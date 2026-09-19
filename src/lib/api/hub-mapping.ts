import { z } from "zod";
import type { Agent, ControlEvent, Mission, RuntimeStatus, Snapshot, Task } from "@/contracts";

const Check = z.object({ name: z.string(), state: z.enum(["pass", "fail", "unverified", "not_run"]), detail: z.string(), evidence: z.object({ standing: z.object({ state: z.string(), detail: z.string().optional(), expires_at: z.string().optional() }).optional() }).optional() });
export const HubEvent = z.object({ id: z.string().min(1), ts: z.string().refine(v => Number.isFinite(Date.parse(v))), type: z.string(), message: z.string(), mission_id: z.string().nullable().optional(), subject: z.string().nullable().optional(), actor: z.string().nullable().optional(), data: z.record(z.string(), z.unknown()).default({}) });
export type HubEvent = z.infer<typeof HubEvent>;
export const HubMission = z.object({
  id: z.string().regex(/^m_[a-zA-Z0-9_-]+$/), text: z.string(), status: z.string(), started_at: z.string(), finished_at: z.string().nullable().optional(),
  business: z.object({ name: z.string().optional() }).default({}),
  jobs: z.array(z.object({ id: z.string().optional(), title: z.string(), capability: z.string(), brief: z.string().default(""), status: z.string(), agent: z.string().nullable().optional(), depends_on: z.array(z.string()).default([]) })).default([]),
  roster: z.array(z.object({ ans_name: z.string(), org: z.string(), capabilities: z.array(z.string()) })).default([]),
  hires: z.array(z.object({ ans_name: z.string(), checks: z.array(Check).default([]) })).default([]),
  recruitments: z.array(z.object({ id: z.string(), capability: z.string(), status: z.string(), requested_scopes: z.array(z.string()).default([]), granted_scopes: z.array(z.string()).default([]), candidates: z.array(z.object({ ans_name: z.string() })).default([]) })).default([]),
  approval: z.object({ reason: z.string(), org: z.string(), version: z.string() }).nullable().default(null),
  error: z.string().nullable().optional(), has_result: z.boolean().default(false), engines: z.array(z.string()).default([]),
});
export type HubMission = z.infer<typeof HubMission>;
export const HubState = z.object({ ans_backend: z.string(), agents: z.array(z.object({ key: z.string(), name: z.string(), org: z.string(), role: z.string(), online: z.boolean(), ans_name: z.string().optional(), capabilities: z.array(z.string()).default([]), status: z.string().optional() })) });
export const HubGrants = z.array(z.object({ ans_name: z.string(), mission_id: z.string(), scopes: z.array(z.string()), status: z.string(), expires_at: z.string() }));
export const HubIncidents = z.array(z.object({ id: z.string(), mission_id: z.string(), state: z.string(), org: z.string(), action: z.string(), resource: z.string(), payload_sha256: z.string().default(""), decision: z.object({ reason: z.string() }), expires_at: z.string().optional() }));
export const HubIntegrations = z.object({ components: z.array(z.object({ name: z.string(), state: z.string(), detail: z.string() })) });
const statuses: Record<string, RuntimeStatus> = { planning: "planning", working: "running", reviewing: "running", paused: "waiting_approval", delivered: "completed", failed: "failed", cancelled: "blocked", pending: "idle", hiring: "planning", rehiring: "planning", done: "completed" };
export const runtimeStatus = (value: string): RuntimeStatus => statuses[value] ?? "disconnected";
export const emptyLiveSnapshot = (): Snapshot => ({ schemaVersion: 1, missions: [], tasks: [], agents: [], events: [], selectedMissionId: "", selectedAgentId: "", submissions: {}, live: { connection: "connecting", ansBackend: "unknown", integrations: [], recruitments: [], incidents: [] } });
export function mapMission(raw: HubMission): { mission: Mission; tasks: Task[] } {
  const taskId = (id: string) => `${raw.id}:${id}`;
  const tasks: Task[] = raw.jobs.map((job, i) => ({ id: taskId(job.id || String(i)), missionId: raw.id, title: job.title, description: job.brief, requiredCapabilities: [job.capability], dependencies: job.depends_on.map(taskId), assignedAgentId: job.agent ?? "", status: runtimeStatus(job.status), attempt: 1, createdAt: raw.started_at, updatedAt: raw.finished_at ?? raw.started_at }));
  return { tasks, mission: { id: raw.id, title: raw.business.name || raw.text.slice(0, 90), objective: raw.text, constraints: [], status: raw.approval ? "waiting_approval" : runtimeStatus(raw.status), backendStatus: raw.status, taskIds: tasks.map(t => t.id), agentIds: raw.roster.map(a => a.ans_name), artifactIds: raw.has_result ? [`${raw.id}:result`] : [], createdAt: raw.started_at, updatedAt: raw.finished_at ?? raw.started_at, budget: { amountMinor: null, currency: "USD", basis: "unknown" }, currentStage: `${raw.status}${raw.engines.length ? ` · ${raw.engines.join(", ")}` : ""}`, source: "live", error: raw.error ?? undefined, approval: raw.approval } };
}
export function mapAgents(state: z.infer<typeof HubState>, mission: HubMission | null, events: HubEvent[], grants: z.infer<typeof HubGrants>): Agent[] {
  return state.agents.map(raw => {
    const id = raw.ans_name ?? raw.key;
    const evidence = events.filter(e => e.mission_id === mission?.id && e.subject === id && e.type === "trust.check").at(-1);
    const parsed = z.array(Check).safeParse(evidence?.data.checks);
    const checks = parsed.success ? parsed.data : mission?.hires.filter(h => h.ans_name === id).at(-1)?.checks ?? [];
    // Identity is proof of possession, independent of standing and policy approval.
    const identityChecks = ["resolve", "authenticate"].map(name => checks.find(c => c.name === name));
    const verified = ["sim", "godaddy"].includes(state.ans_backend) && identityChecks.every(c => c?.state === "pass");
    const failed = identityChecks.some(c => c?.state === "fail");
    const simulator = state.ans_backend === "sim";
    const standing = checks.find(c => c.name === "status")?.evidence?.standing;
    const activeGrants = grants.filter(g => g.ans_name === id && g.mission_id === mission?.id && g.status === "active" && Date.parse(g.expires_at) > Date.now());
    const scopes = [...new Set(activeGrants.flatMap(g => g.scopes))];
    const job = mission?.jobs.find(j => j.agent === id && j.status === "working") ?? mission?.jobs.filter(j => j.agent === id).at(-1);
    return { id, name: raw.org || raw.name, role: raw.role === "commander" ? "Mission orchestration" : raw.capabilities.join(" · ") || raw.role, capabilities: raw.capabilities,
      runtimeStatus: !raw.online ? "disconnected" : job ? runtimeStatus(job.status) : raw.role === "commander" && mission ? runtimeStatus(mission.status) : "idle",
      source: simulator ? "demo" : "live", identityStatus: verified ? simulator ? "demo_verified" : "verified" : failed ? "failed" : "unverified",
      standingSummary: `${simulator ? "Simulator · " : ""}${raw.status === "REVOKED" ? "Revoked" : standing?.state === "pass" && standing.expires_at && Date.parse(standing.expires_at) > Date.now() ? standing.detail || "Signed standing valid" : "Not currently verified"}`,
      authorizationSummary: scopes.length ? `${scopes.length} active mission scopes. Identity does not expand authority.` : "No active mission grant confirmed.", allowedScopes: scopes,
      verificationEvidence: [`Evidence source: ${simulator ? "local ANS simulator" : state.ans_backend}.`, ...checks.map(c => `${c.name}: ${c.state} — ${c.detail}`)], trustChecks: ["resolve", "authenticate", "status", "capability", "policy"].map(name => { const check = checks.find(c => c.name === name); return check ? { name, state: check.state, detail: check.detail } : { name, state: "not_run" as const, detail: "No check recorded." }; }),
      currentTaskId: job ? `${mission!.id}:${job.id || mission!.jobs.indexOf(job)}` : undefined };
  });
}
export function mapEvent(event: HubEvent, sequence: number, simulator: boolean): ControlEvent {
  const base = { schemaVersion: 1 as const, id: event.id, sequence, occurredAt: event.ts, source: simulator ? "demo" as const : "live" as const, missionId: event.mission_id || "", agentId: event.subject ?? event.actor ?? undefined };
  if (event.type === "capability.missing" && typeof event.data.capability === "string") return { ...base, type: "capability.missing", payload: { capability: event.data.capability } };
  return { ...base, type: "task.progress", payload: { summary: event.message } };
}
