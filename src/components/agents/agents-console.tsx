"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type RefObject } from "react";
import { ArrowUpRight, Check, ChevronRight, Focus, List, Network, Pause, Play, RotateCcw, Search, Shield, X } from "lucide-react";
import type { Agent, Mission, Task } from "@/contracts";
import { agentInMission } from "@/lib/demo/fixtures";
import { useControl } from "../provider";
import { useFieldMotion } from "../motion-system";
import { Status } from "../ui";
import { FieldAtmosphere } from "./field-atmosphere";
import { connectionPath, eventSummary, fieldNodes, previewAgents, visualFor, type FieldNode } from "./field-model";

type Filter = "all" | "mission" | "review" | `category:${FieldNode["family"]}`;
type View = "map" | "list";
const compactQuery = "(max-width: 760px)";
function subscribeCompact(callback: () => void) {
  const query = matchMedia(compactQuery);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}
const readCompact = () => matchMedia(compactQuery).matches;
const readServerCompact = () => false;
const nodeStyle = (node: FieldNode): CSSProperties => ({
  "--node-color": node.color, "--node-x": `${node.x}%`, "--node-y": `${node.y}%`,
} as CSSProperties);

export function AgentsConsole() {
  const { api, state } = useControl();
  const { still } = useFieldMotion();
  const compact = useSyncExternalStore(subscribeCompact, readCompact, readServerCompact);
  const [viewChoice, setView] = useState<View | null>(null);
  const view = viewChoice ?? (compact ? "list" : "map");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [focus, setFocus] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [commandError, setCommandError] = useState("");
  const inspector = useRef<HTMLElement>(null);
  const selectionTrigger = useRef<HTMLElement | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const mission = state.missions.find((m) => m.id === state.selectedMissionId) ?? state.missions[0];
  const members = state.agents.filter((agent) => mission.agentIds.includes(agent.id))
    .map((agent) => agentInMission(agent, state, mission.id));
  const agents = [...members, ...previewAgents];
  const selectedId = previewId ?? state.selectedAgentId;
  const selected = agents.find((agent) => agent.id === selectedId) ?? members[0];
  const tasks = state.tasks.filter((task) => task.missionId === mission.id);
  const currentTask = tasks.find((task) => task.id === selected.currentTaskId);
  const normalizedQuery = query.trim().toLowerCase();
  const visible = agents.filter((agent) => {
    const matches = `${agent.name} ${agent.role} ${visualFor(agent.id).family} ${agent.capabilities.join(" ")}`.toLowerCase().includes(normalizedQuery);
    return matches && (filter === "all" || (filter === "mission" && mission.agentIds.includes(agent.id)) || (filter === "review" && agent.runtimeStatus === "waiting_approval") || filter === `category:${visualFor(agent.id).family}`);
  });
  const visibleIds = new Set(visible.map((agent) => agent.id));
  useEffect(() => {
    if (inspectorOpen && compact) {
      inspector.current?.focus({ preventScroll: true });
      inspector.current?.scrollIntoView({ behavior: still ? "instant" : "smooth", block: "start" });
    }
  }, [inspectorOpen, compact, selected.id, still]);
  function closeInspector() {
    setInspectorOpen(false); setFocus(false);
    selectionTrigger.current?.focus();
  }
  function selectAgent(id: string, reveal = true) {
    if (reveal && document.activeElement instanceof HTMLElement) selectionTrigger.current = document.activeElement;
    setInspectorOpen(true);
    if (previewAgents.some((agent) => agent.id === id)) setPreviewId(id);
    else { setPreviewId(null); api.selectAgent(id); }
  }
  function reset() {
    setQuery(""); setFilter("all"); setFocus(false); setHovered(null); setView(null);
    setPreviewId(null); api.selectAgent("coordinator"); setInspectorOpen(false);
  }
  async function toggleMission() {
    setCommandError("");
    try { await api.commandMission(mission.id, mission.status === "paused" ? "resume" : "pause"); }
    catch (error) { setCommandError(error instanceof Error ? error.message : "Unable to update mission."); }
  }
  return (
    <section className={`agents-console ${inspectorOpen ? "inspector-open" : ""}`} aria-label="Agent command center" onKeyDown={(event) => { if (event.key === "Escape" && inspectorOpen) { event.stopPropagation(); closeInspector(); } }}>
      <div className={`agents-constellation ${focus ? "branch-focus" : ""}`} data-view={view}>
        <header className="agents-heading">
          <h1>AGENTS<span>.</span></h1>
        </header>
        <FieldControls view={view} setView={setView} focus={focus} setFocus={setFocus}
          query={query} setQuery={setQuery} filter={filter} setFilter={setFilter} reset={reset} selected={inspectorOpen}
          canReset={inspectorOpen || !!query || filter !== "all" || view !== (compact ? "list" : "map")} />
        {view === "map" ? (
          <div className="constellation-map-viewport" tabIndex={compact ? 0 : undefined} aria-label="Agent constellation; scroll horizontally on small screens">
            <div className="constellation-map" data-selected={selected.id}>
              <FieldAtmosphere selected={hovered ?? selected.id} />
              <svg className="constellation-connections" viewBox="0 0 1000 660" preserveAspectRatio="none" aria-hidden="true">
                <g className="constellation-contours">
                  {Array.from({ length: 8 }, (_, i) => <ellipse key={i} cx="560" cy="277.2" rx={105 + i * 21} ry={85 + i * 17} transform={`rotate(${-18 + i * 7} 560 277.2)`} />)}
                  <path d="M560 64V195M553 76h14M-50 581C260 363 323 760 655 556S975 304 1090 491" />
                </g>
                {fieldNodes.filter((node) => node.id !== "coordinator" && node.id !== "guardian").map((node) => {
                  const agent = agents.find((item) => item.id === node.id);
                  if (!agent || !visibleIds.has(node.id)) return null;
                  return <ConnectionPath key={node.id} node={node} running={agent.runtimeStatus === "running"}
                    disconnected={agent.runtimeStatus === "disconnected"} selected={selected.id === node.id || selected.id === "coordinator"}
                    hovered={hovered === node.id} dim={focus && selected.id !== "coordinator" && selected.id !== node.id} />;
                })}
              </svg>
              {visible.filter((agent) => agent.id !== "guardian").map((agent) => (
                <ConstellationNode key={agent.id} agent={agent} selected={inspectorOpen && selected.id === agent.id}
                  dim={focus && selected.id !== "coordinator" && agent.id !== selected.id && agent.id !== "coordinator"}
                  task={tasks.find((task) => task.id === agent.currentTaskId)} select={() => selectAgent(agent.id)}
                  hover={(value) => setHovered(value ? agent.id : null)} />
              ))}
              {visibleIds.has("guardian") && <button className={`constellation-guardian ${inspectorOpen && selected.id === "guardian" ? "selected" : ""}`}
                aria-label="Inspect Guardian" aria-pressed={inspectorOpen && selected.id === "guardian"} aria-controls={inspectorOpen ? "agent-inspector" : undefined} onClick={() => selectAgent("guardian")}>
                <Shield size={20} strokeWidth={1.2} /><span><strong>GUARDIAN</strong><small>Independent oversight</small></span>
              </button>}
              {!visible.length && <div className="constellation-empty"><Search size={24} /><h2>No matching agents.</h2><p>Try a name, role, or capability.</p><button className="button subtle" onClick={reset}>Clear filters</button></div>}
            </div>
          </div>
        ) : (
          <div className="agents-roster" aria-label="Agent roster">
            {visible.map((agent) => <button key={agent.id} className={`constellation-roster-row ${inspectorOpen && selected.id === agent.id ? "selected" : ""}`}
              style={nodeStyle(visualFor(agent.id))} aria-label={`Inspect ${agent.name}`} aria-pressed={inspectorOpen && selected.id === agent.id}
              aria-controls={inspectorOpen ? "agent-inspector" : undefined} onClick={() => selectAgent(agent.id)}>
              <NeuronGlyph id={agent.id} /><span className="roster-agent-name"><strong>{agent.name}</strong><span>{agent.role}</span></span>
              <AgentState agent={agent} /><ChevronRight size={14} />
            </button>)}
            {!visible.length && <div className="roster-empty"><h2>No matching agents.</h2><p>Try a name, role, or capability.</p><button className="button subtle" onClick={reset}>Clear filters</button></div>}
          </div>
        )}
        <span className="sr-only" role="status">{visible.length} agents shown</span>
      </div>
      {inspectorOpen && <AgentInspector agent={selected} mission={mission} tasks={tasks} task={currentTask} members={members}
        inspectorRef={inspector} select={selectAgent} close={closeInspector} />}
      <details className="agents-activity">
        <summary>Mission activity <span>Recorded demo events</span></summary>
        <div className="agents-event-strip">
          {state.events.filter((event) => event.missionId === mission.id).slice(-4).map((event) => {
            const agent = agents.find((item) => item.id === event.agentId) ?? members[0];
            return <button key={event.id} className="agents-event" style={nodeStyle(visualFor(agent.id))} onClick={() => selectAgent(agent.id)}>
              <span className="event-sequence">{String(event.sequence).padStart(2, "0")} / <time dateTime={event.occurredAt}>{new Date(event.occurredAt).toISOString().slice(11, 16)} UTC</time></span>
              <strong><i />{agent.name}</strong><span>{eventSummary(event)}</span><small>{visualFor(agent.id).family}<ArrowUpRight size={13} /></small>
            </button>;
          })}
        </div>
      </details>
      <div className="agents-mission-control">
        <p>{mission.status === "paused" ? "Execution paused" : mission.currentStage}</p>
        <button className="button subtle" onClick={toggleMission} aria-label={mission.status === "paused" ? "Resume demo mission" : "Pause demo mission"}>
          {mission.status === "paused" ? <Play size={14} /> : <Pause size={14} />}{mission.status === "paused" ? "Resume mission" : "Pause mission"}
        </button>
        {commandError && <p role="alert">{commandError}</p>}
      </div>
    </section>
  );
}

function FieldControls({ view, setView, focus, setFocus, query, setQuery, filter, setFilter, reset, selected, canReset }: {
  view: View; setView: (view: View) => void; focus: boolean; setFocus: (value: boolean) => void;
  query: string; setQuery: (value: string) => void; filter: Filter; setFilter: (value: Filter) => void; reset: () => void; selected: boolean; canReset: boolean;
}) {
  return <div className="agents-field-controls">
    <div className="field-view-controls" role="group" aria-label="Field view">
      <button aria-label="Map view" aria-pressed={view === "map"} onClick={() => setView("map")}><Network size={14} /><span>Map</span></button>
      <button aria-label="List view" aria-pressed={view === "list"} onClick={() => setView("list")}><List size={14} /><span>List</span></button>
      {selected && view === "map" && <button aria-label="Focus selected branch" title="Focus selected branch" aria-pressed={focus} onClick={() => setFocus(!focus)}><Focus size={15} /></button>}
      {canReset && <button aria-label="Reset field view" title="Reset field view" onClick={(event) => {
        event.currentTarget.parentElement?.querySelector("button")?.focus();
        reset();
      }}><RotateCcw size={14} /></button>}
    </div>
    <details className="field-search-disclosure">
      <summary>Find agents{(query || filter !== "all") && " · filtered"}</summary>
      <div className="field-search-controls">
      <label className="agent-search"><Search size={13} /><span className="sr-only">Search agents</span><input placeholder="Find an agent…" value={query} onChange={(event) => setQuery(event.target.value)} />
        {query && <button aria-label="Clear agent search" onClick={() => setQuery("")}><X size={12} /></button>}</label>
      <label className="agent-filter"><span className="sr-only" id="agent-filter-label">Filter agents</span><select aria-labelledby="agent-filter-label" value={filter} onChange={(event) => setFilter(event.target.value as Filter)}>
        <option value="all">All agents</option><option value="mission">In mission</option><option value="review">Needs review</option>
        <optgroup label="Categories">{fieldNodes.map((node) => <option key={node.family} value={`category:${node.family}`}>{node.family}</option>)}</optgroup>
      </select></label>
      </div>
    </details>
  </div>;
}

function AgentState({ agent }: { agent: Agent }) {
  return agent.runtimeStatus === "disconnected" ? <span className="agent-disconnected">Not connected</span> : <Status status={agent.runtimeStatus} guardian={agent.id === "guardian"} />;
}

export function NeuronGlyph({ id }: { id: string }) {
  return <svg className={`neuron-glyph neuron-${id}`} viewBox="0 0 140 140" aria-hidden="true" fill="none">
    <g className="neuron-filaments">
      {Array.from({ length: 9 }, (_, i) => <ellipse key={i} cx="70" cy="70" rx={35 + i * 1.9} ry={25 + i * 2.1} transform={`rotate(${i * 24} 70 70)`} stroke="currentColor" strokeWidth={i === 4 ? ".85" : ".4"} opacity={i === 4 ? ".8" : ".3"} />)}
    </g>
    <circle cx="70" cy="70" r="56" stroke="currentColor" strokeWidth=".5" opacity=".22" />
    <circle cx="70" cy="70" r="32" stroke="currentColor" strokeWidth=".65" opacity=".6" />
    <g className="neuron-orbit"><circle cx="70" cy="70" r="63" stroke="currentColor" strokeWidth=".6" strokeDasharray="13 75 2 34" opacity=".5" /><circle cx="70" cy="7" r="1.6" fill="currentColor" /></g>
    <circle className="neuron-center-halo" cx="70" cy="70" r="19" fill="currentColor" opacity=".09" />
    <circle cx="70" cy="70" r="23" fill="#090c0c" stroke="currentColor" strokeWidth=".6" />
    <g stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      {id === "coordinator" ? <path d="M63 82V57h9c14 0 14 18 0 18h-9" /> :
        id === "scout" ? <><path d="m79 59-5 16-15 6 5-16Z" /><path d="m59 81 20-22" /></> :
        id === "sage" ? <><path d="m70 57 14 24H56Z" /><path d="m62 73 4-4 5 6 6-9" /></> :
        id === "forge" ? <><path d="M59 59h21v21H59zM64 64h21v21H64" /><path d="M59 66h21" /></> :
        id === "guardian" ? <path d="m70 55 13 6v12c0 9-13 14-13 14s-13-5-13-14V61Zm-6 16 4 4 8-9" /> :
        id === "memory" ? <><path d="m70 57 15 8-15 8-15-8Zm-15 15 15 8 15-8m-30 7 15 8 15-8" /></> :
        <path d="M55 67v6m6-13v20m6-25v30m6-21v12m6-17v22m6-14v6" />}
    </g>
    <g className="neuron-spark"><circle cx="48" cy="45" r="7" fill="currentColor" opacity=".12" /><circle cx="48" cy="45" r="3" fill="currentColor" /><circle cx="48" cy="45" r="1.3" fill="#fff8e4" /></g>
  </svg>;
}

function ConstellationNode({ agent, selected, dim, task, select, hover }: {
  agent: Agent; selected: boolean; dim: boolean; task?: Task; select: () => void; hover: (value: boolean) => void;
}) {
  const node = visualFor(agent.id);
  return <button className={`constellation-node ${selected ? "is-selected" : ""} ${dim ? "is-dim" : ""} ${agent.id === "coordinator" ? "is-core" : ""} ${agent.runtimeStatus === "disconnected" ? "is-preview" : ""}`}
    style={nodeStyle(node)} aria-label={`Inspect ${agent.name}`} aria-pressed={selected} aria-controls={selected ? "agent-inspector" : undefined}
    onClick={select} onMouseEnter={() => hover(true)} onMouseLeave={() => hover(false)} onFocus={() => hover(true)} onBlur={() => hover(false)}>
    <span className="neuron-satellites" aria-hidden="true"><i /><i /><i /></span>
    <span className="neuron-aura" aria-hidden="true" /><NeuronGlyph id={agent.id} />
    <span className="neuron-label"><strong>{agent.id === "coordinator" ? "CortexAi" : agent.name}</strong><AgentState agent={agent} /></span>
    <span className="neuron-tooltip"><span>{agent.capabilities[0]}</span>{task?.title ?? agent.role}<ArrowUpRight size={12} /></span>
  </button>;
}

function SignalPulse({ d }: { d: string }) {
  return <path className="constellation-signal" d={d} pathLength="100" />;
}
function ConnectionPath({ node, running, disconnected, selected, hovered, dim }: {
  node: FieldNode; running: boolean; disconnected: boolean; selected: boolean; hovered: boolean; dim: boolean;
}) {
  const d = connectionPath(node);
  return <g className={`constellation-link ${selected || hovered ? "emphasized" : ""} ${dim ? "is-dim" : ""} ${disconnected ? "preview-link" : ""}`} style={nodeStyle(node)} data-agent={node.id}>
    <path className="constellation-link-bloom" d={d} />
    <path className="constellation-link-line" d={d} />
    {running && <SignalPulse d={d} />}
  </g>;
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
  return <aside className="agent-inspector" ref={inspectorRef} id="agent-inspector" aria-label="Agent inspector" tabIndex={-1} style={nodeStyle(node)}>
    <header className="agent-inspector-header"><span>{preview ? "Preview agent" : "Agent details"}</span><button className="icon-button" aria-label="Close agent inspector" onClick={close}><X size={16} /></button></header>
    <motion.div className="agent-inspector-content" key={agent.id} initial={still ? false : { opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: still ? 0 : 0.32 }}>
      <div className="inspector-identity"><NeuronGlyph id={agent.id} /><div><h2>{agent.name}</h2><p>{agent.role}</p></div></div>
      <dl className="inspector-state-grid">
        <div><dt>RUNTIME</dt><dd><AgentState agent={agent} /></dd></div>
        <div><dt>IDENTITY</dt><dd>{agent.identityStatus === "demo_verified" ? "Demo fixture" : agent.identityStatus === "verified" ? "Verified" : "Unverified"}</dd></div>
        <div><dt>STANDING</dt><dd>Not checked</dd></div>
        <div><dt>AUTHORITY</dt><dd>{agent.allowedScopes.length} scoped {agent.allowedScopes.length === 1 ? "permission" : "permissions"}</dd></div>
      </dl>
      <section className="inspector-block"><h3>AUTHORIZATION BOUNDARY <Shield size={12} /></h3><p>{agent.authorizationSummary}</p>
        <ul className="inspector-scopes">{agent.allowedScopes.map((scope) => <li key={scope}><Check size={11} /><code>{scope}</code></li>)}</ul>
        <span className="inspector-footnote">{preview ? "Admission required before any assignment." : "Demo scope only · no live grant or expiry."}</span>
      </section>
      <section className="inspector-block"><h3>CAPABILITIES</h3><ul className="inspector-capabilities">{agent.capabilities.map((capability) => <li key={capability}><i />{capability}</li>)}</ul></section>
      <section className="inspector-block"><h3>CURRENT MISSION</h3><p className="inspector-mission-title">{preview ? "Not assigned" : mission.title}</p><p>{task?.title ?? (preview ? "This specialist is not part of the mission roster." : agent.id === "guardian" ? "Independent policy observation" : "Coordinate the assigned specialists")}</p>
        <h3 className="inspector-output-label">OUTPUT TYPE</h3><p>{node.output}</p><span className="inspector-footnote">{task?.resultRef ? `Result: ${task.resultRef}` : "No delivered artifact"}</span>
      </section>
      {!!relations.length && <section className="inspector-block"><h3>ASSIGNMENT & HANDOFFS</h3><ol className="inspector-handoffs">
        {agent.id === "coordinator" && <li className="handoff-current"><i /><span>CortexAi<small>Coordinate this mission</small></span></li>}
        {relations.map((item) => { const worker = members.find((member) => member.id === item.assignedAgentId); return <li key={item.id} className={worker?.id === agent.id ? "handoff-current" : ""}><i /><button onClick={() => select(item.assignedAgentId, false)}>{worker?.name ?? item.assignedAgentId}<small>{item.title}</small></button><ChevronRight size={12} /></li>; })}
      </ol></section>}
      <details className="inspector-evidence"><summary>Identity evidence <ChevronRight size={13} /></summary>{agent.verificationEvidence.map((evidence) => <p key={evidence}>{evidence}</p>)}<p>ANS standing has not been checked in this frontend demo.</p></details>
      <Link className="inspector-open-link" href={preview ? "/settings" : `/missions/${mission.id}`}>{preview ? "Integration readiness" : "Open mission console"}<ArrowUpRight size={15} /></Link>
    </motion.div>
  </aside>;
}
