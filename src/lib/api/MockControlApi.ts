import {
  ControlApiError,
  CreateMissionRequest,
  SnapshotSchema,
  type Snapshot,
  type Mission,
  type ControlEvent,
} from "@/contracts";
import { initialSnapshot, makeMission } from "@/lib/demo/fixtures";
import type { ControlApi } from "./ControlApi";

export const STORAGE_KEY = "perihelion:phase-a:v1";
export class MockControlApi implements ControlApi {
  private initial = initialSnapshot();
  private state = this.initial;
  private listeners = new Set<() => void>();
  getSnapshot = () => this.state;
  getServerSnapshot = () => this.initial;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private update(state: Snapshot) {
    this.state = state;
    this.listeners.forEach((fn) => fn());
  }
  hydrate(raw: string | null) {
    if (!raw) return;
    try {
      const result = SnapshotSchema.safeParse(JSON.parse(raw));
      if (
        result.success &&
        result.data.missions.some(
          (m) => m.id === result.data.selectedMissionId,
        ) &&
        result.data.agents.some((a) => a.id === result.data.selectedAgentId) &&
        result.data.agents.every((a) => a.source === "demo") &&
        result.data.events.every((e) => e.source === "demo")
      )
        this.update(result.data);
    } catch {
      /* Invalid or outdated local demo state falls back to fixtures. */
    }
  }
  async createMission(input: {
    objective: string;
    idempotencyKey: string;
  }): Promise<Mission> {
    const parsed = CreateMissionRequest.safeParse(input);
    if (!parsed.success)
      throw new ControlApiError(
        "INVALID_REQUEST",
        parsed.error.issues[0].message,
      );
    const prior = this.state.submissions[input.idempotencyKey];
    if (prior) {
      if (prior.objective !== parsed.data.objective)
        throw new ControlApiError(
          "INVALID_REQUEST",
          "This submission key was already used for another objective.",
        );
      return this.state.missions.find((m) => m.id === prior.missionId)!;
    }
    if (this.state.missions.length >= 30)
      throw new ControlApiError(
        "RATE_LIMITED",
        "This device has reached the 30-mission demo limit.",
      );
    const id = `demo-${crypto.randomUUID()}`;
    const fixture = makeMission(
      id,
      parsed.data.objective,
      new Date().toISOString(),
    );
    const lastSequence = this.state.events.at(-1)?.sequence ?? 0;
    this.update({
      ...this.state,
      selectedMissionId: id,
      missions: [...this.state.missions, fixture.mission],
      tasks: [...this.state.tasks, ...fixture.tasks],
      events: [
        ...this.state.events,
        ...fixture.events.map((e, i) => ({
          ...e,
          sequence: lastSequence + i + 1,
        })),
      ].slice(-200),
      submissions: {
        ...this.state.submissions,
        [input.idempotencyKey]: {
          missionId: id,
          objective: parsed.data.objective,
        },
      },
    });
    return fixture.mission;
  }
  selectMission(id: string) {
    if (this.state.missions.some((m) => m.id === id))
      this.update({ ...this.state, selectedMissionId: id });
  }
  selectAgent(id: string) {
    if (this.state.agents.some((a) => a.id === id))
      this.update({ ...this.state, selectedAgentId: id });
  }
  async commandMission(id: string, command: "pause" | "resume") {
    const mission = this.state.missions.find((m) => m.id === id);
    if (
      !mission ||
      (command === "pause" &&
        !["running", "waiting_approval"].includes(mission.status)) ||
      (command === "resume" && mission.status !== "paused")
    )
      return;
    const status =
      command === "pause"
        ? "paused"
        : this.state.tasks.some(
              (t) => t.missionId === id && t.status === "waiting_approval",
            )
          ? "waiting_approval"
          : "running";
    const at = new Date().toISOString();
    const event: ControlEvent = {
      schemaVersion: 1,
      id: crypto.randomUUID(),
      sequence: (this.state.events.at(-1)?.sequence ?? 0) + 1,
      occurredAt: at,
      source: "demo",
      missionId: id,
      type: "mission.state_changed",
      payload: { status },
    };
    this.update({
      ...this.state,
      missions: this.state.missions.map((m) =>
        m.id === id ? { ...m, status, updatedAt: at } : m,
      ),
      events: [...this.state.events, event].slice(-200),
    });
  }
}
