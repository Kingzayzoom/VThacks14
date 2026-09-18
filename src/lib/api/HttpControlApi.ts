import { ControlApiError } from "@/contracts";
import type { ControlApi } from "./ControlApi";
/** Reserved boundary for the team's authenticated server adapter. No network calls in Phase A. */
export function createHttpControlApi(): ControlApi {
  throw new ControlApiError(
    "NOT_CONFIGURED",
    "The live ControlApi adapter is not implemented in this checkpoint.",
  );
}
