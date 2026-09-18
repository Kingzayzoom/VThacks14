"""End-to-end check of the full demo against a running system (start it with run_all.py first).

Runs a mission with every scenario on, answers both things that need a human, and checks that:
  - the impostor was blocked at the identity check
  - WebForge's deliverable was discarded after revocation and SiteSmith took over
  - the mission paused for the new LegalCheck version, then finished
  - the Guardian allowed the font fetch that was inside the site builder's grant
  - the Guardian blocked the upload that was outside it, before anything left
  - the publish request waited for a person and ran only once they said yes
  - every hire has a verifiable transparency-log receipt

    python scripts/smoke_test.py
"""
import sys
import time
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")  # Windows consoles default to cp1252

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import httpx  # noqa: E402

from mc import config  # noqa: E402

HUB = config.hub_url()


def main():
    c = httpx.Client(base_url=HUB, timeout=60)
    c.post("/api/reset").raise_for_status()
    m = c.post("/api/missions", json={
        "text": "Launch an online presence for Hokie Bites, a food truck in Blacksburg.",
        "scenario": {"impostor": True, "revoke": True, "upgrade": True, "exfil": True, "publish": True},
    }).json()
    print(f"mission {m['id']} started")

    approved = False
    authorized = set()
    deadline = time.time() + 600
    while time.time() < deadline:
        m = c.get("/api/missions/current").json()["mission"]
        if m["approval"] and not approved:
            print(f"  approval requested for {m['approval']['ans_name']} → approving")
            c.post(f"/api/missions/{m['id']}/decision", json={"decision": "approve"}).raise_for_status()
            approved = True
        # The Guardian holds outward-facing actions until a person answers; be that person.
        for inc in c.get("/api/guardian/incidents").json():
            if inc["state"] == "NEEDS REVIEW" and inc["id"] not in authorized:
                authorized.add(inc["id"])
                print(f"  guardian asks: {inc['org']} wants to {inc['action']} {inc['resource']} → authorizing once")
                c.post(f"/api/guardian/incidents/{inc['id']}/decision", json={"decision": "approve"}).raise_for_status()
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

    incidents = c.get("/api/guardian/incidents").json()
    by_action = {}
    for inc in incidents:
        by_action.setdefault(inc["action"], []).append(inc)

    fetch = by_action.get("http.fetch", [])
    assert fetch and all(i["state"] == "ALLOWED" for i in fetch), "the font fetch is inside the grant"
    assert any(i["result"] and i["result"]["performed"] for i in fetch), "the Guardian should make the call itself"
    print("✓ guardian allowed the font fetch:", fetch[0]["decision"]["reason"])

    upload = by_action.get("external.upload", [])
    assert upload, "the site builder should have tried to send the brand kit off-site"
    assert all(i["state"] == "DENIED" for i in upload), "that upload must be blocked"
    assert upload[0]["decision"]["rules"] == ["scope-missing"], upload[0]["decision"]
    assert upload[0]["result"] is None, "nothing should have been sent"
    print("✓ guardian blocked the off-site upload:", upload[0]["decision"]["reason"])

    publish = by_action.get("site.publish", [])
    assert publish and publish[0]["state"] == "ALLOWED", "publish should run once authorized"
    assert publish[0]["decision"]["rules"] == ["review-approved"], publish[0]["decision"]
    assert authorized, "publish should have waited for a human"
    print("✓ publish waited for a person, then ran once")

    grants = c.get("/api/guardian/grants").json()
    assert grants and all(g["scopes"] and g["expires_at"] for g in grants), "every hire gets a scoped, expiring grant"
    assert not any("external.upload" in s for g in grants for s in g["scopes"]), "nobody was ever granted uploads"
    print(f"✓ {len(grants)} mission-scoped grants issued, all expiring")

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
