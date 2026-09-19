"use client";
import { useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { usePathname } from "next/navigation";
import { VoiceSession, type VoiceState } from "@/lib/voice/session-client";
import { MissionComposer } from "../composer";
import "@/styles/voice.css";

export function VoicePanel({ onText, onSubmitted }: { onText: () => void; onSubmitted: () => void }) {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [status, setStatus] = useState<VoiceState>("idle");
  const [error, setError] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [draft, setDraft] = useState("");
  const session = useRef<VoiceSession | null>(null);
  const path = usePathname();
  useEffect(() => {
    const controller = new AbortController();
    const voice = new VoiceSession({ state: setStatus, draft: setDraft, error: setError });
    session.current = voice;
    fetch("/api/voice/session", { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const data = await response.json();
        if (!controller.signal.aborted) setConfigured(data.configured === true);
      }).catch(() => { if (!controller.signal.aborted) { setConfigured(false); setError("Voice availability could not be checked."); } });
    return () => { controller.abort(); void voice.stop(); session.current = null; };
  }, [path]);
  const connected = status === "listening" || status === "speaking" || status === "muted";
  return <div className="voice-panel">
    <h2>Talk it through.</h2>
    <p>Shape an objective with your AI voice assistant, then review it before starting a mission.</p>
    <p className="voice-state" role="status">
      {status === "idle" ? "Microphone inactive. No audio is captured." : status === "connecting" ? "Connecting…" : status === "muted" ? "Microphone muted." : status === "speaking" ? "Assistant speaking." : "Listening to you."}
    </p>
    {configured === null && <p>Checking voice availability…</p>}
    {configured === false && <p className="secondary">ElevenLabs is not available in this workspace yet. You can keep working with text.</p>}
    {configured && status === "idle" && <form className="voice-start" onSubmit={(event) => {
      event.preventDefault(); void session.current?.start(accessCode); setAccessCode("");
    }}>
      <label htmlFor="voice-access">Team voice access code</label>
      <input id="voice-access" type="password" autoComplete="off" value={accessCode} onChange={(event) => setAccessCode(event.target.value)} required maxLength={200} />
      <p className="secondary">Starting shares your microphone audio with ElevenLabs.</p>
      <button className="button primary" type="submit"><Mic size={16} />Start voice</button>
    </form>}
    {status !== "idle" && <div className="voice-actions">
      {connected && <button className="button subtle" onClick={() => session.current?.toggleMute()}>{status === "muted" ? <Mic size={16} /> : <MicOff size={16} />}{status === "muted" ? "Unmute" : "Mute"}</button>}
      <button className="button subtle" onClick={() => void session.current?.stop()}>{status === "connecting" ? "Cancel connection" : "End conversation"}</button>
    </div>}
    {error && <p role="alert" className="form-error">{error}</p>}
    {draft && <section className="voice-draft" aria-label="Review voice objective">
      <h3>Review your objective.</h3>
      <MissionComposer key={draft} compact initialObjective={draft} onSubmitted={onSubmitted} />
    </section>}
    <button className="button subtle" onClick={onText}>Use text instead</button>
  </div>;
}
