"""The hub: collects events from every agent and streams them to the dashboard,
hosts the open offers board, exposes demo controls, and serves the dashboard itself."""
import asyncio
from collections import deque

import httpx
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles

from mc import config, crypto, merkle
from mc.ans import AnsError, get_ans_client
from mc.events import emit
from mc.http import client
from mc.llm import mode as llm_mode

from . import integrations
from .guardian import reset as guardian_reset
from .guardian import router as guardian_router

app = FastAPI(title="Mission Control hub")
app.include_router(guardian_router)
ans = get_ans_client()

EVENTS: deque = deque(maxlen=1500)
CLIENTS: set[WebSocket] = set()
OFFERS: list[dict] = []
COMMANDER = config.agent_endpoint(config.agent("commander"))


async def _call(method: str, url: str, timeout: float = 30, **kwargs):
    try:
        r = await client().request(method, url, timeout=timeout, **kwargs)
    except httpx.HTTPError as exc:
        raise HTTPException(502, f"Couldn't reach {url}: {type(exc).__name__}")
    if r.status_code >= 400:
        try:
            detail = r.json().get("detail", r.text)
        except ValueError:
            detail = r.text
        raise HTTPException(r.status_code, detail)
    return r.json() if "json" in r.headers.get("content-type", "") else r.text


# --- events --------------------------------------------------------------------------

@app.post("/events")
async def ingest(event: dict):
    EVENTS.append(event)
    integrations.observe(event)
    asyncio.create_task(_broadcast({"kind": "event", "event": event}))
    return {"ok": True}


async def _send(ws: WebSocket, message: dict):
    try:
        await asyncio.wait_for(ws.send_json(message), timeout=2)
    except Exception:  # noqa: BLE001 — a slow or closed tab must never stall the hub
        CLIENTS.discard(ws)


async def _broadcast(message: dict):
    await asyncio.gather(*[_send(ws, message) for ws in list(CLIENTS)])


@app.websocket("/ws")
async def ws_endpoint(ws: WebSocket):
    await ws.accept()
    CLIENTS.add(ws)
    await ws.send_json({"kind": "history", "events": list(EVENTS)})
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        CLIENTS.discard(ws)


# --- open offers board (unverified claims from anywhere on the web) ---------------------

@app.get("/api/offers")
def list_offers(capability: str | None = None):
    return [o for o in OFFERS if not capability or o["capability"] == capability]


@app.post("/api/offers")
def post_offer(offer: dict):
    OFFERS.append(offer)
    return {"ok": True}


# --- state for the dashboard -------------------------------------------------------------

def _cert_info(pem: str | None) -> dict:
    if not pem:
        return {}
    cert = crypto.load_cert(pem)
    return {"fingerprint": crypto.cert_fingerprint(cert), "cert_expires": cert.not_valid_after_utc.isoformat()}


async def _agent_info(key: str, cfg: dict) -> dict:
    cfg = {**cfg, "key": key}
    endpoint = config.agent_endpoint(cfg)
    info = {"key": key, "name": cfg["name"], "org": cfg["org"], "role": cfg["role"], "endpoint": endpoint,
            "domain": cfg.get("domain"), "online": False}
    try:
        if cfg["role"] == "impostor":
            health = (await client().get(f"{endpoint}/health", timeout=3)).json()
            info.update(online=True, claiming=health.get("claiming"))
            return info
        card = (await client().get(f"{endpoint}/card", timeout=3)).json()
    except (httpx.HTTPError, ValueError):
        return info
    info.update(online=True, ans_name=card["ans_name"], version=card["version"], capabilities=card["capabilities"])
    try:
        rec = await ans.resolve(card["ans_name"])
    except (AnsError, httpx.HTTPError):
        rec = None
    if rec:
        info.update(status=rec["status"], status_reason=rec.get("status_reason"), agent_id=rec["agent_id"],
                    registered_at=rec.get("registered_at"), **_cert_info(rec.get("identity_cert_pem")))
    return info


@app.get("/api/state")
async def get_state():
    agents = await asyncio.gather(*[_agent_info(k, v) for k, v in config.agents().items()])
    return {"agents": agents, "ans_backend": ans.backend, "llm_mode": llm_mode(), "offers": OFFERS,
            "pace": config.pace()}


# --- missions (proxied to the Commander) ---------------------------------------------------

@app.post("/api/missions")
async def start_mission(body: dict):
    return await _call("POST", f"{COMMANDER}/missions", json=body)


@app.get("/api/missions/current")
async def current_mission():
    return await _call("GET", f"{COMMANDER}/missions/current", timeout=5)


@app.get("/api/missions/{mission_id}")
async def get_mission(mission_id: str):
    return await _call("GET", f"{COMMANDER}/missions/{mission_id}", timeout=5)


@app.get("/api/missions/{mission_id}/result", response_class=HTMLResponse)
async def mission_result(mission_id: str):
    return await _call("GET", f"{COMMANDER}/missions/{mission_id}/result", timeout=5)


@app.post("/api/missions/{mission_id}/decision")
async def decide(mission_id: str, body: dict):
    return await _call("POST", f"{COMMANDER}/missions/{mission_id}/decision", json=body)


# --- demo controls ---------------------------------------------------------------------------

def _vendor(key: str) -> dict:
    cfg = config.agents().get(key)
    if not cfg or cfg["role"] != "vendor":
        raise HTTPException(404, f"No vendor agent called {key}")
    return {**cfg, "key": key}


@app.post("/api/chaos/revoke/{key}")
async def chaos_revoke(key: str):
    cfg = _vendor(key)
    card = await _call("GET", f"{config.agent_endpoint(cfg)}/card", timeout=5)
    rec = await ans.resolve(card["ans_name"])
    if not rec:
        raise HTTPException(404, "Agent isn't registered in ANS")
    rec = await ans.revoke(rec["agent_id"], "Compromised: revoked from Mission Control")
    await emit("agent.revoked", f"{cfg['org']} was revoked in ANS ({card['ans_name']})", subject=card["ans_name"])
    return rec


@app.post("/api/chaos/upgrade/{key}")
async def chaos_upgrade(key: str):
    cfg = _vendor(key)
    return await _call("POST", f"{config.agent_endpoint(cfg)}/admin/upgrade")


@app.post("/api/chaos/impostor")
async def chaos_impostor():
    return await _call("POST", f"{config.agent_endpoint(config.agent('impostor'))}/admin/strike")


@app.post("/api/reset")
async def reset():
    OFFERS.clear()
    await guardian_reset()
    notes = []
    try:
        await _call("POST", f"{COMMANDER}/admin/missions/reset", timeout=5)
    except HTTPException as exc:
        notes.append(f"commander: {exc.detail}")
    for key, cfg in config.agents().items():
        if cfg["role"] != "vendor":
            continue
        try:
            out = await _call("POST", f"{config.agent_endpoint({**cfg, 'key': key})}/admin/reset")
            notes += [f"{cfg['org']}: {n}" for n in out.get("notes", [])]
        except HTTPException as exc:
            notes.append(f"{cfg['org']}: {exc.detail}")
    EVENTS.clear()
    await emit("demo.reset", "Demo reset. All agents are back to their approved versions.", notes=notes)
    return {"ok": True, "notes": notes}


# --- transparency log (for the audit trail) --------------------------------------------------

@app.get("/api/log")
async def get_log(limit: int = 40):
    return await ans.log(limit=limit)


@app.get("/api/receipt/{index}")
async def get_receipt(index: int):
    receipt = await ans.receipt(index)
    ok, detail = merkle.verify_receipt(receipt, await ans.log_public_key())
    return {"verified": ok, "detail": detail, "receipt": receipt}


@app.get("/api/dns")
async def get_dns():
    return await ans.dns()


@app.get("/api/integrations/status")
async def integration_status():
    """What is actually working, probed live. Never inferred from configuration."""
    return await integrations.status(client_count=len(CLIENTS))


@app.get("/health")
def health():
    return {"ok": True}


app.mount("/", StaticFiles(directory=config.ROOT / "dashboard", html=True), name="dashboard")
