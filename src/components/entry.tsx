"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Mic } from "lucide-react";
import { Brand, ModeBadge, Status } from "./ui";
import { MissionComposer } from "./composer";
import { useControl } from "./provider";
import { Dialog } from "./dialog";
import { LiveConnection } from "./live-status";
import { VoicePanel } from "./voice/voice-panel";
import "@/styles/entry.css";

export function Entry() {
  const { state, api } = useControl();
  const [voice, setVoice] = useState(false);
  const [voiceDraft, setVoiceDraft] = useState("");
  return <div className="entry">
    <header className="entry-nav"><Brand /><div><ModeBadge /><Link href="/field">Enter workspace <ArrowUpRight size={16} /></Link></div></header>
    <main className="entry-main" id="main">
      <div className="hero-heading"><h1>Delegate work.<br />Stay in control.</h1><p>Plan tasks, coordinate specialist agents, and review the results.</p></div>
      <LiveConnection /><MissionComposer />
      <button className="text-link entry-voice" onClick={() => setVoice(true)}><Mic size={16} />Talk to CONTROL</button>
      <section className="recent-missions" aria-label="Recent missions"><header><h2>Recent missions</h2><Link className="text-link" href="/missions">View all <ArrowUpRight size={14} /></Link></header>
        {state.missions.length ? [...state.missions].reverse().slice(0,3).map(m => <Link className="recent-mission" key={m.id} href={`/missions/${m.id}`} onClick={() => api.selectMission(m.id)}><span>{m.title}<small>{m.taskIds.length} tasks</small></span><Status status={m.status} /></Link>) : <p className="secondary">Your missions will appear here. Start with an objective above.</p>}
      </section>
    </main>
    <Dialog open={voice} onClose={() => setVoice(false)} title="Voice channel">{voice && <VoicePanel initialDraft={voiceDraft} onDraftChange={setVoiceDraft} onSubmitted={() => setVoice(false)} onText={() => { setVoice(false); requestAnimationFrame(() => document.getElementById("objective")?.focus()); }} />}</Dialog>
  </div>;
}
