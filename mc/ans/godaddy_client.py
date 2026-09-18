"""Adapter for GoDaddy's hosted ANS API.

STATUS: skeleton. GoDaddy's public docs don't pin down every endpoint yet, so every
path and field below marked TODO(verify) must be checked against the developer docs
(https://www.godaddy.com/ans/developers) or the Swagger UI once you have an API key.
Ask at the GoDaddy workshop. The rest of Mission Control only talks to the AnsClient
interface, so once these methods work, nothing else needs to change.

Env:
  ANS_API_URL      base URL of the ANS API                     TODO(verify)
  ANS_API_KEY      your API key from AgentNameRegistry.org
  ANS_API_SECRET   secret, if the API uses GoDaddy's "sso-key KEY:SECRET" scheme
"""
from ..config import env
from ..http import client
from .base import AnsClient, AnsError


class GoDaddyAnsClient(AnsClient):
    backend = "godaddy"

    def __init__(self):
        self.base = (env("ANS_API_URL") or "").rstrip("/")
        if not self.base:
            raise AnsError("ANS_BACKEND=godaddy needs ANS_API_URL in .env")
        key, secret = env("ANS_API_KEY", ""), env("ANS_API_SECRET", "")
        # TODO(verify): auth header format. GoDaddy's domain APIs use "sso-key KEY:SECRET".
        self.headers = {"Authorization": f"sso-key {key}:{secret}" if secret else f"Bearer {key}"}
        self._ca = None
        self._log_key = None

    async def _req(self, method, path, *, allow_404=False, **kwargs):
        r = await client().request(method, self.base + path, headers=self.headers, timeout=20, **kwargs)
        if allow_404 and r.status_code == 404:
            return None
        if r.status_code >= 400:
            raise AnsError(f"GoDaddy ANS {method} {path} failed ({r.status_code}): {r.text[:300]}")
        return r.json()

    @staticmethod
    def _to_record(raw: dict) -> dict:
        """Map GoDaddy's response shape onto Mission Control's record shape. TODO(verify) field names."""
        return {
            "agent_id": raw.get("agentId") or raw.get("id"),
            "ans_name": raw.get("ansName") or raw.get("ans_name"),
            "org": raw.get("organization") or raw.get("org"),
            "endpoint": raw.get("endpoint"),
            "agent_card_url": raw.get("agentCardUrl") or raw.get("agent_card_url"),
            "capabilities": raw.get("capabilities", []),
            "status": (raw.get("status") or "").upper(),
            "identity_cert_pem": raw.get("identityCertificate") or raw.get("identity_cert_pem"),
            "registered_at": raw.get("createdAt") or raw.get("registered_at"),
            **{k: raw[k] for k in ("host", "label", "domain", "version") if k in raw},
        }

    async def register(self, *, ans_name, org, endpoint, agent_card_url, capabilities, csr_pem, supersedes=None):
        # TODO(verify): path and body field names.
        raw = await self._req("POST", "/v1/agents/register", json={
            "ansName": ans_name, "organization": org, "endpoint": endpoint,
            "agentCardUrl": agent_card_url, "capabilities": capabilities, "csr": csr_pem,
        })
        return {"agent_id": raw.get("agentId") or raw.get("id"), "status": (raw.get("status") or "").upper(),
                "challenge": raw.get("challenge")}

    async def publish_challenge(self, challenge):
        # With a real domain you add this record at your DNS provider (e.g. GoDaddy DNS manager).
        print("\nAdd this DNS record to prove you control the domain:")
        print(f"  TXT  {challenge.get('name')}  \"{challenge.get('value')}\"")
        input("Press Enter once the record is live... ")

    async def verify_domain(self, agent_id):
        # TODO(verify): path.
        return self._to_record(await self._req("POST", f"/v1/agents/{agent_id}/verify"))

    async def resolve(self, ans_name):
        # TODO(verify): path/params.
        raw = await self._req("GET", "/v1/agents/resolve", params={"ansName": ans_name}, allow_404=True)
        return self._to_record(raw) if raw else None

    async def search(self, capability=None, host=None, status="ACTIVE"):
        # TODO(verify): whether search by capability exists. Fallback: resolve a known list of names.
        params = {k: v for k, v in {"capability": capability, "host": host, "status": status}.items() if v}
        raw = await self._req("GET", "/v1/agents", params=params)
        items = raw.get("agents", raw) if isinstance(raw, dict) else raw
        return [self._to_record(a) for a in items]

    async def revoke(self, agent_id, reason):
        # TODO(verify): path.
        return self._to_record(await self._req("POST", f"/v1/agents/{agent_id}/revoke", json={"reason": reason}))

    async def ca_cert(self):
        if not self._ca:
            # TODO(verify): where the identity CA certificate is published.
            self._ca = (await self._req("GET", "/v1/ca"))["pem"]
        return self._ca

    async def log_public_key(self):
        if not self._log_key:
            # TODO(verify): the reference implementation serves /root-keys on the transparency log.
            self._log_key = (await self._req("GET", "/root-keys"))["pem"]
        return self._log_key

    async def log(self, agent_id=None, limit=50):
        # TODO(verify): path.
        params = {"limit": limit, **({"agentId": agent_id} if agent_id else {})}
        return await self._req("GET", "/v1/log", params=params)

    async def receipt(self, index):
        # TODO(verify): the reference implementation returns COSE receipts; convert them to
        # {entry, audit_path, checkpoint} here, or verify them with the ans-verify CLI instead.
        return await self._req("GET", f"/v1/log/{index}/receipt")
