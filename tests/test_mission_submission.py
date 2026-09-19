import asyncio

import pytest
from fastapi import HTTPException
from pydantic import ValidationError
from services.agents import commander as c


def test_objective_validation():
    for text in (" ", "x" * 2001):
        with pytest.raises(ValidationError):
            c.MissionBody(text=text)
    assert c.MissionBody(text=" dental site ").text == "dental site"


def test_idempotent_creation_and_conflicting_payload(monkeypatch):
    async def check():
        monkeypatch.setattr(c, "MISSIONS", {})
        monkeypatch.setattr(c, "SUBMISSIONS", {})
        monkeypatch.setattr(c, "CURRENT", {"id": None})
        calls = []
        async def run(mission):
            calls.append(mission.id)
        monkeypatch.setattr(c, "run", run)
        body = c.MissionBody(text="Dental site", idempotency_key="same")
        first, second = await asyncio.gather(c.start_mission(body), c.start_mission(body))
        await asyncio.sleep(0)
        assert first["id"] == second["id"]
        assert len(calls) == 1
        with pytest.raises(HTTPException) as exc:
            await c.start_mission(c.MissionBody(text="Other", idempotency_key="same"))
        assert exc.value.status_code == 409
    asyncio.run(check())
