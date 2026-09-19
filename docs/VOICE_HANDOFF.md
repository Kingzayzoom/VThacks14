# Voice assistant and mission handoff

The frontend uses `@elevenlabs/client` 1.25.0 with WebRTC. The Next.js server
exchanges a server-only API key for a short-lived conversation token. Voice stays
unavailable with empty configuration; opening the dialog never requests a microphone.

## Configure the team's private demo

Set these in the local environment or the existing Vercel project's environment settings:

- `ELEVENLABS_API_KEY`: ElevenLabs key with access to the chosen agent.
- `ELEVENLABS_AGENT_ID`: that agent's ID.
- `CORTEX_VOICE_ACCESS_CODE`: a random private invitation code, at least 24 characters.

The last value protects token issuance on the public site. Share it privately with
authorized demo participants. It is entered once per connection, cleared immediately,
and never stored. No provider key is sent to the browser. Configure appropriate
concurrency and conversation-duration limits in ElevenLabs before enabling the public
deployment. The invite is a small private-demo gate; account-based authentication and
distributed rate limiting belong in the eventual hub/auth integration.

Create a **client tool** named `draft_mission` on the ElevenLabs agent, with one required
string parameter `objective` (1–2000 characters). Enable waiting for the tool response.
Suggested instruction: “Help the user clarify their objective. Call draft_mission when
they are ready to review it. A draft is not an executed mission. Explain that they must
review and submit it on screen. Never claim an action ran or permission was granted.”
Do not add a voice tool that bypasses the hub, approves Guardian actions, or calls a worker.

## Integration boundary

`draft_mission` only produces a validated editable draft. The existing `MissionComposer`
submits it through `useControl().api.createMission`, retaining validation, idempotency,
and the current runtime choice. With today's provider, that creates a **demo mission**.
When P1 selects the real adapter, the same handoff uses that adapter; P3 remains responsible
for actual hub authorization/execution. No backend, provider, shared contract, ANS, or
agent-output packet was modified for this addition.

Closing, switching to text, navigating away, or submitting the draft ends the voice
session. Canceling while it connects also closes any session that finishes late.
Mute and speaking/listening indicators reflect SDK state, not a timer. Only one draft
per conversation is accepted, so later tool calls cannot overwrite the user's edits.

## Validation and outstanding live check

Automated checks cover missing configuration, cross-origin denial, invite denial,
credential containment, malformed/upstream failure responses, draft validation,
mute/end, and late connection cancellation. A browser test loads the actual SDK and
denies microphone permission, confirming it makes no provider request. Browser checks cover the unavailable and
configured dialogs, category filters, keyboard/focus, responsive layout, and text fallback.
No real ElevenLabs call is claimed: local key/agent values were empty during implementation.
Once configured, check a real conversation, interruption, mute, denied microphone access,
the agent's `draft_mission` tool, human submission, and hub execution when P1 lands.

Sources: [JavaScript SDK](https://elevenlabs.io/docs/eleven-agents/libraries/java-script),
[conversation token API](https://elevenlabs.io/docs/eleven-agents/api-reference/conversations/get-webrtc-token),
[client tools](https://elevenlabs.io/docs/eleven-agents/customization/tools/client-tools).
