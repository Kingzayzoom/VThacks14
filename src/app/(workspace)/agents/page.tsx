import type { Metadata } from "next";
import { AgentsConsole } from "@/components/agents/agents-console";
import "@/styles/agents.css";

export const metadata: Metadata = {
  title: "Agents — PERIHELION",
  description: "Independent minds. Shared direction. Explore the Perihelion agent constellation.",
};

export default function AgentsPage() {
  return <AgentsConsole />;
}
