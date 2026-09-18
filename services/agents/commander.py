"""The Commander: plans a mission, finds agents, verifies them through ANS, hires them,
checks every signed deliverable, and assembles the result.

Demo scenarios (flags sent with a mission) trigger chaos at exactly the right moment:
  impostor  — before the brand job, an impostor offers to do it
  revoke    — while WebForge builds the site, WebForge is revoked in ANS
  upgrade   — before the review, LegalCheck ships a new version without notice
"""
import asyncio
import datetime as dt
import traceback
import uuid
from dataclasses import dataclass, field

import httpx
from fastapi import HTTPException
from fastapi.responses import HTMLResponse
from pydantic import BaseModel

from mc import config
from mc.agent_base import create_agent_app
from mc.events import emit
from mc.guardian import job_scopes
from mc.http import client
from mc.skills import plan_mission
from mc.trustgate import NEEDS_APPROVAL, TRUSTED, Policy, verify_result

app, state = create_agent_app("commander")

MISSIONS: dict[str, "Mission"] = {}
CURRENT: dict[str, str | None] = {"id": None}


def now() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")


def me() -> str:
    return state.identity.ans_name


class MissionFailed(Exception):
    pass


@dataclass
class Recruitment:
    """One round of "we need someone for this, who is out there?".

    Created the moment the Commander finds it has nobody for a capability, and kept for the
    life of the mission — including the candidates that were turned away, because who we
    refused is as much a part of the record as who we hired.
    """
    mission_id: str
    job_title: str
    capability: str
    requested_scopes: list[str] = field(default_factory=list)
    id: str = field(default_factory=lambda: "rec_" + uuid.uuid4().hex[:8])
    status: str = "discovering"  # discovering | evaluating | awaiting_approval | admitted | rejected | failed
    candidates: list[dict] = field(default_factory=list)
    rejected: list[dict] = field(default_factory=list)
    selected: str | None = None
    replacing: dict | None = None  # set when we are backfilling an agent we lost mid-mission
    granted_scopes: list[str] = field(default_factory=list)
    started_at: str = field(default_factory=lambda: now())
    finished_at: str | None = None

    def public(self) -> dict:
        return {
            "id": self.id, "mission_id": self.mission_id, "job_title": self.job_title,
            "capability": self.capability, "status": self.status, "candidates": self.candidates,
            "selected": self.selected, "replacing": self.replacing, "rejected": self.rejected,
            "requested_scopes": self.requested_scopes, "granted_scopes": self.granted_scopes,
            "started_at": self.started_at, "finished_at": self.finished_at,
        }


def roster_match(roster: dict, capability: str, excluded: set) -> dict | None:
    """Is anyone already working on this mission able to do this job?

    Deterministic and boring on purpose: first hired wins, and anyone we have dropped is
    not a candidate no matter what their card says.
    """
    for entry in roster.values():
        if capability in entry["capabilities"] and (entry["ans_name"], entry["endpoint"]) not in excluded:
            return entry
    return None


class Mission:
    def __init__(self, text: str, scenario: dict):
        self.id = "m_" + uuid.uuid4().hex[:8]
        self.text = text
        self.scenario = scenario
        self.status = "planning"
        self.business: dict = {}
        self.jobs: list[dict] = []
        self.hires: list[dict] = []
        self.recruitments: list[Recruitment] = []
        # Who is already working on this mission, by ANS name. Being on it gets you the next
        # job of the same kind; it does not carry any authority — that is granted per job.
        self.roster: dict[str, dict] = {}
        # Agents we had and lost, by capability — so backfilling one reads as a replacement
        # rather than as never having had anyone.
        self.lost: dict[str, dict] = {}
        self.excluded: set[tuple[str, str]] = set()
        self.policy = Policy.from_config(config.policy())
        self.approval: dict | None = None
        self.approval_event = asyncio.Event()
        self.decision: str | None = None
        self.fired: set[str] = set()
        self.result_html: str | None = None
        self.review: dict | None = None
        self.stats = {"checks_passed": 0, "blocked": 0, "signed": 0}
        self.engines: set[str] = set()
        self.error: str | None = None
        self.started_at = now()
        self.finished_at: str | None = None
        self.task: asyncio.Task | None = None

    def public(self) -> dict:
        return {
            "id": self.id, "text": self.text, "scenario": self.scenario, "status": self.status,
            "business": self.business, "jobs": self.jobs, "hires": self.hires, "approval": self.approval,
            "recruitments": [r.public() for r in self.recruitments],
            "roster": [{"ans_name": e["ans_name"], "org": e["org"], "version": e["version"],
                        "capabilities": e["capabilities"]} for e in self.roster.values()],
            "stats": self.stats, "review": self.review, "error": self.error, "has_result": bool(self.result_html),
            "engines": sorted(e for e in self.engines if e), "started_at": self.started_at,
            "finished_at": self.finished_at,
        }


async def say(m: Mission, type: str, message: str, **data):
    await emit(type, message, actor=me(), mission_id=m.id, **data)


async def hub_post(path: str):
    try:
        r = await client().post(f"{config.hub_url()}{path}", timeout=30)
        return r.json() if r.status_code == 200 else None
    except httpx.HTTPError:
        return None


async def _delayed_hub_post(path: str, delay: float):
    await asyncio.sleep(delay)
    await hub_post(path)


# --- finding and hiring -----------------------------------------------------------------

async def discover(m: Mission, rec: Recruitment) -> list[dict]:
    """Candidates come from two places: open offers on the web, and the ANS registry.

    Anyone can post an offer — that is the point of having them, and it is how the impostor
    gets in front of us. Nothing here is trusted; this only decides who we bother to check.
    """
    await say(m, "discovery.started", f"Searching for an agent that can {rec.capability}",
              capability=rec.capability, recruitment_id=rec.id,
              sources=["ANS registry", "open-web offers"])

    cands: list[dict] = []
    try:
        offers = (await client().get(f"{config.hub_url()}/api/offers",
                                     params={"capability": rec.capability}, timeout=5)).json()
    except (httpx.HTTPError, ValueError):
        offers = []
    for o in offers:
        cands.append({"ans_name": o["ans_name"], "endpoint": o["endpoint"], "source": "open-web offer",
                      "org": o.get("org"), "pitch": o.get("pitch"), "capabilities": [rec.capability]})

    rank = {d: i for i, d in enumerate(m.policy.preferred_vendors)}
    records = await state.ans.search(capability=rec.capability)
    records.sort(key=lambda r: rank.get(config.parse_ans_name(r["ans_name"])["domain"], 99))
    for r in records:
        cands.append({"ans_name": r["ans_name"], "endpoint": r["endpoint"], "source": "ANS registry",
                      "org": r.get("org"), "version": r.get("version"),
                      "capabilities": r.get("capabilities", []), "pitch": None})

    seen, out = set(), []
    for c in cands:
        key = (c["ans_name"], c["endpoint"])
        if key not in seen and key not in m.excluded:
            seen.add(key)
            out.append(c)

    for c in out:
        rec.candidates.append(dict(c))
        await say(m, "discovery.candidate_found",
                  f"{c.get('org') or c['ans_name']} offers {rec.capability}"
                  + (f" — \"{c['pitch']}\"" if c.get("pitch") else ""),
                  subject=c["ans_name"], recruitment_id=rec.id, capability=rec.capability, **c)
        await asyncio.sleep(config.pace() / 4)

    await say(m, "discovery.completed", f"Found {len(out)} candidate(s) for {rec.capability}",
              capability=rec.capability, recruitment_id=rec.id, count=len(out))
    return out


async def reverify(entry: dict) -> tuple[bool, str]:
    """A quick re-check before handing someone we already hired another job.

    Only two things can have changed since we admitted them: their standing in ANS, and their
    version. So those are the two we look at. A new version is a different agent — different
    card, different capabilities, different policy standing — so it goes back through the full
    gate instead of inheriting the old admission.
    """
    record = await state.ans.resolve(entry["ans_name"])
    if not record:
        return False, "no longer registered in ANS"
    if record.get("version") != entry["version"]:
        return False, f"now running v{record.get('version')} (we verified v{entry['version']})"
    check = await state.gate.recheck_status(entry["ans_name"])
    if not check.ok:
        return False, check.detail
    # Keep the certificate fresh: it is what we check their signed deliverables against.
    entry["trust"].record = record
    entry["trust"].cert_pem = record.get("identity_cert_pem") or entry["trust"].cert_pem
    return True, check.detail


async def ask_approval(m: Mission, job: dict, cand: dict, res) -> bool:
    v = config.parse_ans_name(cand["ans_name"])
    pin = m.policy.version_pins.get(v["host"], "?")
    m.status = "paused"
    m.decision = None
    m.approval_event.clear()
    m.approval = {"job": job["title"], "ans_name": cand["ans_name"], "org": res.record["org"],
                  "version": v["version"], "approved_version": f"{pin}.x", "reason": res.reason}
    await say(m, "approval.required",
              f"{res.record['org']} is now running v{v['version']}; our policy approves {pin}.x. Continue with the new version?",
              subject=cand["ans_name"], **m.approval)
    await m.approval_event.wait()
    approved = m.decision == "approve"
    m.approval = None
    m.status = "working"
    await say(m, "approval.decided",
              f"Owner {'approved' if approved else 'rejected'} {res.record['org']} v{v['version']}",
              subject=cand["ans_name"], decision=m.decision)
    if approved:
        m.policy.version_pins[v["host"]] = f"{v['major']}.{v['minor']}"
    return approved


async def hire(m: Mission, job: dict) -> tuple[dict, object]:
    """Someone we already have, or someone we go and find."""
    capability = job["capability"]

    known = roster_match(m.roster, capability, m.excluded)
    if known:
        ok, detail = await reverify(known)
        if ok:
            m.stats["checks_passed"] += 1
            await say(m, "capability.covered",
                      f"{known['org']} is already on this mission and still in good standing",
                      subject=known["ans_name"], capability=capability, job=job["title"],
                      ans_name=known["ans_name"], org=known["org"], detail=detail)
            return {"ans_name": known["ans_name"], "endpoint": known["endpoint"],
                    "source": "mission roster", "org": known["org"]}, known["trust"]
        # They were fine when we hired them and they are not fine now. Off the roster.
        m.roster.pop(known["ans_name"], None)
        m.excluded.add((known["ans_name"], known["endpoint"]))
        m.lost[capability] = {"ans_name": known["ans_name"], "org": known["org"], "reason": detail}
        m.stats["blocked"] += 1
        await say(m, "agent.unavailable", f"{known['org']} can no longer take this job: {detail}",
                  subject=known["ans_name"], ans_name=known["ans_name"], org=known["org"], reason=detail)

    return await recruit(m, job)


async def recruit(m: Mission, job: dict) -> tuple[dict, object]:
    """Nobody we have can do this. Say so out loud, then go looking."""
    capability = job["capability"]
    lost = m.lost.pop(capability, None)
    rec = Recruitment(mission_id=m.id, job_title=job["title"], capability=capability,
                      requested_scopes=job_scopes(capability), replacing=lost)
    m.recruitments.append(rec)
    job["recruitment_id"] = rec.id

    roster = [{"ans_name": e["ans_name"], "org": e["org"], "capabilities": e["capabilities"]}
              for e in m.roster.values()]
    if lost:
        await say(m, "recruitment.replacement_requested",
                  f"{lost['org']} is out and the {job['title'].lower()} still needs doing. Finding a replacement.",
                  subject=lost["ans_name"], capability=capability, job=job["title"], recruitment_id=rec.id,
                  requested_scopes=rec.requested_scopes, replacing=lost, roster=roster)
    else:
        await say(m, "capability.missing",
                  f"Nobody on this mission can {capability}. Looking for an agent that can.",
                  capability=capability, job=job["title"], recruitment_id=rec.id,
                  requested_scopes=rec.requested_scopes, roster=roster)
    await asyncio.sleep(config.pace() / 2)

    candidates = await discover(m, rec)
    if not candidates:
        rec.status, rec.finished_at = "failed", now()
        await say(m, "discovery.failed", f"No agent anywhere offers {capability}",
                  capability=capability, recruitment_id=rec.id)
        raise MissionFailed(f"No verified agent is available for {capability}")

    rec.status = "evaluating"
    for cand in candidates:
        res = await state.gate.check_agent(cand["ans_name"], cand["endpoint"], capability, m.policy,
                                           mission_id=m.id, source=cand["source"])
        m.stats["checks_passed"] += res.passed

        admitted = res.verdict == TRUSTED
        if not admitted and res.verdict == NEEDS_APPROVAL:
            rec.status = "awaiting_approval"
            admitted = await ask_approval(m, job, cand, res)
            rec.status = "evaluating"

        if admitted:
            org = res.record["org"]
            rec.selected, rec.status, rec.finished_at = cand["ans_name"], "admitted", now()
            # The Guardian issues exactly these when the job goes out; /api/guardian/grants is
            # the authority on what was actually granted.
            rec.granted_scopes = list(rec.requested_scopes)
            m.roster[cand["ans_name"]] = {
                "ans_name": cand["ans_name"], "endpoint": cand["endpoint"], "org": org,
                "version": res.record.get("version"), "capabilities": res.record.get("capabilities", []),
                "trust": res, "hired_at": now(),
            }
            await say(m, "agent.admitted", f"{org} passed the Trust Gate and joins the mission",
                      subject=cand["ans_name"], recruitment_id=rec.id, capability=capability,
                      ans_name=cand["ans_name"], org=org, granted_scopes=rec.granted_scopes,
                      source=cand["source"])
            return cand, res

        failed = next((c for c in res.checks if c.ok is False), None)
        rec.rejected.append({"ans_name": cand["ans_name"], "org": cand.get("org"),
                             "failed_check": failed.name if failed else None,
                             "reason": failed.detail if failed else "rejected"})
        await say(m, "agent.rejected", f"{cand.get('org') or cand['ans_name']} was turned away: {res.reason}",
                  subject=cand["ans_name"], recruitment_id=rec.id, ans_name=cand["ans_name"],
                  org=cand.get("org"), failed_check=failed.name if failed else None, reason=res.reason,
                  source=cand["source"])
        m.stats["blocked"] += 1
        m.excluded.add((cand["ans_name"], cand["endpoint"]))
        await asyncio.sleep(config.pace() / 2)

    rec.status, rec.finished_at = "rejected", now()
    raise MissionFailed(f"No verified agent is available for {capability}")


async def issue_grant(m: Mission, ans_name: str, job_id: str, capability: str) -> list[str]:
    """Hire, then authorize — separately, and narrowly.

    Passing the Trust Gate says who this agent is. It says nothing about what it may touch,
    so the Commander asks the Guardian to record a grant covering this job and no more. The
    request is signed: the Guardian takes orders from the Commander's ANS identity, not from
    anything that can reach its port.
    """
    scopes = job_scopes(capability)
    payload = {"from": me(), "mission_id": m.id, "job_id": job_id, "agent": ans_name,
               "scopes": scopes, "capability": capability}
    try:
        r = await client().post(f"{config.hub_url()}/api/guardian/grants",
                                json={"payload": payload, "signature": state.identity.sign_obj(payload)},
                                timeout=15)
        if r.status_code != 200:
            raise MissionFailed(f"The Guardian refused to authorize {ans_name}: {r.text[:200]}")
    except httpx.HTTPError as exc:
        raise MissionFailed(f"The Guardian is unreachable ({type(exc).__name__}); nobody works unauthorized")
    return scopes


async def run_job(m: Mission, job: dict, job_input: dict, *, revoke_during: str | None = None) -> dict:
    job["status"] = "hiring"
    while True:
        cand, trust = await hire(m, job)
        org = trust.record["org"]
        job.update(status="working", agent=cand["ans_name"], org=org)
        job_id = "job_" + uuid.uuid4().hex[:8]
        scopes = await issue_grant(m, cand["ans_name"], job_id, job["capability"])
        job["scopes"] = scopes
        payload = {"job_id": job_id, "mission_id": m.id, "from": me(),
                   "capability": job["capability"], "input": job_input, "allowed_scopes": scopes}
        signature = state.identity.sign_obj(payload)
        await say(m, "job.sent", f"Hired {org} for {job['title'].lower()}", subject=cand["ans_name"], job=job["title"])

        # Demo scenario: revoke this vendor while it's working. We wait for the revocation to land
        # before checking the deliverable, so the scenario plays out the same way every time.
        revoke_task = None
        if revoke_during and "revoke" not in m.fired and \
                config.parse_ans_name(cand["ans_name"])["domain"] == config.agent(revoke_during)["domain"]:
            m.fired.add("revoke")
            revoke_task = asyncio.create_task(_delayed_hub_post(f"/api/chaos/revoke/{revoke_during}", 0.3))

        async def drop(reason: str):
            """Take an agent off this mission. Says so out loud, so the board can grey them out."""
            m.excluded.add((cand["ans_name"], cand["endpoint"]))
            if m.roster.pop(cand["ans_name"], None):
                m.lost[job["capability"]] = {"ans_name": cand["ans_name"], "org": org, "reason": reason}
            m.stats["blocked"] += 1
            job.update(status="rehiring", agent=None, org=None)
            await say(m, "agent.unavailable", f"{org} is off the {job['title'].lower()}: {reason}",
                      subject=cand["ans_name"], ans_name=cand["ans_name"], org=org,
                      capability=job["capability"], reason=reason)

        try:
            r = await client().post(f"{cand['endpoint']}/job", json={"payload": payload, "signature": signature},
                                    timeout=240)
        except httpx.HTTPError as exc:
            await say(m, "result.rejected", f"{org} didn't respond ({type(exc).__name__}); finding another agent",
                      subject=cand["ans_name"])
            await drop("no response")
            continue
        if r.status_code != 200:
            detail = r.json().get("detail", r.text) if r.headers.get("content-type", "").startswith("application/json") else r.text
            await say(m, "result.rejected", f"{org} refused the job: {detail}", subject=cand["ans_name"])
            await drop("refused")
            continue

        result = r.json()
        if revoke_task:
            await revoke_task
        ok, why = verify_result(result, cand["ans_name"], trust.cert_pem,
                                job_id=job_id, mission_id=m.id)
        if ok:
            status = await state.gate.recheck_status(cand["ans_name"])
            if not status.ok:
                ok, why = False, f"{org} is now {status.detail}. Deliverable discarded."
        if not ok:
            await say(m, "result.rejected", why, subject=cand["ans_name"])
            await drop(why)
            continue

        out = result["payload"]
        m.stats["signed"] += 1
        m.engines.add(out.get("engine"))
        m.hires.append({
            "job": job["title"], "capability": job["capability"], "ans_name": cand["ans_name"], "org": org,
            "endpoint": cand["endpoint"], "checks": [c.as_dict() for c in trust.checks],
            "owner_approved": trust.verdict == NEEDS_APPROVAL,
            "log_index": trust.log_index, "fingerprint": result.get("cert_fingerprint"),
            "output_sha256": out["output_sha256"], "signed_at": out["signed_at"], "engine": out.get("engine"),
        })
        await say(m, "result.verified", f"Verified {org}'s signed {job['title'].lower()}", subject=cand["ans_name"],
                  sha256=out["output_sha256"][:16])
        job["status"] = "done"
        return out["output"]


# --- the mission -------------------------------------------------------------------------

def _job(title: str, capability: str, brief: str = "") -> dict:
    return {"title": title, "capability": capability, "brief": brief, "status": "pending", "agent": None, "org": None}


async def run(m: Mission):
    try:
        await say(m, "mission.started", f"Mission received: {m.text}")
        plan, engine = await plan_mission(m.text, actor=me(), mission_id=m.id)
        m.engines.add(engine)
        m.business = plan["business"]
        m.jobs = [_job(j["title"], j["capability"], j["brief"]) for j in plan["jobs"]]
        await say(m, "mission.planned", f"Planned {len(m.jobs)} jobs for {m.business['name']}", engine=engine,
                  jobs=[{"title": j["title"], "capability": j["capability"]} for j in m.jobs])
        m.status = "working"
        await asyncio.sleep(config.pace())

        brand_job, site_job, review_job = m.jobs

        if m.scenario.get("impostor"):
            await hub_post("/api/chaos/impostor")
            await asyncio.sleep(config.pace() / 2)
        brand = await run_job(m, brand_job, {"mission": m.text, "business": m.business, "brief": brand_job["brief"]})

        site = await run_job(m, site_job, {"brand_kit": brand, "business": m.business, "brief": site_job["brief"],
                                           "attempt_exfil": bool(m.scenario.get("exfil")),
                                           "attempt_publish": bool(m.scenario.get("publish"))},
                             revoke_during="webforge" if m.scenario.get("revoke") else None)

        if m.scenario.get("upgrade"):
            await hub_post("/api/chaos/upgrade/compliance")
            await asyncio.sleep(config.pace())
        review = await run_job(m, review_job, {"html": site["html"], "business": m.business})

        if not review.get("approved") and review.get("issues"):
            m.status = "reviewing"
            issues = review["issues"]
            await say(m, "mission.revision",
                      f"Compliance flagged {len(issues)} issue(s). Sending the site back for fixes.", issues=issues)
            fix_job = _job("Fix review issues", "site.generate")
            final_job = _job("Final review", "compliance.review")
            m.jobs += [fix_job, final_job]
            site = await run_job(m, fix_job, {"brand_kit": brand, "business": m.business, "brief": site_job["brief"],
                                              "issues": issues, "previous_html": site["html"]})
            review = await run_job(m, final_job, {"html": site["html"], "business": m.business})

        m.result_html = site["html"]
        m.review = review
        m.status = "delivered"
        m.finished_at = now()
        orgs = sorted({h["org"] for h in m.hires})
        await say(m, "mission.delivered",
                  f"Delivered the {m.business['name']} landing page, built by {len(orgs)} verified agents",
                  stats=m.stats, orgs=orgs)
    except MissionFailed as exc:
        m.status, m.error, m.finished_at = "failed", str(exc), now()
        await say(m, "mission.failed", str(exc))
    except asyncio.CancelledError:
        m.status, m.finished_at = "cancelled", now()
        raise
    except Exception as exc:  # noqa: BLE001
        traceback.print_exc()
        m.status, m.error, m.finished_at = "failed", f"{type(exc).__name__}: {exc}", now()
        await say(m, "mission.failed", f"Mission crashed: {m.error}")


# --- API -------------------------------------------------------------------------------

class MissionBody(BaseModel):
    text: str
    scenario: dict = {}


class DecisionBody(BaseModel):
    decision: str  # "approve" | "reject"


def _current() -> Mission | None:
    return MISSIONS.get(CURRENT["id"] or "")


@app.post("/missions")
async def start_mission(body: MissionBody):
    cur = _current()
    if cur and cur.status in ("planning", "working", "paused", "reviewing"):
        raise HTTPException(409, "A mission is already running")
    if not body.text.strip():
        raise HTTPException(400, "Describe the mission first")
    m = Mission(body.text.strip(), body.scenario)
    MISSIONS[m.id] = m
    CURRENT["id"] = m.id
    m.task = asyncio.create_task(run(m))
    return m.public()


@app.get("/missions/current")
def current_mission():
    m = _current()
    return {"mission": m.public() if m else None}


@app.get("/missions/{mission_id}")
def get_mission(mission_id: str):
    m = MISSIONS.get(mission_id)
    if not m:
        raise HTTPException(404, "No such mission")
    return m.public()


@app.get("/missions/{mission_id}/result", response_class=HTMLResponse)
def mission_result(mission_id: str):
    m = MISSIONS.get(mission_id)
    if not m or not m.result_html:
        raise HTTPException(404, "No result yet")
    return m.result_html


@app.post("/missions/{mission_id}/decision")
def decide(mission_id: str, body: DecisionBody):
    m = MISSIONS.get(mission_id)
    if not m or not m.approval:
        raise HTTPException(409, "Nothing is waiting for approval")
    if body.decision not in ("approve", "reject"):
        raise HTTPException(400, "decision must be approve or reject")
    m.decision = body.decision
    m.approval_event.set()
    return {"ok": True}


@app.post("/admin/missions/reset")
def reset_missions():
    m = _current()
    if m and m.task and not m.task.done():
        m.task.cancel()
    CURRENT["id"] = None
    return {"ok": True}
