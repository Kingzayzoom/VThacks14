import { createHash, timingSafeEqual } from "node:crypto";

type VoiceEnv = Record<string, string | undefined>;
const headers = { "Cache-Control": "no-store" };
export function voiceConfigured(env: VoiceEnv) {
  return [env.ELEVENLABS_API_KEY, env.ELEVENLABS_AGENT_ID].every((value) => !!value?.trim())
    && (env.CORTEX_VOICE_ACCESS_CODE?.trim().length ?? 0) >= 24;
}

/** Server only. An invite code protects the team's paid voice sessions. */
export async function issueVoiceSession(request: Request, env: VoiceEnv, fetcher: typeof fetch = fetch) {
  const reply = (error: string, status: number) => Response.json({ error }, { status, headers });
  if (!voiceConfigured(env)) return reply("Voice is not configured yet. Use text instead.", 503);
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return reply("Open voice from this workspace.", 403);
  const supplied = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  const digest = (value: string) => createHash("sha256").update(value).digest();
  if (!timingSafeEqual(digest(supplied), digest(env.CORTEX_VOICE_ACCESS_CODE!.trim())))
    return reply("The voice access code was not accepted.", 401);
  try {
    const url = new URL("https://api.elevenlabs.io/v1/convai/conversation/token");
    url.searchParams.set("agent_id", env.ELEVENLABS_AGENT_ID!.trim());
    const response = await fetcher(url, {
      headers: { "xi-api-key": env.ELEVENLABS_API_KEY!.trim() },
      cache: "no-store", signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return reply("ElevenLabs could not start a session. Try again shortly.", 502);
    const result: unknown = await response.json();
    if (!result || typeof result !== "object" || !("token" in result) || typeof result.token !== "string" || !result.token)
      return reply("ElevenLabs returned an invalid session.", 502);
    // Never forward provider headers, errors, credentials, or agent configuration.
    return Response.json({ conversationToken: result.token }, { headers });
  } catch {
    return reply("Voice is temporarily unavailable. Use text instead.", 502);
  }
}
