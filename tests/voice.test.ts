import { test } from "node:test";
import assert from "node:assert/strict";
import type { PartialOptions } from "@elevenlabs/client";
import { issueVoiceSession, voiceConfigured } from "../src/lib/voice/session-server";
import { makeMission } from "../src/lib/demo/fixtures";
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
test("start_mission rejects invalid or extra parameters, creates exactly once and returns confirmed ID/status", async () => {
  let options!: PartialOptions, calls = 0;
  const states: VoiceState[] = [], muted: boolean[] = [], created: string[] = [];
  let stopped = 0, release!: () => void;
  const wait = new Promise<void>(resolve => { release = resolve; });
  const mission = { ...makeMission("m_confirmed", "Plan the launch", new Date().toISOString()).mission, source: "live" as const, backendStatus: "planning" };
  const voice = new VoiceSession({ state: s => states.push(s), createMission: async input => { calls++; assert.equal(input.objective, "Plan the launch"); assert.match(input.idempotencyKey, /^voice-/); await wait; return mission; }, created: m => { created.push(m.id); }, error: () => {} }, token, async value => {
    options = value; return { endSession: async () => { stopped++; }, setMicMuted: value => muted.push(value) };
  });
  await voice.start("test");
  assert.deepEqual(Object.keys(options.clientTools ?? {}), ["start_mission"]);
  const start = options.clientTools!.start_mission;
  for (const input of [{objective:" "}, {objective:"x".repeat(2001)}, {objective:42}, {objective:"Do work", permission:"admin"}]) assert.equal(JSON.parse(String(await start(input))).success, false);
  assert.equal(calls, 0);
  const first = start({ objective: " Plan the launch " });
  const duplicate = start({ objective: "Plan the launch" });
  await Promise.resolve(); assert.equal(calls, 1); assert.deepEqual(created, []);
  release();
  const result = JSON.parse(String(await first));
  assert.equal(result.success, true); assert.equal(result.mission_id, "m_confirmed"); assert.equal(result.status, "planning");
  assert.equal(await duplicate, JSON.stringify(result));
  await new Promise(resolve => setTimeout(resolve, 5)); assert.deepEqual(created, ["m_confirmed"]);
  assert.equal(JSON.parse(String(await start({objective:"Another objective"}))).success, false);
  voice.toggleMute(); voice.toggleMute(); assert.deepEqual(muted, [true, false]);
  await voice.stop(); assert.equal(stopped, 1); assert.equal(states.at(-1), "idle");
  assert.match(String(await start({objective:"After closing"})), /canceled/);
});
test("failed mission creation is truthful and repeated tool delivery does not retry it", async () => {
  let options!: PartialOptions, calls = 0;
  const voice = new VoiceSession({ state: () => {}, created: () => assert.fail("cannot navigate"), createMission: async () => { calls++; throw new Error("private upstream error"); }, error: () => {} }, token, async value => { options = value; return { endSession: async () => {}, setMicMuted: () => {} }; });
  await voice.start("test");
  const run = () => options.clientTools!.start_mission({ objective: "Test" });
  assert.deepEqual(JSON.parse(String(await run())), {success:false,message:"Mission creation failed."});
  await run(); assert.equal(calls, 1); await voice.stop();
});
test("cancel during SDK startup closes the late session and ignores late tool events", async () => {
  let release!: () => void, entered!: () => void;
  const started = new Promise<void>((resolve) => { entered = resolve; });
  const wait = new Promise<void>((resolve) => { release = resolve; });
  let stopped = 0, options!: PartialOptions;
  const voice = new VoiceSession({ state: () => {}, createMission: async () => assert.fail("late mission"), created: () => assert.fail("late navigation"), error: () => {} }, token, async (value) => {
    options = value; entered(); await wait;
    return { endSession: async () => { stopped++; }, setMicMuted: () => {} };
  });
  const connecting = voice.start("test");
  await started; await voice.stop(); release(); await connecting;
  assert.equal(stopped, 1);
  assert.match(String(await options.clientTools!.start_mission({ objective: "late" })), /canceled/);
});
test("authentication failure never starts the microphone SDK", async () => {
  let starts = 0;
  const errors: string[] = [];
  const voice = new VoiceSession({ state: () => {}, createMission: async () => assert.fail("unauthenticated mission"), created: () => {}, error: (e) => errors.push(e) },
    async () => Response.json({ error: "The voice access code was not accepted." }, { status: 401 }),
    async () => { starts++; throw new Error(); });
  await voice.start("wrong");
  assert.equal(starts, 0);
  assert.match(errors.at(-1)!, /access code/);
});
