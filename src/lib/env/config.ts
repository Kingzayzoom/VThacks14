import { z } from "zod";
export function runtimeConfig(env: Record<string, string | undefined>) {
  const mode = z
    .enum(["demo", "live"])
    .safeParse(env.CORTEX_RUNTIME_MODE?.trim() || "demo");
  if (!mode.success)
    return {
      mode: "live" as const,
      available: false,
      error: "INVALID_REQUEST" as const,
    };
  // Phase A has no live implementation. Even populated keys must never trigger provider work.
  return {
    mode: mode.data,
    available: mode.data === "demo",
    error: mode.data === "live" ? ("NOT_CONFIGURED" as const) : null,
  };
}
