import type { Agent, ControlEvent } from "@/contracts";

/** Presentation coordinates only. Runtime and authority come from ControlApi. */
export const fieldNodes = [
  { id: "coordinator", x: 56, y: 42, color: "#e6ce9e", family: "Orchestrator", index: "00", description: "Hold the objective. Coordinate the work. Keep human authority at the center.", output: "Mission plan & delegation" },
  { id: "scout", x: 39, y: 29, color: "#a3d9b0", family: "Research", index: "01", description: "Turn public source material into a grounded foundation for the mission.", output: "Source review" },
  { id: "sage", x: 79, y: 25, color: "#a2c9eb", family: "Analysis", index: "02", description: "Connect the findings. Shape a clear audience brief from the provided sample data.", output: "Audience synthesis" },
  { id: "forge", x: 33, y: 66, color: "#e5ba83", family: "Execution", index: "03", description: "Bring the work together as a useful artifact, inside the scope of this mission.", output: "Draft launch brief" },
  { id: "memory", x: 55, y: 77, color: "#c2a8e4", family: "Memory", index: "04", description: "A proposed context specialist. No memory service or agent runtime is connected.", output: "Context records · proposed" },
  { id: "voice", x: 80, y: 69, color: "#e6a598", family: "Voice", index: "05", description: "A proposed mission specialist. Open the voice channel to check the separate assistant's availability.", output: "Mission voice agent · proposed" },
  { id: "guardian", x: 12, y: 86, color: "#b9cbbf", family: "Oversight", index: "G", description: "An independent authority boundary. Observe scope without becoming a worker the orchestrator can disable.", output: "Policy observation · demo" },
] as const;
export type FieldNode = (typeof fieldNodes)[number];
export const visualFor = (id: string) => fieldNodes.find((node) => node.id === id) ?? fieldNodes[0];

// Inspectable concept previews are not added to the mission roster or shared contracts.
export const previewAgents: Agent[] = [
  { id: "memory", name: "Memory", role: "Context & recall", capabilities: ["Context retrieval (proposed)", "Mission recall (proposed)"], runtimeStatus: "disconnected", source: "demo", identityStatus: "unverified", authorizationSummary: "No permissions granted", allowedScopes: [], verificationEvidence: ["Concept preview only. No identity has been registered or checked."] },
  { id: "voice", name: "Voice", role: "Conversation & delivery", capabilities: ["Conversation (proposed)", "Spoken summaries (proposed)"], runtimeStatus: "disconnected", source: "demo", identityStatus: "unverified", authorizationSummary: "No mission permissions granted", allowedScopes: [], verificationEvidence: ["Concept preview only. The assistant's voice connection does not grant this agent authority."] },
];

export function connectionPath(node: FieldNode) {
  const x = node.x * 10, y = node.y * 6.6;
  return `M560 277.2 C${560 + (x - 560) * 0.18} ${y} ${x + (560 - x) * 0.16} 277.2 ${x} ${y}`;
}

export function eventSummary(event: ControlEvent) {
  switch (event.type) {
    case "mission.created": return "Objective received. Mission created.";
    case "task.progress": return event.payload.summary;
    case "capability.missing": return `${event.payload.capability} requested`;
    case "mission.state_changed": return `Mission ${event.payload.status === "paused" ? "paused" : "resumed"}`;
  }
}
