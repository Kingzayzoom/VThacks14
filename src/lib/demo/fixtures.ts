import type { Agent, ControlEvent, Mission, Snapshot, Task } from "@/contracts";

export const EXAMPLE_OBJECTIVE =
  "Prepare a launch brief for our student-built product, including an audience summary, execution plan, and data visualization. Use only the provided public sample data. Do not publish or contact anyone.";
export const agents: Agent[] = [
  {
    id: "coordinator",
    name: "CortexAi",
    role: "Mission coordinator",
    capabilities: ["Planning", "Delegation"],
    runtimeStatus: "planning",
    source: "demo",
    identityStatus: "demo_verified",
    authorizationSummary: "Coordinate this mission only",
    allowedScopes: ["task.assign:mission"],
    verificationEvidence: [
      "Built-in demo fixture. No external identity check.",
    ],
  },
  {
    id: "scout",
    name: "Scout",
    role: "Research & discovery",
    capabilities: ["Research", "Source review"],
    runtimeStatus: "completed",
    source: "demo",
    identityStatus: "demo_verified",
    authorizationSummary: "Read public sample sources",
    allowedScopes: ["dataset.read:public-demo"],
    parentAgentId: "coordinator",
    verificationEvidence: ["Built-in demo fixture. No ANS registration."],
  },
  {
    id: "sage",
    name: "Sage",
    role: "Analysis & synthesis",
    capabilities: ["Analysis", "Audience synthesis"],
    runtimeStatus: "running",
    source: "demo",
    identityStatus: "demo_verified",
    authorizationSummary: "Read public sample data",
    allowedScopes: ["dataset.read:public-demo"],
    parentAgentId: "coordinator",
    verificationEvidence: ["Built-in demo fixture. No ANS registration."],
  },
  {
    id: "forge",
    name: "Forge",
    role: "Artifacts & execution",
    capabilities: ["Writing", "Artifact assembly"],
    runtimeStatus: "waiting_approval",
    source: "demo",
    identityStatus: "demo_verified",
    authorizationSummary: "Draft artifacts inside this mission",
    allowedScopes: ["artifact.write:mission"],
    parentAgentId: "coordinator",
    verificationEvidence: ["Built-in demo fixture. No ANS registration."],
  },
  {
    id: "guardian",
    name: "Guardian",
    role: "Independent oversight",
    capabilities: ["Scope review", "Policy observation"],
    runtimeStatus: "idle",
    source: "demo",
    identityStatus: "demo_verified",
    authorizationSummary:
      "Observe proposed actions; cannot grant its own permissions",
    allowedScopes: ["action.review:mission"],
    verificationEvidence: [
      "Demo policy boundary. Server enforcement is not connected.",
    ],
  },
];
export function makeMission(
  id: string,
  objective: string,
  at: string,
  preview = false,
): { mission: Mission; tasks: Task[]; events: ControlEvent[] } {
  const definitions = [
    [
      "research",
      "Review source material",
      "Scout reviews the public sample sources.",
      "scout",
      preview ? "completed" : "running",
      "Research",
    ],
    [
      "analysis",
      "Shape the audience brief",
      "Sage synthesizes the audience and key findings.",
      "sage",
      preview ? "running" : "idle",
      "Analysis",
    ],
    [
      "artifact",
      "Assemble the launch brief",
      "Forge prepares the final artifact after analysis and specialist review.",
      "forge",
      preview ? "waiting_approval" : "idle",
      "Writing",
    ],
  ] as const;
  const tasks: Task[] = definitions.map(
    ([suffix, title, description, assignedAgentId, status, capability], i) => ({
      id: `${id}-${suffix}`,
      missionId: id,
      title,
      description,
      assignedAgentId,
      status,
      requiredCapabilities: [capability],
      dependencies: i ? [`${id}-${definitions[i - 1][0]}`] : [],
      attempt: 1,
      createdAt: at,
      updatedAt: at,
    }),
  );
  const mission: Mission = {
    id,
    title: preview
      ? "Student product launch"
      : objective.length > 64
        ? objective.slice(0, 61) + "…"
        : objective,
    objective,
    constraints: [
      "Public sample data only",
      "No publishing or external contact",
    ],
    status: preview ? "waiting_approval" : "running",
    taskIds: tasks.map((t) => t.id),
    agentIds: agents.map((a) => a.id),
    artifactIds: [],
    createdAt: at,
    updatedAt: at,
    budget: { amountMinor: null, currency: "USD", basis: "unknown" },
    currentStage: preview
      ? "Specialist review needed"
      : "Reviewing the objective",
  };
  const events: ControlEvent[] = [
    {
      schemaVersion: 1,
      id: `${id}-event-1`,
      sequence: 1,
      occurredAt: at,
      source: "demo",
      missionId: id,
      agentId: "coordinator",
      type: "mission.created",
      payload: { objective },
    },
  ];
  if (preview)
    events.push(
      {
        schemaVersion: 1,
        id: `${id}-event-2`,
        sequence: 2,
        occurredAt: at,
        source: "demo",
        missionId: id,
        agentId: "scout",
        type: "task.progress",
        payload: { summary: "Public source review completed" },
      },
      {
        schemaVersion: 1,
        id: `${id}-event-3`,
        sequence: 3,
        occurredAt: at,
        source: "demo",
        missionId: id,
        agentId: "sage",
        type: "task.progress",
        payload: { summary: "Audience synthesis in progress" },
      },
      {
        schemaVersion: 1,
        id: `${id}-event-4`,
        sequence: 4,
        occurredAt: at,
        source: "demo",
        missionId: id,
        agentId: "forge",
        type: "capability.missing",
        payload: { capability: "Data visualization" },
      },
    );
  return { mission, tasks, events };
}
export function initialSnapshot(): Snapshot {
  const fixture = makeMission(
    "demo-001",
    EXAMPLE_OBJECTIVE,
    "2026-09-18T20:00:00.000Z",
    true,
  );
  return {
    schemaVersion: 1,
    missions: [fixture.mission],
    tasks: fixture.tasks,
    events: fixture.events,
    agents,
    selectedMissionId: fixture.mission.id,
    selectedAgentId: "coordinator",
    submissions: {},
  };
}
export function agentInMission(
  agent: Agent,
  snapshot: Snapshot,
  missionId: string,
): Agent {
  const task = snapshot.tasks.find(
    (t) => t.missionId === missionId && t.assignedAgentId === agent.id,
  );
  const mission = snapshot.missions.find((m) => m.id === missionId);
  const runtimeStatus =
    agent.id === "guardian"
      ? "idle"
      : mission?.status === "paused" &&
          (task?.status === "running" || agent.id === "coordinator")
        ? "paused"
        : (task?.status ?? (agent.id === "coordinator" ? "planning" : "idle"));
  return { ...agent, runtimeStatus, currentTaskId: task?.id };
}
