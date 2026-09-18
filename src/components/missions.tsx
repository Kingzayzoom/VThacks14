"use client";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useControl } from "./provider";
import { Status } from "./ui";
export function Missions() {
  const { state, api } = useControl();
  return (
    <div className="simple-page">
      <div className="eyebrow muted">02 / OBJECTIVES</div>
      <h1>Mission register.</h1>
      <p className="secondary">
        Every objective has a place in the field. These demo missions are saved
        in this browser when local storage is available.
      </p>
      <div className="mission-list">
        {[...state.missions].reverse().map((m) => (
          <Link
            key={m.id}
            href={`/missions/${m.id}`}
            className="mission-row"
            onClick={() => api.selectMission(m.id)}
          >
            <div>
              <span className="eyebrow muted">
                DEMO / {m.taskIds.length} TASKS
              </span>
              <h2>{m.title}</h2>
              <p>{m.currentStage}</p>
            </div>
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
