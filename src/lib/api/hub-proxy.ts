import { isSameOrigin } from "@/lib/api/same-origin";
import { z } from "zod";
import { CreateMissionRequest } from "@/contracts";
import { HubMission, HubState, HubGrants, HubIncidents, HubIntegrations } from "./hub-mapping";
export function hubUrl(env: Record<string, string | undefined> = process.env) {
  const url = new URL(env.CORTEX_HUB_URL?.trim() || "http://127.0.0.1:8000");
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error("Invalid hub URL");
  return url;
}
const reply = (error: string, status: number) => Response.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
export async function proxyControl(request: Request, path: string[], env: Record<string, string | undefined> = process.env, fetcher: typeof fetch = fetch) {
  if (env.CORTEX_RUNTIME_MODE?.trim() !== "live") return reply("Live mode is disabled.", 503);
  const route = path.join("/");
  const reading = request.method === "GET";
  const allowed = reading ? /^(state|integrations\/status|guardian\/(grants|incidents)|missions\/(current|m_[\w-]+(?:\/result)?))$/.test(route) : /^(missions|missions\/m_[\w-]+\/decision|guardian\/incidents\/inc_[\w-]+\/decision)$/.test(route);
  if (!allowed) return reply("Route not available.", 404);
  if (!reading && !isSameOrigin(request)) return reply("Use this workspace to submit actions.", 403);
  try {
    let body: string | undefined;
    if (!reading) {
      const raw = await request.text();
      if (raw.length > 6000) return reply("Invalid request.", 400);
      const input: unknown = JSON.parse(raw);
      if (route === "missions") {
        const parsed = CreateMissionRequest.strict().safeParse(input);
        if (!parsed.success) return reply("Provide an objective between 1 and 2000 characters.", 400);
        body = JSON.stringify({ text: parsed.data.objective, idempotency_key: parsed.data.idempotencyKey });
      } else {
        const parsed = z.object({ decision: z.enum(["approve", "reject"]) }).strict().safeParse(input);
        if (!parsed.success) return reply("Invalid decision.", 400);
        body = JSON.stringify(parsed.data);
      }
    }
    const response = await fetcher(new URL(`/api/${route}`, hubUrl(env)), { method: request.method, headers: { "Content-Type": "application/json" }, body, cache: "no-store", signal: AbortSignal.any([request.signal, AbortSignal.timeout(15000)]) });
    if (!response.ok) return reply(response.status === 409 ? "Action is not available in the current state." : "Hub request failed.", response.status >= 500 ? 502 : response.status);
    if (route.endsWith("/result")) return new Response(await response.text(), { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Content-Security-Policy": "sandbox; default-src 'none'; style-src 'unsafe-inline'; img-src data:", "X-Content-Type-Options": "nosniff" } });
    const data = await response.json();
    // Commander exception text can contain provider diagnostics. Keep it server-side.
    if (route.startsWith("missions") && !route.endsWith("/decision")) {
      const mission = route === "missions/current" ? data.mission : data;
      if (mission?.error) mission.error = "Mission failed. Check the hub diagnostics for details.";
    }
    // Allowlisted schemas strip upstream configuration and provider error payloads.
    const schema = route === "state" ? HubState : route === "integrations/status" ? HubIntegrations : route === "guardian/grants" ? HubGrants : route === "guardian/incidents" ? HubIncidents : route === "missions/current" ? z.object({ mission: HubMission.nullable() }) : route.endsWith("/decision") ? z.object({ ok: z.boolean() }) : HubMission;
    return Response.json(schema.parse(data), { headers: { "Cache-Control": "no-store" } });
  } catch { return reply("The live hub is unavailable or returned invalid data.", 502); }
}
