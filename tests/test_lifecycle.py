"""Lifecycle states: refusing a hire is not the same as accusing an agent.

Real ANS has eight states, not the four our simulator uses. All of them except ACTIVE stop the
hire — that part is easy. The part worth testing is that they do not all *read* the same:
PENDING_DNS means our own registration is half-finished, REVOKED means a key was withdrawn.
Reporting the first as a hard failure sends someone hunting a compromised agent when what they
actually need is a DNS record.
"""
import asyncio

import pytest

from mc.trustgate import TrustGate


class NoAns:
    """A registry that cannot answer.

    Judging a non-ACTIVE record needs nothing from it. An ACTIVE one does — and when the
    evidence cannot be fetched the answer is `unverified`, which is what these stubs produce.
    """
    backend = "test"

    async def log(self, *a, **k):
        raise NotImplementedError("no registry in this test")

    async def status_public_key(self):
        raise NotImplementedError("no registry in this test")


def check_for(status, reason=None):
    gate = TrustGate(NoAns(), "ans://v1.0.0.commander.test")
    record = {"status": status, "status_reason": reason, "agent_id": "a-1",
              "ans_name": "ans://v1.0.0.agent.example.com"}
    result, index = asyncio.run(gate._status_check(record))
    assert index is None
    return result


@pytest.mark.parametrize("status", ["PENDING_VALIDATION", "PENDING_CERTS", "PENDING_DNS"])
def test_a_half_finished_registration_is_unverified_not_a_failure(status):
    """Nothing has gone wrong with the agent. Our setup simply is not done."""
    c = check_for(status)
    assert c.ok is False, "it still refuses the hire"
    assert c.state == "unverified", "but it is not evidence against the agent"


@pytest.mark.parametrize("status", ["REVOKED", "EXPIRED", "FAILED", "SUPERSEDED", "DEPRECATED"])
def test_a_real_lifecycle_problem_is_a_failure(status):
    c = check_for(status)
    assert c.ok is False
    assert c.state == "fail"


def test_each_state_explains_itself_in_words_rather_than_an_enum():
    assert "discovery records" in check_for("PENDING_DNS").detail
    assert "domain control" in check_for("PENDING_VALIDATION").detail
    assert "deprecated" in check_for("DEPRECATED").detail.lower()
    assert "lapsed" in check_for("EXPIRED").detail


def test_the_revocation_reason_is_carried_through():
    c = check_for("REVOKED", "KEY_COMPROMISE")
    assert "REVOKED" in c.detail and "KEY_COMPROMISE" in c.detail


def test_the_raw_registry_state_is_kept_as_evidence():
    assert check_for("PENDING_DNS").evidence["registry_status"] == "PENDING_DNS"


def test_an_unknown_future_state_still_refuses_the_hire():
    """ANS is a moving target. A state we have never heard of must fail closed, not pass."""
    c = check_for("SOME_NEW_STATE")
    assert c.ok is False and c.state == "fail"


def test_case_from_a_provider_is_normalised():
    """A provider sending "active" means ACTIVE. It should reach the evidence checks rather
    than be rejected as a state we have never heard of."""
    c = check_for("active")
    assert c.evidence.get("registry_status") != "active", "it got past the lifecycle branch"
    assert c.state == "unverified", "and then failed for want of evidence, which is honest"
