"""Current good standing, as opposed to past registration.

These are two different questions and it is worth being pedantic about the difference:

  inclusion proof  "this registration was entered in the transparency log"
                   History. Verifiable offline, and true forever once it is true.

  status token     "this agent/version is in good standing right now"
                   A short-lived signed claim that expires on purpose.

Conflating them is the mistake that matters: an agent revoked ten minutes ago still has a
perfectly valid inclusion proof, and always will. Only the second question can catch it, and
only if we insist the answer is recent.

GoDaddy's hosted ANS issues these as `X-ANS-Status-Token` alongside the SCITT `X-SCITT-Receipt`,
with roughly an hour's TTL — which is also the window in which a revocation becomes visible.
The local simulator models the same shape with a plain signed JSON body.
"""
import datetime as dt

from . import crypto

# The fields the issuer signs. Anything outside this set is decoration and must not be trusted.
SIGNED_FIELDS = ("agent_id", "ans_name", "version", "status", "status_reason",
                 "issued_at", "expires_at")


def _parse(ts: str) -> dt.datetime:
    return dt.datetime.fromisoformat(ts)


def signed_body(token: dict) -> dict:
    return {k: token.get(k) for k in SIGNED_FIELDS}


def verify_status_token(token: dict, public_key_pem: str, *, now: dt.datetime | None = None,
                        max_age_seconds: int | None = None) -> tuple[bool, str, dict]:
    """Is this a genuine, unexpired statement of standing from ANS?

    Returns (ok, detail, evidence). Evidence is safe to show a user: it carries no secrets,
    only what was claimed, when, and for how long.
    """
    now = now or dt.datetime.now(dt.timezone.utc)
    try:
        issued, expires = _parse(token["issued_at"]), _parse(token["expires_at"])
        age = (now - issued).total_seconds()
        evidence = {
            "status": token.get("status"), "version": token.get("version"),
            "issued_at": token["issued_at"], "expires_at": token["expires_at"],
            "age_seconds": round(age),
        }
    except (KeyError, TypeError, ValueError) as exc:
        return False, f"malformed status token ({exc})", {}

    public_key = crypto.load_public_key(public_key_pem)
    if not crypto.verify(public_key, crypto.canonical(signed_body(token)), token.get("signature", "")):
        return False, "status token is not signed by ANS", evidence
    if now > expires:
        return False, f"status token expired at {token['expires_at']}", evidence
    if age < -60:
        return False, "status token is issued in the future", evidence
    if max_age_seconds is not None and age > max_age_seconds:
        return False, f"status token is {round(age)}s old; we require under {max_age_seconds}s", evidence

    status = token.get("status")
    if status != "ACTIVE":
        reason = f" ({token['status_reason']})" if token.get("status_reason") else ""
        return False, f"ANS says {status}{reason}", evidence
    return True, f"ANS says ACTIVE, signed {round(age)}s ago", evidence
