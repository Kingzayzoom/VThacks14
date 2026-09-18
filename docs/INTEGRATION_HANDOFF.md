# Integration handoff / Phase A

Roheen owns visual approval. Zabish and Ashraf own the future hosted runtime, provider configuration, ANS and backend. Agree their actual split before assigning implementation work.

## Current readiness
| Area | Demo implementation | Live/configured | Live-tested |
| --- | --- | --- | --- |
| Mission composer / FIELD | Implemented, browser tested | Not connected | No |
| Identity / scopes | Labeled fixture evidence | No ANS adapter | No |
| Recruitment | Read-only capability-request preview | Not implemented | No |
| Guardian | Independent inspector/boundary | No enforcement gateway | No |
| Voice | Not-configured dialog, text fallback | No ElevenLabs adapter | No |
| Persistence | Optional localStorage demo snapshot | No database | No |

No provider SDKs are installed. No paid provider calls, microphone capture, agent registration, deployment, or real external tool actions were performed.

## Configuration
`.env.example` is the exact empty template from MASTER_PROMPT.md. Existing `.env.local` values were preserved; only missing names were added empty. Ignore rules protect private environment and certificate files. Only NEXT_PUBLIC_APP_NAME and NEXT_PUBLIC_APP_URL are public metadata names; provider secrets must stay server-side.

Blank PERIHELION_RUNTIME_MODE selects demo. Live or invalid modes show a setup error and never silently fall back to a successful simulation. Phase A intentionally cannot activate live adapters, even with keys present. Optional numeric env parsing is not implemented because no execution limits are consumed yet; normalize blank values before adding it.

Primary future names: GEMINI_API_KEY, GEMINI_MODEL; ELEVENLABS_API_KEY, ELEVENLABS_AGENT_ID; ANS_REGISTRY_BASE_URL, GODADDY_API_KEY, GODADDY_API_SECRET; AGENT_RUNTIME_BASE_URL, AGENT_RUNTIME_API_TOKEN. The complete list is in `.env.example`; do not copy values into docs or browser forms.

ANS names are project adapter inputs, not promised SDK variables. Confirm sponsor environment/authentication and exact installed SDK versions when integration is authorized.

## Next step
Stop for Roheen's Phase A visual review. After approval, complete the deterministic frontend scenario and remaining routes (Phase B), then full error/reconnect and contract validation (C). Live wiring (D) requires separate authorization. Replace the adapter behind ControlApi; preserve the approved component layout. Authenticate server requests, validate outputs, enforce policy before tool execution, and return only sanitized readiness/evidence.
