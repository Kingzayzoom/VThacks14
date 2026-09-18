# Who owns what

Four people, one weekend, one repo. The territories below are drawn so that two people almost
never need the same file at the same time.

**Everyone, before anything else:** read [`../onboarding.md`](../onboarding.md) and paste it into
your AI assistant. Then read your brief below. Then [`../status.md`](../status.md) for what is
currently done and open.

| Who | Owns | Brief |
|---|---|---|
| **Zay** | Trust, Guardian, orchestration — the core | [core.md](core.md) |
| **Frontend** | `dashboard/` — the entire UI | [frontend.md](frontend.md) |
| **Live ANS** | GoDaddy integration, domain, DNS, deployment | [live-ans.md](live-ans.md) |
| **Agents & demo** | What agents produce, and the run-of-show | [agents-and-demo.md](agents-and-demo.md) |

## File territories

```
Zay                mc/trustgate.py  mc/guardian.py  mc/standing.py  mc/planning.py
                   mc/crypto.py  mc/merkle.py  mc/identity.py
                   services/agents/commander.py  services/hub/guardian.py
                   services/ans_sim/

Frontend           dashboard/          (everything — HTML, CSS, JS)

Live ANS           mc/ans/godaddy_client.py  mc/ans/base.py  mc/ans/sim_client.py
                   scripts/check_ans.py  scripts/register_agents.py
                   .env.example  deployment/

Agents & demo      mc/skills.py  mc/llm.py  services/agents/vendor.py
                   scripts/smoke_test.py  docs/demo-script.md
```

**One genuinely shared file: `config/agents.yaml`.** Live ANS owns the domains and endpoints
section; Agents owns `job_scopes` and any `llm:` settings; Zay owns the policy block. Say in chat
before you edit it, and keep your edit to your own section.

**One genuinely shared document: [`../contracts.md`](../contracts.md).** If you change an event
name, add a field, or change an API shape, update it *in the same commit*. The frontend is built
from that file, not from reading Python.

## How we avoid stepping on each other

- **Branch off `main`.** `git checkout -b live-ans`, `git checkout -b frontend`, etc. Small
  commits. Push often — an unpushed branch helps nobody.
- **Merge into `main` at least twice a day.** The longer a branch lives the worse the merge.
- **Run `pytest` before you push.** Under a second, 90 tests, catches most collisions.
- **Run `python scripts/smoke_test.py` before you merge anything structural.** It asserts the
  whole demo end to end and will tell you if you broke someone else's scenario.
- **If you need something from another territory, ask rather than reaching in.** A two-line change
  in someone else's file at 3am is how a merge conflict becomes a demo failure.

## The ground rules nobody may break

These are in [`../onboarding.md`](../onboarding.md) §10 in full. The short version:

1. Never show a green check you did not earn.
2. Fail closed, and say which kind of no it was.
3. No secret ever reaches the browser.
4. No fake progress — UI state comes from events, never timers.
5. Never silently fall back from a failed live call to a fake success.
6. The model explains; deterministic code decides.

**If a rule is making your work harder, raise it in chat.** Do not quietly route around it —
those rules *are* the product. There is almost always an honest version that demos better.

## Status and priorities

Read [`../status.md`](../status.md). Current top three, in order:

1. **Live ANS working** — the prize track is "Best Use of ANS". Blocked on a sponsor PAT.
2. **Demo reliability** — it has to work on the presentation machine, three times running.
3. **Frontend** — the architecture has to be legible in five seconds.

Everything else is nice to have.
