// Runtime only. Never import this handler from middleware or a client bundle.
// Forwards /api/backend/<namespace>/... to the mock API: ORGTIK_MOCK_URL when it is set (a
// separately hosted mock), otherwise the copy that runs inside this server (backend/).
import { backendOrigin } from "orgtik-wm-backend";

const namespaces = new Set(["sos", "tasks", "files", "hr", "sales", "marketing", "chats", "wm", "admin"]);
const forwarded = ["accept", "accept-language", "authorization", "content-type", "content-length", "range", "if-range", "if-match", "if-none-match", "x-workspace", "idempotency-key", "x-operation-id", "origin", "access-control-request-method", "access-control-request-headers"];
// The public website calls the content API from its own origin, so CORS answers pass through.
const responseHeaders = ["content-type", "content-disposition", "content-length", "content-range", "accept-ranges", "etag", "last-modified", "access-control-allow-origin", "access-control-allow-credentials", "access-control-allow-methods", "access-control-allow-headers", "access-control-expose-headers", "vary"];
const failure = (status: number, code: string) => Response.json({ success: false, statusCode: status, code }, { status, headers: { "cache-control": "no-store" } });

export async function proxyBackend(request: Request): Promise<Response> {
  const incoming = new URL(request.url);
  const marker = "/api/backend/", position = incoming.pathname.indexOf(marker);
  const path = position < 0 ? "" : incoming.pathname.slice(position + marker.length);
  const namespace = path.split("/")[0] || "";
  if (!namespaces.has(namespace) || /(?:^|\/)__(?:mock|.*)(?:\/|$)|%2f|%5c|%2e|\\/i.test(path)) return failure(404, "not_found");
  const headers = new Headers();
  for (const name of forwarded) {
    const value = request.headers.get(name);
    if (value !== null) headers.set(name, value);
  }
  try {
    const binding = process.env.ORGTIK_MOCK_URL || await backendOrigin();
    const base = new URL(binding.endsWith("/") ? binding : `${binding}/`);
    const target = new URL(path + incoming.search, base);
    const init: RequestInit & { duplex?: "half" } = {
      method: request.method, headers, cache: "no-store", redirect: "manual",
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(55000)]),
    };
    if (!["GET", "HEAD"].includes(request.method)) { init.body = request.body; init.duplex = "half"; }
    const upstream = await fetch(target, init);
    const output = new Headers({ "cache-control": "no-store" });
    for (const name of responseHeaders) {
      const value = upstream.headers.get(name);
      if (value !== null && !(name === "content-length" && upstream.headers.has("content-encoding"))) output.set(name, value);
    }
    const location = upstream.headers.get("location");
    if (location) {
      const resolved = new URL(location, target);
      if (resolved.origin !== base.origin || !resolved.pathname.startsWith(base.pathname)) return failure(502, "invalid_upstream_redirect");
      output.set("location", incoming.origin + incoming.pathname.slice(0, position + marker.length) + resolved.pathname.slice(base.pathname.length) + resolved.search + resolved.hash);
    }
    return new Response([204, 205, 304].includes(upstream.status) || request.method === "HEAD" ? null : upstream.body, { status: upstream.status, headers: output });
  } catch (error) {
    console.error("[backend]", error);
    return failure(503, "backend_unavailable");
  }
}
