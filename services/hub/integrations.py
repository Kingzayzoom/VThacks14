"""Are our dependencies actually working?

The rule this exists to enforce: a configured integration is not a working one. An API key in
the environment tells you somebody pasted a string into a file. It does not tell you the service
answers, that the credential is valid, or that the last call succeeded — and a dashboard that
shows a green light on the strength of an env var is lying to whoever is reading it.

So every state here is either observed or admitted:

    NOT_CONFIGURED       nothing set up. Not an error — the demo runs fine without Gemini.
    CONFIGURED_UNTESTED  credentials present, nothing has exercised them yet.
    CONNECTED            we made a real call, or saw real traffic, and it worked.
    DEGRADED             working, but not well: fell back, retried, partially available.
    ERROR               configured and failing.

Nothing in here returns a secret. The frontend learns whether something works, never what it
was configured with.
"""
import asyncio
import datetime as dt

import httpx

from mc import config
from mc.ans import AnsError, get_ans_client
from mc.http import client
from mc.llm import mode as llm_mode

NOT_CONFIGURED = "NOT_CONFIGURED"
CONFIGURED_UNTESTED = "CONFIGURED_UNTESTED"
CONNECTED = "CONNECTED"
DEGRADED = "DEGRADED"
ERROR = "ERROR"

PROBE_TIMEOUT = 4.0

# What we have actually seen happen, as opposed to what is configured. Updated from the event
# stream, because the hub sees every agent's work go past and that is better evidence than
# anything the hub could ask for itself.
OBSERVED: dict[str, dict] = {}


def now() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")


def observe(event: dict) -> None:
    """Learn the health of things we do not call ourselves, from traffic we can see."""
    data = event.get("data") or {}
    if event.get("type") == "llm.fallback":
        OBSERVED["gemini"] = {"state": DEGRADED, "at": event.get("ts"),
                              "detail": event.get("message") or "fell back to offline templates"}
    elif data.get("engine") == "gemini":
        OBSERVED["gemini"] = {"state": CONNECTED, "at": event.get("ts"),
                              "detail": "an agent completed work with Gemini"}
    elif event.get("type") == "demo.reset":
        OBSERVED.clear()


def _component(name: str, state: str, detail: str, **extra) -> dict:
    return {"name": name, "state": state, "detail": detail, "checked_at": now(), **extra}


async def _probe_ans() -> dict:
    """A real registry read. Not a cached certificate, not the value of an env var."""
    ans = get_ans_client()
    backend = "GoDaddy ANS" if ans.backend == "godaddy" else "ANS simulator (local)"
    try:
        agents = await asyncio.wait_for(ans.search(status=None), timeout=PROBE_TIMEOUT)
    except NotImplementedError as exc:
        return _component("ANS", CONFIGURED_UNTESTED, f"{backend}: {exc}", backend=ans.backend)
    except asyncio.TimeoutError:
        return _component("ANS", ERROR, f"{backend} did not answer within {PROBE_TIMEOUT:g}s",
                          backend=ans.backend)
    except (AnsError, httpx.HTTPError) as exc:
        return _component("ANS", ERROR, f"{backend}: {exc}"[:200], backend=ans.backend)
    if not agents:
        return _component("ANS", DEGRADED, f"{backend} answered, but has no registered agents",
                          backend=ans.backend, registered=0)
    return _component("ANS", CONNECTED, f"{backend} · {len(agents)} registered agent(s)",
                      backend=ans.backend, registered=len(agents))


async def _probe_agent(key: str, cfg: dict) -> bool:
    endpoint = config.agent_endpoint({**cfg, "key": key})
    try:
        r = await client().get(f"{endpoint}/health", timeout=2)
        return r.status_code == 200
    except httpx.HTTPError:
        return False


async def _probe_runtime() -> dict:
    agents = config.agents()
    results = await asyncio.gather(*[_probe_agent(k, v) for k, v in agents.items()])
    online, total = sum(results), len(results)
    if online == 0:
        return _component("Agent runtime", ERROR, "no agents are answering", online=0, total=total)
    state = CONNECTED if online == total else DEGRADED
    return _component("Agent runtime", state, f"{online} of {total} agents online",
                      online=online, total=total)


def _gemini() -> dict:
    """Configured is not connected — only traffic we have seen counts as working."""
    seen = OBSERVED.get("gemini")
    if seen:
        return _component("Gemini", seen["state"], seen["detail"], last_seen=seen.get("at"))
    if llm_mode() == "offline":
        return _component("Gemini", NOT_CONFIGURED,
                          "no API key; agents are using offline templates (the demo runs fine)")
    return _component("Gemini", CONFIGURED_UNTESTED, "API key is set, but no agent has used it yet")


def _event_stream(client_count: int) -> dict:
    state = CONNECTED if client_count else CONFIGURED_UNTESTED
    detail = f"{client_count} dashboard(s) attached" if client_count else "running, nothing attached"
    return _component("Event stream", state, detail, clients=client_count)


async def status(client_count: int = 0) -> dict:
    ans, runtime = await asyncio.gather(_probe_ans(), _probe_runtime())
    components = [ans, runtime, _gemini(), _event_stream(client_count)]
    worst = next((s for s in (ERROR, DEGRADED, CONFIGURED_UNTESTED)
                  if any(c["state"] == s for c in components)), CONNECTED)
    return {"overall": worst, "checked_at": now(), "components": components}
