"""Mapping GoDaddy's agent records onto ours.

The fixture below is a real response captured from the live OTE registry, not a shape invented
from the documentation. That distinction matters: three of these fields are not where the docs
implied they were, and a wrong mapping produces a record that looks perfectly fine and then fails
every check for reasons that make no sense.
"""
from mc.ans.godaddy_client import GoDaddyAnsClient as G

# Verbatim from GET https://api.ote-godaddy.com/v1/ans/registered-agents
LIVE = {
    "agentId": "7ffeb852-14e3-49d0-bbc1-2d65e44118f9",
    "providerId": "108",
    "ansName": "ans://v1.0.3.domain.anciobanu.com",
    "agentHost": "domain.anciobanu.com",
    "agentDisplayName": "Domain Risk Agent",
    "agentDescription": "Deterministic domain risk scorer",
    "agentVersion": "v1.0.3",
    "indexedAt": "2026-09-18T10:43:03.844735294Z",
    "leafIndex": 818,
    "logId": "01a09028-b57e-7de8-9f9e-2872c1b50eb2",
    "expiresAt": "2026-12-10T09:56:42Z",
    "lifecycle": {"status": "ACTIVE"},
    "scores": {"trustScore": 54, "textScore": 0, "relevance": 54},
    "endpoints": [{
        "agentUrl": "https://domain.anciobanu.com",
        "metaDataUrl": "https://domain.anciobanu.com/.well-known/agent-card.json",
        "protocol": "A2A",
        "transports": ["STREAMABLE-HTTP"],
    }],
}


def test_the_identity_fields_survive_the_mapping():
    r = G._to_record(LIVE)
    assert r["agent_id"] == "7ffeb852-14e3-49d0-bbc1-2d65e44118f9"
    assert r["ans_name"] == "ans://v1.0.3.domain.anciobanu.com"
    assert r["host"] == "domain.anciobanu.com"
    assert r["org"] == "Domain Risk Agent"


def test_status_is_read_from_the_nested_lifecycle():
    """There is no top-level `status`. Reading one gives every agent an empty status."""
    assert G._to_record(LIVE)["status"] == "ACTIVE"


def test_the_version_prefix_is_stripped():
    """GoDaddy sends "v1.0.3". Our policy pins compare against "1.0.3"."""
    assert G._to_record(LIVE)["version"] == "1.0.3"


def test_endpoints_come_from_the_first_endpoint_entry():
    r = G._to_record(LIVE)
    assert r["endpoint"] == "https://domain.anciobanu.com"
    assert r["agent_card_url"] == "https://domain.anciobanu.com/.well-known/agent-card.json"
    assert r["protocol"] == "A2A"


def test_transparency_log_pointers_are_kept():
    """leafIndex and logId are how we would fetch an inclusion proof once we can read COSE."""
    r = G._to_record(LIVE)
    assert r["log_index"] == 818
    assert r["log_id"] == "01a09028-b57e-7de8-9f9e-2872c1b50eb2"


def test_provider_scores_are_kept_but_kept_separate():
    """GoDaddy scores agents. That is their judgement, not ours, and must never be rendered
    as our own safety verdict — so it lives under its own key, clearly attributed."""
    r = G._to_record(LIVE)
    assert r["provider_scores"] == {"trustScore": 54, "textScore": 0, "relevance": 54}
    assert "trustScore" not in r, "a provider score must not be promoted to a top-level field"


def test_capabilities_come_from_registered_function_names():
    with_fns = {**LIVE, "endpoints": [{**LIVE["endpoints"][0], "functions": [
        {"id": "translate_text", "name": "Translate Text"},
        {"id": "translate_doc", "name": "Translate Document"},
    ]}]}
    assert G._to_record(with_fns)["capabilities"] == ["Translate Text", "Translate Document"]


def test_an_agent_with_no_endpoints_does_not_crash_the_mapping():
    r = G._to_record({"agentId": "x", "ansName": "ans://v1.0.0.a.example.com", "agentHost": "a.example.com"})
    assert r["endpoint"] is None and r["status"] == ""


def test_an_identity_certificate_is_never_assumed():
    """The listing does not carry one; it takes a separate authenticated call. Assuming one is
    present would let an unverified agent through the authenticate check."""
    assert G._to_record(LIVE)["identity_cert_pem"] is None
