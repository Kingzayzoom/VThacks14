"use client";
import { useEffect, useRef } from "react";
import type { Agent, Snapshot } from "@/contracts";
import { Status } from "./ui";
import { AgentSignature } from "./agent-signature";
import { LivingField } from "./living-field";
import { ContourSheet } from "./atmosphere";
import { agentInMission } from "@/lib/demo/fixtures";
import { Shield, ArrowUpRight, CornerDownRight } from "lucide-react";

const indices: Record<string, string> = {
  coordinator: "00",
  scout: "01",
  sage: "02",
  forge: "03",
  guardian: "G",
};
const paths = [
  { agentId: "scout", d: "M322 204 C275 164 229 121 195 141" },
  { agentId: "sage", d: "M403 208 C520 245 565 149 510 96" },
  { agentId: "forge", d: "M407 237 C500 282 537 153 608 184" },
];
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
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => {
      element.dataset.inView = String(entry.isIntersecting);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const agents = state.agents.map((a) => agentInMission(a, state, missionId));
  const mission = state.missions.find((m) => m.id === missionId)!;
  const tasks = state.tasks.filter((t) => t.missionId === missionId);
  const pending = tasks.some((t) => t.status === "waiting_approval");
  const running = agents.filter((a) => a.runtimeStatus === "running");
  const latestEvent = state.events
    .filter((e) => e.missionId === missionId)
    .at(-1);
  const currentTask = tasks.find((t) => t.assignedAgentId === running[0]?.id);
  return (
    <div
      ref={container}
      className={`network-container ${list ? "list-mode" : ""} ${mission.status === "paused" ? "is-paused" : ""}`}
    >
      <div className="network-visual">
        <LivingField variant="network" />
        <ContourSheet />
        <div className="field-graticule" aria-hidden="true" />
        <div className="network-corner eyebrow">
          FIELD / 001<span>RELATIONAL MAP · DEMO</span>
        </div>
        <div className={`network-heartbeat ${running.length ? "working" : ""}`}>
          <span className="heartbeat-mark" aria-hidden="true" />
          <span>
            {mission.status === "paused"
              ? "EXECUTION PAUSED"
              : `${String(running.length).padStart(2, "0")} ACTIVE PROCESS`}
          </span>
        </div>
        <div className="network-scale eyebrow" aria-hidden="true">
          +<br />+<br />+
        </div>
        <svg
          className="network-edges"
          viewBox="0 0 800 400"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path className="boundary-arc" d="M75 330 C120 65 615 50 733 320" />
          {paths.map(({ agentId, d }) => {
            const status = agents.find((a) => a.id === agentId)?.runtimeStatus;
            return (
              <g key={agentId} className={`connection connection-${agentId} ${state.selectedAgentId === agentId ? "connection-selected" : ""}`} >
                <path className="connection-bed" d={d} />
                {status === "running" && <path className="signal-trace" d={d} pathLength="100" />}
                <path
                  className={`edge ${status === "running" ? "executing" : status === "completed" ? "settled" : status === "waiting_approval" ? "waiting-edge" : "dormant"}`}
                  d={d}
                />
              </g>
            );
          })}
          {pending && (
            <>
              <path
                className="edge awaiting"
                d="M680 216 C729 224 732 276 694 294"
              />
              <path className="connection-stop" d="M687 291l13 6" />
            </>
          )}
        </svg>
        {agents
          .filter((a) => a.id !== "guardian")
          .map((a) => (
            <AgentNode
              key={a.id}
              agent={a}
              selected={state.selectedAgentId === a.id}
              onClick={() => select(a.id)}
              task={tasks.find((t) => t.id === a.currentTaskId)?.title}
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
              Open assignment<small>VISUALIZATION / REVIEW</small>
            </div>
            <ArrowUpRight size={12} />
          </button>
        )}
        <div className="guardian-boundary">
          <button
            className={state.selectedAgentId === "guardian" ? "selected" : ""}
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
      <div className="network-list">
        <div className="mobile-field-caption">
          <LivingField variant="network" />
          <span className="eyebrow">
            ONE OBJECTIVE / {tasks.length} ASSIGNMENTS
          </span>
          <p>
            A shared direction.
            <br />
            <em>Independent intelligence.</em>
          </p>
        </div>
        {agents.map((a) => (
          <button
            key={a.id}
            className={`agent-list-row row-${a.id} ${state.selectedAgentId === a.id ? "selected" : ""}`}
            onClick={() => select(a.id)}
            aria-label={`Inspect ${a.name}`}
            aria-pressed={state.selectedAgentId === a.id}
          >
            <span className="list-signature">
              <AgentSignature
                id={a.id}
                status={a.runtimeStatus}
                selected={state.selectedAgentId === a.id}
              />
            </span>
            <div>
              <span className="agent-list-name">
                <strong>{a.name}</strong>
                <span className="eyebrow">{indices[a.id]}</span>
              </span>
              <span>{a.role}</span>
              <span className="agent-list-task">
                <CornerDownRight size={11} />
                {tasks.find((t) => t.assignedAgentId === a.id)?.title ??
                  (a.id === "guardian"
                    ? "Separate authority boundary"
                    : "Plan & delegate")}
              </span>
            </div>
            <Status status={a.runtimeStatus} guardian={a.id === "guardian"} />
            <ArrowUpRight size={15} />
          </button>
        ))}
      </div>
      <div
        key={latestEvent?.id ?? mission.id}
        className={`network-transmission ${mission.status === "paused" ? "paused" : ""}`}
        aria-live="polite"
      >
        <span className="transmission-index">
          {mission.status === "paused" ? "HOLD" : "NOW"}
        </span>
        <span>
          {mission.status === "paused"
            ? "Mission paused. The field is holding its position."
            : currentTask
              ? `${running[0].name} / ${currentTask.title}`
              : "The field is awaiting its next assignment."}
        </span>
        <span className="transmission-source">DEMO SIGNAL</span>
      </div>
    </div>
  );
}
function AgentNode({
  agent,
  selected,
  onClick,
  task,
}: {
  agent: Agent;
  selected: boolean;
  onClick: () => void;
  task?: string;
}) {
  return (
    <button
      className={`agent-node node-${agent.id} ${selected ? "selected" : ""} ${agent.runtimeStatus}`}
      onClick={onClick}
      aria-label={`Inspect ${agent.name}`}
      aria-pressed={selected}
      title={task ?? agent.role}
    >
      <span className="node-symbol">
        <AgentSignature
          id={agent.id}
          status={agent.runtimeStatus}
          selected={selected}
        />
      </span>
      <span className="node-caption">
        <span className="node-index" aria-hidden="true">
          {indices[agent.id]} /
        </span>
        <strong>
          {agent.id === "coordinator" ? "CORTEXAI" : agent.name.toUpperCase()}
        </strong>
      </span>
      <span className="node-role">{agent.role}</span>
      <span className="node-state" key={agent.runtimeStatus}>
        <Status status={agent.runtimeStatus} />
      </span>
    </button>
  );
}
