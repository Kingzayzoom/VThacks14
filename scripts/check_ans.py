"""Find out, in about thirty seconds, which of our GoDaddy ANS assumptions are true.

Every endpoint and field name in mc/ans/godaddy_client.py comes from GoDaddy's published REST
reference, but documentation is not a running service and we have never had a token to try it
with. This script makes the calls and tells you which ones answered.

Read-only by default: it resolves, searches and reads. It registers or revokes nothing.

    python scripts/check_ans.py
    python scripts/check_ans.py --host brand.yourteam.xyz --version 1.0.0
    python scripts/check_ans.py --capability site.generate

Exit code is 0 if every probe passed, 1 otherwise, so CI can run it too.
"""
import argparse
import asyncio
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from mc import config  # noqa: E402
from mc.ans import AnsError  # noqa: E402
from mc.ans.godaddy_client import GoDaddyAnsClient  # noqa: E402

PASS, FAIL, SKIP = "✓ PASS", "✗ FAIL", "– SKIP"
results: list[tuple[str, str, str]] = []


def record(name: str, outcome: str, detail: str = ""):
    results.append((name, outcome, detail))
    print(f"  {outcome}  {name}" + (f"\n          {detail}" if detail else ""))


async def probe(name: str, coro, *, expect_none_ok: bool = False):
    """Run one call and report what came back, without letting a failure stop the rest."""
    try:
        value = await coro
    except NotImplementedError as exc:
        record(name, SKIP, str(exc).split(".")[0])
        return None
    except AnsError as exc:
        record(name, FAIL, str(exc))
        return None
    except Exception as exc:  # noqa: BLE001 — a probe must never take the script down
        record(name, FAIL, f"{type(exc).__name__}: {exc}")
        return None
    if value is None and not expect_none_ok:
        record(name, FAIL, "no result (404?)")
        return None
    record(name, PASS, _summarise(value))
    return value


def _summarise(value) -> str:
    if isinstance(value, list):
        return f"{len(value)} result(s)" + (f" — first: {list(value[0])[:6]}" if value else "")
    if isinstance(value, dict):
        return f"keys: {sorted(value)[:8]}"
    return str(value)[:120]


async def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--host", help="an agent FQDN you have registered, e.g. brand.yourteam.xyz")
    ap.add_argument("--version", default="1.0.0")
    ap.add_argument("--capability", default="site.generate")
    args = ap.parse_args()

    print("\nGoDaddy ANS preflight")
    print(f"  base url : {config.env('ANS_API_URL') or '(unset)'}")
    print(f"  auth     : {(config.env('ANS_AUTH_MODE', 'pat') or 'pat')}"
          f"  token {'set' if (config.env('ANS_PAT') or config.env('GODADDY_PAT')) else 'MISSING'}")
    print(f"  tlog url : {config.env('ANS_TLOG_URL') or '(unset — standing will be UNVERIFIED)'}")
    print(f"  ca bundle: {config.env('ANS_CA_BUNDLE_PATH') or '(unset — cert chains cannot be anchored)'}\n")

    try:
        ans = GoDaddyAnsClient()
    except AnsError as exc:
        print(f"  {FAIL}  client construction\n          {exc}\n")
        return 1

    print("Discovery (read-only)")
    agents = await probe(f"GET /v1/ans/registered-agents  capabilities={args.capability}",
                         ans.search(capability=args.capability), expect_none_ok=True)

    host = args.host
    if not host and agents:
        host = agents[0].get("host")
        print(f"\n  (using {host} from the search result)")

    if host:
        print("\nResolution and identity")
        ans_name = f"ans://v{args.version}.{host}"
        record_ = await probe(f"POST /v1/agents/resolution  {host} @ {args.version}",
                              ans.resolve(ans_name))
        if record_:
            for field, why in (("ans_name", "the versioned name"),
                               ("endpoint", "endpoints[].agentUrl"),
                               ("agent_card_url", "endpoints[].metaDataUrl"),
                               ("capabilities", "endpoints[].functions[].name"),
                               ("status", "lifecycle"),
                               ("identity_cert_pem", "GET /certificates/identity")):
                value = record_.get(field)
                record(f"    field {field}  ({why})", PASS if value else FAIL,
                       "" if value else "missing — our mapping is wrong or the call needs a scope")
            if record_.get("agent_id"):
                print("\nEvidence")
                await probe(f"status token for {record_['agent_id']}",
                            ans.status_token(record_["agent_id"]))
                await probe("transparency-log root keys", ans.status_public_key())
    else:
        print("\n  (no host to resolve — pass --host once you have registered one)")

    print("\nTrust anchor")
    await probe("ANS identity CA root", ans.ca_cert())

    failed = [r for r in results if r[1] == FAIL]
    skipped = [r for r in results if r[1] == SKIP]
    print(f"\n{len(results) - len(failed) - len(skipped)} passed, {len(failed)} failed, "
          f"{len(skipped)} skipped (not configured)\n")
    if failed:
        print("Failures are what to take back to the sponsor — each one is a documented")
        print("assumption in mc/ans/godaddy_client.py that did not survive contact:\n")
        for name, _, detail in failed:
            print(f"  · {name}\n      {detail}")
        print()
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
