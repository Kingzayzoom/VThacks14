"""ANS client. Pick the backend with ANS_BACKEND=sim (local simulator) or ANS_BACKEND=godaddy."""
from ..config import env
from .base import AnsClient, AnsError


def get_ans_client() -> AnsClient:
    backend = (env("ANS_BACKEND", "sim") or "sim").lower()
    if backend == "godaddy":
        from .godaddy_client import GoDaddyAnsClient
        return GoDaddyAnsClient()
    from .sim_client import SimAnsClient
    return SimAnsClient()


__all__ = ["AnsClient", "AnsError", "get_ans_client"]
