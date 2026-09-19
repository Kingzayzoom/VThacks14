"""The operations CortexAi needs from ANS. Both backends implement this.

Agent records are plain dicts with these keys:
  agent_id, ans_name, host, label, domain, version, org, endpoint, agent_card_url,
  capabilities, status (PENDING_VALIDATION | ACTIVE | REVOKED | SUPERSEDED),
  identity_cert_pem, registered_at, updated_at, status_reason
"""


class AnsError(Exception):
    pass


class AnsClient:
    backend = "base"

    async def register(self, *, ans_name: str, org: str, endpoint: str, agent_card_url: str,
                       capabilities: list[str], csr_pem: str, supersedes: str | None = None) -> dict:
        """Submit a registration. Returns {agent_id, status, challenge?} (challenge proves domain control)."""
        raise NotImplementedError

    async def publish_challenge(self, challenge: dict) -> None:
        """Put the domain-control challenge where the Registration Authority can see it (a DNS TXT record)."""
        raise NotImplementedError

    async def verify_domain(self, agent_id: str) -> dict:
        """Ask the RA to check the challenge. Returns the agent record, now ACTIVE with an identity cert."""
        raise NotImplementedError

    async def resolve(self, ans_name: str) -> dict | None:
        raise NotImplementedError

    async def search(self, capability: str | None = None, host: str | None = None,
                     status: str | None = "ACTIVE") -> list[dict]:
        raise NotImplementedError

    async def revoke(self, agent_id: str, reason: str) -> dict:
        raise NotImplementedError

    async def ca_cert(self) -> str:
        """PEM of the CA that signs agent identity certificates."""
        raise NotImplementedError

    async def log_public_key(self) -> str:
        """PEM of the key the transparency log signs its tree roots with."""
        raise NotImplementedError

    async def log(self, agent_id: str | None = None, limit: int = 50) -> list[dict]:
        raise NotImplementedError

    async def receipt(self, index: int) -> dict:
        """Proof that a registration is in the transparency log. History; stays true forever."""
        raise NotImplementedError

    async def status_token(self, agent_id: str) -> dict:
        """Short-lived signed proof of current good standing. A different question to `receipt`.

        On GoDaddy-hosted ANS this arrives as `X-ANS-Status-Token`; the simulator serves the
        same fields as JSON. Raise NotImplementedError if a backend cannot supply one — the
        Trust Gate reports that as unverified standing rather than as good standing.
        """
        raise NotImplementedError

    async def status_public_key(self) -> str:
        """PEM of the key ANS signs status tokens with."""
        raise NotImplementedError

    async def dev_set_status(self, agent_id: str, status: str, reason: str) -> dict:
        """Demo-only: put an agent back to a status (used by the Reset button). Not possible on real ANS."""
        raise NotImplementedError("Real ANS can't un-revoke an agent. Register a new version instead.")

    async def dns(self) -> dict:
        return {}
