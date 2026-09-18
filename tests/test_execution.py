"""Wiring one task's output into the next task's input.

This replaced a hardcoded three-step pipeline where the Commander knew that job 2 got job 1's
output because it was job 2. Now the plan says what depends on what, so this is the code that
has to get it right — and getting it wrong means an agent silently working from nothing.
"""
from types import SimpleNamespace

from mc.planning import Task
from services.agents.commander import build_inputs

BRAND_KIT = {"name": "Hokie Bites", "palette": {"primary": "#861F41"}, "fonts": {}}
SITE = {"html": "<html>the page</html>", "summary": "a page"}
REVIEW = {"approved": False, "issues": [{"severity": "high", "issue": "No allergen notice"}]}


def mission():
    return SimpleNamespace(text="Launch an online presence for Hokie Bites",
                           business={"name": "Hokie Bites", "type": "food truck"})


def test_a_task_with_no_dependencies_still_gets_the_mission_and_its_brief():
    task = Task("brand", "Brand kit", "brand.identity", brief="Make a brand kit")
    inputs = build_inputs(mission(), task, {})
    assert inputs["mission"].startswith("Launch")
    assert inputs["brief"] == "Make a brand kit"
    assert inputs["business"]["name"] == "Hokie Bites"


def test_a_brand_kit_reaches_the_site_builder():
    task = Task("site", "Landing page", "site.generate", depends_on=["brand"])
    inputs = build_inputs(mission(), task, {"brand": BRAND_KIT})
    assert inputs["brand_kit"] == BRAND_KIT


def test_a_page_reaches_the_reviewer():
    task = Task("review", "Compliance review", "compliance.review", depends_on=["site"])
    inputs = build_inputs(mission(), task, {"site": SITE})
    assert inputs["html"] == SITE["html"]


def test_a_fix_task_gets_the_page_the_brand_kit_and_the_issues_to_fix():
    """Three dependencies of three different shapes, all needed at once."""
    task = Task("fix", "Fix review issues", "site.generate", depends_on=["site", "review"])
    inputs = build_inputs(mission(), task, {"brand": BRAND_KIT, "site": SITE, "review": REVIEW})
    assert inputs["previous_html"] == SITE["html"]
    assert inputs["issues"] == REVIEW["issues"]
    assert inputs["brand_kit"] == BRAND_KIT, "a rebuild still needs the brand it is rebuilding"


def test_a_site_builder_finds_the_brand_kit_even_if_the_plan_did_not_wire_it():
    """A planner that forgets the dependency should not produce an unbranded page."""
    task = Task("site", "Landing page", "site.generate", depends_on=[])
    inputs = build_inputs(mission(), task, {"brand": BRAND_KIT})
    assert inputs["brand_kit"] == BRAND_KIT


def test_a_site_builder_with_nothing_to_go_on_gets_an_empty_kit_not_a_crash():
    task = Task("site", "Landing page", "site.generate", depends_on=[])
    assert build_inputs(mission(), task, {})["brand_kit"] == {}


def test_outputs_from_tasks_we_do_not_depend_on_are_not_handed_over():
    """The plan decides who sees what. A task gets its dependencies and nothing else."""
    task = Task("review", "Compliance review", "compliance.review", depends_on=["site"])
    inputs = build_inputs(mission(), task, {"site": SITE, "secret": {"api_key": "should-not-travel"}})
    assert "api_key" not in str(inputs)


def test_a_dependency_that_produced_nothing_usable_is_skipped_quietly():
    task = Task("review", "Compliance review", "compliance.review", depends_on=["site", "broken"])
    inputs = build_inputs(mission(), task, {"site": SITE, "broken": None})
    assert inputs["html"] == SITE["html"]
