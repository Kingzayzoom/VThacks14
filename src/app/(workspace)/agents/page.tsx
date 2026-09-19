import type { Metadata } from "next";
import { AgentsConsole } from "@/components/agents/agents-console";
import "@/styles/agents.css";

export const metadata: Metadata = {
  title: "Agents — CORTEXAI",
  description: "Inspect specialist assignments, runtime state, and authority.",
};

export default function AgentsPage() {
  return <AgentsConsole />;
}
