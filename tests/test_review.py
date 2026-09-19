"""The compliance review: what a model may add, and what it may not take away.

The demo's review loop depends on a real finding — the first draft of the page genuinely has no
allergen notice, and the reviewer genuinely catches it. Hand that job to a model alone and the
beat becomes a coin flip: it might approve the page, or word the problem away.

So the rule checks run on every review and their findings are not negotiable. The model is there
to catch what a rule cannot express.
"""
from mc.skills import _fallback_review, merge_reviews

FOOD = {"business": {"type": "food truck"}, "html": "<html><body>no notice here</body></html>"}


def rules_for(inp=None):
    return _fallback_review(inp or FOOD)


# --- what the rules find on their own ------------------------------------------------------

def test_the_rules_catch_the_missing_allergen_notice():
    found = rules_for()
    assert not found["approved"]
    assert any("allergen" in i["issue"].lower() for i in found["issues"])


def test_a_page_with_everything_passes_the_rules():
    clean = {"business": {"type": "food truck"},
             "html": '<html lang="en"><body>allergen notice <a href="mailto:a@b.c">mail</a></body></html>'}
    assert _fallback_review(clean)["approved"]


# --- the floor: a model cannot make a rule finding disappear --------------------------------

def test_an_approving_model_cannot_overrule_a_rule_finding():
    """The one that protects the demo. The model says it is fine; the page still is not."""
    merged = merge_reviews(rules_for(), {"approved": True, "issues": [], "summary": "Looks great."})
    assert merged["approved"] is False
    assert any("allergen" in i["issue"].lower() for i in merged["issues"])


def test_a_model_returning_nothing_at_all_leaves_the_rules_intact():
    for empty in ({}, {"issues": None}, {"approved": True}):
        merged = merge_reviews(rules_for(), empty)
        assert not merged["approved"]
        assert len(merged["issues"]) == len(rules_for()["issues"])


def test_model_junk_does_not_crash_the_merge():
    merged = merge_reviews(rules_for(), {"issues": ["a string", None, 42, {"issue": "real one"}]})
    assert any(i["issue"] == "real one" for i in merged["issues"])


# --- what the model does add ----------------------------------------------------------------

def test_the_model_can_add_a_finding_a_rule_could_not_express():
    merged = merge_reviews(rules_for(), {
        "approved": False,
        "issues": [{"severity": "low", "issue": "The tagline claims 'best in the world'",
                    "fix": "Remove the unverifiable superlative."}],
    })
    texts = [i["issue"] for i in merged["issues"]]
    assert any("allergen" in t.lower() for t in texts), "rule finding survives"
    assert any("best in the world" in t for t in texts), "model finding is added"


def test_the_same_problem_reported_twice_is_listed_once():
    merged = merge_reviews(rules_for(), {
        "issues": [{"severity": "high", "issue": "No allergen or food-safety notice!"}],
    })
    allergen = [i for i in merged["issues"] if "allergen" in i["issue"].lower()]
    assert len(allergen) == 1


def test_every_issue_says_where_it_came_from():
    merged = merge_reviews(rules_for(), {"issues": [{"severity": "low", "issue": "Something else"}]})
    assert {i["source"] for i in merged["issues"]} == {"rule", "model"}


def test_a_model_high_severity_finding_blocks_approval_on_its_own():
    clean = {"business": {"type": "bookshop"},
             "html": '<html lang="en"><body><a href="mailto:a@b.c">mail</a></body></html>'}
    rules = _fallback_review(clean)
    assert rules["approved"], "nothing for the rules to find here"
    merged = merge_reviews(rules, {"approved": False, "issues": [
        {"severity": "high", "issue": "Uses a trademarked logo without permission"}]})
    assert not merged["approved"]


def test_the_summary_reports_the_real_count_when_the_model_understated_it():
    merged = merge_reviews(rules_for(), {"approved": True, "issues": [], "summary": "All good!"})
    assert "required fix" in merged["summary"]
    assert "All good!" not in merged["summary"]
