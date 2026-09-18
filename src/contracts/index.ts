import { z } from "zod";

export const RuntimeStatus = z.enum([
  "idle",
  "planning",
  "running",
  "waiting_approval",
  "blocked",
  "completed",
  "disconnected",
  "failed",
  "paused",
]);
export type RuntimeStatus = z.infer<typeof RuntimeStatus>;
export const AgentSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
  capabilities: z.array(z.string()),
  runtimeStatus: RuntimeStatus,
  source: z.enum(["demo", "live"]),
  identityStatus: z.enum([
    "unverified",
    "checking",
    "demo_verified",
    "verified",
    "failed",
  ]),
  authorizationSummary: z.string(),
  allowedScopes: z.array(z.string()),
  currentTaskId: z.string().optional(),
  parentAgentId: z.string().optional(),
  publicEndpoint: z.string().url().optional(),
  protocol: z.string().optional(),
  verificationEvidence: z.array(z.string()),
});
export type Agent = z.infer<typeof AgentSchema>;
export const TaskSchema = z.object({
  id: z.string(),
  missionId: z.string(),
  title: z.string(),
  description: z.string(),
  requiredCapabilities: z.array(z.string()),
  dependencies: z.array(z.string()),
  assignedAgentId: z.string(),
  status: RuntimeStatus,
  attempt: z.number().int().positive(),
  createdAt: z.string(),
  updatedAt: z.string(),
  resultRef: z.string().optional(),
  error: z.string().optional(),
});
export type Task = z.infer<typeof TaskSchema>;
export const MissionSchema = z.object({
  id: z.string(),
  title: z.string(),
  objective: z.string(),
  constraints: z.array(z.string()),
  status: RuntimeStatus,
  taskIds: z.array(z.string()),
  agentIds: z.array(z.string()),
  artifactIds: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
  budget: z.object({
    amountMinor: z.number().int().nonnegative().nullable(),
    currency: z.literal("USD"),
    basis: z.enum(["estimated", "measured", "unknown"]),
  }),
  currentStage: z.string(),
});
export type Mission = z.infer<typeof MissionSchema>;
export interface Recruitment {
  id: string;
  missionId: string;
  missingCapability: string;
  candidateIds: string[];
  selectedCandidateId?: string;
  status: "requested" | "admitted" | "denied" | "expired";
  requestedScopes: string[];
  grantedScopes: string[];
  decisionId?: string;
}
export interface ActionRequest {
  id: string;
  missionId: string;
  agentId: string;
  tool: string;
  resource: string;
  sanitizedInputSummary: string;
  payloadDigest: string;
  requestedScopes: string[];
  policyOutcome: "review" | "allow" | "deny";
  executionStatus: "not_executed" | "executed" | "failed";
}
export interface Approval {
  id: string;
  actionRequestId: string;
  immutablePayloadDigest: string;
  reviewable: boolean;
  status: "pending" | "approved" | "denied" | "expired";
  grantedScope: string[];
  expiresAt: string;
  decidedBy?: string;
  decidedAt?: string;
}
export interface Incident {
  id: string;
  actionRequestId: string;
  severity: "warning" | "critical";
  reason: string;
  policyId: string;
  status: "open" | "resolved";
  interventionResult: string;
}
export interface Artifact {
  id: string;
  missionId: string;
  taskId: string;
  type: "markdown" | "table";
  title: string;
  contentRef: string;
  sourceRefs: string[];
  version: number;
  createdAt: string;
}
export interface IntegrationStatus {
  provider: string;
  mode: "demo" | "live";
  readiness:
    | "not_configured"
    | "configured_untested"
    | "connected"
    | "degraded"
    | "error";
  checkedAt: string | null;
  safeError?: string;
  missingVariableNames: string[];
}

const EventBase = z.object({
  schemaVersion: z.literal(1),
  id: z.string(),
  sequence: z.number().int().nonnegative(),
  occurredAt: z.string(),
  source: z.enum(["demo", "live"]),
  missionId: z.string(),
  agentId: z.string().optional(),
  taskId: z.string().optional(),
  correlationId: z.string().optional(),
});
export const EventSchema = z.discriminatedUnion("type", [
  EventBase.extend({
    type: z.literal("mission.created"),
    payload: z.object({ objective: z.string() }),
  }),
  EventBase.extend({
    type: z.literal("mission.state_changed"),
    payload: z.object({ status: RuntimeStatus }),
  }),
  EventBase.extend({
    type: z.literal("task.progress"),
    payload: z.object({ summary: z.string() }),
  }),
  EventBase.extend({
    type: z.literal("capability.missing"),
    payload: z.object({ capability: z.string() }),
  }),
]);
export type ControlEvent = z.infer<typeof EventSchema>;
export const CreateMissionRequest = z.object({
  objective: z
    .string()
    .trim()
    .min(1, "Describe an objective to begin.")
    .max(2000, "Keep your objective under 2,000 characters."),
  idempotencyKey: z.string().min(1).max(100),
});
export const SnapshotSchema = z.object({
  schemaVersion: z.literal(1),
  missions: z.array(MissionSchema).max(30),
  tasks: z.array(TaskSchema).max(150),
  agents: z.array(AgentSchema).max(12),
  events: z.array(EventSchema).max(200),
  selectedMissionId: z.string(),
  selectedAgentId: z.string(),
  submissions: z.record(
    z.string(),
    z.object({ missionId: z.string(), objective: z.string() }),
  ),
});
export type Snapshot = z.infer<typeof SnapshotSchema>;
export type ErrorCode =
  | "NOT_CONFIGURED"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "INVALID_REQUEST"
  | "RATE_LIMITED"
  | "UPSTREAM_UNAVAILABLE"
  | "TIMEOUT";
export class ControlApiError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
  ) {
    super(message);
  }
}
