# P6 — Demo script, rehearsal and failure drills

**Paste [`../onboarding.md`](../onboarding.md) first, then this file.**

Branch: `p6-demo`. High priority by Saturday.

---

## The job

Someone has to own what gets typed, what gets clicked, what gets said, how long it takes, and what
happens when something breaks in front of judges. Nobody is doing that yet.

This packet needs no backend knowledge to start, and it will catch more problems than any amount
of code review.

## Files you own

```
docs/demo-script.md         yours to create
scripts/smoke_test.py       the end-to-end assertion
```

**Nothing else.** If a drill uncovers a bug, write it down and hand it to whoever owns that file.

## Task 1 — the run-of-show

Not a rough plan. The actual thing, with timings, so anyone on the team can present it if the
person who wrote it is debugging something at the time.

- the exact mission text to type — rehearse that exact string
- which scenario checkboxes are on
- every click, in order, with what to say while it happens
- where the two human decisions land (the version-upgrade approval, and the Guardian publish
  request) and who clicks them
- **real measured timings**, not guesses
- what to say if something fails — every failure here has an honest reading, and the honest
  reading is usually more interesting than the happy path

The arc the demo tells:

```
1.  one sentence typed in
2.  the Commander plans it and finds it has nobody for the first job
3.  it searches ANS, finds candidates, runs the Trust Gate
4.  an impostor bids and is refused — it cannot prove it holds the key
5.  real agents are admitted, each with narrow scoped permission
6.  one is revoked mid-job; its work is discarded and a replacement recruited
7.  one ships a new version unannounced; the mission pauses for a human
8.  one tries to send data off-site; the Guardian refuses before anything leaves
9.  compliance sends the work back; it is fixed and re-reviewed
10. a finished, signed, provenanced website
```

## Task 2 — rehearse until it is boring

**Three clean runs on the actual presentation machine**, with that machine's network, or none.
Not your laptop.

```bash
python scripts/run_all.py --fresh    # --fresh before every real run
python scripts/smoke_test.py         # the whole thing, asserted, in a second terminal
```

`DEMO_PACE` in `.env` controls the deliberate pauses — `0` fastest, `1.0` default, `2.0` lets an
audience follow. Tune it to the time you are given.

**One trap that has already bitten us:** only one instance can hold the ports. If a previous
`run_all.py` is still alive, the new one fails to bind and you end up testing stale services with
accumulated state — versions that have crept up, agents already revoked. If results look strange,
that is the first thing to check.

## Task 3 — failure drills

Break things deliberately and confirm the system tells the truth:

| Break | Should show |
|---|---|
| Kill an agent mid-mission | it drops off, a replacement is recruited |
| Kill the ANS simulator | checks report `unverified`, hires refused, nothing pretends to pass |
| Pull the network with Gemini configured | `llm.fallback`, offline templates, `DEGRADED`, mission still finishes |
| Refuse the publish request | action blocked, mission continues |
| Double-click every button | no duplicate missions, no double approvals |
| Let the Guardian review expire | silence counts as no |

**Anything that lies under pressure is a bug worth more than a feature.** Write it up.

One of these is already proven: a configured-but-failing Gemini was tested for real. Four
`llm.fallback` events, `DEGRADED` reported with the actual reason, mission delivered, all five
scenarios green. Nothing pretended to work.

## Task 4 — judge questions

Have the answers ready. The ones that will come:

- *"Is this real ANS or a simulation?"* — say exactly which, and that the cryptography is real
  either way. Never fudge this; it is the one answer that can cost the track.
- *"Couldn't an agent just not ask the Guardian?"* — network actions go out *through* the Guardian,
  so for those there is no other path. For in-process actions the agents cooperate — and here is
  how you would enforce it in production.
- *"You wrote the agent that misbehaves."* — yes, deliberately. A demo where permission is only
  ever granted teaches nobody anything. The refusal is not staged: the Guardian has no special
  knowledge of that request, and the same rules would deny any agent.
- *"What does this actually prove?"* — that an agent is who it says it is, that it is in good
  standing right now, and that it acted inside permissions we granted. **Not** that its output is
  correct. Keeping those three separate is what makes it sound rigorous instead of overclaiming.

## Task 5 — keep the smoke test honest

`scripts/smoke_test.py` asserts all five scenarios end to end. As the other packets land, it is
the thing that catches a broken scenario before a judge does. Keep it passing, and extend it when
someone adds a beat.

**Do not weaken an assertion to make it pass.** A failing smoke test is information.

## Done when

- [ ] `docs/demo-script.md` exists and someone other than you can present from it
- [ ] Three clean runs on the presentation machine, timed
- [ ] Every failure drill done, each one either honest or written up as a bug
- [ ] Judge answers rehearsed
- [ ] `python scripts/smoke_test.py` green
