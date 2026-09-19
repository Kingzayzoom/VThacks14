import { proxyControl } from "@/lib/api/hub-proxy";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
async function handle(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return proxyControl(request, (await context.params).path);
}
export { handle as GET, handle as POST };
