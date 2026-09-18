"""Who the Commander turns to for a job, before any network call happens.

The rule these cover: we go recruiting when — and only when — nobody already on the mission
can do the work. Getting this wrong either floods the demo with recruitment noise or, worse,
quietly hands the next job to an agent we already dropped.
"""
from services.agents.commander import Recruitment, roster_match

SITESMITH = "ans://v1.0.0.sitebuilder.sitesmith.xyz"
LEGALCHECK = "ans://v1.0.0.compliance.legalcheck.xyz"


def entry(ans_name, capabilities, endpoint="http://127.0.0.1:8004", org="SiteSmith", version="1.0.0"):
    return {"ans_name": ans_name, "endpoint": endpoint, "org": org, "version": version,
            "capabilities": list(capabilities), "trust": object(), "hired_at": "2026-09-18T20:00:00+00:00"}


def roster(*entries):
    return {e["ans_name"]: e for e in entries}


# --- when we already have someone ------------------------------------------------------

def test_an_agent_on_the_roster_covers_its_own_capability():
    r = roster(entry(SITESMITH, ["site.generate"]))
    assert roster_match(r, "site.generate", set())["ans_name"] == SITESMITH


def test_an_empty_roster_covers_nothing():
    assert roster_match({}, "site.generate", set()) is None


def test_the_roster_does_not_cover_a_capability_nobody_has():
    r = roster(entry(SITESMITH, ["site.generate"]), entry(LEGALCHECK, ["compliance.review"]))
    assert roster_match(r, "brand.identity", set()) is None


def test_an_agent_with_several_capabilities_covers_each_of_them():
    r = roster(entry(SITESMITH, ["site.generate", "brand.identity"]))
    assert roster_match(r, "site.generate", set()) is not None
    assert roster_match(r, "brand.identity", set()) is not None


def test_first_hired_wins_so_the_choice_is_repeatable():
    first = entry(SITESMITH, ["site.generate"])
    second = entry("ans://v1.0.0.sitebuilder.webforge.xyz", ["site.generate"],
                   endpoint="http://127.0.0.1:8003", org="WebForge")
    assert roster_match(roster(first, second), "site.generate", set())["ans_name"] == SITESMITH


# --- when we have dropped someone -------------------------------------------------------

def test_a_dropped_agent_is_not_reused_however_good_its_card_looks():
    """The revocation scenario turns on this: drop WebForge, and it must not come straight back."""
    webforge = entry("ans://v1.0.0.sitebuilder.webforge.xyz", ["site.generate"],
                     endpoint="http://127.0.0.1:8003", org="WebForge")
    excluded = {(webforge["ans_name"], webforge["endpoint"])}
    assert roster_match(roster(webforge), "site.generate", excluded) is None


def test_dropping_one_agent_does_not_drop_another_who_can_do_the_same_job():
    webforge = entry("ans://v1.0.0.sitebuilder.webforge.xyz", ["site.generate"],
                     endpoint="http://127.0.0.1:8003", org="WebForge")
    sitesmith = entry(SITESMITH, ["site.generate"])
    excluded = {(webforge["ans_name"], webforge["endpoint"])}
    assert roster_match(roster(webforge, sitesmith), "site.generate", excluded)["ans_name"] == SITESMITH


def test_exclusion_is_by_name_and_endpoint_together():
    """Same identity at a different address is a different thing to talk to — that is the impostor."""
    real = entry(SITESMITH, ["site.generate"], endpoint="http://127.0.0.1:8004")
    excluded = {(SITESMITH, "http://127.0.0.1:9999")}
    assert roster_match(roster(real), "site.generate", excluded)["ans_name"] == SITESMITH


# --- the shape the frontend renders -------------------------------------------------------

def test_a_new_recruitment_starts_discovering_and_already_knows_what_it_will_ask_for():
    rec = Recruitment(mission_id="m_1", job_title="Landing page", capability="site.generate",
                      requested_scopes=["artifact.write:mission"])
    pub = rec.public()
    assert pub["status"] == "discovering"
    assert pub["selected"] is None and pub["finished_at"] is None
    # The drawer shows what an agent is asking for while the decision is still open.
    assert pub["requested_scopes"] == ["artifact.write:mission"]
    assert pub["id"].startswith("rec_")


def test_recruitment_ids_are_unique():
    ids = {Recruitment(mission_id="m", job_title="j", capability="c").id for _ in range(50)}
    assert len(ids) == 50
