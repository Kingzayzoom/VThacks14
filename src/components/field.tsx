"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Pause, Play, TriangleAlert, ArrowRight, Shield, FileText, X, CircleCheck, CircleDot, CirclePause, Circle, CornerDownRight } from "lucide-react";
import { useControl } from "./provider";
import { AgentGlyph, Status } from "./ui";
import { Dialog } from "./dialog";
import { agentInMission } from "@/lib/demo/fixtures";
import { eventSummary } from "./agents/field-model";
export function Field({ missionId }: { missionId?: string }) {
  const { state, api } = useControl();
  const router = useRouter();
  const mission = state.missions.find(m => m.id === (missionId ?? state.selectedMissionId));
  const [inspecting, setInspecting] = useState(false);
  const [review, setReview] = useState(false);
  const [objective, setObjective] = useState(false);
  const [commandError, setCommandError] = useState("");
  const trigger = useRef<HTMLElement | null>(null);
  useEffect(() => { if (missionId && state.selectedMissionId !== missionId) api.selectMission(missionId); }, [api, missionId, state.selectedMissionId]);
  function closeInspector() { setInspecting(false); trigger.current?.focus(); }
  function select(id: string) {
    trigger.current = document.activeElement as HTMLElement;
    api.selectAgent(id); setInspecting(true);
    requestAnimationFrame(() => document.getElementById("selected-agent-details")?.focus());
  }
  if (!mission) return <div className="empty-state"><h1>{missionId ? "Mission not found on this device." : "No mission selected"}</h1><p>Start a mission or choose one from your workspace.</p><Link className="button primary" href="/">Create mission</Link><Link className="text-link" href="/missions">Browse missions</Link></div>;
  const tasks = state.tasks.filter(t => t.missionId === mission.id);
  const completed = tasks.filter(t => t.status === "completed").length;
  const pending = tasks.filter(t => t.status === "waiting_approval").length;
  const events = state.events.filter(e => e.missionId === mission.id).slice(-8).reverse();
  const selected = state.agents.find(a => a.id === state.selectedAgentId) ?? state.agents[0];
  const agent = selected ? agentInMission(selected, state, mission.id) : undefined;
  const task = tasks.find(t => t.id === agent?.currentTaskId);
  async function toggleMission() { if (!mission) return; try { await api.commandMission(mission.id, mission.status === "paused" ? "resume" : "pause"); setCommandError(""); } catch (error) { setCommandError(error instanceof Error ? error.message : "Unable to update mission."); } }
  return <div className="field-page">
    <header className="page-heading"><div><h1>{missionId ? "Mission detail" : "Overview"}</h1><p className="secondary">{missionId ? "Objective, tasks, and results in one place." : "Your current work and the decisions that move it forward."}</p></div>
      <label className="mission-select"><span>Selected mission</span><select aria-label="Active mission" value={mission.id} onChange={e => { api.selectMission(e.target.value); if (missionId) router.push(`/missions/${e.target.value}`); }}>{state.missions.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}</select></label>
    </header>
    <div className="work-grid">
      <section className="mission-work" aria-label="Current mission progress">
        <div className="mission-overview">
          <div className="mission-caption"><span>Current mission</span><Status status={mission.status} /></div>
          <h2>{mission.title}</h2>
          <p className="objective-copy">{mission.objective}</p>
          <div className="mission-actions">
            <button className="text-link" onClick={() => setObjective(true)}>View objective <ArrowUpRight size={14} /></button>
            <button className="button subtle" aria-label={mission.status === "paused" ? "Resume demo mission" : "Pause demo mission"} onClick={toggleMission}>
              {mission.status === "paused" ? <Play size={14} /> : <Pause size={14} />}{mission.status === "paused" ? "Resume demo" : "Pause demo"}
            </button>
          </div>
          {commandError && <p role="alert" className="form-error">{commandError}</p>}
        </div>
        <div className="task-section">
          <div className="section-heading"><h2>Mission tasks</h2><span className="progress-label">{completed} of {tasks.length} complete</span></div>
          <div className="task-progress" aria-hidden="true">{tasks.map(t => <span key={t.id} className={t.status} />)}</div>
          <ol className="task-list">
            {tasks.map((t, i) => {
              const status = mission.status === "paused" && t.status === "running" ? "paused" : t.status;
              const Icon = status === "completed" ? CircleCheck : status === "running" ? CircleDot : status === "paused" ? CirclePause : status === "waiting_approval" ? TriangleAlert : Circle;
              const assigned = state.agents.find(a => a.id === t.assignedAgentId);
              return <li key={t.id}>
                <button className={`task-item task-${status}`} aria-label={`Inspect ${assigned?.name ?? t.assignedAgentId}`} onClick={() => select(t.assignedAgentId)}>
                  <span className="task-state-icon"><Icon size={20} aria-hidden="true" /></span>
                  <span className="task-copy"><strong><span className="sr-only">Task {i + 1}: </span>{t.title}</strong>
                    <span className="task-assignee"><AgentGlyph id={t.assignedAgentId} size={14} />{assigned?.name}
                      <span className="task-dependency"><CornerDownRight size={13} />{t.dependencies.length ? `After task ${t.dependencies.map(id => tasks.findIndex(task => task.id === id) + 1).join(", ")}` : "No dependencies"}</span>
                    </span>
                  </span>
                  <Status status={status} /><ArrowUpRight size={15} />
                </button>
              </li>;
            })}
          </ol>
          {!tasks.length && <p className="secondary">No tasks assigned yet.</p>}
        </div>
        <details className="mission-activity">
          <summary>Recent activity <span>{events.length} events</span></summary>
          <ol className="activity-list">{events.map(event => <li key={event.id}><span><strong>{state.agents.find(a => a.id === event.agentId)?.name ?? "Operator"}</strong><p>{eventSummary(event)}</p></span><time dateTime={event.occurredAt}>{new Date(event.occurredAt).toISOString().slice(11,16)} UTC</time></li>)}</ol>
          <p className="secondary">Local fixture events. No external agent is executing.</p>
        </details>
      </section>
      <div className="mission-context-column">
        {pending > 0 && <aside className="review-callout">
          <div className="context-label"><TriangleAlert size={16} /><span>Needs your input</span></div>
          <h2>A capability is missing.</h2>
          <p>Forge needs a data visualization specialist to finish the brief.</p>
          <dl className="request-summary"><div><dt>Requested by</dt><dd><AgentGlyph id="forge" size={15} />Forge</dd></div><div><dt>Scope</dt><dd>This mission only</dd></div></dl>
          <button className="button primary" onClick={() => setReview(true)}>Review request <ArrowRight size={16} /></button>
          <p className="review-note">{pending} task awaiting review</p>
        </aside>}
        <section className="results-section">
          <div className="section-heading"><h2>Results</h2><span className="count-label">{mission.artifactIds.length}</span></div>
          {mission.artifactIds.length ? mission.artifactIds.map(id => <p key={id}><code>{id}</code></p>) : <div className="result-empty"><FileText size={22} /><div><h3>No delivered artifacts yet</h3><p>Outputs will appear here as tasks finish.</p></div></div>}
        </section>
      </div>
    </div>
    {inspecting && agent && <aside className="context-inspector inspector-content" id="selected-agent-details" tabIndex={-1} aria-label="Selected agent details" onKeyDown={e => { if (e.key === "Escape") closeInspector(); }}><header className="agent-inspector-header"><span>Agent details</span><button className="icon-button" aria-label="Close inspector" onClick={closeInspector}><X size={18} /></button></header><div className="inspector-identity"><AgentGlyph id={agent.id} /><div><h2>{agent.name}</h2><p>{agent.role}</p></div></div><dl className="inspector-state-grid"><div><dt>Identity</dt><dd>Demo verification only</dd></div><div><dt>Standing</dt><dd>Not checked</dd></div><div><dt>Authority</dt><dd>{agent.allowedScopes.length} scoped permissions</dd></div><div><dt>Runtime</dt><dd><Status status={agent.runtimeStatus} /></dd></div></dl><dl className="inspector-block"><dt>Current assignment</dt><dd>{task?.title ?? agent.role}</dd><dt>Authorization</dt><dd>{agent.authorizationSummary}</dd><dt>Allowed scopes</dt><dd className="scope-list">{agent.allowedScopes.map(s => <code key={s}>{s}</code>)}</dd><dt>Capabilities</dt><dd>{agent.capabilities.join(" / ")}</dd></dl><details className="inspector-evidence"><summary>Identity evidence</summary>{agent.verificationEvidence.map(e => <p key={e}>{e}</p>)}</details></aside>}
      <Dialog
        open={review}
        onClose={() => setReview(false)}
        title="Capability request"
      >
        <div className="eyebrow amber">
          <TriangleAlert size={14} /> Capability request
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
          Request preview<br />
          <span>
            Specialist admission is not connected. This request remains pending.
          </span>
        </div>
        <button className="button primary" onClick={() => setReview(false)}>
          Return to overview
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
        <div className="eyebrow muted">Constraints</div>
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
            Demo objectives use the same sample task plan. External execution is not connected.
          </span>
        </div>
      </Dialog>
  </div>;
}
