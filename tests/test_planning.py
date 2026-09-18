"""Plan validation: the gap between "the model returned JSON" and "we can run this".

Every case here is something a model will eventually produce. Schema-valid and runnable are
different properties, and only one of them can be checked by a schema.
"""
from mc.planning import Plan, Task, order_tasks, validate_plan

KNOWN = ["brand.identity", "site.generate", "compliance.review"]


def task(tid, capability, depends_on=None, **extra):
    return {"id": tid, "title": tid.title(), "capability": capability,
            "brief": "do the thing", "depends_on": depends_on or [], **extra}


def validate(*tasks, business=None, **kwargs):
    raw = {"business": business or {"name": "Hokie Bites"}, "tasks": list(tasks)}
    return validate_plan(raw, known_capabilities=KNOWN, **kwargs)


# --- plans that should run ----------------------------------------------------------------

def test_a_straight_line_plan_is_accepted_in_order():
    plan, problems = validate(
        task("brand", "brand.identity"),
        task("site", "site.generate", ["brand"]),
        task("review", "compliance.review", ["site"]),
    )
    assert problems == []
    assert [t.id for t in plan.tasks] == ["brand", "site", "review"]
    assert plan.business["name"] == "Hokie Bites"


def test_a_single_task_mission_is_fine():
    """"Just make me a brand kit" is a legitimate mission, not a broken plan."""
    plan, problems = validate(task("brand", "brand.identity"))
    assert problems == []
    assert len(plan.tasks) == 1


def test_dependencies_are_reordered_into_a_runnable_sequence():
    """The model listed them backwards. That is fine — it declared the dependencies."""
    plan, problems = validate(
        task("review", "compliance.review", ["site"]),
        task("site", "site.generate", ["brand"]),
        task("brand", "brand.identity"),
    )
    assert problems == []
    assert [t.id for t in plan.tasks] == ["brand", "site", "review"]


def test_independent_tasks_keep_the_order_they_were_given():
    """Same plan, same run order, every rehearsal."""
    plan, _ = validate(task("a", "brand.identity"), task("b", "brand.identity"))
    assert [t.id for t in plan.tasks] == ["a", "b"]


def test_missing_ids_are_filled_in_rather_than_rejected():
    plan, problems = validate({"capability": "brand.identity", "title": "Brand"})
    assert problems == []
    assert plan.tasks[0].id


# --- plans that must not run ----------------------------------------------------------------

def test_a_task_depending_on_itself_is_rejected():
    _, problems = validate(task("brand", "brand.identity", ["brand"]))
    assert any("depends on itself" in p for p in problems)


def test_a_dependency_cycle_is_rejected():
    plan, problems = validate(
        task("a", "brand.identity", ["b"]),
        task("b", "site.generate", ["a"]),
    )
    assert plan is None
    assert any("loop" in p for p in problems)


def test_a_dependency_on_a_task_that_does_not_exist_is_rejected():
    _, problems = validate(task("site", "site.generate", ["nonexistent"]))
    assert any("not in the plan" in p for p in problems)


def test_duplicate_task_ids_are_rejected():
    _, problems = validate(task("same", "brand.identity"), task("same", "site.generate"))
    assert any("share the id" in p for p in problems)


def test_a_task_with_no_capability_is_rejected():
    _, problems = validate({"id": "x", "title": "Do something vague"})
    assert any("no capability" in p for p in problems)


def test_an_empty_plan_is_rejected():
    plan, problems = validate_plan({"tasks": []}, known_capabilities=KNOWN)
    assert plan is None
    assert any("no tasks" in p for p in problems)


def test_a_plan_that_is_not_an_object_is_rejected():
    for junk in (None, [], "a plan", 7):
        plan, problems = validate_plan(junk, known_capabilities=KNOWN)
        assert plan is None and problems


def test_runaway_plans_are_capped():
    _, problems = validate(*[task(f"t{i}", "brand.identity") for i in range(20)], max_tasks=6)
    assert any("more than the 6 we allow" in p for p in problems)


# --- work we cannot source --------------------------------------------------------------------

def test_a_capability_we_cannot_source_is_recorded_not_invented():
    plan, problems = validate(
        task("brand", "brand.identity"),
        task("seo", "seo.audit"),
    )
    assert problems == []
    assert [t.id for t in plan.tasks] == ["brand"]
    assert plan.unsupported == ["seo.audit"], "we should be able to say what we could not do"


def test_a_plan_made_entirely_of_work_we_cannot_do_is_rejected():
    plan, problems = validate(task("seo", "seo.audit"), task("ads", "ads.buy"))
    assert plan is None
    assert any("cannot source" in p for p in problems)
    assert any("seo.audit" in p for p in problems), "say which, so the model can try again"


# --- the ordering primitive ----------------------------------------------------------------------

def test_order_tasks_reports_which_tasks_are_stuck():
    tasks = [Task("a", "A", "brand.identity", depends_on=["b"]),
             Task("b", "B", "site.generate", depends_on=["a"])]
    ordered, problem = order_tasks(tasks)
    assert ordered == []
    assert "a" in problem and "b" in problem


def test_a_diamond_dependency_runs_both_middles_before_the_end():
    tasks = [Task("end", "End", "compliance.review", depends_on=["left", "right"]),
             Task("left", "L", "site.generate", depends_on=["start"]),
             Task("right", "R", "site.generate", depends_on=["start"]),
             Task("start", "S", "brand.identity")]
    ordered, problem = order_tasks(tasks)
    assert problem is None
    positions = {t.id: i for i, t in enumerate(ordered)}
    assert positions["start"] < positions["left"] < positions["end"]
    assert positions["start"] < positions["right"] < positions["end"]


def test_the_plan_serialises_for_the_frontend():
    plan = Plan(business={"name": "X"}, tasks=[Task("a", "A", "brand.identity")], unsupported=["seo.audit"])
    out = plan.as_dict()
    assert out["tasks"][0]["depends_on"] == []
    assert out["unsupported"] == ["seo.audit"]


# --- the planner around the model ------------------------------------------------------------
# plan_mission is what a bad plan actually meets. These drive it with a stand-in model, because
# the retry path is the one thing an offline demo run can never exercise.

import asyncio  # noqa: E402

from mc import skills  # noqa: E402

MISSION = "Launch an online presence for Hokie Bites, a food truck in Blacksburg."


def drive(responses, monkeypatch):
    """Run plan_mission against a scripted model. Returns (plan, engine, prompts it was given)."""
    prompts = []

    async def fake(system, prompt, fallback, *, label, **ctx):
        prompts.append(prompt)
        reply = responses[min(len(prompts) - 1, len(responses) - 1)]
        return (fallback() if reply is None else reply), ("offline" if reply is None else "gemini")

    monkeypatch.setattr(skills, "generate_json", fake)
    plan, engine = asyncio.run(skills.plan_mission(MISSION))
    return plan, engine, prompts


def test_a_good_plan_from_the_model_is_used_as_given(monkeypatch):
    plan, engine, prompts = drive([{
        "business": {"name": "Hokie Bites", "type": "food truck"},
        "tasks": [task("brand", "brand.identity")],
    }], monkeypatch)
    assert engine == "gemini"
    assert len(prompts) == 1, "a usable plan should not be second-guessed"
    assert [t.capability for t in plan.tasks] == ["brand.identity"]


def test_the_business_details_are_topped_up_from_what_we_could_parse(monkeypatch):
    """The model named the business but skipped the rest; we already worked those out."""
    plan, _, _ = drive([{"business": {"name": "Hokie Bites"},
                         "tasks": [task("brand", "brand.identity")]}], monkeypatch)
    assert plan.business["name"] == "Hokie Bites"
    assert plan.business.get("location"), "location should be filled in, not left blank"


def test_an_unrunnable_plan_gets_one_more_try_with_the_reasons(monkeypatch):
    broken = {"business": {}, "tasks": [task("a", "brand.identity", ["b"]),
                                        task("b", "site.generate", ["a"])]}
    good = {"business": {}, "tasks": [task("brand", "brand.identity")]}
    plan, engine, prompts = drive([broken, good], monkeypatch)
    assert engine == "gemini"
    assert len(prompts) == 2, "a broken plan should be sent back once"
    assert "could not be run" in prompts[1] and "loop" in prompts[1], "tell it what was wrong"
    assert [t.id for t in plan.tasks] == ["brand"]


def test_two_unrunnable_plans_fall_back_rather_than_looping(monkeypatch):
    broken = {"business": {}, "tasks": [task("a", "brand.identity", ["a"])]}
    plan, engine, prompts = drive([broken, broken], monkeypatch)
    assert len(prompts) == 2, "exactly one retry, then stop"
    assert engine == "offline"
    assert [t.capability for t in plan.tasks] == KNOWN, "the whole-job plan, so the mission still runs"


def test_with_no_model_at_all_we_plan_it_ourselves(monkeypatch):
    plan, engine, prompts = drive([None], monkeypatch)
    assert engine == "offline"
    assert len(prompts) == 1
    assert [t.capability for t in plan.tasks] == KNOWN
