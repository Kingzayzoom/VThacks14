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
import time
from contextlib import asynccontextmanager
from typing import Awaitable, Callable

import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from . import config, crypto, standing
from .ans import AnsError, get_ans_client
from .events import emit
from .http import client
from .identity import Identity, ensure_identity, register_identity
from .trustgate import TrustGate, signed_result_body

# How long an agent holds on to its own status token before asking ANS for a fresh one.
# Hosted ANS issues them with roughly an hour's life; re-fetching sooner means a revocation
# shows up sooner, at the cost of a call nobody notices.
STATUS_REFRESH_SECONDS = 60

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
        self._status_token = None
        self._status_fetched_at = 0.0

    async def status_token_header(self) -> str | None:
        """This agent's own proof of good standing, to hand to whoever it is talking to.

        Carrying our own evidence is what lets the other side verify us offline, against root
        keys it already holds, without calling the registry. If ANS is unreachable we keep
        presenting the last token we were given — it expires on its own, and a stale token is
        refused by the verifier rather than quietly accepted.
        """
        if not self.identity:
            return None
        age = time.monotonic() - self._status_fetched_at
        if self._status_token and age < STATUS_REFRESH_SECONDS:
            return self._status_token
        try:
            token = await self.ans.status_token(self.identity.agent_id)
            self._status_token = standing.encode_token(token)
            self._status_fetched_at = time.monotonic()
        except Exception:  # noqa: BLE001 — never fail a request over this; the old token expires safely
            pass
        return self._status_token

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


def _guardian_asker(state: AgentState, mission_id: str | None, job_id: str | None):
    """Hands a skill one function: ask the Guardian before doing something sensitive.

    The request is signed with this agent's ANS identity, so the Guardian knows exactly who
    is asking and can check it is still in good standing. If the Guardian can't be reached,
    the answer is no — an agent must never be able to act by cutting the line.
    """
    async def ask(action: str, resource: str, *, destination: str | None = None, url: str | None = None,
                  payload=None, purpose: str = "") -> tuple[bool, str]:
        request = {
            "from": state.identity.ans_name, "mission_id": mission_id, "job_id": job_id,
            "action": action, "resource": resource, "destination": destination, "url": url,
            "payload_sha256": crypto.sha256_hex(crypto.canonical(payload if payload is not None else "")),
            "purpose": purpose,
        }
        body = {"payload": request, "signature": state.identity.sign_obj(request)}
        try:
            r = await client().post(f"{config.hub_url()}/api/guardian/actions", json=body, timeout=200)
        except httpx.HTTPError as exc:
            return False, f"Guardian unreachable ({type(exc).__name__})"
        if r.status_code == 200:
            return True, r.json().get("detail") or "allowed"
        try:
            return False, r.json().get("detail", r.text)
        except ValueError:
            return False, r.text

    return ask


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

    @app.middleware("http")
    async def attach_standing(request, call_next):
        """Every answer this agent gives carries its current proof of good standing."""
        response = await call_next(request)
        token = await state.status_token_header()
        if token:
            response.headers[standing.STATUS_HEADER] = token
        return response

    @app.get("/health")
    def health():
        return {"ok": True, "ans_name": state.identity.ans_name if state.identity else None}

    @app.get("/card")
    def card():
        return state.card()

    @app.post("/challenge")
    def challenge(body: ChallengeBody):
        return {"ans_name": state.identity.ans_name,
                "signature": state.identity.sign(crypto.challenge_bytes(body.nonce)),
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
                                              {"actor": me.ans_name, "mission_id": mission_id,
                                               "ask": _guardian_asker(state, mission_id, payload.get("job_id"))})
            await asyncio.sleep(config.pace())

            result = {
                "job_id": payload.get("job_id"), "mission_id": mission_id, "from": me.ans_name,
                "output": output, "output_sha256": crypto.sha256_hex(crypto.canonical(output)),
                "engine": engine, "signed_at": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
            }
            signed = signed_result_body(result)
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
