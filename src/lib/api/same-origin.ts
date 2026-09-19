/** Compare browser Origin to the public Host, not Next's internal localhost URL. */
export function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const expected = new URL(request.url);
    const host = request.headers.get("host");
    if (host) expected.host = host;
    return new URL(origin).origin === expected.origin;
  } catch { return false; }
}
