"""The Guardian: what a hired agent may DO, as opposed to who it is.

The Trust Gate (mc/trustgate.py) answers questions about identity: is this really
BrandStudio, is it in good standing, does it do this job? The Guardian answers a
different question, over and over, while the agent works:

    may THIS agent take THIS action, on THIS mission, right now?

A verified agent is not an unlimited agent. Every decision here is deterministic — the
LLM explains, it never decides — and some actions are refused no matter who asks or who
clicks approve.
"""
import datetime as dt
from dataclasses import dataclass, field

from . import crypto
from .config import policy

ALLOW, REVIEW, DENY = "allow", "review", "deny"

# Actions no agent may ever take, whatever it was hired for, however the human votes.
# If an agent could talk its way past these, nothing else in CortexAi would mean
# anything — so they are checked before grants, scopes and approvals are even looked at.
HARD_DENY = {
    "secrets.read": "reading CortexAi's own credentials",
    "key.export": "exporting an identity private key",
    "ans.revoke": "revoking another agent in ANS",
    "guardian.disable": "switching the Guardian off",
}

# Outward-facing and hard to take back: a human decides, even when the agent holds the scope.
NEEDS_REVIEW = {"site.publish", "email.send"}

# For these, the scope is about where the bytes go, not what they are.
NETWORK_ACTIONS = {"http.fetch", "external.upload"}


def now() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc)


def iso(t: dt.datetime) -> str:
    return t.isoformat(timespec="seconds")


@dataclass
class ActionRequest:
    """What an agent wants to do. payload_sha256 pins the exact bytes it wants to act on."""
    mission_id: str
    job_id: str
    ans_name: str
    action: str
    resource: str
    destination: str | None = None
    payload_sha256: str = ""
    purpose: str = ""
    url: str | None = None  # the exact URL wanted; its host must equal `destination`

    @property
    def target(self) -> str:
        """The half of the scope that says where, or on what."""
        return (self.destination or "") if self.action in NETWORK_ACTIONS else self.resource

    @property
    def required_scope(self) -> str:
        return f"{self.action}:{self.target}"

    def as_dict(self) -> dict:
        return {"mission_id": self.mission_id, "job_id": self.job_id, "from": self.ans_name,
                "action": self.action, "resource": self.resource, "destination": self.destination,
                "payload_sha256": self.payload_sha256, "purpose": self.purpose, "url": self.url}

    @classmethod
    def from_payload(cls, p: dict) -> "ActionRequest":
        return cls(mission_id=p.get("mission_id") or "", job_id=p.get("job_id") or "",
                   ans_name=p.get("from") or "", action=p.get("action") or "",
                   resource=p.get("resource") or "", destination=p.get("destination"),
                   payload_sha256=p.get("payload_sha256") or "", purpose=p.get("purpose") or "",
                   url=p.get("url"))


@dataclass
class Grant:
    """Permission to act, scoped to one mission and one agent, and it expires.

    Being hired is not "this agent is safe forever". It is "this agent, for this mission,
    with these scopes, until this time".
    """
    grant_id: str
    ans_name: str
    mission_id: str
    job_id: str
    scopes: list[str]
    issued_at: str
    expires_at: str
    status: str = "active"  # active | expired | revoked

    def covers(self, scope: str) -> bool:
        """Exact match, or an action-wide wildcard such as artifact.write:*"""
        if scope in self.scopes:
            return True
        action = scope.split(":", 1)[0]
        return f"{action}:*" in self.scopes

    def live(self, at: dt.datetime | None = None) -> tuple[bool, str]:
        if self.status != "active":
            return False, f"the grant was {self.status}"
        if iso(at or now()) > self.expires_at:
            return False, f"the grant expired at {self.expires_at}"
        return True, ""

    def as_dict(self) -> dict:
        return {"grant_id": self.grant_id, "ans_name": self.ans_name, "mission_id": self.mission_id,
                "job_id": self.job_id, "scopes": list(self.scopes), "issued_at": self.issued_at,
                "expires_at": self.expires_at, "status": self.status}


@dataclass
class Decision:
    outcome: str
    reason: str
    required_scope: str = ""
    granted_scopes: list[str] = field(default_factory=list)
    rules: list[str] = field(default_factory=list)

    @property
    def blocked(self) -> bool:
        return self.outcome == DENY

    def as_dict(self) -> dict:
        return {"outcome": self.outcome, "reason": self.reason, "required_scope": self.required_scope,
                "granted_scopes": list(self.granted_scopes), "rules": list(self.rules)}


@dataclass
class Approval:
    """A human saying yes to one action, once.

    Bound to the exact payload the agent showed us: change a byte and the approval no
    longer applies; use it twice and the second attempt is refused.
    """
    approval_id: str
    request: ActionRequest
    decided: str | None = None  # approve | reject
    used: bool = False
    expires_at: str = ""

    def matches(self, req: ActionRequest) -> tuple[bool, str]:
        r = self.request
        if (req.ans_name, req.mission_id, req.action, req.resource, req.destination) != \
           (r.ans_name, r.mission_id, r.action, r.resource, r.destination):
            return False, "the approval was for a different action"
        if req.payload_sha256 != r.payload_sha256:
            return False, "the payload changed after it was approved"
        if self.used:
            return False, "that approval was already used"
        if self.expires_at and iso(now()) > self.expires_at:
            return False, "the approval expired"
        return True, ""


def decide(req: ActionRequest, grant: Grant | None, *, approval: Approval | None = None,
           at: dt.datetime | None = None) -> Decision:
    """The whole policy, in order. No model output reaches this function."""
    scope = req.required_scope

    # 1. Hard denies come first, so that no grant, scope or human click can reach past them.
    if req.action in HARD_DENY:
        return Decision(DENY, f"{HARD_DENY[req.action]} is never permitted", scope, rules=["hard-deny"])

    # 2. No grant means no authority, however impeccable the agent's identity.
    if grant is None:
        return Decision(DENY, "no mission grant for this agent", scope, rules=["grant-required"])
    if grant.mission_id != req.mission_id or grant.ans_name != req.ans_name:
        return Decision(DENY, "the grant belongs to a different agent or mission", scope,
                        rules=["grant-mismatch"])
    ok, why = grant.live(at)
    if not ok:
        return Decision(DENY, why, scope, grant.scopes, rules=["grant-expired"])

    # 3. The scope has to cover this exact action and target.
    if not grant.covers(scope):
        where = f" to {req.destination}" if req.action in NETWORK_ACTIONS else ""
        return Decision(DENY, f"not authorized to {req.action} {req.resource}{where}", scope,
                        grant.scopes, rules=["scope-missing"])

    # 4. Scoped, but outward-facing: a human signs off, once, on these exact bytes.
    if req.action in NEEDS_REVIEW:
        if approval is None:
            return Decision(REVIEW, "outward-facing action needs a human decision", scope,
                            grant.scopes, rules=["review-required"])
        if approval.decided != "approve":
            return Decision(DENY, "a human rejected this action", scope, grant.scopes,
                            rules=["review-rejected"])
        matches, why = approval.matches(req)
        if not matches:
            return Decision(DENY, why, scope, grant.scopes, rules=["approval-invalid"])
        return Decision(ALLOW, "authorized once by a human", scope, grant.scopes, rules=["review-approved"])

    return Decision(ALLOW, f"within the mission grant ({scope})", scope, grant.scopes, rules=["scope-match"])


def job_scopes(capability: str) -> list[str]:
    """What a given kind of job may do, from config/agents.yaml.

    The Commander reads this when it hires, and can only ever hand out what is listed here.
    """
    return list((policy().get("job_scopes") or {}).get(capability, []))


def digest(payload) -> str:
    """The fingerprint an approval is bound to."""
    return crypto.sha256_hex(crypto.canonical(payload))
