import type { Snapshot, Mission } from "@/contracts";
export interface ControlApi {
  getSnapshot: () => Snapshot;
  getServerSnapshot: () => Snapshot;
  subscribe: (listener: () => void) => () => void;
  createMission(input: {
    objective: string;
    idempotencyKey: string;
  }): Promise<Mission>;
  selectMission(id: string): void;
  selectAgent(id: string): void;
  commandMission(id: string, command: "pause" | "resume"): Promise<void>;
  decide?(id: string, decision: "approve" | "reject", kind: "mission" | "incident"): Promise<void>;
}
