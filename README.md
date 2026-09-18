# Mission Control

**Hire AI agents you can actually trust.** Built for VTHacks 14, GoDaddy "Best Use of ANS" track.

Mission Control turns a plain-English goal into finished work by hiring specialist AI agents from across the web. Before any agent touches the job, it proves who it is through GoDaddy's [Agent Name Service (ANS)](https://www.godaddy.com/ans). Every hire, rejection and deliverable is visible, signed and traceable.

## Docs

- [Product spec](docs/product-spec.html) — what the product does: users, features, screens, journeys, scope
- [Field guide](docs/field-guide.html) — how it works and how to build it: ANS concepts, architecture, flows, data formats, weekend plan

## Stack

- **Agents:** Python + FastAPI
- **Agent brains:** Gemini API
- **Identity:** GoDaddy ANS API
- **Dashboard:** Next.js + React, live updates over WebSocket
