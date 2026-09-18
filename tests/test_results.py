"""Signed deliverables: what a signature does and does not prove.

A valid signature proves an agent produced these exact bytes at some point. It says nothing
about *which job* they were for, so every check here is about binding work to the request that
asked for it. Without that, an agent can hand back something it signed perfectly well an hour
ago and every cryptographic test passes.
"""
import datetime as dt

import pytest

from mc import crypto
from mc.trustgate import signed_result_body, verify_result

ANS_NAME = "ans://v1.0.0.sitebuilder.sitesmith.xyz"
JOB, MISSION = "job_abc123", "m_xyz789"

CA_KEY, CA_CERT = crypto.make_ca("Test ANS CA")


def issue(ans_name=ANS_NAME):
    key = crypto.new_key()
    csr = crypto.make_csr(key, ans_name, ans_name.replace("ans://v1.0.0.", ""))
    cert = crypto.issue_cert(CA_KEY, CA_CERT, csr)
    return key, crypto.cert_to_pem(cert)


KEY, CERT_PEM = issue()


def deliverable(*, key=KEY, ans_name=ANS_NAME, job_id=JOB, mission_id=MISSION,
                output=None, tamper=None):
    output = {"html": "<html>the work</html>"} if output is None else output
    payload = {
        "job_id": job_id, "mission_id": mission_id, "from": ans_name, "output": output,
        "output_sha256": crypto.sha256_hex(crypto.canonical(output)),
        "engine": "offline",
        "signed_at": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
    }
    signature = crypto.sign(key, crypto.canonical(signed_result_body(payload)))
    if tamper:
        payload.update(tamper)
    return {"payload": payload, "signature": signature}


def check(result, **overrides):
    kwargs = {"expected_from": ANS_NAME, "cert_pem": CERT_PEM, "job_id": JOB, "mission_id": MISSION}
    kwargs.update(overrides)
    return verify_result(result, kwargs.pop("expected_from"), kwargs.pop("cert_pem"), **kwargs)


def test_honest_work_verifies():
    ok, detail = check(deliverable())
    assert ok, detail


# --- the replay this binding exists to stop --------------------------------------------

def test_work_signed_for_another_job_is_refused():
    """Genuinely signed, genuinely this agent's — and not what we asked for."""
    old_work = deliverable(job_id="job_from_an_hour_ago")
    ok, detail = check(old_work)
    assert not ok
    assert "different job" in detail


def test_work_from_another_mission_is_refused():
    ok, detail = check(deliverable(mission_id="m_somebody_elses"))
    assert not ok
    assert "different mission" in detail


def test_a_signature_cannot_be_moved_onto_a_different_job_id():
    """Relabel old work with the job id we asked for, keep its real signature.

    This is the attack the job_id check alone would miss: the payload now says the right thing.
    It fails because job_id is inside what was signed, so relabelling breaks the signature.
    """
    forged = deliverable(job_id="job_other", tamper={"job_id": JOB})
    ok, detail = check(forged)
    assert not ok
    assert "signature doesn't match" in detail


def test_a_signature_cannot_be_moved_onto_a_different_mission():
    forged = deliverable(mission_id="m_other", tamper={"mission_id": MISSION})
    ok, detail = check(forged)
    assert not ok
    assert "signature doesn't match" in detail


# --- the checks that were already there ---------------------------------------------------

def test_work_from_a_different_agent_is_refused():
    other_key, _ = issue("ans://v1.0.0.sitebuilder.webforge.xyz")
    ok, detail = check(deliverable(key=other_key, ans_name="ans://v1.0.0.sitebuilder.webforge.xyz"))
    assert not ok
    assert "different agent" in detail


def test_output_edited_after_signing_is_caught():
    ok, detail = check(deliverable(tamper={"output": {"html": "<html>something else</html>"}}))
    assert not ok
    assert "altered after signing" in detail


def test_a_signature_from_the_wrong_key_is_caught():
    stranger = crypto.new_key()
    ok, detail = check(deliverable(key=stranger))
    assert not ok
    assert "signature doesn't match" in detail


@pytest.mark.parametrize("broken", [
    {}, {"payload": {}}, {"payload": {"from": ANS_NAME}, "signature": "x"},
])
def test_malformed_deliverables_fail_without_raising(broken):
    ok, detail = check(broken)
    assert not ok
    assert detail
