import { ControlApiError, CreateMissionRequest, type Snapshot, type Mission } from "@/contracts";
import type { ControlApi } from "./ControlApi";
import { emptyLiveSnapshot, HubEvent, HubMission, HubState, HubGrants, HubIncidents, HubIntegrations, mapAgents, mapEvent, mapMission } from "./hub-mapping";

type EventStream = Pick<EventSource, "onmessage" | "onopen" | "onerror" | "close">;
export class HttpControlApi implements ControlApi {
  private initial = emptyLiveSnapshot();
  private state = this.initial;
  private listeners = new Set<() => void>();
  private events = new Map<string, HubEvent>();
  private stream: EventStream | null = null;
  private stopped = true;
  private streamReady = false;
  private retries = 0;
  private retryTimer?: ReturnType<typeof setTimeout>;
  private refreshTimer?: ReturnType<typeof setTimeout>;
  private controller?: AbortController;
  private pending = new Map<string, { objective: string; result: Promise<Mission> }>();
  private refreshing = false;
  private refreshAgain = false;
  constructor(private fetcher: typeof fetch = (url, init) => fetch(url, init), private openStream: () => EventStream = () => new EventSource("/api/control/events")) {}
  getSnapshot = () => this.state;
  getServerSnapshot = () => this.initial;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private update(state: Snapshot) { this.state = state; this.listeners.forEach(fn => fn()); }
  private connection(connection: NonNullable<Snapshot["live"]>["connection"], error?: string) { this.update({ ...this.state, live: { ...this.state.live!, connection, error } }); }
  start() {
    this.stopped = false; this.retries = 0; this.controller = new AbortController();
    void this.refresh(); this.connect();
    return () => this.stop();
  }
  stop() {
    this.stopped = true; this.streamReady = false; this.controller?.abort(); this.stream?.close(); this.stream = null;
    clearTimeout(this.retryTimer); clearTimeout(this.refreshTimer);
  }
  private connect() {
    if (this.stopped) return;
    this.connection("connecting");
    const stream = this.openStream(); this.stream = stream;
    stream.onopen = () => { if (!this.stopped && this.stream === stream) { this.connection("connecting"); } };
    stream.onmessage = event => { if (!this.stopped && this.stream === stream) this.receive(event.data); };
    stream.onerror = () => {
      if (this.stopped || this.stream !== stream) return;
      stream.close(); this.stream = null; this.streamReady = false;
      this.connection("disconnected", "Live updates disconnected. Displayed data may be stale.");
      if (this.retries < 5) this.retryTimer = setTimeout(() => this.connect(), Math.min(1000 * 2 ** this.retries++, 16000));
      else this.connection("error", "Live updates unavailable after 5 retries. Reload to reconnect.");
    };
  }
  receive(message: string) {
    try {
      const data = JSON.parse(message);
      if (data.kind === "connected") { this.streamReady = true; this.connection("connected"); if (!this.stopped) void this.refresh(); return; }
      const incoming: unknown[] = data.kind === "history" && Array.isArray(data.events) ? data.events : data.kind === "event" ? [data.event] : [];
      let changed = false;
      for (const candidate of incoming) {
        const parsed = HubEvent.safeParse(candidate);
        if (!parsed.success || this.events.has(parsed.data.id)) continue;
        if (parsed.data.type === "demo.reset") { this.events.clear(); this.update({ ...emptyLiveSnapshot(), live: this.state.live }); }
        this.events.set(parsed.data.id, parsed.data); changed = true;
      }
      while (this.events.size > 1500) this.events.delete(this.events.keys().next().value!);
      if (changed) {
        const known = new Set(this.state.missions.map(m => m.id));
        this.update({ ...this.state, events: [...this.events.values()].filter(e => known.has(e.mission_id || "")).slice(-200).map((e, i) => mapEvent(e, i + 1, this.state.live?.ansBackend !== "godaddy")) });
        if (!this.stopped && !this.refreshTimer) this.refreshTimer = setTimeout(() => { this.refreshTimer = undefined; void this.refresh(); }, 150);
      }
    } catch { /* Malformed frames cannot change trust or runtime state. */ }
  }
  private async request(path: string, body?: unknown) {
    const response = await this.fetcher(`/api/control/${path}`, { method: body === undefined ? "GET" : "POST", headers: body === undefined ? undefined : { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body), cache: "no-store", signal: this.controller?.signal ?? AbortSignal.timeout(15000) });
    if (!response.ok) throw new ControlApiError("UPSTREAM_UNAVAILABLE", response.status === 409 ? "The hub cannot accept this action now. Another mission or decision may already be active." : "The live hub is unavailable. No demo fallback was used.");
    return response.json();
  }
  async refresh() {
    if (this.refreshing) { this.refreshAgain = true; return; }
    this.refreshing = true;
    try {
      const selected = this.state.selectedMissionId;
      const [rawState, current, grants, incidents, integrations] = await Promise.all([
        this.request("state"), this.request(selected ? `missions/${encodeURIComponent(selected)}` : "missions/current"), this.request("guardian/grants"), this.request("guardian/incidents"), this.request("integrations/status"),
      ]);
      if (this.stopped) return;
      if (selected !== this.state.selectedMissionId) { this.refreshAgain = true; return; }
      const hubState = HubState.parse(rawState);
      const rawMission = selected ? current : current.mission;
      const mission = rawMission ? HubMission.parse(rawMission) : null;
      if (mission) this.mergeMission(mission);
      const agents = mapAgents(hubState, mission, [...this.events.values()], HubGrants.parse(grants));
      const known = new Set(this.state.missions.map(m => m.id));
      this.update({ ...this.state, agents, selectedAgentId: agents.some(a => a.id === this.state.selectedAgentId) ? this.state.selectedAgentId : agents[0]?.id || "",
        events: [...this.events.values()].filter(e => known.has(e.mission_id || "")).slice(-200).map((e, i) => mapEvent(e, i + 1, hubState.ans_backend !== "godaddy")),
        live: { ...this.state.live!, connection: this.streamReady ? "connected" : this.state.live!.connection, error: this.streamReady ? undefined : this.state.live?.error, ansBackend: hubState.ans_backend, integrations: HubIntegrations.parse(integrations).components,
          recruitments: (mission?.recruitments ?? []).map(r => ({ id: r.id, missionId: mission!.id, capability: r.capability, status: r.status, requestedScopes: r.requested_scopes, grantedScopes: r.granted_scopes, candidates: r.candidates.map(c => c.ans_name) })),
          incidents: HubIncidents.parse(incidents).map(i => ({ id: i.id, missionId: i.mission_id, state: i.state, org: i.org, action: i.action, resource: i.resource, reason: i.decision.reason, payloadDigest: i.payload_sha256, expiresAt: i.expires_at })) } });
    } catch { if (!this.stopped) this.connection("error", "Live hub data is unavailable. Displayed data may be stale; no demo fallback was used."); }
    finally { this.refreshing = false; if (this.refreshAgain && !this.stopped) { this.refreshAgain = false; void this.refresh(); } }
  }
  private mergeMission(raw: HubMission) {
    const { mission, tasks } = mapMission(raw);
    this.update({ ...this.state, missions: [...this.state.missions.filter(m => m.id !== mission.id), mission].slice(-30), tasks: [...this.state.tasks.filter(t => t.missionId !== mission.id), ...tasks], selectedMissionId: this.state.selectedMissionId || mission.id });
    return mission;
  }
  async createMission(input: { objective: string; idempotencyKey: string }): Promise<Mission> {
    const parsed = CreateMissionRequest.safeParse(input);
    if (!parsed.success) throw new ControlApiError("INVALID_REQUEST", parsed.error.issues[0].message);
    const prior = this.pending.get(input.idempotencyKey);
    if (prior) { if (prior.objective !== parsed.data.objective) throw new ControlApiError("INVALID_REQUEST", "Submission key already used."); return prior.result; }
    const result = this.request("missions", parsed.data).then(value => {
      const mission = this.mergeMission(HubMission.parse(value));
      this.update({ ...this.state, selectedMissionId: mission.id });
      if (!this.stopped) void this.refresh();
      return mission;
    });
    this.pending.set(input.idempotencyKey, { objective: parsed.data.objective, result });
    return result;
  }
  selectMission(id: string) { if (id === this.state.selectedMissionId) return; this.update({ ...this.state, selectedMissionId: id }); if (!this.stopped) void this.refresh(); }
  selectAgent(id: string) { this.update({ ...this.state, selectedAgentId: id }); }
  async commandMission() { throw new ControlApiError("NOT_CONFIGURED", "The hub does not support pause/resume. Use the explicit review decision instead."); }
  async decide(id: string, decision: "approve" | "reject", kind: "mission" | "incident") {
    await this.request(`${kind === "mission" ? "missions" : "guardian/incidents"}/${encodeURIComponent(id)}/decision`, { decision });
    await this.refresh();
  }
}
export function createHttpControlApi(): ControlApi { return new HttpControlApi(); }
