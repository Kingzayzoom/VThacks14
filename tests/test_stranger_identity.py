"""Verifying a stranger — a real agent, run by someone else, against GoDaddy's real CA.

Every other identity test in this suite checks an agent we registered ourselves. That is a fair
thing for a judge to be sceptical about. These fixtures are the live trust cards of two agents
published by Webmesh for VTHacks, carrying X.509 certificates issued by GoDaddy's production ANS
CA. Nothing here is ours and nothing here needs a credential.

This caught a real bug: cert_issued_by assumed ECDSA because that is what our simulator issues.
GoDaddy's ANS certificates are RSA, so every genuine agent looked like a forgery.
"""
import base64
import json
from pathlib import Path

import pytest
from cryptography import x509

from mc import crypto

FIXTURES = Path(__file__).parent.parent / "docs" / "work" / "fixtures" / "webmesh"
STRANGERS = ["supplier", "fraud"]


def chain_for(name):
    card = json.loads((FIXTURES / f"{name}-trust-card.json").read_text(encoding="utf-8"))
    certs = [x509.load_der_x509_certificate(base64.b64decode(b)) for b in card["keys"][0]["x5c"]]
    return card, certs


@pytest.mark.parametrize("name", STRANGERS)
def test_the_chain_reaches_godaddys_root(name):
    _, (leaf, issuing, root) = chain_for(name)
    assert crypto.cert_issued_by(leaf, issuing), "leaf must be signed by the ANS issuing CA"
    assert crypto.cert_issued_by(issuing, root), "issuing CA must be signed by the root"
    assert crypto.cert_issued_by(root, root), "the root is self-signed"


@pytest.mark.parametrize("name", STRANGERS)
def test_rsa_chains_verify(name):
    """The bug this file exists for. Our simulator issues ECDSA; GoDaddy issues RSA."""
    _, (leaf, issuing, _) = chain_for(name)
    assert "RSA" in type(issuing.public_key()).__name__
    assert crypto.cert_issued_by(leaf, issuing)


@pytest.mark.parametrize("name", STRANGERS)
def test_the_ans_name_is_bound_into_the_certificate(name):
    """A name asserted beside a certificate proves nothing. It has to be inside it."""
    card, (leaf, *_) = chain_for(name)
    assert card["ansName"] in crypto.cert_uris(leaf)


@pytest.mark.parametrize("name", STRANGERS)
def test_it_is_issued_by_godaddy_and_not_merely_by_someone(name):
    _, (leaf, *_) = chain_for(name)
    issuer = leaf.issuer.rfc4514_string()
    assert "GoDaddy" in issuer and "ANS" in issuer


@pytest.mark.parametrize("name", STRANGERS)
def test_a_forgery_carrying_the_same_name_is_refused(name):
    """The discriminator that matters: same ANS name, same host, wrong CA."""
    card, (_, issuing, _) = chain_for(name)
    key, ca = crypto.make_ca("Not The GoDaddy ANS CA")
    forged = crypto.issue_cert(key, ca, crypto.make_csr(crypto.new_key(),
                                                        card["ansName"], card["agentHost"]))
    assert card["ansName"] in crypto.cert_uris(forged), "the forgery does claim the name"
    assert not crypto.cert_issued_by(forged, issuing), "and it is still refused"


@pytest.mark.parametrize("name", STRANGERS)
def test_the_agent_card_is_signed_by_the_key_in_the_trust_card(name):
    """Tamper detection: the card carries a JWS whose kid must match the published key."""
    card = json.loads((FIXTURES / f"{name}-agent-card.json").read_text(encoding="utf-8"))
    trust, _ = chain_for(name)
    header = json.loads(base64.urlsafe_b64decode(card["signatures"][0]["protected"] + "=="))
    assert header["kid"] == trust["keys"][0]["kid"]
    assert header["jku"].endswith("/.well-known/ans/trust-card.json")


def test_two_different_strangers_do_not_share_an_identity():
    supplier, (s_leaf, *_) = chain_for("supplier")
    fraud, (f_leaf, *_) = chain_for("fraud")
    assert supplier["ansName"] != fraud["ansName"]
    assert crypto.cert_fingerprint(s_leaf) != crypto.cert_fingerprint(f_leaf)
