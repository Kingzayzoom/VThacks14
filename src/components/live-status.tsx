"use client";
import { useState } from "react";
import { useControl } from "./provider";
export function LiveConnection() {
  const { state } = useControl();
  if (!state.live) return null;
  return <p className={state.live.error ? "form-error" : "settings-note"} role="status">{state.live.error || `Live hub · ${state.live.connection} · ${state.live.ansBackend === "sim" ? "Local ANS simulator evidence" : state.live.ansBackend === "godaddy" ? "GoDaddy ANS" : "ANS not checked"}`}</p>;
}
export function LiveMissionContext({ missionId }: { missionId: string }) {
  const { state, api } = useControl();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const mission = state.missions.find(m => m.id === missionId);
  if (!state.live) return null;
  const incidents = state.live.incidents.filter(i => i.missionId === missionId);
  async function decide(id: string, decision: "approve" | "reject", kind: "mission" | "incident") {
    if (!api.decide || pending) return;
    setPending(true); setError("");
    try { await api.decide(id, decision, kind); } catch { setError("Decision was not confirmed. Refresh the live state before trying again."); }
    finally { setPending(false); }
  }
  const actions = (id: string, kind: "mission" | "incident") => <div className="mission-actions"><button className="button primary" disabled={pending || state.live?.connection !== "connected"} onClick={() => void decide(id, "approve", kind)}>Approve once</button><button className="button subtle" disabled={pending || state.live?.connection !== "connected"} onClick={() => void decide(id, "reject", kind)}>Refuse</button></div>;
  return <>
    {mission?.error && <p className="form-error" role="alert">{mission.error}</p>}
    {mission?.approval && <aside className="review-callout"><div className="context-label">Needs your input</div><h2>Version approval</h2><p>{mission.approval.org} · {mission.approval.version}</p><p>{mission.approval.reason}</p>{actions(missionId, "mission")}</aside>}
    {!!state.live.recruitments.length && <section className="results-section"><h2>Recruitment</h2>{state.live.recruitments.filter(r => r.missionId === missionId).map(r => <details key={r.id}><summary>{r.capability} · {r.status}</summary><p>{r.candidates.length} candidates</p><p>Requested: {r.requestedScopes.join(", ") || "None"}</p><p>Admission scopes: {r.grantedScopes.join(", ") || "None"}. Active authority is checked separately with Guardian.</p></details>)}</section>}
    <section className="results-section"><h2>Guardian</h2><p className="secondary">Independent deterministic policy. Identity never grants authority.</p>{incidents.length ? incidents.map(i => <details key={i.id} open={i.state === "NEEDS REVIEW"}><summary>{i.org} · {i.state}</summary><p>{i.action} · {i.resource}</p><p>{i.reason}</p><p className="secondary">Payload: <code style={{overflowWrap: "anywhere"}}>{i.payloadDigest || "Not supplied"}</code></p>{i.state === "NEEDS REVIEW" && actions(i.id, "incident")}</details>) : <p>No action decisions recorded for this mission.</p>}</section>
    {error && <p className="form-error" role="alert">{error}</p>}
  </>;
}
export function LiveIntegrations() {
  const { state } = useControl();
  if (!state.live) return null;
  return <div className="integration-table">{state.live.integrations.map(i => <section className="integration-row" key={i.name}><div><h2>{i.name}</h2><p>{i.detail}</p></div><span className="status">{i.state.replaceAll("_", " ").toLowerCase()}</span></section>)}</div>;
}
