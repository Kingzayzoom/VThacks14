"""An agent's ANS identity: its private key, identity certificate and registration.

Private keys live in keys/ (gitignored) and never leave this machine — they are never
sent to ANS, other agents, the dashboard or the LLM.
"""
import json
import re
from dataclasses import dataclass

from . import crypto
from .ans import AnsClient, AnsError
from .config import KEYS_DIR, ans_name as make_ans_name, host_of, parse_ans_name


@dataclass
class Identity:
    ans_name: str
    agent_id: str
    key: object
    cert_pem: str

    @property
    def cert(self):
        return crypto.load_cert(self.cert_pem)

    @property
    def fingerprint(self) -> str:
        return crypto.cert_fingerprint(self.cert)

    @property
    def version(self) -> str:
        return parse_ans_name(self.ans_name)["version"]

    def sign(self, data: bytes) -> str:
        return crypto.sign(self.key, data)

    def sign_obj(self, obj) -> str:
        return self.sign(crypto.canonical(obj))


def _dir(ans_name: str):
    return KEYS_DIR / re.sub(r"[^A-Za-z0-9.-]", "_", ans_name.replace("ans://", ""))


def load_identity(ans_name: str) -> Identity | None:
    d = _dir(ans_name)
    try:
        meta = json.loads((d / "meta.json").read_text())
        return Identity(ans_name, meta["agent_id"], crypto.load_key((d / "key.pem").read_text()),
                        (d / "cert.pem").read_text())
    except FileNotFoundError:
        return None


def _save_identity(ident: Identity) -> None:
    d = _dir(ident.ans_name)
    d.mkdir(parents=True, exist_ok=True)
    (d / "key.pem").write_text(crypto.key_to_pem(ident.key))
    (d / "cert.pem").write_text(ident.cert_pem)
    (d / "meta.json").write_text(json.dumps({"agent_id": ident.agent_id, "ans_name": ident.ans_name}, indent=1))


async def register_identity(ans: AnsClient, cfg: dict, version: str, endpoint: str,
                            supersedes: str | None = None, log=print) -> Identity:
    """Full ANS registration: key + CSR -> submit -> prove domain control -> receive certificate."""
    name = make_ans_name(cfg, version)
    key = crypto.new_key()
    csr = crypto.make_csr(key, name, host_of(cfg))
    log(f"[{cfg['key']}] registering {name}")
    reg = await ans.register(ans_name=name, org=cfg["org"], endpoint=endpoint,
                             agent_card_url=f"{endpoint}/card", capabilities=cfg["capabilities"],
                             csr_pem=csr, supersedes=supersedes)
    rec = reg
    if reg.get("status") == "PENDING_VALIDATION":
        await ans.publish_challenge(reg["challenge"])
        rec = await ans.verify_domain(reg["agent_id"])
    if rec.get("status") != "ACTIVE" or not rec.get("identity_cert_pem"):
        raise AnsError(f"Registration of {name} did not complete: {rec}")
    ident = Identity(name, rec["agent_id"], key, rec["identity_cert_pem"])
    _save_identity(ident)
    log(f"[{cfg['key']}] registered {name} ({ident.fingerprint[:23]}...)")
    return ident


async def ensure_identity(ans: AnsClient, cfg: dict, version: str, endpoint: str, log=print) -> Identity:
    """Load this agent's saved identity if ANS still knows it; otherwise register from scratch."""
    name = make_ans_name(cfg, version)
    ident = load_identity(name)
    if ident:
        rec = await ans.resolve(name)
        if rec and rec["agent_id"] == ident.agent_id and rec.get("identity_cert_pem") == ident.cert_pem:
            return ident
        log(f"[{cfg['key']}] saved identity for {name} is unknown to ANS; registering again")
    return await register_identity(ans, cfg, version, endpoint, log=log)
