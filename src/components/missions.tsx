"use client";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useControl } from "./provider";
import { Status } from "./ui";
export function Missions() {
  const { state, api } = useControl();
  return (
    <div className="simple-page">
      <h1>Missions</h1>
      <p className="secondary">
        Objectives, assignments, and progress. Missions are saved on this device.
      </p>
      <div className="mission-list">
        {!state.missions.length && <div className="empty-state"><h2>No missions yet</h2><p>Give your agents an objective to work toward.</p><Link href="/" className="button primary">Create mission</Link></div>}
        {[...state.missions].reverse().map((m) => (
          <Link
            key={m.id}
            href={`/missions/${m.id}`}
            className="mission-row"
            onClick={() => api.selectMission(m.id)}
          >
            <div>

              <h2>{m.title}</h2>
              <p>{m.currentStage}</p>
            </div>
            <span className="mission-task-count">{m.taskIds.length} tasks</span>
            <time dateTime={m.updatedAt}>{new Date(m.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}</time>
            <div>
              <Status status={m.status} />
              <ArrowUpRight size={20} />
            </div>
          </Link>
        ))}
      </div>
      <p className="settings-note">
        Custom objectives use the sample research → analysis → artifact plan in
        this checkpoint. Planning, board views, and execution arrive in Phase B.
      </p>
    </div>
  );
}
