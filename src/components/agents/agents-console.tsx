"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useRef, useState, useSyncExternalStore, type RefObject } from "react";
import { ArrowUpRight, Check, ChevronRight, Pause, Play, RotateCcw, Search, Shield, X } from "lucide-react";
import type { Agent, Mission, Task } from "@/contracts";
import { agentInMission } from "@/lib/demo/fixtures";
import { useControl } from "../provider";
import { useFieldMotion } from "../motion-system";
import { Status, AgentGlyph } from "../ui";
import { eventSummary, fieldNodes, previewAgents, visualFor, type FieldNode } from "./field-model";

type Filter = "all" | "mission" | "review" | `category:${FieldNode["family"]}`;
const compactQuery = "(max-width: 760px)";
function subscribeCompact(callback: () => void) {
  const query = matchMedia(compactQuery);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}
const readCompact = () => matchMedia(compactQuery).matches;
const readServerCompact = () => false;
export function AgentsConsole() {
  const { api, state } = useControl();
  const { still } = useFieldMotion();
  const compact = useSyncExternalStore(subscribeCompact, readCompact, readServerCompact);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [commandError, setCommandError] = useState("");
  const inspector = useRef<HTMLElement>(null);
  const selectionTrigger = useRef<HTMLElement | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const mission = state.missions.find((m) => m.id === state.selectedMissionId) ?? state.missions[0];
  const members = state.agents.filter((agent) => mission?.agentIds.includes(agent.id))
    .map((agent) => agentInMission(agent, state, mission?.id ?? ""));
  const agents = [...members, ...previewAgents];
  const selectedId = previewId ?? state.selectedAgentId;
  const selected = agents.find((agent) => agent.id === selectedId) ?? members[0];
  const tasks = state.tasks.filter((task) => task.missionId === mission?.id);
  const currentTask = tasks.find((task) => task.id === selected?.currentTaskId);
  const normalizedQuery = query.trim().toLowerCase();
  const visible = agents.filter((agent) => {
    const matches = `${agent.name} ${agent.role} ${visualFor(agent.id).family} ${agent.capabilities.join(" ")}`.toLowerCase().includes(normalizedQuery);
    return matches && (filter === "all" || (filter === "mission" && mission?.agentIds.includes(agent.id)) || (filter === "review" && agent.runtimeStatus === "waiting_approval") || filter === `category:${visualFor(agent.id).family}`);
  });
  useEffect(() => {
    if (inspectorOpen) {
      inspector.current?.focus({ preventScroll: true });
      inspector.current?.scrollIntoView({ behavior: still ? "instant" : "smooth", block: "start" });
    }
  }, [inspectorOpen, compact, selected?.id, still]);
  function closeInspector() {
    setInspectorOpen(false);
    selectionTrigger.current?.focus();
  }
  function selectAgent(id: string, reveal = true) {
    if (reveal && document.activeElement instanceof HTMLElement) selectionTrigger.current = document.activeElement;
    setInspectorOpen(true);
    if (previewAgents.some((agent) => agent.id === id)) setPreviewId(id);
    else { setPreviewId(null); api.selectAgent(id); }
  }
  function reset() {
    setQuery(""); setFilter("all");
    setPreviewId(null); api.selectAgent("coordinator"); setInspectorOpen(false);
  }
  async function toggleMission() {
    if (!mission) return;
    setCommandError("");
    try { await api.commandMission(mission.id, mission.status === "paused" ? "resume" : "pause"); }
    catch (error) { setCommandError(error instanceof Error ? error.message : "Unable to update mission."); }
  }
  return (
    <section className={`agents-console ${inspectorOpen ? "inspector-open" : ""}`} aria-label="Agent command center" onKeyDown={(event) => { if (event.key === "Escape" && inspectorOpen) { event.stopPropagation(); closeInspector(); } }}>
      <div className="agents-constellation">
        <header className="agents-heading">
          <h1>Agents</h1><p className="secondary">Specialists, their assignments, and the boundaries they work within.</p>
        </header>
        <FieldControls query={query} setQuery={setQuery} filter={filter} setFilter={setFilter} reset={reset} canReset={!!query || filter !== "all"} />
        <div className="roster-heading"><span>Agent / capability</span><span>Assignment</span><span>Runtime</span></div>
          <div className="agents-roster" aria-label="Agent roster">
            {visible.map((agent) => <button key={agent.id} className={`constellation-roster-row ${inspectorOpen && selected?.id === agent.id ? "selected" : ""}`}
              aria-label={`Inspect ${agent.name}`} aria-pressed={inspectorOpen && selected?.id === agent.id}
              aria-controls={inspectorOpen ? "agent-inspector" : undefined} onClick={() => selectAgent(agent.id)}>
              <NeuronGlyph id={agent.id} /><span className="roster-agent-name"><strong>{agent.name}</strong><span>{agent.role}</span></span>
              <span className="roster-assignment">{tasks.find(t => t.id === agent.currentTaskId)?.title ?? (previewAgents.some(p => p.id === agent.id) ? "Not assigned" : agent.role)}</span><AgentState agent={agent} /><ChevronRight size={14} />
            </button>)}
            {!visible.length && <div className="roster-empty"><h2>No matching agents.</h2><p>Try a name, role, or capability.</p><button className="button subtle" onClick={reset}>Clear filters</button></div>}
          </div>
        <span className="sr-only" role="status">{visible.length} agents shown</span>
      </div>
      {inspectorOpen && selected && mission && <AgentInspector agent={selected} mission={mission} tasks={tasks} task={currentTask} members={members}
        inspectorRef={inspector} select={selectAgent} close={closeInspector} />}
      <details className="agents-activity">
        <summary>Mission activity <span>Recorded demo events</span></summary>
        <div className="agents-event-strip">
          {state.events.filter((event) => event.missionId === mission?.id).slice(-4).map((event) => {
            const agent = agents.find((item) => item.id === event.agentId) ?? members[0];
            return <button key={event.id} className="agents-event" onClick={() => selectAgent(agent.id)}>
              <span className="event-sequence">{String(event.sequence).padStart(2, "0")} / <time dateTime={event.occurredAt}>{new Date(event.occurredAt).toISOString().slice(11, 16)} UTC</time></span>
              <strong><i />{agent.name}</strong><span>{eventSummary(event)}</span><small>{visualFor(agent.id).family}<ArrowUpRight size={13} /></small>
            </button>;
          })}
        </div>
      </details>
      {mission && <div className="agents-mission-control">
        <p>{mission.status === "paused" ? "Execution paused" : mission.currentStage}</p>
        <button className="button subtle" onClick={toggleMission} aria-label={mission.status === "paused" ? "Resume demo mission" : "Pause demo mission"}>
          {mission.status === "paused" ? <Play size={14} /> : <Pause size={14} />}{mission.status === "paused" ? "Resume mission" : "Pause mission"}
        </button>
        {commandError && <p role="alert">{commandError}</p>}
      </div>}
    </section>
  );
}

function FieldControls({ query, setQuery, filter, setFilter, reset, canReset }: {
  query: string; setQuery: (value: string) => void; filter: Filter; setFilter: (value: Filter) => void; reset: () => void; canReset: boolean;
}) {
  return <div className="agents-field-controls"><div className="field-search-controls">
      <label className="agent-search"><Search size={13} /><span className="sr-only">Search agents</span><input placeholder="Find an agent…" value={query} onChange={(event) => setQuery(event.target.value)} />
        {query && <button aria-label="Clear agent search" onClick={() => setQuery("")}><X size={12} /></button>}</label>
      <label className="agent-filter"><span className="sr-only" id="agent-filter-label">Filter agents</span><select aria-labelledby="agent-filter-label" value={filter} onChange={(event) => setFilter(event.target.value as Filter)}>
        <option value="all">All agents</option><option value="mission">In mission</option><option value="review">Needs review</option>
        <optgroup label="Categories">{fieldNodes.map((node) => <option key={node.family} value={`category:${node.family}`}>{node.family}</option>)}</optgroup>
      </select></label>
      </div>
    {canReset && <button className="button subtle" aria-label="Reset filters" onClick={reset}><RotateCcw size={14} />Reset</button>}
  </div>;
}

function AgentState({ agent }: { agent: Agent }) {
  return agent.runtimeStatus === "disconnected" ? <span className="agent-disconnected">Not connected</span> : <Status status={agent.runtimeStatus} guardian={agent.id === "guardian"} />;
}

export function NeuronGlyph({ id }: { id: string }) {
  return <span className="agent-icon"><AgentGlyph id={id} size={20} /></span>;
}

function AgentInspector({ agent, mission, tasks, task, members, inspectorRef, select, close }: {
  agent: Agent; mission: Mission; tasks: Task[]; task?: Task; members: Agent[];
  inspectorRef: RefObject<HTMLElement | null>; select: (id: string, reveal?: boolean) => void; close: () => void;
}) {
  const { still } = useFieldMotion();
  const node = visualFor(agent.id);
  const preview = previewAgents.some((item) => item.id === agent.id);
  const childTasks = tasks.filter((item) => item.dependencies.includes(task?.id ?? ""));
  const parentTasks = tasks.filter((item) => task?.dependencies.includes(item.id));
  const relations = agent.id === "coordinator" ? tasks : [...parentTasks, ...(task ? [task] : []), ...childTasks];
  return <aside className="agent-inspector" ref={inspectorRef} id="agent-inspector" aria-label="Agent inspector" tabIndex={-1}>
    <header className="agent-inspector-header"><span>{preview ? "Preview agent" : "Agent details"}</span><button className="icon-button" aria-label="Close agent inspector" onClick={close}><X size={16} /></button></header>
    <motion.div className="agent-inspector-content" key={agent.id} initial={still ? false : { x: 8 }} animate={{ x: 0 }} transition={{ duration: still ? 0 : 0.16 }}>
      <div className="inspector-identity"><NeuronGlyph id={agent.id} /><div><h2>{agent.name}</h2><p>{agent.role}</p></div></div>
      <dl className="inspector-state-grid">
        <div><dt>Runtime</dt><dd><AgentState agent={agent} /></dd></div>
        <div><dt>Identity</dt><dd>{agent.identityStatus === "demo_verified" ? "Demo fixture" : agent.identityStatus === "verified" ? "Verified" : "Unverified"}</dd></div>
        <div><dt>Standing</dt><dd>Not checked</dd></div>
        <div><dt>Authority</dt><dd>{agent.allowedScopes.length} scoped {agent.allowedScopes.length === 1 ? "permission" : "permissions"}</dd></div>
      </dl>
      <section className="inspector-block"><h3>Authorization boundary <Shield size={12} /></h3><p>{agent.authorizationSummary}</p>
        <ul className="inspector-scopes">{agent.allowedScopes.map((scope) => <li key={scope}><Check size={11} /><code>{scope}</code></li>)}</ul>
        <span className="inspector-footnote">{preview ? "Admission required before any assignment." : "Demo scope only · no live grant or expiry."}</span>
      </section>
      <section className="inspector-block"><h3>Capabilities</h3><ul className="inspector-capabilities">{agent.capabilities.map((capability) => <li key={capability}><i />{capability}</li>)}</ul></section>
      <section className="inspector-block"><h3>Current mission</h3><p className="inspector-mission-title">{preview ? "Not assigned" : mission.title}</p><p>{task?.title ?? (preview ? "This specialist is not part of the mission roster." : agent.id === "guardian" ? "Independent policy observation" : "Coordinate the assigned specialists")}</p>
        <h3 className="inspector-output-label">Output type</h3><p>{node.output}</p><span className="inspector-footnote">{task?.resultRef ? `Result: ${task.resultRef}` : "No delivered artifact"}</span>
      </section>
      {!!relations.length && <section className="inspector-block"><h3>Assignment & handoffs</h3><ol className="inspector-handoffs">
        {agent.id === "coordinator" && <li className="handoff-current"><i /><span>CortexAi<small>Coordinate this mission</small></span></li>}
        {relations.map((item) => { const worker = members.find((member) => member.id === item.assignedAgentId); return <li key={item.id} className={worker?.id === agent.id ? "handoff-current" : ""}><i /><button onClick={() => select(item.assignedAgentId, false)}>{worker?.name ?? item.assignedAgentId}<small>{item.title}</small></button><ChevronRight size={12} /></li>; })}
      </ol></section>}
      <details className="inspector-evidence"><summary>Identity evidence <ChevronRight size={13} /></summary>{agent.verificationEvidence.map((evidence) => <p key={evidence}>{evidence}</p>)}<p>ANS standing has not been checked in this frontend demo.</p></details>
      <Link className="inspector-open-link" href={preview ? "/settings" : `/missions/${mission.id}`}>{preview ? "Integration readiness" : "Open mission console"}<ArrowUpRight size={15} /></Link>
    </motion.div>
  </aside>;
}
