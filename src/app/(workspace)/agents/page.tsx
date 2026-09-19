import type { Metadata } from "next";
import { AgentsConsole } from "@/components/agents/agents-console";
import "@/styles/agents.css";

export const metadata: Metadata = {
  title: "Agents — CORTEXAI",
  description: "Independent minds. Shared direction. Explore the CortexAi agent constellation.",
};

export default function AgentsPage() {
  return <AgentsConsole />;
}
