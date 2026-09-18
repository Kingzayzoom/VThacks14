"""A specialist vendor agent. Which one is chosen by the AGENT_KEY env var
(brand, webforge, sitesmith or compliance — see config/agents.yaml)."""
import os

from mc.agent_base import create_agent_app
from mc.skills import SKILLS

AGENT_KEY = os.environ.get("AGENT_KEY", "brand")


async def work(capability: str, job_input: dict, ctx: dict):
    return await SKILLS[capability](job_input, **ctx)


app, state = create_agent_app(AGENT_KEY, handle_job=work)
