"""Local ANS simulator.

Plays every GoDaddy role on your laptop so the whole demo runs offline:
  - Registration Authority: accepts registrations, checks domain control, manages lifecycle
  - Certificate Authority:  issues identity certificates bound to ANS names
  - Transparency log:       append-only Merkle log with signed tree roots and receipts
  - DNS:                    a stand-in DNS zone for challenges and discovery records

The cryptography is real (X.509, ECDSA, Merkle proofs); only the hosting is local.
State persists in data/ans_sim/ so registrations survive restarts.
"""
import datetime as dt
import json
import secrets
import threading
import uuid

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from mc import crypto, merkle
from mc.config import DATA_DIR, parse_ans_name

STATE_DIR = DATA_DIR / "ans_sim"
STATE_FILE = STATE_DIR / "state.json"

app = FastAPI(title="ANS simulator")
_lock = threading.Lock()


def now() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")


def _load_or_create_keys():
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    ca_key_f, ca_cert_f, tl_key_f = STATE_DIR / "ca_key.pem", STATE_DIR / "ca_cert.pem", STATE_DIR / "tl_key.pem"
    if not ca_key_f.exists():
        key, cert = crypto.make_ca("ANS Simulator Identity CA")
        ca_key_f.write_text(crypto.key_to_pem(key))
        ca_cert_f.write_text(crypto.cert_to_pem(cert))
    if not tl_key_f.exists():
        tl_key_f.write_text(crypto.key_to_pem(crypto.new_key()))
    return (crypto.load_key(ca_key_f.read_text()), crypto.load_cert(ca_cert_f.read_text()),
            crypto.load_key(tl_key_f.read_text()))


CA_KEY, CA_CERT, TL_KEY = _load_or_create_keys()


def _load_state() -> dict:
    if STATE_FILE.exists():
        return json.loads(STATE_FILE.read_text(encoding="utf-8"))
    return {"agents": {}, "log": [], "dns": {}}


STATE = _load_state()
LEAVES = [merkle.leaf_hash(e) for e in STATE["log"]]


def _save():
    STATE_FILE.write_text(json.dumps(STATE, indent=1), encoding="utf-8")


def _append_log(event: str, rec: dict, **data) -> dict:
    entry = {
        "index": len(STATE["log"]), "ts": now(), "event": event,
        "agent_id": rec["agent_id"], "ans_name": rec["ans_name"], "data": data,
    }
    STATE["log"].append(entry)
    LEAVES.append(merkle.leaf_hash(entry))
    return entry


def _public(rec: dict) -> dict:
    return {k: v for k, v in rec.items() if k not in ("csr_pem", "challenge")}


def _get(agent_id: str) -> dict:
    rec = STATE["agents"].get(agent_id)
    if not rec:
        raise HTTPException(404, "No agent with that id")
    return rec


# --- registration ---------------------------------------------------------------

class RegisterBody(BaseModel):
    ans_name: str
    org: str
    endpoint: str
    agent_card_url: str
    capabilities: list[str]
    csr_pem: str
    supersedes: str | None = None


@app.post("/v1/agents")
def register(body: RegisterBody):
    parsed = parse_ans_name(body.ans_name)
    if not parsed:
        raise HTTPException(400, "ans_name must look like ans://v1.0.0.label.domain")
    try:
        csr = crypto.load_csr(body.csr_pem)
    except ValueError:
        raise HTTPException(400, "csr_pem is not a valid CSR")
    if not csr.is_signature_valid:
        raise HTTPException(400, "CSR signature is invalid")
    try:
        san_uris = csr.extensions.get_extension_for_class(crypto.x509.SubjectAlternativeName).value \
            .get_values_for_type(crypto.x509.UniformResourceIdentifier)
    except crypto.x509.ExtensionNotFound:
        san_uris = []
    if body.ans_name not in san_uris:
        raise HTTPException(400, "CSR must name the ANS name in its subjectAltName")

    with _lock:
        for rec in STATE["agents"].values():
            if rec["ans_name"] == body.ans_name and rec["status"] != "PENDING_VALIDATION":
                raise HTTPException(409, "That ANS name is already registered. Names are permanent; use a new version.")
        agent_id = str(uuid.uuid4())
        challenge = {
            "type": "dns-txt",
            "name": f"_ans-challenge.{parsed['host']}",
            "value": "ans-verify=" + secrets.token_urlsafe(18),
        }
        STATE["agents"][agent_id] = {
            "agent_id": agent_id, "ans_name": body.ans_name, "host": parsed["host"],
            "label": parsed["label"], "domain": parsed["domain"], "version": parsed["version"],
            "org": body.org, "endpoint": body.endpoint, "agent_card_url": body.agent_card_url,
            "capabilities": body.capabilities, "status": "PENDING_VALIDATION", "status_reason": None,
            "identity_cert_pem": None, "csr_pem": body.csr_pem, "challenge": challenge,
            "supersedes": body.supersedes, "registered_at": None, "updated_at": now(),
        }
        _save()
    return {"agent_id": agent_id, "status": "PENDING_VALIDATION", "challenge": challenge}


@app.post("/v1/agents/{agent_id}/verify")
def verify(agent_id: str):
    with _lock:
        rec = _get(agent_id)
        if rec["status"] != "PENDING_VALIDATION":
            return _public(rec)
        ch = rec["challenge"]
        if ch["value"] not in STATE["dns"].get(ch["name"], []):
            raise HTTPException(400, f"Domain check failed: TXT record {ch['name']} not found")

        cert = crypto.issue_cert(CA_KEY, CA_CERT, rec["csr_pem"])
        rec.update(identity_cert_pem=crypto.cert_to_pem(cert), status="ACTIVE",
                   registered_at=now(), updated_at=now())
        host = rec["host"]
        STATE["dns"][f"_ans.{host}"] = [f"url={rec['agent_card_url']}"]
        STATE["dns"][f"_ra-badge.{host}"] = [f"v=ra-badge1; agent={rec['agent_id']}"]
        STATE["dns"].pop(ch["name"], None)

        _append_log("AGENT_REGISTERED", rec, fingerprint=crypto.cert_fingerprint(cert),
                    validation={"domainControl": "success", "csr": "success"},
                    capabilities=rec["capabilities"], endpoint=rec["endpoint"])

        old = STATE["agents"].get(rec.get("supersedes") or "")
        if old and old["status"] == "ACTIVE":
            old.update(status="SUPERSEDED", status_reason=f"Replaced by {rec['ans_name']}", updated_at=now())
            _append_log("AGENT_SUPERSEDED", old, by=rec["ans_name"])
        _save()
        return _public(rec)


# --- lookup ----------------------------------------------------------------------

@app.get("/v1/resolve")
def resolve(name: str):
    for rec in STATE["agents"].values():
        if rec["ans_name"] == name and rec["status"] != "PENDING_VALIDATION":
            return _public(rec)
    raise HTTPException(404, "No agent registered under that ANS name")


@app.get("/v1/agents")
def search(capability: str | None = None, host: str | None = None, status: str | None = None):
    out = []
    for rec in STATE["agents"].values():
        if rec["status"] == "PENDING_VALIDATION":
            continue
        if capability and capability not in rec["capabilities"]:
            continue
        if host and rec["host"] != host:
            continue
        if status and rec["status"] != status:
            continue
        out.append(_public(rec))
    return sorted(out, key=lambda r: r["registered_at"] or "")


@app.get("/v1/agents/{agent_id}")
def get_agent(agent_id: str):
    return _public(_get(agent_id))


# --- lifecycle -------------------------------------------------------------------

class ReasonBody(BaseModel):
    reason: str = "Revoked by owner"


@app.post("/v1/agents/{agent_id}/revoke")
def revoke(agent_id: str, body: ReasonBody):
    with _lock:
        rec = _get(agent_id)
        if rec["status"] != "REVOKED":
            rec.update(status="REVOKED", status_reason=body.reason, updated_at=now())
            _append_log("AGENT_REVOKED", rec, reason=body.reason)
            _save()
        return _public(rec)


class StatusBody(BaseModel):
    status: str
    reason: str = "Demo reset"


@app.post("/v1/dev/agents/{agent_id}/status")
def dev_set_status(agent_id: str, body: StatusBody):
    """Demo-only reset. Real ANS can't un-revoke; this exists so the demo can be re-run."""
    if body.status not in ("ACTIVE", "REVOKED", "SUPERSEDED"):
        raise HTTPException(400, "status must be ACTIVE, REVOKED or SUPERSEDED")
    with _lock:
        rec = _get(agent_id)
        if rec["status"] != body.status:
            rec.update(status=body.status, status_reason=body.reason, updated_at=now())
            _append_log("DEMO_STATUS_RESET", rec, status=body.status, reason=body.reason)
            _save()
        return _public(rec)


# --- current standing ------------------------------------------------------------

# GoDaddy documents roughly an hour for hosted ANS status tokens, which is also the window
# in which a revocation becomes visible to anyone holding a fresh one. Same shape here.
STATUS_TOKEN_TTL = 3600


@app.get("/v1/agents/{agent_id}/status-token")
def status_token(agent_id: str):
    """A short-lived signed statement that this agent is in good standing *now*.

    Deliberately separate from the transparency-log receipt: that one proves the registration
    happened and stays true after a revocation, which is exactly why it cannot be the thing
    you check before handing over work.
    """
    rec = _get(agent_id)
    issued = dt.datetime.now(dt.timezone.utc)
    body = {
        "agent_id": agent_id, "ans_name": rec["ans_name"], "version": rec["version"],
        "status": rec["status"], "status_reason": rec.get("status_reason"),
        "issued_at": issued.isoformat(timespec="seconds"),
        "expires_at": (issued + dt.timedelta(seconds=STATUS_TOKEN_TTL)).isoformat(timespec="seconds"),
    }
    return {**body, "signature": crypto.sign(TL_KEY, crypto.canonical(body))}


# --- certificate authority -------------------------------------------------------

@app.get("/v1/ca")
def ca():
    return {"pem": crypto.cert_to_pem(CA_CERT)}


# --- transparency log ------------------------------------------------------------

def _checkpoint(size: int) -> dict:
    root_hex = merkle.root(LEAVES[:size]).hex()
    body = merkle.checkpoint_body(size, root_hex)
    return {**body, "signature": crypto.sign(TL_KEY, crypto.canonical(body))}


@app.get("/v1/log/public-key")
def log_public_key():
    return {"pem": crypto.public_key_to_pem(TL_KEY.public_key())}


@app.get("/v1/log/checkpoint")
def checkpoint():
    return _checkpoint(len(LEAVES))


@app.get("/v1/log")
def log(agent_id: str | None = None, limit: int = 50):
    entries = [e for e in STATE["log"] if not agent_id or e["agent_id"] == agent_id]
    return entries[-limit:]


@app.get("/v1/log/{index}/receipt")
def receipt(index: int):
    with _lock:
        size = len(LEAVES)
        if not 0 <= index < size:
            raise HTTPException(404, "No log entry at that index")
        return {
            "entry": STATE["log"][index],
            "audit_path": [h.hex() for h in merkle.inclusion_path(index, LEAVES[:size])],
            "checkpoint": _checkpoint(size),
        }


# --- simulated DNS ---------------------------------------------------------------

class DnsBody(BaseModel):
    name: str
    value: str


@app.post("/v1/dev/dns")
def set_dns(body: DnsBody):
    with _lock:
        STATE["dns"][body.name] = [body.value]
        _save()
    return {"ok": True}


@app.get("/v1/dev/dns")
def get_dns():
    return STATE["dns"]


@app.get("/health")
def health():
    return {"ok": True, "agents": len(STATE["agents"]), "log_size": len(LEAVES)}
