import { test } from "node:test";
import assert from "node:assert/strict";
import type { PartialOptions } from "@elevenlabs/client";
import { issueVoiceSession, voiceConfigured } from "../src/lib/voice/session-server";
import { VoiceSession, type VoiceState } from "../src/lib/voice/session-client";

const env = { ELEVENLABS_API_KEY: "test-provider-secret", ELEVENLABS_AGENT_ID: "test-agent", CORTEX_VOICE_ACCESS_CODE: "test-access-code-at-least-24-characters" };
const request = (code = env.CORTEX_VOICE_ACCESS_CODE, origin = "https://cortex.test") => new Request("https://cortex.test/api/voice/session", {
  method: "POST", headers: { origin, authorization: `Bearer ${code}` },
});
test("voice fails closed without config, invitation, or same origin; never calls the provider", async () => {
  let calls = 0;
  const fetcher: typeof fetch = async () => { calls++; throw new Error("must not call"); };
  assert.equal(voiceConfigured({}), false);
  assert.equal(voiceConfigured({ ...env, CORTEX_VOICE_ACCESS_CODE: "short" }), false);
  assert.equal((await issueVoiceSession(request(), {}, fetcher)).status, 503);
  assert.equal((await issueVoiceSession(request("wrong"), env, fetcher)).status, 401);
  assert.equal((await issueVoiceSession(request(env.CORTEX_VOICE_ACCESS_CODE, "https://elsewhere.test"), env, fetcher)).status, 403);
  assert.equal(calls, 0);
});
test("voice session passes the API key only upstream and returns only an uncached session token", async () => {
  const response = await issueVoiceSession(request(), env, async (url, options) => {
    assert.equal(new URL(String(url)).searchParams.get("agent_id"), "test-agent");
    assert.equal(new Headers(options?.headers).get("xi-api-key"), env.ELEVENLABS_API_KEY);
    assert.equal(options?.cache, "no-store");
    return Response.json({ token: "short-lived-test-token", secret: "must-not-forward" });
  });
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), { conversationToken: "short-lived-test-token" });
  for (const upstream of [new Response(env.ELEVENLABS_API_KEY, { status: 401 }), Response.json({ token: 42 })]) {
    const failure = await issueVoiceSession(request(), env, async () => upstream);
    assert.equal(failure.status, 502);
    assert.equal((await failure.text()).includes(env.ELEVENLABS_API_KEY), false);
  }
});
const token: typeof fetch = async () => Response.json({ conversationToken: "test-token" });
test("voice tool validates a draft, never overwrites a reviewed draft, and cannot execute missions", async () => {
  let options!: PartialOptions;
  const drafts: string[] = [], states: VoiceState[] = [], muted: boolean[] = [];
  let stopped = 0;
  const voice = new VoiceSession({ state: (s) => states.push(s), draft: (d) => drafts.push(d), error: () => {} }, token, async (value) => {
    options = value;
    return { endSession: async () => { stopped++; }, setMicMuted: (value) => muted.push(value) };
  });
  await voice.start("test");
  assert.equal(options.connectionType, "webrtc");
  assert.deepEqual(Object.keys(options.clientTools ?? {}), ["draft_mission"]);
  const draft = options.clientTools!.draft_mission;
  assert.match(String(await draft({ objective: " " })), /invalid/);
  assert.match(String(await draft({ objective: "Do work", permission: "admin" })), /invalid/);
  assert.match(String(await draft({ objective: " Plan the launch " })), /awaiting_user_confirmation/);
  await draft({ objective: "Replace the edited draft" });
  assert.deepEqual(drafts, ["Plan the launch"]);
  voice.toggleMute(); voice.toggleMute();
  assert.deepEqual(muted, [true, false]);
  await voice.stop();
  assert.equal(stopped, 1);
  assert.equal(states.at(-1), "idle");
  assert.match(String(await draft({ objective: "After closing" })), /canceled/);
});
test("cancel during SDK startup closes the late session and ignores late tool events", async () => {
  let release!: () => void, entered!: () => void;
  const started = new Promise<void>((resolve) => { entered = resolve; });
  const wait = new Promise<void>((resolve) => { release = resolve; });
  let stopped = 0, options!: PartialOptions;
  const voice = new VoiceSession({ state: () => {}, draft: () => assert.fail("late draft"), error: () => {} }, token, async (value) => {
    options = value; entered(); await wait;
    return { endSession: async () => { stopped++; }, setMicMuted: () => {} };
  });
  const connecting = voice.start("test");
  await started; await voice.stop(); release(); await connecting;
  assert.equal(stopped, 1);
  assert.match(String(await options.clientTools!.draft_mission({ objective: "late" })), /canceled/);
});
test("authentication failure never starts the microphone SDK", async () => {
  let starts = 0;
  const errors: string[] = [];
  const voice = new VoiceSession({ state: () => {}, draft: () => {}, error: (e) => errors.push(e) },
    async () => Response.json({ error: "The voice access code was not accepted." }, { status: 401 }),
    async () => { starts++; throw new Error(); });
  await voice.start("wrong");
  assert.equal(starts, 0);
  assert.match(errors.at(-1)!, /access code/);
});
