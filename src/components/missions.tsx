"use client";
import Link from "next/link";
import { ArrowUpRight, Layers2 } from "lucide-react";
import { useControl } from "./provider";
import { Status } from "./ui";

export function Missions() {
  const { state, api } = useControl();
  return (
    <div className="simple-page missions-page">
      <header className="page-heading"><div><h1>Missions</h1><p className="secondary">Every objective, from first task to final result.</p></div></header>
      <section className="mission-list" aria-label="Mission list">
        <div className="list-toolbar"><h2>All missions <span className="count-label">{state.missions.length}</span></h2><span>{state.live ? "Observed from the hub" : "Saved on this device"}</span></div>
        {!!state.missions.length && <div className="mission-columns" aria-hidden="true"><span>Mission</span><span>Status</span><span>Tasks</span><span>Updated</span><span /></div>}
        {!state.missions.length && <div className="empty-state"><h2>No missions yet</h2><p>Give your agents an objective to work toward.</p><Link href="/" className="button primary">Create mission</Link></div>}
        {[...state.missions].reverse().map(m => {
          const tasks = state.tasks.filter(t => t.missionId === m.id);
          const completed = tasks.filter(t => t.status === "completed").length;
          return <Link key={m.id} href={`/missions/${m.id}`} className={`mission-row ${m.id === state.selectedMissionId ? "selected" : ""}`} onClick={() => api.selectMission(m.id)}>
            <div className="mission-row-name"><span className="mission-icon"><Layers2 size={20} /></span><div><h2>{m.title}</h2><p>{m.currentStage}</p></div></div>
            <Status status={m.status} />
            <span className="mission-task-count"><span>{completed} / {m.taskIds.length}</span><span className="mini-progress" aria-hidden="true"><i style={{width: `${m.taskIds.length ? completed / m.taskIds.length * 100 : 0}%`}} /></span><span className="sr-only">tasks complete</span></span>
            <time dateTime={m.updatedAt}>{new Date(m.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}</time>
            <ArrowUpRight size={17} />
          </Link>;
        })}
      </section>
      <p className="settings-note">{state.live ? "Live missions use the existing Commander and Guardian. History is held by the hub process." : "Demo missions use a sample task plan. External execution is not connected."}</p>
    </div>
  );
}
