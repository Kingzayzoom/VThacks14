"""Register every agent in config/agents.yaml with ANS (or confirm it's already registered).

With the local simulator, agents do this themselves on startup, so you rarely need it.
With ANS_BACKEND=godaddy, run it once per agent domain: it will print the DNS TXT record
to add for each domain and wait while you add it.

    python scripts/register_agents.py
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from mc import config  # noqa: E402
from mc.ans import get_ans_client  # noqa: E402
from mc.identity import ensure_identity  # noqa: E402


async def main():
    ans = get_ans_client()
    print(f"ANS backend: {ans.backend}")
    for key, cfg in config.agents().items():
        if cfg["role"] == "impostor":
            continue
        cfg = {**cfg, "key": key}
        ident = await ensure_identity(ans, cfg, cfg["version"], config.agent_endpoint(cfg))
        print(f"  {key:<11} {ident.ans_name:<42} {ident.fingerprint[:30]}…")
    print("All agents registered.")


if __name__ == "__main__":
    asyncio.run(main())
