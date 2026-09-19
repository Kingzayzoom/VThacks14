"use client";
import { useControl } from "./provider";
import type { RuntimeStatus } from "@/contracts";
import {
  CircleCheck,
  CirclePause,
  TriangleAlert,
  Radio,
  Circle,
  Shield,
  Compass,
  Triangle,
  Square,
  Workflow,
  Layers3,
  Mic,
  ArrowUpRight,
} from "lucide-react";
import Link from "next/link";

export function Brand({ large = false }: { large?: boolean }) {
  return (
    <Link
      href="/"
      className={`brand ${large ? "large" : ""}`}
      aria-label="CortexAi home"
    >
      <svg className="brand-mark" viewBox="0 0 28 28" fill="none" aria-hidden="true"><path d="M22 5H11L4 12v11h11l7-7" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path d="M11 5v11h11" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path className="brand-junction" d="M19 2h6v6h-6z" /></svg>
      <span>CORTEXAI</span>
    </Link>
  );
}
export function ModeBadge() {
  const { state } = useControl();
  return (
    <span className="mode-badge">
      <span /> {state.live ? "Live hub" : "Demo"}
    </span>
  );
}
export function AgentGlyph({ id, size = 24 }: { id: string; size?: number }) {
  const Icon =
    (
      {
        scout: Compass,
        sage: Triangle,
        forge: Square,
        guardian: Shield,
        coordinator: Workflow,
        memory: Layers3,
        voice: Mic,
      } as Record<string, typeof Shield>
    )[id] ?? Workflow;
  return <Icon size={size} strokeWidth={1.35} aria-hidden="true" />;
}
const labels: Record<RuntimeStatus, string> = {
  idle: "Queued",
  planning: "Coordinating",
  running: "Running",
  waiting_approval: "Needs review",
  blocked: "Blocked",
  completed: "Complete",
  disconnected: "Disconnected",
  failed: "Failed",
  paused: "Paused",
};
export function Status({
  status,
  guardian = false,
}: {
  status: RuntimeStatus;
  guardian?: boolean;
}) {
  const Icon =
    status === "completed"
      ? CircleCheck
      : status === "waiting_approval" ||
          status === "blocked" ||
          status === "failed"
        ? TriangleAlert
        : status === "paused"
          ? CirclePause
          : status === "running"
            ? Radio
            : Circle;
  return (
    <span className={`status ${status}`}>
      <Icon size={12} aria-hidden="true" />
      {guardian ? "Observing · demo" : labels[status]}
    </span>
  );
}
export function TextLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link className="text-link" href={href}>
      {children}
      <ArrowUpRight size={15} />
    </Link>
  );
}
