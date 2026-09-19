"use strict";

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const S = { agents: [], mission: null, events: [], resultFor: null, logTimer: null };

async function api(method, path, body) {
  const res = await fetch(path, {
    method, headers: body ? { "Content-Type": "application/json" } : {}, body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || `${res.status} ${res.statusText}`);
  return data;
}

// --- naming helpers ------------------------------------------------------------------

function agentByAns(ans) { return S.agents.find((a) => a.ans_name === ans); }
function parseAns(ans) {
  const m = /^ans:\/\/v(\d+\.\d+\.\d+)\.([a-z0-9-]+)\.([a-z0-9.-]+)$/.exec(ans || "");
  return m ? { version: m[1], label: m[2], domain: m[3], host: `${m[2]}.${m[3]}` } : null;
}
function hostOf(agent) {
  const p = parseAns(agent.ans_name);
  return p ? p.host : null;
}
function orgFor(ans) {
  const a = agentByAns(ans);
  if (a) return a.org;
  const p = parseAns(ans);
  if (p) {
    // Match on host, not domain: once every agent is a subdomain of one real domain, matching
    // on the domain alone reports the same org for all of them.
    const byHost = S.agents.find((x) => hostOf(x) === p.host);
    return byHost ? `${byHost.org} v${p.version}` : p.host;
  }
  const imp = S.agents.find((x) => x.role === "impostor" && x.endpoint === ans);
  return imp ? "Impostor" : ans || "Mission Control";
}
function time(ts) { return ts ? new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }) : ""; }

// --- agents ----------------------------------------------------------------------------

const STATUS = {
  ACTIVE: ["ok", "Verified"], REVOKED: ["bad", "Revoked"], SUPERSEDED: ["", "Superseded"],
};

function renderAgents() {
  const el = $("agents");
  if (!S.agents.length) { el.innerHTML = `<p class="empty">Waiting for agents…</p>`; return; }
  el.innerHTML = S.agents.map((a) => {
    if (a.role === "impostor") {
      return `<div class="agent impostor ${a.online ? "" : "offline"}">
        <div class="agent-head"><b>Impostor</b><span class="pill bad">Not in ANS</span></div>
        <span class="org">${a.claiming ? `Claims to be <code>${esc(a.claiming)}</code>` : "Waiting for a chance to strike"}</span>
        <div class="actions"><button class="btn small danger" data-act="impostor" ${a.online ? "" : "disabled"}>Send impostor</button></div>
      </div>`;
    }
    if (!a.online) {
      return `<div class="agent offline"><div class="agent-head"><b>${esc(a.name)}</b><span class="pill">Offline</span></div>
        <span class="org">${esc(a.org)} · ${esc(a.domain)}</span></div>`;
    }
    const [cls, label] = STATUS[a.status] || ["", a.status || "Unknown"];
    const self = a.role === "commander";
    const days = a.cert_expires ? Math.max(0, Math.round((new Date(a.cert_expires) - Date.now()) / 864e5)) : null;
    const vendor = a.role === "vendor";
    return `<div class="agent ${self ? "self" : ""} ${(a.status || "").toLowerCase()}">
      <div class="agent-head"><b>${esc(a.name)}</b><span class="pill ${self ? "acc" : cls}">${self ? "You" : label}</span></div>
      <span class="org">${esc(a.org)} · ${esc(a.domain)}</span>
      <code>${esc(a.ans_name)}</code>
      <span class="meta">${a.fingerprint ? `cert ${esc(a.fingerprint.slice(7, 19))}… · ` : ""}${days !== null ? `expires in ${days}d` : ""}${a.status_reason && a.status !== "ACTIVE" ? ` · ${esc(a.status_reason)}` : ""}</span>
      ${vendor ? `<div class="actions">
        <button class="btn small danger" data-act="revoke" data-key="${a.key}" ${a.status === "ACTIVE" ? "" : "disabled"}>Revoke in ANS</button>
        <button class="btn small" data-act="upgrade" data-key="${a.key}" ${a.status === "ACTIVE" ? "" : "disabled"}>Ship new version</button>
      </div>` : ""}
    </div>`;
  }).join("");
}

$("agents").addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-act]");
  if (!btn) return;
  btn.disabled = true;
  const { act, key } = btn.dataset;
  try {
    if (act === "revoke") await api("POST", `/api/chaos/revoke/${key}`);
    if (act === "upgrade") await api("POST", `/api/chaos/upgrade/${key}`);
    if (act === "impostor") await api("POST", "/api/chaos/impostor");
  } catch (err) { showError(err.message); }
  refreshState();
});

// --- feed --------------------------------------------------------------------------------

const CHECK_LABEL = { resolve: "resolve", authenticate: "identity", status: "status", capability: "capability", policy: "policy" };

function eventHtml(ev) {
  const d = ev.data || {};
  const t = `<time>${time(ev.ts)}</time>`;
  if (ev.type === "trust.check") {
    const verdict = d.verdict || "";
    const cls = verdict === "TRUSTED" ? "ok" : verdict === "NEEDS_APPROVAL" ? "warn" : "bad";
    const label = verdict === "TRUSTED" ? "Trusted" : verdict === "NEEDS_APPROVAL" ? "Needs approval" : "Blocked";
    const subject = d.source === "open-web offer" ? `${orgFor(ev.subject)} <span class="muted">(at ${esc(d.endpoint)})</span>` : esc(orgFor(ev.subject));
    const chips = (d.checks || []).map((c) =>
      `<span class="chip ${c.ok ? "ok" : c.ok === false ? "bad" : ""}" title="${esc(c.detail)}">${esc(CHECK_LABEL[c.name] || c.name)} ${c.ok ? "✓" : c.ok === false ? "✗" : "–"}</span>`).join("");
    const failed = (d.checks || []).find((c) => c.ok === false);
    return `<div class="ev ${cls === "ok" ? "good" : cls}">${t}<div>
      <p><span class="who">${esc(orgFor(ev.actor))}</span> checked <span class="who">${subject}</span>
      <span class="src">${esc(d.source || "")}</span> <span class="pill ${cls}">${label}</span></p>
      <div class="chips">${chips}</div>${failed ? `<p class="why">${esc(failed.detail)}</p>` : ""}</div></div>`;
  }
  const tone = {
    "result.rejected": "bad", "agent.revoked": "bad", "chaos.impostor": "bad", "mission.failed": "bad",
    "approval.required": "warn", "agent.upgraded": "warn", "mission.revision": "warn", "llm.fallback": "warn",
    "action.blocked": "bad", "approval.requested": "warn", "action.completed": "good",
    "result.verified": "good", "mission.delivered": "good",
  }[ev.type] || "";
  let extra = "";
  if (ev.type === "mission.revision" && d.issues) {
    extra = `<ul class="issues">${d.issues.map((i) => `<li>${esc(i.issue)}</li>`).join("")}</ul>`;
  }
  return `<div class="ev ${tone}">${t}<div><p>${esc(ev.message)}</p>${extra}</div></div>`;
}

function renderFeed() {
  const el = $("feed");
  const shown = S.events;
  el.innerHTML = shown.length ? shown.slice().reverse().map(eventHtml).join("") : `<p class="empty">Launch a mission to see agents verify each other.</p>`;
}

// --- mission --------------------------------------------------------------------------------

const MISSION_PILL = { planning: "acc", working: "acc", reviewing: "acc", paused: "warn", delivered: "ok", failed: "bad", cancelled: "" };
const JOB_PILL = { pending: ["", "Pending"], hiring: ["acc", "Verifying"], working: ["acc", "Working"], rehiring: ["warn", "Replacing"], done: ["ok", "Done"] };

function renderMission() {
  const m = S.mission;
  $("missionStatus").className = `pill ${m ? MISSION_PILL[m.status] || "" : ""}`;
  $("missionStatus").textContent = m ? m.status : "idle";
  $("launchBtn").disabled = !!m && ["planning", "working", "paused", "reviewing"].includes(m.status);
  $("jobs").innerHTML = m ? m.jobs.map((j) => {
    const [cls, label] = JOB_PILL[j.status] || ["", j.status];
    return `<li><b>${esc(j.title)}</b><span class="pill ${cls}">${label}</span>
      <small>${j.agent ? `${esc(j.org)} · ${esc(j.agent)}` : esc(j.capability)}</small></li>`;
  }).join("") : "";
  $("approval").innerHTML = m && m.approval ? `<div class="approval">
      <p><strong>${esc(m.approval.org)}</strong> is now running <strong>v${esc(m.approval.version)}</strong>.
      Your policy approves ${esc(m.approval.approved_version)} only. Continue with the new version?</p>
      <div class="actions"><button class="btn primary" data-decision="approve">Approve v${esc(m.approval.version)}</button>
      <button class="btn" data-decision="reject">Reject</button></div></div>` : "";
  const st = m ? m.stats : { checks_passed: 0, blocked: 0, signed: 0 };
  $("stChecks").textContent = st.checks_passed;
  $("stBlocked").textContent = st.blocked;
  $("stSigned").textContent = st.signed;
  $("missionMeta").textContent = m ? `${m.business?.name ? m.business.name + " · " : ""}brains: ${(m.engines || []).join(", ") || "—"}${m.error ? " · " + m.error : ""}` : "";
  renderResult();
}

$("approval").addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-decision]");
  if (!btn || !S.mission) return;
  btn.disabled = true;
  try { await api("POST", `/api/missions/${S.mission.id}/decision`, { decision: btn.dataset.decision }); }
  catch (err) { showError(err.message); }
  refreshMission();
});

function renderResult() {
  const m = S.mission;
  const frame = $("resultFrame");
  if (!m || !m.has_result) {
    if (S.resultFor) { frame.removeAttribute("src"); S.resultFor = null; }
    $("resultPlaceholder").hidden = false;
    $("report").innerHTML = m ? `<p class="muted">Agents that deliver verified, signed work will be listed here.</p>${hiresTable(m)}` : "";
    return;
  }
  if (S.resultFor !== m.id) {
    frame.src = `/api/missions/${m.id}/result`;
    S.resultFor = m.id;
  }
  $("resultPlaceholder").hidden = true;
  const r = m.review || {};
  $("report").innerHTML = `<h3>Trust report · ${esc(m.business?.name || "")}</h3>${hiresTable(m)}
    <p class="small muted">Compliance: ${r.approved ? "approved" : "approved with notes"}${r.summary ? " · " + esc(r.summary) : ""}</p>`;
}

function hiresTable(m) {
  if (!m.hires.length) return "";
  return `<table><thead><tr><th>Job</th><th>Agent</th><th>Checks</th><th>Proof</th></tr></thead><tbody>
    ${m.hires.map((h) => `<tr><td>${esc(h.job)}</td><td>${esc(h.org)}<br><code>${esc(h.ans_name)}</code></td>
      <td>${h.checks.filter((c) => c.ok).length}/${h.checks.length} ✓${h.owner_approved ? `<br><span class="small muted">new version approved by owner</span>` : ""}</td>
      <td>signed ✓${h.log_index !== null && h.log_index !== undefined ? `<br><button class="btn small" data-receipt="${h.log_index}">Verify log #${h.log_index}</button>` : ""}</td></tr>`).join("")}
  </tbody></table>`;
}

// --- guardian ---------------------------------------------------------------------------------

const INCIDENT_PILL = { ALLOWED: "ok", DENIED: "bad", "NEEDS REVIEW": "warn" };

function incidentHtml(i) {
  const d = i.decision || {};
  const where = i.destination ? ` <span class="muted">→ ${esc(i.destination)}</span>` : "";
  const scopes = (i.grant?.scopes || []);
  const review = i.state === "NEEDS REVIEW";
  return `<div class="incident ${(INCIDENT_PILL[i.state] || "")}">
    <div class="incident-head">
      <b>${esc(i.org)}</b> wants to <code>${esc(i.action)}</code> ${esc(i.resource)}${where}
      <span class="pill ${INCIDENT_PILL[i.state] || ""}">${esc(i.state)}</span>
    </div>
    <p class="why">${esc(d.reason || "")}</p>
    <div class="chips">
      <span class="chip" title="The scope this action needs">needs ${esc(d.required_scope || "?")}</span>
      ${scopes.map((s) => `<span class="chip ${s === d.required_scope ? "ok" : ""}">${esc(s)}</span>`).join("")}
    </div>
    <span class="meta">${esc(i.purpose || "")}${i.payload_sha256 ? ` · payload ${esc(i.payload_sha256.slice(0, 12))}…` : ""}${i.result?.detail ? ` · ${esc(i.result.detail)}` : ""}</span>
    ${review ? `<div class="actions">
      <button class="btn primary small" data-incident="${esc(i.id)}" data-decision="approve">Authorize once</button>
      <button class="btn small danger" data-incident="${esc(i.id)}" data-decision="reject">Refuse</button>
    </div>` : ""}
  </div>`;
}

async function refreshGuardian() {
  try {
    const rows = await api("GET", "/api/guardian/incidents?limit=30");
    const el = $("guardian");
    el.innerHTML = rows.length
      ? rows.slice().reverse().map(incidentHtml).join("")
      : `<p class="empty">Nothing yet. Every sensitive thing an agent tries to do shows up here, allowed or not.</p>`;
  } catch { /* hub restarting */ }
}

$("guardian").addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-incident]");
  if (!btn) return;
  $("guardian").querySelectorAll("button[data-incident]").forEach((b) => { b.disabled = true; });
  try { await api("POST", `/api/guardian/incidents/${btn.dataset.incident}/decision`, { decision: btn.dataset.decision }); }
  catch (err) { showError(err.message); }
  refreshGuardian();
});

// --- transparency log -------------------------------------------------------------------------

const LOG_LABEL = { AGENT_REGISTERED: "Registered", AGENT_REVOKED: "Revoked", AGENT_SUPERSEDED: "Superseded", DEMO_STATUS_RESET: "Demo reset" };

async function refreshLog() {
  try {
    const entries = await api("GET", "/api/log?limit=40");
    $("logBody").innerHTML = entries.slice().reverse().map((e) => `<tr>
      <td>${e.index}</td><td>${time(e.ts)}</td><td>${esc(LOG_LABEL[e.event] || e.event)}${e.data?.reason ? ` <span class="muted small">· ${esc(e.data.reason)}</span>` : ""}</td>
      <td><code>${esc(e.ans_name)}</code></td>
      <td id="proof-${e.index}"><button class="btn small" data-receipt="${e.index}">Verify</button></td></tr>`).join("");
  } catch { /* ANS not up yet */ }
}

document.addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-receipt]");
  if (!btn) return;
  const idx = btn.dataset.receipt;
  btn.disabled = true;
  try {
    const r = await api("GET", `/api/receipt/${idx}`);
    const html = r.verified ? `<span class="proof-ok">✓ ${esc(r.detail)}</span>` : `<span class="proof-bad">✗ ${esc(r.detail)}</span>`;
    const cell = $(`proof-${idx}`);
    if (cell) cell.innerHTML = html;
    btn.outerHTML = html;
  } catch (err) { showError(err.message); btn.disabled = false; }
});

// --- controls ------------------------------------------------------------------------------------

function showError(msg) { $("launchError").textContent = msg || ""; if (msg) setTimeout(() => { if ($("launchError").textContent === msg) $("launchError").textContent = ""; }, 8000); }

$("launchBtn").addEventListener("click", async () => {
  showError("");
  const text = $("missionText").value.trim();
  if (!text) { showError("Describe the mission first."); return; }
  $("launchBtn").disabled = true;
  try {
    S.mission = await api("POST", "/api/missions", {
      text, scenario: {
        impostor: $("scImpostor").checked, revoke: $("scRevoke").checked, upgrade: $("scUpgrade").checked,
        exfil: $("scExfil").checked, publish: $("scPublish").checked,
      },
    });
    renderMission();
  } catch (err) { showError(err.message); $("launchBtn").disabled = false; }
});
$("missionText").addEventListener("input", () => showError(""));

$("resetBtn").addEventListener("click", async () => {
  $("resetBtn").disabled = true;
  try { await api("POST", "/api/reset"); S.mission = null; S.events = []; renderFeed(); renderMission(); }
  catch (err) { showError(err.message); }
  $("resetBtn").disabled = false;
  refreshState(); refreshLog(); refreshGuardian();
});

// --- data refresh -------------------------------------------------------------------------------------

async function refreshState() {
  try {
    const st = await api("GET", "/api/state");
    const namesChanged = JSON.stringify(S.agents.map((a) => a.ans_name)) !== JSON.stringify(st.agents.map((a) => a.ans_name));
    S.agents = st.agents;
    if (namesChanged) renderFeed();
    $("ansBadge").textContent = `ANS: ${st.ans_backend === "sim" ? "local simulator" : "GoDaddy"}`;
    $("llmBadge").textContent = `Brains: ${st.llm_mode === "gemini" ? "Gemini" : "offline templates"}`;
    renderAgents();
  } catch { /* hub restarting */ }
}

async function refreshMission() {
  try {
    const { mission } = await api("GET", "/api/missions/current");
    S.mission = mission;
    renderMission();
  } catch { /* commander not up */ }
}

let pending = null;
const GUARDIAN_EVENTS = ["action.requested", "policy.evaluated", "action.blocked", "action.completed",
                        "approval.requested", "approval.decided", "agent.granted", "agent.grant_revoked"];

function scheduleRefresh(ev) {
  if (["agent.revoked", "agent.upgraded", "agent.online", "demo.reset", "chaos.impostor"].includes(ev.type)) {
    refreshState(); refreshLog();
  }
  if (GUARDIAN_EVENTS.includes(ev.type) || ev.type === "demo.reset") refreshGuardian();
  clearTimeout(pending);
  pending = setTimeout(refreshMission, 150);
}

function connect() {
  const ws = new WebSocket(`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`);
  ws.onopen = () => { $("wsBadge").textContent = "Live feed: on"; $("wsBadge").className = "badge live"; };
  ws.onclose = () => { $("wsBadge").textContent = "Live feed: reconnecting"; $("wsBadge").className = "badge down"; setTimeout(connect, 1500); };
  ws.onmessage = (msg) => {
    const data = JSON.parse(msg.data);
    if (data.kind === "history") { S.events = data.events; renderFeed(); return; }
    const ev = data.event;
    if (ev.type === "demo.reset") S.events = [];
    S.events.push(ev);
    if (S.events.length > 400) S.events.shift();
    renderFeed();
    scheduleRefresh(ev);
  };
}

refreshState();
refreshMission();
refreshLog();
refreshGuardian();
connect();
setInterval(refreshState, 4000);
setInterval(refreshMission, 2000);
setInterval(refreshLog, 6000);
