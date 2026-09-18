"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useFieldMotion } from "./motion-system";
import {
  Aperture,
  List,
  ArrowUpRight,
  Pause,
  Play,
  TriangleAlert,
  ArrowRight,
  Shield,
  Check,
  Maximize2,
  FileText,
} from "lucide-react";
import { useControl } from "./provider";
import { Network } from "./network";
import { AgentGlyph, Status } from "./ui";
import { Dialog } from "./dialog";
import { agentInMission } from "@/lib/demo/fixtures";
import type { ControlEvent } from "@/contracts";

function eventText(event: ControlEvent) {
  switch (event.type) {
    case "mission.created":
      return "Objective received. Tasks assigned.";
    case "task.progress":
      return event.payload.summary;
    case "capability.missing":
      return `${event.payload.capability} capability needed`;
    case "mission.state_changed":
      return event.payload.status === "paused"
        ? "Mission paused by operator"
        : "Mission resumed by operator";
  }
}
export function Field({ missionId }: { missionId?: string }) {
  const { state, api } = useControl();
  const { still } = useFieldMotion();
  const mission = state.missions.find(
    (m) => m.id === (missionId ?? state.selectedMissionId),
  );
  const [list, setList] = useState(false);
  const [tab, setTab] = useState<"activity" | "inspector">("activity");
  const [review, setReview] = useState(false);
  const [objective, setObjective] = useState(false);
  useEffect(() => {
    if (missionId && state.selectedMissionId !== missionId)
      api.selectMission(missionId);
  }, [api, missionId, state.selectedMissionId, state.missions]);
  if (!mission)
    return (
      <div className="empty-state">
        <h1>Mission not found on this device.</h1>
        <p>Demo missions are stored locally in this browser.</p>
        <Link className="button primary" href="/field">
          Return to the field
        </Link>
      </div>
    );
  const tasks = state.tasks.filter((t) => t.missionId === mission.id);
  const completed = tasks.filter((t) => t.status === "completed").length;
  const pending = tasks.filter((t) => t.status === "waiting_approval").length;
  const events = state.events
    .filter((e) => e.missionId === mission.id)
    .slice(-8)
    .reverse();
  const agent = agentInMission(
    state.agents.find((a) => a.id === state.selectedAgentId) ?? state.agents[0],
    state,
    mission.id,
  );
  const task = tasks.find((t) => t.id === agent.currentTaskId);
  function select(id: string) {
    api.selectAgent(id);
    setTab("inspector");
    if (window.matchMedia("(max-width: 760px)").matches) {
      requestAnimationFrame(() => {
        const inspector = document.getElementById("selected-agent-details");
        inspector?.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
            .matches
            ? "instant"
            : "smooth",
          block: "center",
        });
        inspector?.focus({ preventScroll: true });
      });
    }
  }
  return (
    <div className="field-page">
      <div className="field-heading">
        <div>
          <div className="eyebrow muted">OPERATIONS / SECTOR 01</div>
          <h1>
            FIELD<span className="heading-dot">.</span>
          </h1>
          <p>Independent minds. A common direction.</p>
        </div>
        <div className="field-summary">
          <span>
            <b>
              {tasks
                .filter(
                  (t) => t.status === "running" && mission.status !== "paused",
                )
                .length.toString()
                .padStart(2, "0")}
            </b>
            EXECUTING
          </span>
          <button
            className="summary-review"
            onClick={() => (pending ? setReview(true) : select("guardian"))}
            aria-label={
              pending
                ? "Review pending capability request"
                : "Inspect mission oversight"
            }
          >
            <b>{pending.toString().padStart(2, "0")}</b>NEEDS REVIEW
          </button>
        </div>
      </div>
      <div className="field-layout">
        <section className="field-network-panel" aria-label="Agent field">
          <div className="panel-toolbar">
            <span className="eyebrow">
              <span className="signal-dot" /> THE COORDINATION FIELD
            </span>
            <div className="view-controls">
              <button
                className={!list ? "active" : ""}
                onClick={() => setList(false)}
                aria-pressed={!list}
              >
                <Aperture size={14} />
                <span>Graph</span>
              </button>
              <button
                className={list ? "active" : ""}
                onClick={() => setList(true)}
                aria-pressed={list}
              >
                <List size={14} />
                <span>List</span>
              </button>
              <button
                className="fit-control"
                aria-label="Reset field view"
                title="Reset field view"
                onClick={() => {
                  setList(false);
                  api.selectAgent("coordinator");
                  setTab("activity");
                }}
              >
                <Maximize2 size={14} />
              </button>
            </div>
          </div>
          <Network
            state={state}
            missionId={mission.id}
            select={select}
            onReview={() => setReview(true)}
            list={list}
          />
          <div className="network-legend">
            <span>
              <i className="cyan" />
              Executing
            </span>
            <span>
              <i className="mint" />
              Complete
            </span>
            <span>
              <i className="amber" />
              Needs review
            </span>
            <span className="legend-hint">
              Select an agent to inspect
              <ArrowUpRight size={12} />
            </span>
          </div>
        </section>
        <aside
          className="activity-rail"
          aria-label="Field activity and inspector"
        >
          <div className="rail-tabs">
            <button
              aria-pressed={tab === "activity"}
              className={tab === "activity" ? "active" : ""}
              onClick={() => setTab("activity")}
            >
              Activity<span>{events.length}</span>
            </button>
            <button
              aria-pressed={tab === "inspector"}
              className={tab === "inspector" ? "active" : ""}
              onClick={() => setTab("inspector")}
            >
              Inspector
            </button>
          </div>
          {tab === "activity" ? (
            <motion.div
              key="activity"
              initial={still ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="activity-content"
              tabIndex={0}
              role="region"
              aria-label="Recent mission events"
            >
              <div className="rail-caption eyebrow">
                MISSION EVENT STREAM<span>DEMO</span>
              </div>
              <ol className="activity-list">
                {events.map((event) => (
                  <li key={event.id}>
                    <span
                      className={`event-dot ${event.type === "capability.missing" ? "amber" : event.agentId === "scout" ? "mint" : "cyan"}`}
                    />
                    <div>
                      <div className="event-heading">
                        <strong>
                          {state.agents.find((a) => a.id === event.agentId)
                            ?.name ?? "Operator"}
                        </strong>
                        <span className="eyebrow muted">
                          #{String(event.sequence).padStart(3, "0")}
                        </span>
                      </div>
                      <p>{eventText(event)}</p>
                      <span className="event-tag">
                        {event.type.replaceAll(".", " / ")}
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
              <p className="rail-footnote">
                Local fixture events. No external agent is executing.
              </p>
            </motion.div>
          ) : (
            <motion.div
              key={agent.id}
              initial={still ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              id="selected-agent-details"
              className="inspector-content"
              tabIndex={0}
              role="region"
              aria-label="Selected agent details"
            >
              <div className="inspector-agent">
                <AgentGlyph id={agent.id} size={30} />
                <div>
                  <h2>{agent.name}</h2>
                  <span>{agent.role}</span>
                </div>
              </div>
              <Status
                status={agent.runtimeStatus}
                guardian={agent.id === "guardian"}
              />
              <dl>
                <dt>Current assignment</dt>
                <dd>
                  {task?.title ??
                    (agent.id === "guardian"
                      ? "Observe mission action boundaries"
                      : "Coordinate the mission plan")}
                </dd>
                <dt>Identity</dt>
                <dd>
                  <Check size={13} />
                  Demo verification only
                </dd>
                <dt>Authorization</dt>
                <dd>{agent.authorizationSummary}</dd>
                <dt>Allowed scopes</dt>
                <dd className="scope-list">
                  {agent.allowedScopes.map((s) => (
                    <code key={s}>{s}</code>
                  ))}
                </dd>
                <dt>Capabilities</dt>
                <dd>{agent.capabilities.join(" · ")}</dd>
                <dt>Evidence</dt>
                <dd>{agent.verificationEvidence[0]}</dd>
                <dt>Parent / outputs</dt>
                <dd>
                  {agent.parentAgentId ?? "Independent"} · No artifact yet
                </dd>
              </dl>
            </motion.div>
          )}
          <div className={`review-callout ${!pending ? "no-review" : ""}`}>
            <div className="eyebrow">
              {pending ? <TriangleAlert size={14} /> : <Shield size={14} />}{" "}
              {pending ? "YOUR DECISION, NEXT" : "HUMAN AUTHORITY"}
            </div>
            <span className="review-index" aria-hidden="true">
              !
            </span>
            <h3>
              {pending ? "A capability is missing." : "You set the boundary."}
            </h3>
            <p>
              {pending
                ? "Forge needs a data visualization specialist to finish the brief."
                : "Agents stay within this mission’s public sample data."}
            </p>
            {pending ? (
              <button onClick={() => setReview(true)}>
                Review request
                <ArrowRight size={16} />
              </button>
            ) : (
              <button onClick={() => select("guardian")}>
                Inspect Guardian
                <ArrowRight size={16} />
              </button>
            )}
          </div>
        </aside>
      </div>
      <section className="mission-strip" aria-label="Current mission progress">
        <div className="mission-strip-title">
          <div>
            <span className="eyebrow muted">CURRENT MISSION / DEMO</span>
            <h2>{mission.title}</h2>
          </div>
          <div className="mission-actions">
            <button
              className="icon-button"
              aria-label={
                mission.status === "paused"
                  ? "Resume demo mission"
                  : "Pause demo mission"
              }
              onClick={() =>
                api.commandMission(
                  mission.id,
                  mission.status === "paused" ? "resume" : "pause",
                )
              }
            >
              {mission.status === "paused" ? (
                <Play size={16} />
              ) : (
                <Pause size={16} />
              )}
            </button>
            <button className="text-link" onClick={() => setObjective(true)}>
              View objective
              <ArrowUpRight size={14} />
            </button>
          </div>
        </div>
        <div className="task-preview">
          {tasks.map((t, i) => (
            <button
              key={t.id}
              onClick={() => select(t.assignedAgentId)}
              className="task-item"
            >
              <span className="task-number">0{i + 1}</span>
              <div>
                <strong>{t.title}</strong>
                <span>
                  {state.agents.find((a) => a.id === t.assignedAgentId)?.name}{" "}
                  <span className="task-separator">/</span>{" "}
                  <Status
                    status={
                      mission.status === "paused" && t.status === "running"
                        ? "paused"
                        : t.status
                    }
                  />
                </span>
              </div>
              <ArrowUpRight size={13} />
            </button>
          ))}
        </div>
        <div className="mission-progress">
          <div className="progress-track">
            <span style={{ width: `${(completed / tasks.length) * 100}%` }} />
          </div>
          <span>
            {completed} of {tasks.length} tasks complete
          </span>
          <span className="artifact-note">
            <FileText size={12} />
            {mission.artifactIds.length} artifacts
          </span>
        </div>
      </section>
      <Dialog
        open={review}
        onClose={() => setReview(false)}
        title="Capability request"
      >
        <div className="eyebrow amber">
          <TriangleAlert size={14} /> CAPABILITY DEFICIT / DEMO
        </div>
        <h2>Something is missing.</h2>
        <p>
          Forge needs <strong>data visualization</strong> to turn the public
          sample data into a useful chart.
        </p>
        <dl className="review-details">
          <dt>Mission</dt>
          <dd>{mission.title}</dd>
          <dt>Requested capability</dt>
          <dd>Data visualization</dd>
          <dt>Proposed scopes</dt>
          <dd>
            <code>dataset.read:public-demo</code>
            <code>artifact.write:mission</code>
          </dd>
          <dt>Scope boundary</dt>
          <dd>This mission only. No publishing or external contact.</dd>
          <dt>Identity / budget</dt>
          <dd>No candidate verified. Cost not provided.</dd>
        </dl>
        <div className="notice">
          Request preview · Phase A<br />
          <span>
            Candidate discovery and admission arrive after visual approval. This
            request stays pending.
          </span>
        </div>
        <button className="button primary" onClick={() => setReview(false)}>
          Return to field
          <ArrowRight size={16} />
        </button>
      </Dialog>
      <Dialog
        open={objective}
        onClose={() => setObjective(false)}
        title="Mission objective"
      >
        <h2>{mission.title}</h2>
        <p className="objective-copy">{mission.objective}</p>
        <div className="eyebrow muted">CONSTRAINTS</div>
        <ul className="constraint-list">
          {mission.constraints.map((c) => (
            <li key={c}>
              <Shield size={14} />
              {c}
            </li>
          ))}
        </ul>
        <div className="notice">
          {mission.status === "paused" ? "Paused" : mission.currentStage} · Demo
          fixture plan
          <br />
          <span>
            Custom objectives use the same sample task structure in Phase A.
          </span>
        </div>
      </Dialog>
    </div>
  );
}
