"""Client for the local ANS simulator (services/ans_sim)."""
from ..config import ans_sim_url
from ..http import client
from .base import AnsClient, AnsError


class SimAnsClient(AnsClient):
    backend = "sim"

    def __init__(self, base_url: str | None = None):
        self.base = (base_url or ans_sim_url()).rstrip("/")
        self._ca = None
        self._log_key = None

    async def _req(self, method: str, path: str, *, allow_404: bool = False, **kwargs):
        r = await client().request(method, self.base + path, timeout=10, **kwargs)
        if allow_404 and r.status_code == 404:
            return None
        if r.status_code >= 400:
            try:
                detail = r.json().get("detail", r.text)
            except ValueError:
                detail = r.text
            raise AnsError(f"ANS {method} {path} failed ({r.status_code}): {detail}")
        return r.json()

    async def register(self, *, ans_name, org, endpoint, agent_card_url, capabilities, csr_pem, supersedes=None):
        return await self._req("POST", "/v1/agents", json={
            "ans_name": ans_name, "org": org, "endpoint": endpoint, "agent_card_url": agent_card_url,
            "capabilities": capabilities, "csr_pem": csr_pem, "supersedes": supersedes,
        })

    async def publish_challenge(self, challenge):
        # The simulator plays the role of the domain's DNS provider too.
        await self._req("POST", "/v1/dev/dns", json={"name": challenge["name"], "value": challenge["value"]})

    async def verify_domain(self, agent_id):
        return await self._req("POST", f"/v1/agents/{agent_id}/verify")

    async def resolve(self, ans_name):
        return await self._req("GET", "/v1/resolve", params={"name": ans_name}, allow_404=True)

    async def search(self, capability=None, host=None, status="ACTIVE"):
        params = {k: v for k, v in {"capability": capability, "host": host, "status": status}.items() if v}
        return await self._req("GET", "/v1/agents", params=params)

    async def revoke(self, agent_id, reason):
        return await self._req("POST", f"/v1/agents/{agent_id}/revoke", json={"reason": reason})

    async def ca_cert(self):
        if not self._ca:
            self._ca = (await self._req("GET", "/v1/ca"))["pem"]
        return self._ca

    async def log_public_key(self):
        if not self._log_key:
            self._log_key = (await self._req("GET", "/v1/log/public-key"))["pem"]
        return self._log_key

    async def log(self, agent_id=None, limit=50):
        params = {"limit": limit}
        if agent_id:
            params["agent_id"] = agent_id
        return await self._req("GET", "/v1/log", params=params)

    async def receipt(self, index):
        return await self._req("GET", f"/v1/log/{index}/receipt")

    async def dev_set_status(self, agent_id, status, reason):
        return await self._req("POST", f"/v1/dev/agents/{agent_id}/status", json={"status": status, "reason": reason})

    async def dns(self):
        return await self._req("GET", "/v1/dev/dns")
