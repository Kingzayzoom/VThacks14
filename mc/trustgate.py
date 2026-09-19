"""The Trust Gate: the checks an agent runs before trusting another agent.

  1. resolve       — does this ANS name exist, and where is its agent card?
  2. authenticate  — does the agent we're talking to hold the private key for that identity?
  3. status        — is it still in good standing? Two separate pieces of evidence: an
                     inclusion proof that it was registered, and a fresh signed status token
                     saying it is ACTIVE right now. The first one survives a revocation.
  4. capability    — does it actually do the job we need?
  5. policy        — does it meet our own rules (domain allowlist, approved versions)?

Every run is streamed to the dashboard as a "trust.check" event.

On the `authenticate` check: the nonce-and-signature exchange below is CortexAi's own
proof-of-possession protocol, not an ANS one. GoDaddy's documented mechanisms are mTLS (the
identity certificate presented in the handshake) and DPoP (a per-request signed proof). Ours
verifies the same key against the same ANS-issued certificate, so it answers the same question
— but call it what it is, and swap to mTLS or DPoP when talking to a real deployment.
"""
from dataclasses import dataclass, field

import httpx

from . import crypto, merkle, standing
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
    # `ok` is the yes/no the mission acts on. `state` says *why*, and keeps the two kinds of
    # no apart: evidence that says no, and evidence we could not obtain. Both stop the hire —
    # we fail closed — but only one of them means the agent did something wrong, and an
    # operator staring at a screen at 2am needs to be able to tell which.
    state: str = ""  # pass | fail | unverified | not_run
    evidence: dict = field(default_factory=dict)

    def __post_init__(self):
        if not self.state:
            self.state = {True: "pass", False: "fail", None: "not_run"}[self.ok]

    def as_dict(self):
        return {"name": self.name, "ok": self.ok, "detail": self.detail,
                "state": self.state, "evidence": self.evidence}


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

    async def _fetch_card(self, url: str) -> tuple[dict | None, str | None]:
        """Returns (card, presented status token). The token rides along on the same response."""
        try:
            r = await client().get(url, timeout=5)
            if r.status_code != 200:
                return None, None
            return r.json(), r.headers.get(standing.STATUS_HEADER)
        except (httpx.HTTPError, ValueError):
            return None, None

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

    async def _inclusion_evidence(self, record: dict) -> tuple[str, str, int | None, dict]:
        """Is this registration in the transparency log? Returns (state, detail, index, evidence).

        This is history. It proves the registration happened and it keeps proving that after a
        revocation, which is exactly why it is not enough on its own.
        """
        try:
            entries = await self.ans.log(agent_id=record["agent_id"], limit=1)
            if not entries:
                return "fail", "no transparency-log entry", None, {}
            index = entries[-1]["index"]
            ok, detail = merkle.verify_receipt(await self.ans.receipt(index), await self.ans.log_public_key())
            return ("pass" if ok else "fail"), detail, (index if ok else None), {"log_index": index}
        except (AnsError, httpx.HTTPError, NotImplementedError) as exc:
            return "unverified", f"inclusion proof unavailable ({type(exc).__name__})", None, {}

    async def _standing_evidence(self, record: dict, presented: str | None = None) -> tuple[str, str, dict]:
        """Is it in good standing *now*? Returns (state, detail, evidence).

        Two ways to find out, and the first is the one ANS is designed around: the agent hands
        us its own signed status token and we check it offline against root keys we already
        hold. No registry round-trip, and it still works when the registry is unreachable.
        Asking the registry ourselves is the fallback.

        A presented token is pinned to the name we are asking about. It is otherwise a perfectly
        genuine document — just possibly about someone else.
        """
        try:
            public_key = await self.ans.status_public_key()
        except (AnsError, httpx.HTTPError, NotImplementedError) as exc:
            return "unverified", f"no ANS signing key to check standing against ({type(exc).__name__})", {}

        if presented:
            token = standing.decode_token(presented)
            if token is None:
                return "fail", "the presented status token is unreadable", {}
            ok, detail, evidence = standing.verify_status_token(
                token, public_key, expect_ans_name=record["ans_name"])
            return ("pass" if ok else "fail"), f"{detail} (presented, verified offline)",                    {**evidence, "source": "presented by the agent"}

        try:
            token = await self.ans.status_token(record["agent_id"])
        except (AnsError, httpx.HTTPError, NotImplementedError) as exc:
            return "unverified", f"standing unproven ({type(exc).__name__})", {}
        ok, detail, evidence = standing.verify_status_token(
            token, public_key, expect_ans_name=record["ans_name"])
        return ("pass" if ok else "fail"), f"{detail} (fetched from ANS)",                {**evidence, "source": "fetched from the registry"}

    async def _status_check(self, record: dict, presented: str | None = None) -> tuple[Check, int | None]:
        """Two questions, asked separately: was it registered, and is it still in good standing.

        Answering only the first is the classic mistake — a revoked agent's inclusion proof
        verifies perfectly and always will.
        """
        status = (record.get("status") or "").upper()
        if status != "ACTIVE":
            reason = f" ({record['status_reason']})" if record.get("status_reason") else ""
            # Not every non-ACTIVE state is the agent's fault, and they should not read alike.
            # A half-finished registration is our problem; a revocation is a statement about
            # the agent. Both refuse the hire; only one means something went wrong out there.
            unfinished = status in ("PENDING_VALIDATION", "PENDING_CERTS", "PENDING_DNS")
            detail = {
                "PENDING_VALIDATION": "registration is still proving domain control",
                "PENDING_CERTS": "registration is waiting on certificate issuance",
                "PENDING_DNS": "certificates are ready but the discovery records are not published",
                "DEPRECATED": "registered but deprecated — a newer version is preferred",
                "EXPIRED": "the registration has lapsed",
                "FAILED": "registration never completed",
                "REVOKED": "REVOKED",
                "SUPERSEDED": "SUPERSEDED — replaced by a newer registration",
            }.get(status, status)
            return Check("status", False, f"{detail}{reason}",
                         state="unverified" if unfinished else "fail",
                         evidence={"registry_status": status}), None

        inclusion_state, inclusion_detail, index, inclusion_ev = await self._inclusion_evidence(record)
        standing_state, standing_detail, standing_ev = await self._standing_evidence(record, presented)
        evidence = {"registry_status": status,
                    "inclusion": {"state": inclusion_state, "detail": inclusion_detail, **inclusion_ev},
                    "standing": {"state": standing_state, "detail": standing_detail, **standing_ev}}

        if "fail" in (inclusion_state, standing_state):
            failed = inclusion_detail if inclusion_state == "fail" else standing_detail
            return Check("status", False, failed, state="fail", evidence=evidence), None
        if "unverified" in (inclusion_state, standing_state):
            unproven = inclusion_detail if inclusion_state == "unverified" else standing_detail
            # Fail closed, but say which kind of no this is.
            return Check("status", False, unproven, state="unverified", evidence=evidence), index
        return Check("status", True, f"ACTIVE · {standing_detail} · log entry #{index} verified",
                     evidence=evidence), index

    async def check_agent(self, ans_name: str, endpoint: str, capability: str, policy: Policy | None = None,
                          *, mission_id: str | None = None, source: str = "ANS registry") -> TrustResult:
        res = TrustResult(ans_name=ans_name, endpoint=endpoint)
        checks = res.checks

        # 1. resolve
        record = await self.ans.resolve(ans_name)
        card, presented = (await self._fetch_card(record["agent_card_url"])) if record else (None, None)
        res.record, res.card = record, card
        if not record:
            checks.append(Check("resolve", False, "not registered in ANS"))
        elif not card:
            checks.append(Check("resolve", False, "registered, but its agent card is unreachable"))
        else:
            at_registered_endpoint = endpoint.rstrip("/") == (record.get("endpoint") or "").rstrip("/")
            where = "" if at_registered_endpoint else f" · offering from {endpoint}, ANS lists {record['endpoint']}"
            checks.append(Check("resolve", True, f"registered to {record['org']} · card fetched{where}",
                                evidence={"registered_endpoint": record.get("endpoint"),
                                          "offered_endpoint": endpoint,
                                          "endpoint_matches_registry": at_registered_endpoint}))

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
                # The endpoint we are actually talking to gets to present its own standing,
                # which matters when it is not the one the registry lists.
                presented = r.headers.get(standing.STATUS_HEADER) or presented
            except (httpx.HTTPError, ValueError):
                pass
            if sig and crypto.verify(cert.public_key(), crypto.challenge_bytes(challenge), sig):
                res.cert_pem = record["identity_cert_pem"]
                checks.append(Check("authenticate", True, "signed our challenge with its certified key"))
            else:
                note = " (it is not at the endpoint ANS lists)" if endpoint.rstrip("/") != record["endpoint"].rstrip("/") else ""
                checks.append(Check("authenticate", False,
                                    "couldn't prove it holds this identity's private key" + note))

        # 3. status (+ transparency-log receipt)
        status_check, res.log_index = await self._status_check(record, presented)
        checks.append(status_check)

        # 4. capability
        has_cap = capability in card.get("capabilities", []) and capability in record.get("capabilities", [])
        checks.append(Check("capability", has_cap,
                            f"offers {capability}" if has_cap else f"doesn't offer {capability}"))

        # 5. policy
        checks.append(self._policy_check(ans_name, policy, record, endpoint))
        return await self._finish(res, mission_id, source, capability)

    def _policy_check(self, ans_name: str, policy: Policy | None, record: dict | None = None,
                      endpoint: str | None = None) -> Check:
        if not policy:
            return Check("policy", True, "no policy set")
        parsed = parse_ans_name(ans_name)
        if policy.allowed_domains and parsed["domain"] not in policy.allowed_domains:
            return Check("policy", False, f"{parsed['domain']} is not on our allowlist")
        # We talk to agents where ANS says they live. Someone offering this identity from an
        # address the registry does not list is refused on that ground alone — belt and braces,
        # because the authenticate check should already have caught anyone who cannot prove the
        # key, and a rule that only works when the crypto works is not much of a rule.
        registered = (record or {}).get("endpoint")
        if endpoint and registered and endpoint.rstrip("/") != registered.rstrip("/"):
            return Check("policy", False,
                         f"offering this identity from {endpoint}, but ANS lists {registered}",
                         evidence={"registered_endpoint": registered, "offered_endpoint": endpoint})
        pin = policy.version_pins.get(parsed["label"]) or policy.version_pins.get(parsed["host"])
        if pin and not parsed["version"].startswith(pin + "."):
            return Check("policy", False, f"version {parsed['version']} isn't the approved {pin}.x")
        return Check("policy", True, "domain allowed · at its registered address · version approved")

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

    async def verify_signed(self, ans_name: str, payload: dict, signature: str, *,
                            label: str = "request") -> TrustResult:
        """Who signed this, and are they still in good standing? Emits nothing.

        The caller decides whether the check is worth an event: a job hand-off is, an
        agent asking the Guardian for permission mid-job would drown the feed.
        """
        res = TrustResult(ans_name=ans_name, endpoint="(caller)")
        record = await self.ans.resolve(ans_name)
        res.record = record
        if not record:
            res.checks.append(Check("resolve", False, "caller is not registered in ANS"))
        else:
            res.checks.append(Check("resolve", True, f"registered to {record['org']}"))
            cert, problem = await self._cert_checks(ans_name, record.get("identity_cert_pem"))
            if problem:
                res.checks.append(Check("authenticate", False, problem))
            elif crypto.verify(cert.public_key(), crypto.canonical(payload), signature):
                res.cert_pem = record["identity_cert_pem"]
                res.checks.append(Check("authenticate", True, f"{label} signed by its certified key"))
            else:
                res.checks.append(Check("authenticate", False, f"{label} signature is invalid"))
            status_check, res.log_index = await self._status_check(record)
            res.checks.append(status_check)
        res.verdict = TRUSTED if all(c.ok for c in res.checks) else REJECTED
        return res

    async def verify_peer_request(self, payload: dict, signature: str, *, mission_id: str | None = None) -> TrustResult:
        """Used by vendors: verify the client that sent us a job (trust goes both ways)."""
        sender = payload.get("from", "")
        res = await self.verify_signed(sender, payload, signature, label="job request")
        await emit("trust.check", f"{res.verdict.title()}: client {sender}", actor=self.me, subject=sender,
                   mission_id=mission_id, verdict=res.verdict, checks=[c.as_dict() for c in res.checks],
                   endpoint=res.endpoint, source="incoming job", capability=payload.get("capability"))
        return res


# What an agent signs when it returns work. Both sides build this from the same keys, in the
# same order, or nothing verifies. job_id and mission_id are in here so that a signature cannot
# be lifted off one piece of work and stapled to another.
SIGNED_RESULT_FIELDS = ("job_id", "mission_id", "from", "output_sha256", "signed_at")


def signed_result_body(payload: dict) -> dict:
    return {k: payload[k] for k in SIGNED_RESULT_FIELDS}


def verify_result(result: dict, expected_from: str, cert_pem: str, *,
                  job_id: str, mission_id: str) -> tuple[bool, str]:
    """Check a signed deliverable: right agent, right job, untampered output, valid signature.

    Checking the signature alone is not enough. A deliverable an agent signed perfectly well an
    hour ago is still perfectly signed today — so without pinning it to the job we actually
    asked for, an agent could hand back old work, or work it did for somebody else's mission,
    and every cryptographic check would pass.
    """
    try:
        payload, signature = result["payload"], result["signature"]
        if payload["from"] != expected_from:
            return False, "deliverable is from a different agent than the one hired"
        if payload.get("job_id") != job_id:
            return False, "deliverable is for a different job than the one we sent"
        if payload.get("mission_id") != mission_id:
            return False, "deliverable belongs to a different mission"
        if crypto.sha256_hex(crypto.canonical(payload["output"])) != payload["output_sha256"]:
            return False, "deliverable was altered after signing"
        cert = crypto.load_cert(cert_pem)
        if not crypto.verify(cert.public_key(), crypto.canonical(signed_result_body(payload)), signature):
            return False, "signature doesn't match the agent's identity certificate"
        return True, "signature valid"
    except (KeyError, TypeError, ValueError) as exc:
        return False, f"malformed deliverable ({exc})"
