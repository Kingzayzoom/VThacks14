import type { Conversation, PartialOptions } from "@elevenlabs/client";
import { z } from "zod";

export const VoiceObjective = z.object({ objective: z.string().trim().min(1).max(2000) }).strict();
export type VoiceState = "idle" | "connecting" | "listening" | "speaking" | "muted";
type Session = Pick<Conversation, "endSession" | "setMicMuted">;
type StartSession = (options: PartialOptions) => Promise<Session>;
class SessionRequestError extends Error {}

/** Lifecycle boundary: canceling a pending connection also closes its eventual session. */
export class VoiceSession {
  private session: Session | null = null;
  private generation = 0;
  private pending: AbortController | null = null;
  private muted = false;
  private mode: "listening" | "speaking" = "listening";
  private submission: { objective: string; result: Promise<string> } | null = null;
  constructor(private callbacks: {
    state: (state: VoiceState) => void;
    createMission: (input: { objective: string; idempotencyKey: string }) => Promise<import("@/contracts").Mission>;
    created: (mission: import("@/contracts").Mission) => void;
    error: (message: string) => void;
  }, private fetcher: typeof fetch = (input, init) => fetch(input, init), private startSession?: StartSession) {}

  async start(accessCode: string) {
    if (this.pending || this.session) return;
    const generation = ++this.generation;
    const active = () => generation === this.generation;
    this.pending = new AbortController();
    this.submission = null;
    this.callbacks.state("connecting");
    this.callbacks.error("");
    try {
      const response = await this.fetcher("/api/voice/session", {
        method: "POST", headers: { Authorization: `Bearer ${accessCode}` },
        signal: this.pending.signal, cache: "no-store",
      });
      const data = await response.json();
      if (!active()) return;
      if (!response.ok) throw new SessionRequestError(typeof data.error === "string" ? data.error : "Voice is unavailable.");
      if (typeof data.conversationToken !== "string" || !data.conversationToken) throw new SessionRequestError("Voice returned an invalid session.");
      const start = this.startSession ?? (await import("@elevenlabs/client")).Conversation.startSession;
      if (!active()) return;
      const session = await start({
        conversationToken: data.conversationToken, connectionType: "webrtc", textOnly: false,
        onModeChange: ({ mode }) => {
          this.mode = mode;
          if (active()) this.callbacks.state(this.muted ? "muted" : mode);
        },
        onDisconnect: () => { if (active()) { ++this.generation; this.pending = null; this.session = null; this.callbacks.state("idle"); } },
        onError: () => { if (active()) { this.callbacks.error("The voice connection was interrupted. Please reconnect."); void this.stop(); } },
        clientTools: {
          start_mission: async (input: unknown) => {
            if (!active()) return JSON.stringify({ success: false, message: "Session canceled." });
            const objective = VoiceObjective.safeParse(input);
            if (!objective.success) return JSON.stringify({ success: false, message: "Provide only an objective between 1 and 2000 characters." });
            if (this.submission) return this.submission.objective === objective.data.objective ? this.submission.result : JSON.stringify({ success: false, message: "This conversation already submitted a mission. Start a new conversation for another objective." });
            // The promise is retained even on failure: a provider retry cannot submit twice.
            const result = Promise.resolve().then(async () => {
              if (!active()) return JSON.stringify({ success: false, message: "Session canceled." });
              try {
                const mission = await this.callbacks.createMission({ objective: objective.data.objective, idempotencyKey: `voice-${crypto.randomUUID()}` });
                // Let the SDK send the resolved tool response before navigation unmounts voice.
                setTimeout(() => { if (active()) this.callbacks.created(mission); }, 0);
                return JSON.stringify({ success: true, mission_id: mission.id, status: mission.backendStatus ?? mission.status, message: mission.source === "live" ? "Mission created. The orchestrator accepted the objective." : "Demo mission created. No external execution was started." });
              } catch { return JSON.stringify({ success: false, message: "Mission creation failed." }); }
            });
            this.submission = { objective: objective.data.objective, result };
            return result;
          },
        },
      });
      if (!active()) { await session.endSession(); return; }
      this.session = session;
      this.muted = false;
      this.callbacks.state(this.mode);
    } catch (error) {
      if (active()) {
        const denied = error instanceof Error && (error.name === "NotAllowedError" || error.name === "PermissionDeniedError");
        this.callbacks.error(denied ? "Microphone access was denied. You can still type your objective." :
          error instanceof SessionRequestError ? error.message : "Unable to connect voice. Check microphone access and try again.");
        this.callbacks.state("idle");
      }
    } finally { if (active()) this.pending = null; }
  }
  toggleMute() {
    if (!this.session) return;
    this.muted = !this.muted;
    this.session.setMicMuted(this.muted);
    this.callbacks.state(this.muted ? "muted" : this.mode);
  }
  async stop() {
    ++this.generation;
    this.pending?.abort(); this.pending = null;
    const session = this.session; this.session = null;
    this.muted = false; this.mode = "listening";
    this.callbacks.state("idle");
    if (session) await session.endSession().catch(() => {});
  }
}
