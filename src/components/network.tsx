"use client";
import type { Agent, Snapshot } from "@/contracts";
import { AgentGlyph, Status } from "./ui";
import { ContourSheet } from "./atmosphere";
import { agentInMission } from "@/lib/demo/fixtures";
import { Shield, ArrowUpRight } from "lucide-react";

export function Network({
  state,
  missionId,
  select,
  onReview,
  list,
}: {
  state: Snapshot;
  missionId: string;
  select: (id: string) => void;
  onReview: () => void;
  list: boolean;
}) {
  const agents = state.agents.map((a) => agentInMission(a, state, missionId));
  const mission = state.missions.find((m) => m.id === missionId)!;
  const pending = state.tasks.some(
    (t) => t.missionId === missionId && t.status === "waiting_approval",
  );
  const running = agents.find((a) => a.runtimeStatus === "running");
  const workerList = (
    <div className="network-list">
      {agents.map((a) => (
        <button
          key={a.id}
          className={`agent-list-row ${state.selectedAgentId === a.id ? "selected" : ""}`}
          onClick={() => select(a.id)}
          aria-label={`Inspect ${a.name}`}
          aria-pressed={state.selectedAgentId === a.id}
        >
          <AgentGlyph id={a.id} />
          <div>
            <strong>{a.name}</strong>
            <span>{a.role}</span>
          </div>
          <Status status={a.runtimeStatus} guardian={a.id === "guardian"} />
          <ArrowUpRight size={15} />
        </button>
      ))}
    </div>
  );
  return (
    <div
      className={`network-container ${list ? "list-mode" : ""} ${mission.status === "paused" ? "is-paused" : ""}`}
    >
      <div className="network-visual">
        <ContourSheet />
        <div className="network-corner eyebrow">
          EXECUTION TOPOLOGY<span>DEMO / LOCAL FIELD</span>
        </div>
        <div className="network-scale eyebrow" aria-hidden="true">
          +<br />+<br />+
        </div>
        <svg
          className="network-edges"
          viewBox="0 0 800 430"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path className="boundary-arc" d="M90 332 C150 105 638 105 705 332" />
          <path
            className="edge settled"
            d="M180 180 C245 180 245 290 395 237"
          />
          <path
            className={`edge ${running?.id === "scout" && mission.status !== "paused" ? "executing" : "settled"}`}
            d="M395 237 C245 290 245 180 180 180"
          />
          <path
            className={`edge ${running?.id === "sage" && mission.status !== "paused" ? "executing" : ""}`}
            d="M395 237 C380 165 416 158 450 96"
          />
          <path
            className={`edge ${pending ? "waiting-edge" : ""}`}
            d="M395 237 C510 270 490 180 626 189"
          />
          <path
            className="edge awaiting"
            d="M626 189 C676 207 673 260 658 278"
          />
          <circle className="junction" cx="395" cy="237" r="7" />
        </svg>
        {agents
          .filter((a) => a.id !== "guardian")
          .map((a) => (
            <AgentNode
              key={a.id}
              agent={a}
              selected={state.selectedAgentId === a.id}
              onClick={() => select(a.id)}
            />
          ))}
        {pending && (
          <button
            className="missing-node"
            onClick={onReview}
            aria-label="Review missing data visualization capability"
          >
            <span>+</span>
            <div>
              Specialist needed<small>DATA VISUALIZATION</small>
            </div>
          </button>
        )}
        <div className="edge-label scout-label eyebrow">
          {agents.find((a) => a.id === "scout")?.runtimeStatus === "completed"
            ? "SOURCE REVIEW COMPLETE"
            : "SOURCE REVIEW"}
        </div>
        <div className="edge-label sage-label eyebrow">
          {mission.status === "paused" ? "EXECUTION PAUSED" : "SYNTHESIZING"}
        </div>
        <div className="guardian-boundary">
          <button
            onClick={() => select("guardian")}
            aria-label="Inspect Guardian"
          >
            <Shield size={20} />
            <span>
              <strong>GUARDIAN</strong>
              <small>Independent oversight</small>
            </span>
            <span className="guardian-observing">DEMO BOUNDARY</span>
          </button>
          <span className="boundary-line" />
        </div>
      </div>
      {workerList}
    </div>
  );
}
function AgentNode({
  agent,
  selected,
  onClick,
}: {
  agent: Agent;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`agent-node node-${agent.id} ${selected ? "selected" : ""} ${agent.runtimeStatus}`}
      onClick={onClick}
      aria-label={`Inspect ${agent.name}`}
      aria-pressed={selected}
    >
      <span className="node-symbol">
        <AgentGlyph id={agent.id} size={agent.id === "coordinator" ? 43 : 27} />
      </span>
      <strong>
        {agent.id === "coordinator" ? "PERIHELION" : agent.name.toUpperCase()}
      </strong>
      <span className="node-role">{agent.role}</span>
      <Status status={agent.runtimeStatus} />
    </button>
  );
}
