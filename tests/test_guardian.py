"""The Guardian's rules, checked one at a time.

These run without a server, ANS or network: the policy engine is deliberately pure so
the rules that matter most are the cheapest ones to test.
"""
import datetime as dt

import pytest

from mc import guardian
from mc.guardian import ALLOW, DENY, REVIEW, ActionRequest, Approval, Grant

MISSION = "m_test"
AGENT = "ans://v1.0.0.sitebuilder.sitesmith.xyz"


def grant(scopes, *, ans_name=AGENT, mission_id=MISSION, minutes=10, status="active") -> Grant:
    issued = guardian.now()
    return Grant(grant_id="g_1", ans_name=ans_name, mission_id=mission_id, job_id="job_1",
                 scopes=list(scopes), issued_at=guardian.iso(issued),
                 expires_at=guardian.iso(issued + dt.timedelta(minutes=minutes)), status=status)


def action(act, resource, destination=None, *, payload=("brand kit",), ans_name=AGENT,
           mission_id=MISSION) -> ActionRequest:
    return ActionRequest(mission_id=mission_id, job_id="job_1", ans_name=ans_name, action=act,
                         resource=resource, destination=destination,
                         payload_sha256=guardian.digest(list(payload)))


# --- the everyday path ---------------------------------------------------------------

def test_action_inside_the_grant_is_allowed():
    d = guardian.decide(action("artifact.write", "mission"), grant(["artifact.write:mission"]))
    assert d.outcome == ALLOW
    assert d.required_scope == "artifact.write:mission"


def test_network_action_is_scoped_to_its_destination():
    g = grant(["http.fetch:fonts.googleapis.com"])
    assert guardian.decide(action("http.fetch", "font", "fonts.googleapis.com"), g).outcome == ALLOW
    # Same action, same agent, somewhere else entirely.
    d = guardian.decide(action("http.fetch", "font", "totally-not-fonts.example.net"), g)
    assert d.outcome == DENY
    assert "not authorized" in d.reason


def test_wildcard_scope_covers_the_whole_action():
    assert guardian.decide(action("artifact.write", "anything"), grant(["artifact.write:*"])).outcome == ALLOW


# --- the point of the whole thing ----------------------------------------------------

def test_verified_agent_without_the_scope_is_still_denied():
    """Identity verified, good standing, right capability — and still not allowed to do this."""
    d = guardian.decide(action("external.upload", "brand_kit", "agent-telemetry.example.net"),
                        grant(["artifact.write:mission", "http.fetch:fonts.googleapis.com"]))
    assert d.outcome == DENY
    assert d.rules == ["scope-missing"]


def test_no_grant_means_no_authority():
    d = guardian.decide(action("artifact.write", "mission"), None)
    assert d.outcome == DENY
    assert d.rules == ["grant-required"]


def test_a_grant_for_another_mission_does_not_travel():
    d = guardian.decide(action("artifact.write", "mission"), grant(["artifact.write:mission"], mission_id="m_other"))
    assert d.outcome == DENY
    assert d.rules == ["grant-mismatch"]


def test_a_grant_for_another_agent_does_not_travel():
    d = guardian.decide(action("artifact.write", "mission"),
                        grant(["artifact.write:mission"], ans_name="ans://v1.0.0.brand.brandstudio.xyz"))
    assert d.outcome == DENY
    assert d.rules == ["grant-mismatch"]


def test_expired_grant_is_denied():
    d = guardian.decide(action("artifact.write", "mission"), grant(["artifact.write:mission"], minutes=1),
                        at=guardian.now() + dt.timedelta(minutes=5))
    assert d.outcome == DENY
    assert d.rules == ["grant-expired"]


def test_revoked_grant_is_denied():
    d = guardian.decide(action("artifact.write", "mission"),
                        grant(["artifact.write:mission"], status="revoked"))
    assert d.outcome == DENY


# --- hard denies ----------------------------------------------------------------------

@pytest.mark.parametrize("act", sorted(guardian.HARD_DENY))
def test_hard_denied_actions_are_refused_even_with_a_scope_for_them(act):
    d = guardian.decide(action(act, "anything"), grant([f"{act}:anything", f"{act}:*"]))
    assert d.outcome == DENY
    assert d.rules == ["hard-deny"]


@pytest.mark.parametrize("act", sorted(guardian.HARD_DENY))
def test_a_human_cannot_approve_a_hard_denied_action(act):
    """The tired-operator-at-3am test: clicking approve must not unlock these."""
    req = action(act, "anything")
    approved = Approval("a_1", req, decided="approve",
                        expires_at=guardian.iso(guardian.now() + dt.timedelta(minutes=5)))
    d = guardian.decide(req, grant([f"{act}:*"]), approval=approved)
    assert d.outcome == DENY
    assert d.rules == ["hard-deny"]


# --- human review ----------------------------------------------------------------------

def review_request():
    return action("site.publish", "site", payload=("<html>v1</html>",))


def approval_for(req, decided="approve", used=False):
    return Approval("a_1", req, decided=decided, used=used,
                    expires_at=guardian.iso(guardian.now() + dt.timedelta(minutes=5)))


def test_outward_facing_action_waits_for_a_human_even_with_the_scope():
    d = guardian.decide(review_request(), grant(["site.publish:site"]))
    assert d.outcome == REVIEW
    assert d.rules == ["review-required"]


def test_human_can_authorize_once():
    req = review_request()
    d = guardian.decide(req, grant(["site.publish:site"]), approval=approval_for(req))
    assert d.outcome == ALLOW
    assert d.rules == ["review-approved"]


def test_human_rejection_denies():
    req = review_request()
    d = guardian.decide(req, grant(["site.publish:site"]), approval=approval_for(req, decided="reject"))
    assert d.outcome == DENY
    assert d.rules == ["review-rejected"]


def test_changing_the_payload_invalidates_the_approval():
    approved = approval_for(review_request())
    tampered = action("site.publish", "site", payload=("<html>v2 with an extra tracker</html>",))
    d = guardian.decide(tampered, grant(["site.publish:site"]), approval=approved)
    assert d.outcome == DENY
    assert d.rules == ["approval-invalid"]
    assert "payload changed" in d.reason


def test_an_approval_cannot_be_replayed():
    req = review_request()
    d = guardian.decide(req, grant(["site.publish:site"]), approval=approval_for(req, used=True))
    assert d.outcome == DENY
    assert "already used" in d.reason


def test_an_expired_approval_does_not_count():
    req = review_request()
    stale = Approval("a_1", req, decided="approve",
                     expires_at=guardian.iso(guardian.now() - dt.timedelta(minutes=1)))
    d = guardian.decide(req, grant(["site.publish:site"]), approval=stale)
    assert d.outcome == DENY
    assert "expired" in d.reason


def test_an_approval_for_a_different_action_does_not_transfer():
    approved = approval_for(review_request())
    other = action("email.send", "owner", payload=("<html>v1</html>",))
    d = guardian.decide(other, grant(["email.send:owner", "site.publish:site"]), approval=approved)
    assert d.outcome == DENY
    assert d.rules == ["approval-invalid"]


# --- scope shape -------------------------------------------------------------------------

def test_scope_is_built_from_destination_for_network_actions_and_resource_otherwise():
    assert action("external.upload", "brand_kit", "example.net").required_scope == "external.upload:example.net"
    assert action("artifact.write", "mission").required_scope == "artifact.write:mission"
