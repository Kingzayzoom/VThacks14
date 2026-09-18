"""End-to-end check of the full demo against a running system (start it with run_all.py first).

Runs a mission with all three scenarios, approves the surprise upgrade, and checks that:
  - the impostor was blocked at the identity check
  - WebForge's deliverable was discarded after revocation and SiteSmith took over
  - the mission paused for the new LegalCheck version, then finished
  - every hire has a verifiable transparency-log receipt

    python scripts/smoke_test.py
"""
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import httpx  # noqa: E402

from mc import config  # noqa: E402

HUB = config.hub_url()


def main():
    c = httpx.Client(base_url=HUB, timeout=60)
    c.post("/api/reset").raise_for_status()
    m = c.post("/api/missions", json={
        "text": "Launch an online presence for Hokie Bites, a food truck in Blacksburg.",
        "scenario": {"impostor": True, "revoke": True, "upgrade": True},
    }).json()
    print(f"mission {m['id']} started")

    approved = False
    deadline = time.time() + 600
    while time.time() < deadline:
        m = c.get("/api/missions/current").json()["mission"]
        if m["approval"] and not approved:
            print(f"  approval requested for {m['approval']['ans_name']} → approving")
            c.post(f"/api/missions/{m['id']}/decision", json={"decision": "approve"}).raise_for_status()
            approved = True
        if m["status"] in ("delivered", "failed", "cancelled"):
            break
        time.sleep(0.5)

    print(f"status: {m['status']}  stats: {m['stats']}  brains: {m['engines']}")
    assert m["status"] == "delivered", m.get("error")
    orgs = [h["org"] for h in m["hires"]]
    print("hires:", ", ".join(f"{h['job']}={h['org']}" for h in m["hires"]))

    # The hub sends its event history to every new dashboard connection; read it the same way.
    import json
    from websockets.sync.client import connect  # installed with uvicorn[standard]
    with connect(HUB.replace("http", "ws", 1) + "/ws") as ws:
        events = json.loads(ws.recv())["events"]

    checks = [e for e in events if e["type"] == "trust.check" and e["mission_id"] == m["id"]]
    impostor = [e for e in checks if e["data"].get("source") == "open-web offer"]
    assert impostor and impostor[0]["data"]["verdict"] == "REJECTED", "impostor should be blocked"
    auth = next(ch for ch in impostor[0]["data"]["checks"] if ch["name"] == "authenticate")
    assert auth["ok"] is False, "impostor should fail the authenticate check"
    print("✓ impostor blocked:", auth["detail"])

    assert "WebForge" not in orgs and "SiteSmith" in orgs, "SiteSmith should replace revoked WebForge"
    assert any(e["type"] == "result.rejected" and "REVOKED" in e["message"] for e in events), "WebForge result should be discarded"
    print("✓ WebForge revoked mid-job; SiteSmith took over")

    assert approved and any(e["type"] == "approval.required" for e in events), "upgrade should require approval"
    assert any("v1.1" in h["ans_name"] for h in m["hires"] if h["org"] == "LegalCheck"), "LegalCheck v1.1 should do the review"
    print("✓ surprise upgrade paused the mission until approved")

    for h in m["hires"]:
        r = c.get(f"/api/receipt/{h['log_index']}").json()
        assert r["verified"], r["detail"]
    print(f"✓ {len(m['hires'])} log receipts verified")

    html = c.get(f"/api/missions/{m['id']}/result").text
    assert "<html" in html.lower()
    print(f"✓ result delivered ({len(html):,} bytes of HTML)")
    print("\nALL CHECKS PASSED")


if __name__ == "__main__":
    main()
