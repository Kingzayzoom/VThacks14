"""Loads .env and config/agents.yaml, and builds names and URLs from them."""
import os
import re
from functools import lru_cache
from pathlib import Path

import yaml
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")

KEYS_DIR = ROOT / "keys"
DATA_DIR = ROOT / "data"

ANS_NAME_RE = re.compile(r"^ans://v(\d+)\.(\d+)\.(\d+)\.([a-z0-9-]+)\.([a-z0-9.-]+)$")


def env(name: str, default: str | None = None) -> str | None:
    value = os.environ.get(name)
    return value if value not in (None, "") else default


@lru_cache
def load() -> dict:
    with open(ROOT / "config" / "agents.yaml", encoding="utf-8") as f:
        return yaml.safe_load(f)


def agents() -> dict:
    return load()["agents"]


def agent(key: str) -> dict:
    cfg = dict(agents()[key])
    cfg["key"] = key
    return cfg


def policy() -> dict:
    return load().get("policy", {})


def port(service: str) -> int:
    return load()["services"][service]["port"]


def hub_url() -> str:
    return env("HUB_URL", f"http://127.0.0.1:{port('hub')}")


def ans_sim_url() -> str:
    return env("ANS_SIM_URL", f"http://127.0.0.1:{port('ans_sim')}")


def agent_endpoint(cfg: dict) -> str:
    """Where the agent is reachable. Set AGENT_ENDPOINT_<KEY> to override (e.g. when deployed)."""
    override = env(f"AGENT_ENDPOINT_{cfg['key'].upper()}")
    return (override or cfg.get("endpoint") or f"http://127.0.0.1:{cfg['port']}").rstrip("/")


def host_of(cfg: dict) -> str:
    return f"{cfg['label']}.{cfg['domain']}"


def ans_name(cfg: dict, version: str | None = None) -> str:
    return f"ans://v{version or cfg['version']}.{cfg['label']}.{cfg['domain']}"


def parse_ans_name(name: str) -> dict | None:
    m = ANS_NAME_RE.match(name or "")
    if not m:
        return None
    major, minor, patch, label, domain = m.groups()
    return {
        "version": f"{major}.{minor}.{patch}",
        "major": int(major), "minor": int(minor), "patch": int(patch),
        "label": label, "domain": domain, "host": f"{label}.{domain}",
    }


def pace() -> float:
    """Seconds of deliberate delay between steps, so a live audience can follow along."""
    return float(env("DEMO_PACE", "1.0"))
