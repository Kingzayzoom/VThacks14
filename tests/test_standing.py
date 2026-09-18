"""Status tokens: proof that an agent is in good standing *now*.

The bug these exist to prevent: accepting an agent because its registration is provably in
the transparency log, when it was revoked ten minutes ago. Inclusion proofs never expire.
Standing has to.
"""
import datetime as dt

from mc import crypto, standing

KEY = crypto.new_key()
PUB = crypto.public_key_to_pem(KEY.public_key())
OTHER = crypto.new_key()


def token(*, status="ACTIVE", status_reason=None, age_seconds=5, ttl=3600, key=KEY, **overrides):
    issued = dt.datetime.now(dt.timezone.utc) - dt.timedelta(seconds=age_seconds)
    body = {
        "agent_id": "a-1", "ans_name": "ans://v1.0.0.sitebuilder.sitesmith.xyz", "version": "1.0.0",
        "status": status, "status_reason": status_reason,
        "issued_at": issued.isoformat(timespec="seconds"),
        "expires_at": (issued + dt.timedelta(seconds=ttl)).isoformat(timespec="seconds"),
    }
    body.update(overrides)
    return {**body, "signature": crypto.sign(key, crypto.canonical(standing.signed_body(body)))}


def test_a_fresh_signed_active_token_passes():
    ok, detail, evidence = standing.verify_status_token(token(), PUB)
    assert ok, detail
    assert evidence["status"] == "ACTIVE"
    assert evidence["age_seconds"] <= 6


def test_a_revoked_agent_fails_even_though_the_token_is_perfectly_valid():
    """The signature is genuine and unexpired. The answer is still no."""
    ok, detail, evidence = standing.verify_status_token(
        token(status="REVOKED", status_reason="KEY_COMPROMISE"), PUB)
    assert not ok
    assert "REVOKED" in detail and "KEY_COMPROMISE" in detail
    assert evidence["status"] == "REVOKED"


def test_an_expired_token_is_not_evidence_of_anything():
    ok, detail, _ = standing.verify_status_token(token(age_seconds=7200, ttl=3600), PUB)
    assert not ok
    assert "expired" in detail


def test_a_token_signed_by_the_wrong_key_is_refused():
    ok, detail, _ = standing.verify_status_token(token(key=OTHER), PUB)
    assert not ok
    assert "not signed by ANS" in detail


def test_editing_the_status_after_signing_invalidates_the_token():
    """The obvious attack: take a real REVOKED token and change one word."""
    t = token(status="REVOKED")
    t["status"] = "ACTIVE"
    ok, detail, _ = standing.verify_status_token(t, PUB)
    assert not ok
    assert "not signed by ANS" in detail


def test_editing_the_expiry_after_signing_invalidates_the_token():
    t = token(age_seconds=7200, ttl=3600)
    t["expires_at"] = (dt.datetime.now(dt.timezone.utc) + dt.timedelta(hours=1)).isoformat(timespec="seconds")
    ok, detail, _ = standing.verify_status_token(t, PUB)
    assert not ok
    assert "not signed by ANS" in detail


def test_an_unsigned_field_cannot_smuggle_anything_in():
    """Only SIGNED_FIELDS are covered; decoration must not change the verdict."""
    t = token()
    t["note"] = "trust me"
    ok, _, _ = standing.verify_status_token(t, PUB)
    assert ok


def test_a_caller_can_demand_the_token_be_recent():
    old = token(age_seconds=1800, ttl=3600)     # valid, but half an hour old
    assert standing.verify_status_token(old, PUB)[0]
    ok, detail, _ = standing.verify_status_token(old, PUB, max_age_seconds=300)
    assert not ok
    assert "we require under 300s" in detail


def test_a_token_from_the_future_is_refused():
    ok, detail, _ = standing.verify_status_token(token(age_seconds=-600), PUB)
    assert not ok
    assert "future" in detail


def test_a_malformed_token_fails_without_raising():
    for bad in ({}, {"issued_at": "not a date"}, {"status": "ACTIVE"}):
        ok, detail, _ = standing.verify_status_token(bad, PUB)
        assert not ok
        assert "malformed" in detail
