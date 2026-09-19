# P7 — Live discovery across 216,000 real agents

**Paste [`../GUIDE.md`](../GUIDE.md) first, then this file.**

Branch: `p7-discovery`. **Ready now — needs no credential.** High value: this is the difference
between "we integrated ANS" and "watch it search the real registry live."

---

## The job

`GET /v1/ans/registered-agents` on GoDaddy's **production** registry answers **without any
authentication**, capability filter included. There are 216,110 registered agents in it. Our
Commander currently searches only the local simulator.

Make it search the real one.

## Proven already — do not re-investigate

```
GET https://api.godaddy.com/v1/ans/registered-agents           -> 200, no credential
GET .../registered-agents?query=logo                           -> 200, text search
GET .../registered-agents?capabilities=Generate%20Logo         -> 200, exact match, 1 result
```

`mc/ans/godaddy_client.py` already maps the live record shape correctly (nine tests in
`tests/test_godaddy_mapping.py` pin it to a verbatim captured response). Discovery works today:

```bash
ANS_BACKEND=godaddy ANS_API_URL=https://api.godaddy.com \
  python -c "import asyncio;from mc.ans import get_ans_client;\
print(len(asyncio.run(get_ans_client().search(capability='Generate Logo'))))"
```

## Files you own

```
mc/discovery.py                       new — the two-stage search strategy
tests/test_discovery.py               new
services/agents/commander.py          ONLY the discover() function — coordinate, see below
```

**`services/agents/commander.py` is shared with P3**, which owns the mission-state machine for
pause/resume. Your change is confined to `discover()`; theirs is in `run()` and `Mission`. Say in
chat before you touch it, keep your diff inside `discover()`, and merge often.

**Do not touch** `mc/ans/godaddy_client.py` — P4 owns it. If you need a parameter it does not
send, ask them.

## The problem you are solving

Our planner emits `brand.identity`, `site.generate`, `compliance.review`. **Those strings match
zero of 216,110 agents.** The registry's capability names are free text chosen by whoever
registered: `Generate Logo`, `Generate Website`, `Translate Text`, `Apply Fonts`. There is no
controlled vocabulary and no way to know it in advance.

And text search alone is a trap. `?query=` matches names and descriptions, so:

| query | top hit | what it can actually do |
|---|---|---|
| "build a landing page website" | *Landing Page Customer Support Agent* | `Answer Questions, Order Lookup` |
| "legal compliance review" | *Accessibility Assurance Customer Support* | `Answer Questions, Order Lookup` |
| "translate text" | *Professional Translation Solution Customer Support* | `Answer Questions, Order Lookup` |

~200k of those agents are auto-generated support bots for GoDaddy customers. They all declare the
same two functions and none of them can do the work.

## The two-stage strategy

```
1. CAST      ?query=<phrasings>        high recall, low precision, over 216k
2. HARVEST   read the capability names the results actually declare
3. FILTER    ?capabilities=<exact>     high precision
4. GATE      the Trust Gate's capability check rejects the rest
```

Stage 2 is the interesting one: **you learn the vocabulary from the search results** rather than
knowing it up front. That is the part worth building well.

Turning "I need a logo" into candidate phrasings is model-shaped work — but it must degrade
gracefully, because there may be no model (see `../GUIDE.md` §11). A static synonym map per
capability is a perfectly good fallback and should be the default.

## Tasks

1. **`mc/discovery.py`** — pure strategy functions, no I/O, so they are testable:
   `phrasings_for(capability)`, `harvest_capability_names(results)`, `rank_candidates(...)`.
2. **Wire it into `discover()`** — when the backend is `godaddy`, run the two stages; when it is
   `sim`, keep today's exact-match behaviour so the demo is unaffected.
3. **Emit what you find.** `discovery.candidate_found` already exists and the UI renders it. A
   candidate found in the real registry should carry `source: "GoDaddy ANS"` so a judge can see
   the difference between that and a local one.
4. **Cap it.** 216k agents, paginated 20 at a time. Bound the number of pages and candidates —
   `../GUIDE.md` §14. A mission must not spend ninety seconds searching.
5. **Handle the registry being unreachable** as `discovery.failed`, not a crash.

## The honest ending, and why it is the point

You will find real agents. **You cannot hire them.** Verified:

| Agent | Why not |
|---|---|
| GoDaddy Website Builder (`Generate Website`, `Publish Website`) | DNS does not resolve publicly |
| GoDaddy Logo Generation (`Generate Logo`) | `401 Unauthorized` |
| shopagent.cloud (live, 42 skills) | requires `ansMtls` / `ansJwt` / `apiKey` |

**Do not fake a hire.** Build it so the Commander finds a real agent, verifies what it can, and
stops at the authorization boundary — then falls back to an agent we do have authority over and
completes the mission.

That stop *is* the product. GoDaddy's own documentation says ANS "does not establish that the
caller is authorized to use the agent." Showing that boundary against 216,000 real agents is a
stronger demonstration than hiring five agents we registered ourselves an hour earlier.

## Done when

- [ ] A mission searches the real registry and finds genuinely relevant agents
- [ ] Support-bot noise is filtered out by capability, not by hoping
- [ ] Candidates from real ANS are distinguishable from local ones in the event stream
- [ ] The search is bounded — pages, candidates, and wall-clock time
- [ ] The authorization stop is explicit and legible, not a crash or a silent skip
- [ ] The simulator path is unchanged: `pytest` and `scripts/smoke_test.py` both still pass

## Blocked?

- **Need a credential** — you do not, for search. If something 302s, that is resolution or
  certificates, which is P4's territory.
- **Want to actually hire one** — nobody can. See the table above. Ask the sponsor whether there
  is a reachable sandbox agent we are authorized to invoke; that is the only thing that changes it.
