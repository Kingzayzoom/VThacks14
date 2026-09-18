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

import httpx
from fastapi import HTTPException
from fastapi.responses import HTMLResponse
from pydantic import BaseModel

from mc import config
from mc.agent_base import create_agent_app
from mc.events import emit
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


class Mission:
    def __init__(self, text: str, scenario: dict):
        self.id = "m_" + uuid.uuid4().hex[:8]
        self.text = text
        self.scenario = scenario
        self.status = "planning"
        self.business: dict = {}
        self.jobs: list[dict] = []
        self.hires: list[dict] = []
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

async def discover(m: Mission, capability: str, prefer: str | None = None) -> list[dict]:
    """Candidates come from two places: open offers on the web (unverified) and the ANS registry."""
    cands: list[dict] = []
    try:
        offers = (await client().get(f"{config.hub_url()}/api/offers", params={"capability": capability}, timeout=5)).json()
    except (httpx.HTTPError, ValueError):
        offers = []
    for o in offers:
        cands.append({"ans_name": o["ans_name"], "endpoint": o["endpoint"], "source": "open-web offer",
                      "pitch": o.get("pitch")})

    rank = {d: i for i, d in enumerate(m.policy.preferred_vendors)}
    records = await state.ans.search(capability=capability)
    records.sort(key=lambda r: rank.get(config.parse_ans_name(r["ans_name"])["domain"], 99))
    for r in records:
        cands.append({"ans_name": r["ans_name"], "endpoint": r["endpoint"], "source": "ANS registry"})

    seen, out = set(), []
    for c in cands:
        key = (c["ans_name"], c["endpoint"])
        if key not in seen and key not in m.excluded:
            seen.add(key)
            out.append(c)
    if prefer:
        out.sort(key=lambda c: c["ans_name"] != prefer)
    await say(m, "discovery", f"Found {len(out)} candidate(s) for {capability}", capability=capability,
              candidates=[{k: c[k] for k in ("ans_name", "endpoint", "source")} for c in out])
    return out


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


async def hire(m: Mission, job: dict, prefer: str | None = None) -> tuple[dict, object]:
    capability = job["capability"]
    for cand in await discover(m, capability, prefer):
        res = await state.gate.check_agent(cand["ans_name"], cand["endpoint"], capability, m.policy,
                                           mission_id=m.id, source=cand["source"])
        m.stats["checks_passed"] += res.passed
        if res.verdict == TRUSTED:
            return cand, res
        if res.verdict == NEEDS_APPROVAL and await ask_approval(m, job, cand, res):
            return cand, res
        m.stats["blocked"] += 1
        m.excluded.add((cand["ans_name"], cand["endpoint"]))
        await asyncio.sleep(config.pace() / 2)
    raise MissionFailed(f"No verified agent is available for {capability}")


async def run_job(m: Mission, job: dict, job_input: dict, *, prefer: str | None = None,
                  revoke_during: str | None = None) -> dict:
    job["status"] = "hiring"
    while True:
        cand, trust = await hire(m, job, prefer)
        org = trust.record["org"]
        job.update(status="working", agent=cand["ans_name"], org=org)
        payload = {"job_id": "job_" + uuid.uuid4().hex[:8], "mission_id": m.id, "from": me(),
                   "capability": job["capability"], "input": job_input}
        signature = state.identity.sign_obj(payload)
        await say(m, "job.sent", f"Hired {org} for {job['title'].lower()}", subject=cand["ans_name"], job=job["title"])

        # Demo scenario: revoke this vendor while it's working. We wait for the revocation to land
        # before checking the deliverable, so the scenario plays out the same way every time.
        revoke_task = None
        if revoke_during and "revoke" not in m.fired and \
                config.parse_ans_name(cand["ans_name"])["domain"] == config.agent(revoke_during)["domain"]:
            m.fired.add("revoke")
            revoke_task = asyncio.create_task(_delayed_hub_post(f"/api/chaos/revoke/{revoke_during}", 0.3))

        def drop(reason_event: str):
            m.excluded.add((cand["ans_name"], cand["endpoint"]))
            m.stats["blocked"] += 1
            job.update(status="rehiring", agent=None, org=None)
            return reason_event

        try:
            r = await client().post(f"{cand['endpoint']}/job", json={"payload": payload, "signature": signature},
                                    timeout=240)
        except httpx.HTTPError as exc:
            await say(m, "result.rejected", f"{org} didn't respond ({type(exc).__name__}); finding another agent",
                      subject=cand["ans_name"])
            drop("no response")
            continue
        if r.status_code != 200:
            detail = r.json().get("detail", r.text) if r.headers.get("content-type", "").startswith("application/json") else r.text
            await say(m, "result.rejected", f"{org} refused the job: {detail}", subject=cand["ans_name"])
            drop("refused")
            continue

        result = r.json()
        if revoke_task:
            await revoke_task
        ok, why = verify_result(result, cand["ans_name"], trust.cert_pem)
        if ok:
            status = await state.gate.recheck_status(cand["ans_name"])
            if not status.ok:
                ok, why = False, f"{org} is now {status.detail}. Deliverable discarded."
        if not ok:
            await say(m, "result.rejected", why, subject=cand["ans_name"])
            drop(why)
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

        site = await run_job(m, site_job, {"brand_kit": brand, "business": m.business, "brief": site_job["brief"]},
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
                                              "issues": issues, "previous_html": site["html"]}, prefer=site_job["agent"])
            review = await run_job(m, final_job, {"html": site["html"], "business": m.business}, prefer=review_job["agent"])

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
