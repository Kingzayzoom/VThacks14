import { hubUrl } from "@/lib/api/hub-proxy";
import { HubEvent } from "@/lib/api/hub-mapping";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  if (process.env.CORTEX_RUNTIME_MODE?.trim() !== "live") return new Response(null, { status: 503 });
  const url = hubUrl(); url.protocol = url.protocol === "https:" ? "wss:" : "ws:"; url.pathname = "/ws";
  let dispose = () => {};
  const stream = new ReadableStream({
    start(controller) {
      const socket = new WebSocket(url);
      let closed = false;
      const encoder = new TextEncoder();
      const close = () => { if (closed) return; closed = true; clearInterval(heartbeat); clearTimeout(timeout); request.signal.removeEventListener("abort", close); socket.close(); try { controller.close(); } catch { /* Consumer already canceled. */ } };
      const send = (value: string) => { if (!closed) controller.enqueue(encoder.encode(value)); };
      const timeout = setTimeout(close, 10000);
      const heartbeat = setInterval(() => send(": heartbeat\n\n"), 15000);
      dispose = close;
      request.signal.addEventListener("abort", close, { once: true });
      socket.onopen = () => { clearTimeout(timeout); send('data: {"kind":"connected"}\n\n'); };
      socket.onclose = close; socket.onerror = close;
      socket.onmessage = event => {
        try {
          const frame = JSON.parse(String(event.data));
          const raw: unknown[] = frame.kind === "history" && Array.isArray(frame.events) ? frame.events : frame.kind === "event" ? [frame.event] : [];
          const events = raw.flatMap(item => {
            const parsed = HubEvent.safeParse(item); if (!parsed.success) return [];
            const event = parsed.data;
            // Do not forward arbitrary provider error data from llm.fallback.
            const data = event.type === "trust.check" ? { checks: event.data.checks } : event.type === "capability.missing" ? { capability: event.data.capability } : {};
            return [{ ...event, message: event.type === "mission.failed" ? "Mission failed. Check the hub diagnostics for details." : event.message, data }];
          });
          if (frame.kind === "history") send(`data: ${JSON.stringify({ kind: "history", events })}\n\n`);
          else for (const event of events) send(`data: ${JSON.stringify({ kind: "event", event })}\n\n`);
        } catch { /* Drop malformed upstream frames. */ }
      };
      if (request.signal.aborted) close();
    },
    cancel() { dispose(); },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-store", "X-Accel-Buffering": "no" } });
}
