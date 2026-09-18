"""The Trust Gate: the checks an agent runs before trusting another agent.

  1. resolve       — does this ANS name exist, and where is its agent card?
  2. authenticate  — does the agent we're talking to hold the private key for that identity?
  3. status        — is it still ACTIVE, backed by a verified transparency-log receipt?
  4. capability    — does it actually do the job we need?
  5. policy        — does it meet our own rules (domain allowlist, approved versions)?

Every run is streamed to the dashboard as a "trust.check" event.
"""
from dataclasses import dataclass, field

import httpx

from . import crypto, merkle
from .ans import AnsClient, AnsError
from .config import parse_ans_name
from .events import emit
from .http import client

TRUSTED, REJECTED, NEEDS_APPROVAL = "TRUSTED", "REJECTED", "NEEDS_APPROVAL"


@dataclass
class Check:
    name: str
    ok: bool | None  # None = skipped because an earlier check failed
    detail: str

    def as_dict(self):
        return {"name": self.name, "ok": self.ok, "detail": self.detail}


@dataclass
class TrustResult:
    ans_name: str
    endpoint: str
    verdict: str = REJECTED
    checks: list[Check] = field(default_factory=list)
    record: dict | None = None
    card: dict | None = None
    cert_pem: str | None = None
    log_index: int | None = None

    @property
    def trusted(self) -> bool:
        return self.verdict == TRUSTED

    @property
    def reason(self) -> str:
        failed = [c for c in self.checks if c.ok is False]
        return failed[0].detail if failed else ""

    @property
    def passed(self) -> int:
        return sum(1 for c in self.checks if c.ok)


@dataclass
class Policy:
    allowed_domains: list[str] = field(default_factory=list)
    version_pins: dict[str, str] = field(default_factory=dict)
    preferred_vendors: list[str] = field(default_factory=list)

    @classmethod
    def from_config(cls, cfg: dict) -> "Policy":
        return cls(list(cfg.get("allowed_domains", [])), dict(cfg.get("version_pins", {})),
                   list(cfg.get("preferred_vendors", [])))


class TrustGate:
    def __init__(self, ans: AnsClient, me: str):
        self.ans = ans
        self.me = me  # my own ANS name, used as the actor in events

    async def _fetch_card(self, url: str) -> dict | None:
        try:
            r = await client().get(url, timeout=5)
            return r.json() if r.status_code == 200 else None
        except (httpx.HTTPError, ValueError):
            return None

    async def _cert_checks(self, ans_name: str, cert_pem: str | None) -> tuple[object | None, str | None]:
        """Returns (cert, problem). The cert must be issued by the ANS CA, unexpired, and name this agent."""
        if not cert_pem:
            return None, "no identity certificate on record"
        cert = crypto.load_cert(cert_pem)
        ca = crypto.load_cert(await self.ans.ca_cert())
        if not crypto.cert_issued_by(cert, ca):
            return None, "certificate was not issued by the ANS CA"
        if not crypto.cert_valid_now(cert):
            return None, "certificate is expired"
        if ans_name not in crypto.cert_uris(cert):
            return None, "certificate names a different agent"
        return cert, None

    async def _status_check(self, record: dict) -> tuple[Check, int | None]:
        status = record.get("status")
        if status != "ACTIVE":
            reason = f" ({record['status_reason']})" if record.get("status_reason") else ""
            return Check("status", False, f"{status}{reason}"), None
        try:
            entries = await self.ans.log(agent_id=record["agent_id"], limit=1)
            if not entries:
                return Check("status", False, "ACTIVE, but no transparency-log entry found"), None
            index = entries[-1]["index"]
            ok, detail = merkle.verify_receipt(await self.ans.receipt(index), await self.ans.log_public_key())
            if not ok:
                return Check("status", False, f"log receipt invalid: {detail}"), None
            return Check("status", True, f"ACTIVE · log entry #{index} verified"), index
        except (AnsError, httpx.HTTPError, NotImplementedError) as exc:
            return Check("status", False, f"ACTIVE, but log receipt unavailable ({exc})"), None

    async def check_agent(self, ans_name: str, endpoint: str, capability: str, policy: Policy | None = None,
                          *, mission_id: str | None = None, source: str = "ANS registry") -> TrustResult:
        res = TrustResult(ans_name=ans_name, endpoint=endpoint)
        checks = res.checks

        # 1. resolve
        record = await self.ans.resolve(ans_name)
        card = await self._fetch_card(record["agent_card_url"]) if record else None
        res.record, res.card = record, card
        if not record:
            checks.append(Check("resolve", False, "not registered in ANS"))
        elif not card:
            checks.append(Check("resolve", False, "registered, but its agent card is unreachable"))
        else:
            checks.append(Check("resolve", True, f"registered to {record['org']} · card fetched"))

        if not checks[0].ok:
            checks += [Check(n, None, "skipped") for n in ("authenticate", "status", "capability", "policy")]
            return await self._finish(res, mission_id, source, capability)

        # 2. authenticate: challenge the endpoint we'd actually talk to
        cert, problem = await self._cert_checks(ans_name, record.get("identity_cert_pem"))
        if problem:
            checks.append(Check("authenticate", False, problem))
        else:
            challenge = crypto.nonce()
            sig = None
            try:
                r = await client().post(f"{endpoint}/challenge", json={"nonce": challenge, "from": self.me}, timeout=5)
                sig = r.json().get("signature") if r.status_code == 200 else None
            except (httpx.HTTPError, ValueError):
                pass
            if sig and crypto.verify(cert.public_key(), challenge.encode(), sig):
                res.cert_pem = record["identity_cert_pem"]
                checks.append(Check("authenticate", True, "signed our challenge with its certified key"))
            else:
                note = " (it is not at the endpoint ANS lists)" if endpoint.rstrip("/") != record["endpoint"].rstrip("/") else ""
                checks.append(Check("authenticate", False,
                                    "couldn't prove it holds this identity's private key" + note))

        # 3. status (+ transparency-log receipt)
        status_check, res.log_index = await self._status_check(record)
        checks.append(status_check)

        # 4. capability
        has_cap = capability in card.get("capabilities", []) and capability in record.get("capabilities", [])
        checks.append(Check("capability", has_cap,
                            f"offers {capability}" if has_cap else f"doesn't offer {capability}"))

        # 5. policy
        checks.append(self._policy_check(ans_name, policy))
        return await self._finish(res, mission_id, source, capability)

    def _policy_check(self, ans_name: str, policy: Policy | None) -> Check:
        if not policy:
            return Check("policy", True, "no policy set")
        parsed = parse_ans_name(ans_name)
        if policy.allowed_domains and parsed["domain"] not in policy.allowed_domains:
            return Check("policy", False, f"{parsed['domain']} is not on our allowlist")
        pin = policy.version_pins.get(parsed["host"])
        if pin and not parsed["version"].startswith(pin + "."):
            return Check("policy", False, f"version {parsed['version']} isn't the approved {pin}.x")
        return Check("policy", True, "domain allowed · version approved")

    async def _finish(self, res: TrustResult, mission_id, source, capability) -> TrustResult:
        failed = [c for c in res.checks if c.ok is False]
        if not failed:
            res.verdict = TRUSTED
        elif len(failed) == 1 and failed[0].name == "policy" and "version" in failed[0].detail:
            res.verdict = NEEDS_APPROVAL
        else:
            res.verdict = REJECTED
        await emit("trust.check", f"{res.verdict.replace('_', ' ').title()}: {res.ans_name}",
                   actor=self.me, subject=res.ans_name, mission_id=mission_id, verdict=res.verdict,
                   checks=[c.as_dict() for c in res.checks], endpoint=res.endpoint, source=source,
                   capability=capability)
        return res

    async def recheck_status(self, ans_name: str) -> Check:
        """Fast re-check before every hand-off: is the agent still ACTIVE right now?"""
        record = await self.ans.resolve(ans_name)
        if not record:
            return Check("status", False, "no longer registered")
        check, _ = await self._status_check(record)
        return check

    async def verify_peer_request(self, payload: dict, signature: str, *, mission_id: str | None = None) -> TrustResult:
        """Used by vendors: verify the client that sent us a job (trust goes both ways)."""
        sender = payload.get("from", "")
        res = TrustResult(ans_name=sender, endpoint="(caller)")
        record = await self.ans.resolve(sender)
        res.record = record
        if not record:
            res.checks.append(Check("resolve", False, "caller is not registered in ANS"))
        else:
            res.checks.append(Check("resolve", True, f"registered to {record['org']}"))
            cert, problem = await self._cert_checks(sender, record.get("identity_cert_pem"))
            if problem:
                res.checks.append(Check("authenticate", False, problem))
            elif crypto.verify(cert.public_key(), crypto.canonical(payload), signature):
                res.checks.append(Check("authenticate", True, "job request signed by its certified key"))
            else:
                res.checks.append(Check("authenticate", False, "job request signature is invalid"))
            status_check, res.log_index = await self._status_check(record)
            res.checks.append(status_check)
        res.verdict = TRUSTED if all(c.ok for c in res.checks) else REJECTED
        await emit("trust.check", f"{res.verdict.title()}: client {sender}", actor=self.me, subject=sender,
                   mission_id=mission_id, verdict=res.verdict, checks=[c.as_dict() for c in res.checks],
                   endpoint=res.endpoint, source="incoming job", capability=payload.get("capability"))
        return res


def verify_result(result: dict, expected_from: str, cert_pem: str) -> tuple[bool, str]:
    """Check a signed deliverable: right sender, untampered output, valid signature."""
    try:
        payload, signature = result["payload"], result["signature"]
        if payload["from"] != expected_from:
            return False, "deliverable is from a different agent than the one hired"
        if crypto.sha256_hex(crypto.canonical(payload["output"])) != payload["output_sha256"]:
            return False, "deliverable was altered after signing"
        cert = crypto.load_cert(cert_pem)
        signed = {k: payload[k] for k in ("job_id", "from", "output_sha256", "signed_at")}
        if not crypto.verify(cert.public_key(), crypto.canonical(signed), signature):
            return False, "signature doesn't match the agent's identity certificate"
        return True, "signature valid"
    except (KeyError, TypeError, ValueError) as exc:
        return False, f"malformed deliverable ({exc})"
