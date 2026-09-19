import { issueVoiceSession, voiceConfigured } from "@/lib/voice/session-server";

export const runtime = "nodejs";
export async function GET() {
  return Response.json({ configured: voiceConfigured(process.env) }, { headers: { "Cache-Control": "no-store" } });
}
export async function POST(request: Request) {
  return issueVoiceSession(request, process.env);
}
