"""Adapter for GoDaddy's hosted Agent Name Service.

Endpoints and field names below come from GoDaddy's published ANS REST reference
(developer.godaddy.com/en/docs/references/rest/ans/*) rather than from guesswork. What we
have *not* been able to do is run a single call against it — that needs a PAT. So treat this
as documented-but-unexercised: run `python scripts/check_ans.py` the moment you have a token
and it will tell you, endpoint by endpoint, which of these assumptions survive contact.

Two things this backend cannot do yet, both deliberate:

  the status-token retrieval path is still a guess. It should rarely matter: the intended flow
  is that an agent presents its own token and we verify it offline, which is what the Trust Gate
  tries first. If neither works, standing is recorded as *unverified* — which fails closed but
  is reported as "we could not get the evidence", never as "the agent is fine".

  receipts are SCITT COSE_Sign1, not the JSON Merkle receipts the simulator serves. Do not
  point mc/merkle.py at them; verify with GoDaddy's ans-verify tooling instead.

Env:
  ANS_API_URL             https://api.ote-godaddy.com (OTE) or https://api.godaddy.com
  ANS_PAT                 personal access token — sent as `Authorization: Bearer <pat>`
  ANS_TRANSPARENCY_URL    defaults from ANS_API_URL: transparency.ans[.ote]-godaddy.com
  ANS_CA_BUNDLE_PATH      the identity CA root to pin
  ANS_AUTH_MODE           pat (default) | sso-key, for the older KEY:SECRET scheme
"""
from ..config import env, parse_ans_name
from ..http import client
from .base import AnsClient, AnsError

# POST /v1/agents/{agentId}/revoke — the reasons the API accepts.
REVOCATION_REASONS = (
    "KEY_COMPROMISE", "CESSATION_OF_OPERATION", "AFFILIATION_CHANGED", "SUPERSEDED",
    "CERTIFICATE_HOLD", "PRIVILEGE_WITHDRAWN", "AA_COMPROMISE",
)


class GoDaddyAnsClient(AnsClient):
    backend = "godaddy"

    def __init__(self):
        self.base = (env("ANS_API_URL") or "").rstrip("/")
        if not self.base:
            raise AnsError("ANS_BACKEND=godaddy needs ANS_API_URL in .env "
                           "(https://api.ote-godaddy.com for OTE)")
        self.tlog = self._transparency_url(self.base)
        self.headers = {"Accept": "application/json", **self._auth()}
        self._ca = None

    @staticmethod
    def _transparency_url(api_base: str) -> str:
        """Where receipts, status tokens and root keys live.

        Published alongside the SDK, and paired with the API environment — mixing OTE identities
        with production proofs would verify nothing. Set ANS_TRANSPARENCY_URL to override.
        """
        explicit = env("ANS_TRANSPARENCY_URL") or env("ANS_TLOG_URL")
        if explicit:
            return explicit.rstrip("/")
        return {
            "https://api.godaddy.com": "https://transparency.ans.godaddy.com",
            "https://api.ote-godaddy.com": "https://transparency.ans.ote-godaddy.com",
        }.get(api_base, "")

    @staticmethod
    def _auth() -> dict:
        """PAT bearer by default; the older key:secret scheme only if asked for explicitly."""
        mode = (env("ANS_AUTH_MODE", "pat") or "pat").lower()
        if mode == "sso-key":
            key, secret = env("ANS_API_KEY", ""), env("ANS_API_SECRET", "")
            if not key or not secret:
                raise AnsError("ANS_AUTH_MODE=sso-key needs ANS_API_KEY and ANS_API_SECRET")
            return {"Authorization": f"sso-key {key}:{secret}"}
        pat = env("ANS_PAT") or env("GODADDY_PAT")
        if not pat:
            raise AnsError("ANS_PAT is not set. GoDaddy's ANS REST catalog lists PAT auth; "
                           "set ANS_AUTH_MODE=sso-key only if the sponsor tells you otherwise.")
        return {"Authorization": f"Bearer {pat}"}

    async def _req(self, method: str, path: str, *, base: str | None = None,
                   allow_404: bool = False, **kwargs):
        url = (base or self.base) + path
        headers = dict(self.headers)
        if "json" in kwargs:
            headers["Content-Type"] = "application/json"
        r = await client().request(method, url, headers=headers, timeout=20, **kwargs)
        if allow_404 and r.status_code == 404:
            return None
        if r.status_code >= 400:
            raise AnsError(f"ANS {method} {path} failed ({r.status_code}): {r.text[:300]}")
        return r.json() if r.content else {}

    # --- mapping ------------------------------------------------------------------------

    @staticmethod
    def _capabilities(raw: dict) -> list[str]:
        """Our "capabilities" are ANS registered function names — endpoints[].functions[].name."""
        names = []
        for ep in raw.get("endpoints") or []:
            for fn in ep.get("functions") or []:
                if fn.get("name"):
                    names.append(fn["name"])
        return names or list(raw.get("capabilities") or [])

    @classmethod
    def _to_record(cls, raw: dict) -> dict:
        """GoDaddy's agent shape → the record shape the rest of CortexAi speaks."""
        endpoints = raw.get("endpoints") or [{}]
        first = endpoints[0]
        host = raw.get("agentHost") or ""
        ans_name = raw.get("ansName") or raw.get("ans_name")
        parsed = parse_ans_name(ans_name or "") or {}
        return {
            "agent_id": raw.get("agentId") or raw.get("id"),
            "ans_name": ans_name,
            "host": host or parsed.get("host"),
            "label": parsed.get("label") or (host.split(".")[0] if host else None),
            "domain": parsed.get("domain") or (".".join(host.split(".")[1:]) if host else None),
            "version": raw.get("version") or parsed.get("version"),
            "org": raw.get("agentDisplayName") or parsed.get("domain") or host,
            "endpoint": first.get("agentUrl"),
            "agent_card_url": first.get("metaDataUrl"),
            "capabilities": cls._capabilities(raw),
            "status": (raw.get("status") or "").upper(),
            "status_reason": raw.get("statusReason") or raw.get("revocationReason"),
            "identity_cert_pem": None,  # a second call; see resolve()
            "registered_at": raw.get("createdAt") or raw.get("registeredAt"),
            "updated_at": raw.get("updatedAt"),
        }

    # --- registration -------------------------------------------------------------------

    async def register(self, *, ans_name, org, endpoint, agent_card_url, capabilities, csr_pem,
                       supersedes=None):
        """POST /v1/agents/register — returns agentId, ansName and a DNS-01 challenge."""
        parsed = parse_ans_name(ans_name)
        if not parsed:
            raise AnsError(f"{ans_name} is not a well-formed ANS name")
        body = {
            "agentDisplayName": org,
            "agentHost": parsed["host"],
            "version": parsed["version"],
            "identityCsrPEM": csr_pem,
            "endpoints": [{
                "agentUrl": endpoint,
                "metaDataUrl": agent_card_url,
                "protocol": "A2A",
                "transports": ["HTTP"],
                "functions": [{"id": c.replace(".", "_"), "name": c, "tags": [c.split(".")[0]]}
                              for c in capabilities],
            }],
        }
        raw = await self._req("POST", "/v1/agents/register", json=body)
        challenge = raw.get("challenge") or {}
        dns = challenge.get("dnsRecord") or {}
        return {
            "agent_id": raw.get("agentId"),
            "ans_name": raw.get("ansName"),
            "status": (raw.get("status") or "").upper(),
            # Normalised to what publish_challenge/verify_domain expect.
            "challenge": {"type": challenge.get("type", "DNS_01"), "name": dns.get("name"),
                          "value": dns.get("value"), "record_type": dns.get("type", "TXT"),
                          "token": challenge.get("token")} if challenge else None,
        }

    async def publish_challenge(self, challenge):
        """A real domain means a real DNS record, which means a human at a DNS console."""
        print("\nAdd this DNS record to prove you control the domain:")
        print(f"  {challenge.get('record_type', 'TXT')}  {challenge.get('name')}  \"{challenge.get('value')}\"")
        input("Press Enter once it has propagated (dig TXT <name> to check)... ")

    async def verify_domain(self, agent_id):
        """POST /v1/agents/{agentId}/verify-acme — ACME DNS-01. /verify-dns also exists."""
        await self._req("POST", f"/v1/agents/{agent_id}/verify-acme", json={})
        return await self.get_agent(agent_id)

    # --- lookup -------------------------------------------------------------------------

    async def get_agent(self, agent_id: str) -> dict:
        raw = await self._req("GET", f"/v1/agents/{agent_id}", allow_404=True)
        if not raw:
            return None
        record = self._to_record(raw)
        record["identity_cert_pem"] = await self._identity_cert(agent_id)
        return record

    async def _identity_cert(self, agent_id: str) -> str | None:
        """GET /v1/agents/{agentId}/certificates/identity — the cert whose SAN is the ANS name."""
        try:
            raw = await self._req("GET", f"/v1/agents/{agent_id}/certificates/identity", allow_404=True)
        except AnsError:
            return None
        return (raw or {}).get("certificatePEM")

    async def resolve(self, ans_name):
        """POST /v1/agents/resolution — by host and version, not by the ans:// URI.

        Resolution returns the name and links; the identity certificate is a separate call,
        so this makes both and hands back one record like the rest of the code expects.
        """
        parsed = parse_ans_name(ans_name)
        if not parsed:
            return None
        raw = await self._req("POST", "/v1/agents/resolution", allow_404=True,
                              json={"agentHost": parsed["host"], "version": parsed["version"]})
        if not raw:
            return None
        agent_id = raw.get("agentId") or raw.get("id")
        if agent_id:
            return await self.get_agent(agent_id)
        record = self._to_record(raw)
        record.setdefault("ans_name", ans_name)
        return record

    async def search(self, capability=None, host=None, status="ACTIVE"):
        """GET /v1/ans/registered-agents — the indexed registry, where capability filtering lives.

        `capabilities` matches registered function names, which is why we register each of our
        capabilities as a function name rather than only as a tag.
        """
        params = {}
        if capability:
            params["capabilities"] = capability
        if host:
            params["agentDomains"] = host
        if status:
            params["statuses"] = status
        try:
            raw = await self._req("GET", "/v1/ans/registered-agents", params=params)
        except AnsError:
            # POST /v1/ans/search-registered-agents is the documented search form of the same index.
            raw = await self._req("POST", "/v1/ans/search-registered-agents", json=params)
        items = raw.get("agents") or raw.get("results") or raw if isinstance(raw, dict) else raw
        return [self._to_record(a) for a in (items or [])]

    # --- lifecycle ----------------------------------------------------------------------

    async def revoke(self, agent_id, reason):
        """POST /v1/agents/{agentId}/revoke. One way — there is no un-revoke."""
        code = reason if reason in REVOCATION_REASONS else "PRIVILEGE_WITHDRAWN"
        await self._req("POST", f"/v1/agents/{agent_id}/revoke",
                        json={"reason": code, "comments": reason})
        return await self.get_agent(agent_id)

    async def events(self, since: str | None = None, limit: int = 50):
        return await self._req("GET", "/v1/agents/events",
                               params={k: v for k, v in {"since": since, "limit": limit}.items() if v})

    # --- evidence -----------------------------------------------------------------------

    async def ca_cert(self):
        """The trust anchor for identity certificates.

        `chainPEM` comes back with each identity certificate, but a chain handed over by the
        party you are checking is not a trust anchor — you need a root you already trust. Ask
        the sponsor where to pin it, then set ANS_CA_BUNDLE_PATH.
        """
        path = env("ANS_CA_BUNDLE_PATH")
        if not path:
            raise NotImplementedError(
                "No ANS CA trust anchor configured. Set ANS_CA_BUNDLE_PATH to the pinned root.")
        if self._ca is None:
            with open(path, encoding="utf-8") as f:
                self._ca = f.read()
        return self._ca

    def _need_tlog(self):
        if not self.tlog:
            raise NotImplementedError(
                "ANS_TLOG_URL is not set, so standing and inclusion proofs cannot be fetched. "
                "The Trust Gate will report this as unverified rather than as good standing.")

    async def status_token(self, agent_id: str) -> dict:
        """Fetching standing from the log is the fallback, not the intended path.

        In GoDaddy's model the agent attaches its own `X-ANS-Status-Token` and you verify it
        offline against cached root keys — that is what makes verification sub-millisecond and
        survive the registry being unreachable. This exists for when nothing was presented.

        The retrieval path here is still a guess; scripts/check_ans.py will say so.
        """
        self._need_tlog()
        return await self._req("GET", f"/status-tokens/{agent_id}", base=self.tlog)

    async def status_public_key(self) -> str:
        self._need_tlog()
        return (await self._req("GET", "/root-keys", base=self.tlog))["pem"]

    async def log_public_key(self):
        return await self.status_public_key()

    async def log(self, agent_id=None, limit=50):
        self._need_tlog()
        params = {"limit": limit, **({"agentId": agent_id} if agent_id else {})}
        return await self._req("GET", "/entries", base=self.tlog, params=params)

    async def receipt(self, index):
        """SCITT COSE_Sign1, not the JSON receipts mc/merkle.py verifies.

        Verify these with GoDaddy's ans-verify tooling rather than reimplementing COSE here.
        """
        self._need_tlog()
        raise NotImplementedError(
            "SCITT COSE_Sign1 receipts need the ans-verify verifier; mc/merkle.py cannot read them.")
