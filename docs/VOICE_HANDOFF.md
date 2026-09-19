# CONTROL voice handoff

The frontend uses the existing @elevenlabs/client SDK with WebRTC. The server exchanges ELEVENLABS_API_KEY for a short-lived conversation token; only that token reaches the browser. ELEVENLABS_AGENT_ID selects CONTROL. CORTEX_VOICE_ACCESS_CODE must contain at least 24 characters. No microphone is requested until the user starts voice.

Configure one dashboard client tool, named exactly `start_mission`, with response waiting enabled:

```json
{"type":"object","properties":{"objective":{"type":"string","minLength":1,"maxLength":2000}},"required":["objective"],"additionalProperties":false}
```

Suggested instruction: Help the user clarify an objective. When they ask to start, call start_mission. Wait for success and a mission_id before claiming creation. If success is false, say creation failed and direct them to the text composer. You are the conversational interface; Commander plans, ANS verifies identity and Guardian decides authority. You cannot grant scopes, approve actions or call workers.

The client trims and validates input, generates one UUID idempotency key and invokes the exact ControlApi.createMission path used by MissionComposer. One submission is accepted per conversation. Duplicate tool deliveries share its promise; failure does not silently retry. Confirmed success returns mission_id and actual backend status. Demo success explicitly states no external execution. The existing mission screen opens after the tool response resolves.

Closing or navigating away ends voice. Canceling startup closes any eventual late session and ignores late tools. A mission already accepted by the backend is not canceled by closing voice. No voice approval tool is registered.

Actual September 19 check: requests reached ElevenLabs but returned HTTP 401. No token, microphone or conversation was started. Correct the private credential/agent access before a live conversation; never paste secrets into chat. See [LIVE_INTEGRATION.md](LIVE_INTEGRATION.md) for exact commands. Automated validation, lifecycle, credential-containment and actual-SDK microphone-denial tests pass.
