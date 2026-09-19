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
  Orbit,
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
      <span className="brand-mark" aria-hidden="true" />
      <span>CORTEXAI</span>
    </Link>
  );
}
export function ModeBadge() {
  return (
    <span className="mode-badge">
      <span /> DEMO
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
        coordinator: Orbit,
      } as Record<string, typeof Shield>
    )[id] ?? Orbit;
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
