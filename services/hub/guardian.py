"""The Guardian gateway: where an agent has to ask before it acts.

This lives in the hub, not in the Commander and not in the agents, because it has to be
able to say no to all of them. The Commander issues grants but cannot widen one after the
fact; an agent can ask but cannot answer; neither can switch the Guardian off.

Every message in and out of here is signed with an ANS identity and checked against ANS
before a single rule is consulted — so an agent revoked halfway through a mission stops
being able to act, not just to get hired.

    POST /api/guardian/grants                  Commander: this agent, this mission, these scopes
    POST /api/guardian/actions                 Agent: may I do this?
    GET  /api/guardian/incidents               everything that has been asked, and the answers
    POST /api/guardian/incidents/{id}/decision human: approve once, or refuse
"""
import asyncio
import datetime as dt
import uuid

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from mc import config, guardian
from mc.ans import get_ans_client
from mc.config import host_of, parse_ans_name
from mc.events import emit
from mc.guardian import ALLOW, DENY, REVIEW, ActionRequest, Approval, Grant
from mc.http import client
from mc.trustgate import TrustGate

router = APIRouter(prefix="/api/guardian", tags=["guardian"])

GATE = TrustGate(get_ans_client(), "guardian.mission-control")

GRANTS: dict[str, Grant] = {}
INCIDENTS: list[dict] = []
APPROVALS: dict[str, Approval] = {}
WAITERS: dict[str, asyncio.Event] = {}

# How long a human gets to answer before the agent stops waiting. Refusing to decide is
# not the same as approving, so the action is denied when this runs out.
REVIEW_TIMEOUT = 180.0


def _policy() -> dict:
    return config.policy()


def _grant_ttl() -> int:
    return int(_policy().get("grant_ttl_seconds", 900))


def _outbound_allowlist() -> list[str]:
    """The only hosts the Guardian will reach on an agent's behalf, whatever a scope says."""
    return list(_policy().get("outbound_allowlist", []))


def _commander_host() -> str:
    return host_of({**config.agent("commander")})


def _find_grant(mission_id: str, ans_name: str, job_id: str = "") -> Grant | None:
    """A grant is issued per job, so prefer the one for this job before anything broader."""
    live = [g for g in GRANTS.values()
            if g.mission_id == mission_id and g.ans_name == ans_name and g.status == "active"]
    return next((g for g in live if job_id and g.job_id == job_id), live[-1] if live else None)


def _org(ans_name: str) -> str:
    parsed = parse_ans_name(ans_name or "")
    if not parsed:
        return ans_name or "unknown"
    for cfg in config.agents().values():
        if cfg.get("domain") == parsed["domain"]:
            return cfg["org"]
    return parsed["domain"]


class SignedBody(BaseModel):
    payload: dict
    signature: str


async def _verify(payload: dict, signature: str, *, label: str) -> str:
    """Returns the verified ANS name of the sender, or raises 403."""
    sender = payload.get("from") or ""
    res = await GATE.verify_signed(sender, payload, signature, label=label)
    if not res.trusted:
        raise HTTPException(403, f"Guardian refused: {res.reason}")
    return sender


# --- grants ---------------------------------------------------------------------------

@router.post("/grants")
async def issue_grant(body: SignedBody):
    """Only the Commander can hand out authority, and only for one mission at a time."""
    sender = await _verify(body.payload, body.signature, label="grant")
    parsed = parse_ans_name(sender)
    if not parsed or parsed["host"] != _commander_host():
        raise HTTPException(403, "Only the Commander may issue grants")

    p = body.payload
    issued = guardian.now()
    ttl = min(int(p.get("ttl_seconds") or _grant_ttl()), _grant_ttl())
    grant = Grant(
        grant_id="gr_" + uuid.uuid4().hex[:8], ans_name=p["agent"], mission_id=p["mission_id"],
        job_id=p.get("job_id", ""), scopes=list(p.get("scopes", [])), issued_at=guardian.iso(issued),
        expires_at=guardian.iso(issued + dt.timedelta(seconds=ttl)),
    )
    GRANTS[grant.grant_id] = grant
    await emit("agent.granted",
               f"{_org(grant.ans_name)} granted {len(grant.scopes)} scope(s) for this mission",
               actor=sender, subject=grant.ans_name, mission_id=grant.mission_id,
               grant_id=grant.grant_id, scopes=grant.scopes, expires_at=grant.expires_at)
    return grant.as_dict()


@router.get("/grants")
def list_grants(mission_id: str | None = None):
    return [g.as_dict() for g in GRANTS.values() if not mission_id or g.mission_id == mission_id]


@router.post("/grants/{grant_id}/revoke")
async def revoke_grant(grant_id: str):
    grant = GRANTS.get(grant_id)
    if not grant:
        raise HTTPException(404, "No such grant")
    grant.status = "revoked"
    await emit("agent.grant_revoked", f"{_org(grant.ans_name)}'s mission access was withdrawn",
               subject=grant.ans_name, mission_id=grant.mission_id, grant_id=grant_id)
    return grant.as_dict()


# --- actions ----------------------------------------------------------------------------

def _incident(req: ActionRequest, decision, *, state: str, grant: Grant | None) -> dict:
    inc = {
        "id": "inc_" + uuid.uuid4().hex[:8], "at": guardian.iso(guardian.now()),
        "state": state, "org": _org(req.ans_name), **req.as_dict(),
        "decision": decision.as_dict(),
        "grant": grant.as_dict() if grant else None,
        "result": None,
    }
    INCIDENTS.append(inc)
    return inc


async def _perform(req: ActionRequest) -> dict:
    """Network actions go out through the Guardian or not at all.

    The agent never gets to make the call itself, so a denied request is denied in the
    only sense that counts: nothing left the building. The allowlist is checked again
    here, because a scope is a claim about intent and this is the socket.
    """
    if req.action not in guardian.NETWORK_ACTIONS:
        return {"performed": False, "detail": "no outbound call needed"}
    host = (req.destination or "").split("/")[0]
    if host not in _outbound_allowlist():
        return {"performed": False, "detail": f"{host} is not on the outbound allowlist"}
    url = req.url or f"https://{host}"
    # The scope was granted for a host, so that is the host we go to. An agent does not get
    # to name an allowed destination and hand over a URL pointing somewhere else.
    if httpx.URL(url).host != host:
        return {"performed": False, "detail": f"the URL is not on {host}"}
    try:
        r = await client().get(url, timeout=8)
        return {"performed": True, "detail": f"GET {host} → {r.status_code} ({len(r.content)} bytes)"}
    except httpx.HTTPError as exc:
        return {"performed": False, "detail": f"{type(exc).__name__} reaching {host}"}


@router.post("/actions")
async def request_action(body: SignedBody):
    sender = await _verify(body.payload, body.signature, label="action request")
    req = ActionRequest.from_payload({**body.payload, "from": sender})

    grant = _find_grant(req.mission_id, req.ans_name, req.job_id)
    decision = guardian.decide(req, grant)
    await emit("action.requested", f"{_org(req.ans_name)} wants to {req.action} {req.resource}"
                                   + (f" → {req.destination}" if req.destination else ""),
               actor=req.ans_name, mission_id=req.mission_id, action=req.action, resource=req.resource,
               destination=req.destination, purpose=req.purpose, payload_sha256=req.payload_sha256)
    await emit("policy.evaluated", f"Policy says {decision.outcome.upper()}: {decision.reason}",
               actor="guardian", subject=req.ans_name, mission_id=req.mission_id, **decision.as_dict())

    if decision.outcome == REVIEW:
        decision = await _await_human(req, decision)

    if decision.outcome == DENY:
        inc = _incident(req, decision, state="DENIED", grant=grant)
        await emit("action.blocked", f"Guardian blocked {_org(req.ans_name)}: {decision.reason}",
                   actor="guardian", subject=req.ans_name, mission_id=req.mission_id,
                   incident_id=inc["id"], action=req.action, resource=req.resource,
                   destination=req.destination, reason=decision.reason, rules=decision.rules)
        raise HTTPException(403, decision.reason)

    inc = _incident(req, decision, state="ALLOWED", grant=grant)
    result = await _perform(req)
    inc["result"] = result
    await emit("action.completed", f"Guardian allowed {_org(req.ans_name)} to {req.action} {req.resource}",
               actor="guardian", subject=req.ans_name, mission_id=req.mission_id, incident_id=inc["id"],
               action=req.action, resource=req.resource, reason=decision.reason, **result)
    return {"outcome": ALLOW, "incident_id": inc["id"], "reason": decision.reason, **result}


async def _await_human(req: ActionRequest, decision) -> object:
    """Hold the action while a person looks at it. Silence is a no."""
    approval = Approval(
        approval_id="ap_" + uuid.uuid4().hex[:8], request=req,
        expires_at=guardian.iso(guardian.now() + dt.timedelta(seconds=REVIEW_TIMEOUT)),
    )
    APPROVALS[approval.approval_id] = approval
    waiter = WAITERS[approval.approval_id] = asyncio.Event()
    inc = _incident(req, decision, state="NEEDS REVIEW", grant=_find_grant(req.mission_id, req.ans_name, req.job_id))
    inc["approval_id"] = approval.approval_id
    await emit("approval.requested",
               f"{_org(req.ans_name)} is asking to {req.action} {req.resource}. Your call.",
               actor="guardian", subject=req.ans_name, mission_id=req.mission_id,
               incident_id=inc["id"], approval_id=approval.approval_id, action=req.action,
               resource=req.resource, destination=req.destination, purpose=req.purpose,
               payload_sha256=req.payload_sha256, expires_at=approval.expires_at)
    try:
        await asyncio.wait_for(waiter.wait(), timeout=REVIEW_TIMEOUT)
    except asyncio.TimeoutError:
        approval.decided = "reject"
        await emit("approval.decided", "Nobody answered in time, so the Guardian said no",
                   actor="guardian", subject=req.ans_name, mission_id=req.mission_id,
                   approval_id=approval.approval_id, decision="timeout")
    finally:
        WAITERS.pop(approval.approval_id, None)

    grant = _find_grant(req.mission_id, req.ans_name, req.job_id)
    final = guardian.decide(req, grant, approval=approval)
    approval.used = True  # one decision, one action
    inc["state"] = "ALLOWED" if final.outcome == ALLOW else "DENIED"
    inc["decision"] = final.as_dict()
    return final


# --- the human side -------------------------------------------------------------------

class DecisionBody(BaseModel):
    decision: str  # approve | reject


@router.get("/incidents")
def incidents(mission_id: str | None = None, limit: int = 50):
    rows = [i for i in INCIDENTS if not mission_id or i["mission_id"] == mission_id]
    return rows[-limit:]


@router.post("/incidents/{incident_id}/decision")
async def decide_incident(incident_id: str, body: DecisionBody):
    if body.decision not in ("approve", "reject"):
        raise HTTPException(400, "decision must be approve or reject")
    inc = next((i for i in INCIDENTS if i["id"] == incident_id), None)
    if not inc or not inc.get("approval_id"):
        raise HTTPException(404, "Nothing is waiting for a decision there")
    approval = APPROVALS.get(inc["approval_id"])
    waiter = WAITERS.get(inc["approval_id"])
    if not approval or approval.decided or not waiter:
        raise HTTPException(409, "That decision has already been made")
    approval.decided = body.decision
    await emit("approval.decided",
               f"Owner {'authorized' if body.decision == 'approve' else 'refused'} "
               f"{_org(approval.request.ans_name)} to {approval.request.action} {approval.request.resource}",
               actor="owner", subject=approval.request.ans_name, mission_id=approval.request.mission_id,
               incident_id=incident_id, decision=body.decision,
               payload_sha256=approval.request.payload_sha256)
    waiter.set()
    return {"ok": True}


@router.post("/reset")
async def reset():
    for waiter in list(WAITERS.values()):
        waiter.set()
    GRANTS.clear()
    INCIDENTS.clear()
    APPROVALS.clear()
    WAITERS.clear()
    return {"ok": True}
