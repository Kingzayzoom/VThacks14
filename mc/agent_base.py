"""The shared web service every ANS-registered agent runs.

Routes:
  GET  /card            agent card (who I am, what I do)
  POST /challenge       sign a nonce to prove I hold my identity's private key
  POST /job             do work for a verified client, return a signed deliverable
  POST /admin/upgrade   ship a new version (new ANS name, old one superseded)   [demo control]
  POST /admin/reset     go back to the configured version                        [demo control]
"""
import asyncio
import datetime as dt
from contextlib import asynccontextmanager
from typing import Awaitable, Callable

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from . import config, crypto
from .ans import AnsError, get_ans_client
from .events import emit
from .identity import Identity, ensure_identity, register_identity
from .trustgate import TrustGate

JobHandler = Callable[[str, dict, dict], Awaitable[tuple[dict, str]]]


class AgentState:
    def __init__(self, cfg: dict):
        self.cfg = cfg
        self.endpoint = config.agent_endpoint(cfg)
        self.ans = get_ans_client()
        self.identity: Identity | None = None
        self.gate: TrustGate | None = None

    def set_identity(self, ident: Identity):
        self.identity = ident
        self.gate = TrustGate(self.ans, ident.ans_name)

    def card(self) -> dict:
        return {
            "name": self.cfg["name"], "organization": self.cfg["org"],
            "ans_name": self.identity.ans_name if self.identity else None,
            "version": self.identity.version if self.identity else self.cfg["version"],
            "endpoint": self.endpoint, "capabilities": self.cfg["capabilities"],
            "description": self.cfg.get("description", ""), "protocols": ["https-json"],
        }


async def _wait_for_ans(state: AgentState, attempts: int = 40):
    for _ in range(attempts):
        try:
            await state.ans.ca_cert()
            return
        except Exception:  # noqa: BLE001 — ANS may still be starting
            await asyncio.sleep(0.5)
    raise RuntimeError("ANS is not reachable. Is the ANS simulator running?")


class ChallengeBody(BaseModel):
    nonce: str
    model_config = {"extra": "allow"}


class JobBody(BaseModel):
    payload: dict
    signature: str


def create_agent_app(agent_key: str, handle_job: JobHandler | None = None) -> tuple[FastAPI, AgentState]:
    cfg = config.agent(agent_key)
    state = AgentState(cfg)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        await _wait_for_ans(state)
        state.set_identity(await ensure_identity(state.ans, cfg, cfg["version"], state.endpoint))
        await emit("agent.online", f"{cfg['org']} {cfg['name']} is online as {state.identity.ans_name}",
                   actor=state.identity.ans_name)
        yield

    app = FastAPI(title=f"{cfg['org']} {cfg['name']}", lifespan=lifespan)

    @app.get("/health")
    def health():
        return {"ok": True, "ans_name": state.identity.ans_name if state.identity else None}

    @app.get("/card")
    def card():
        return state.card()

    @app.post("/challenge")
    def challenge(body: ChallengeBody):
        return {"ans_name": state.identity.ans_name, "signature": state.identity.sign(body.nonce.encode()),
                "fingerprint": state.identity.fingerprint}

    if handle_job:
        @app.post("/job")
        async def job(body: JobBody):
            payload = body.payload
            me = state.identity
            mission_id = payload.get("mission_id")
            peer = await state.gate.verify_peer_request(payload, body.signature, mission_id=mission_id)
            if not peer.trusted:
                raise HTTPException(403, f"Refusing job: {peer.reason}")
            capability = payload.get("capability")
            if capability not in cfg["capabilities"]:
                raise HTTPException(400, f"{cfg['org']} doesn't offer {capability}")

            await emit("job.working", f"{cfg['org']} is working on {capability}", actor=me.ans_name,
                       mission_id=mission_id, job_id=payload.get("job_id"))
            await asyncio.sleep(config.pace())
            output, engine = await handle_job(capability, payload.get("input", {}),
                                              {"actor": me.ans_name, "mission_id": mission_id})
            await asyncio.sleep(config.pace())

            result = {
                "job_id": payload.get("job_id"), "mission_id": mission_id, "from": me.ans_name,
                "output": output, "output_sha256": crypto.sha256_hex(crypto.canonical(output)),
                "engine": engine, "signed_at": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
            }
            signed = {k: result[k] for k in ("job_id", "from", "output_sha256", "signed_at")}
            await emit("job.done", f"{cfg['org']} delivered {capability} (signed)", actor=me.ans_name,
                       mission_id=mission_id, job_id=payload.get("job_id"), engine=engine)
            return {"payload": result, "signature": me.sign_obj(signed), "cert_fingerprint": me.fingerprint}

    @app.post("/admin/upgrade")
    async def upgrade():
        old = state.identity
        v = config.parse_ans_name(old.ans_name)
        new_version = f"{v['major']}.{v['minor'] + 1}.0"
        patch = 0
        while await state.ans.resolve(config.ans_name(cfg, new_version)):
            patch += 1
            new_version = f"{v['major']}.{v['minor'] + 1}.{patch}"
        ident = await register_identity(state.ans, cfg, new_version, state.endpoint, supersedes=old.agent_id)
        state.set_identity(ident)
        await emit("agent.upgraded", f"{cfg['org']} shipped v{new_version} without notice (was v{old.version})",
                   actor=ident.ans_name, subject=old.ans_name, old=old.ans_name, new=ident.ans_name)
        return state.card()

    @app.post("/admin/reset")
    async def reset():
        base = await ensure_identity(state.ans, cfg, cfg["version"], state.endpoint)
        notes = []
        try:
            for rec in await state.ans.search(host=config.host_of(cfg), status=None):
                if rec["agent_id"] != base.agent_id and rec["status"] == "ACTIVE":
                    await state.ans.dev_set_status(rec["agent_id"], "REVOKED", "Demo reset")
                    notes.append(f"retired {rec['ans_name']}")
            rec = await state.ans.resolve(base.ans_name)
            if rec and rec["status"] != "ACTIVE":
                await state.ans.dev_set_status(base.agent_id, "ACTIVE", "Demo reset")
                notes.append(f"reactivated {base.ans_name}")
        except (NotImplementedError, AnsError) as exc:
            notes.append(f"couldn't reset ANS status: {exc}")
        state.set_identity(base)
        return {"card": state.card(), "notes": notes}

    return app, state
