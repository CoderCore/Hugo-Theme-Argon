const API_PATH = "/api/views";

function allowedOrigin(request, env) {
  const origin = request.headers.get("Origin");
  if (!origin) return null;
  const allowed = String(env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return allowed.includes(origin) ? origin : null;
}

function responseHeaders(origin) {
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    Vary: "Origin",
  });
  if (origin) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type, X-View-Counter-Key");
  }
  return headers;
}

function json(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: responseHeaders(origin),
  });
}

function normalizeId(id) {
  if (typeof id !== "string") return null;
  const value = id.trim().split("#", 1)[0];
  if (!value || value.length > 512 || !value.startsWith("/")) return null;
  return value;
}

function secretsMatch(provided, expected) {
  if (typeof provided !== "string" || typeof expected !== "string" || !expected) return false;
  const providedBytes = new TextEncoder().encode(provided);
  const expectedBytes = new TextEncoder().encode(expected);
  let difference = providedBytes.length ^ expectedBytes.length;
  const length = Math.max(providedBytes.length, expectedBytes.length);
  for (let index = 0; index < length; index += 1) {
    difference |= (providedBytes[index] || 0) ^ (expectedBytes[index] || 0);
  }
  return difference === 0;
}

function authorized(request, env) {
  return secretsMatch(request.headers.get("X-View-Counter-Key"), env.VIEW_COUNTER_KEY);
}

async function readId(request, url) {
  if (request.method === "GET") {
    return normalizeId(url.searchParams.get("id"));
  }
  try {
    const body = await request.json();
    return normalizeId(body && body.id);
  } catch {
    return null;
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== API_PATH && url.pathname !== `${API_PATH}/`) {
      return json({ error: "not_found" }, 404, "");
    }

    const origin = allowedOrigin(request, env);
    if (origin === null) {
      return json({ error: "origin_not_allowed" }, 403, "");
    }
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: responseHeaders(origin) });
    }
    if (request.method !== "GET" && request.method !== "POST") {
      return json({ error: "method_not_allowed" }, 405, origin);
    }
    if (!authorized(request, env)) {
      return json({ error: "unauthorized" }, 401, origin);
    }
    if (!env.DB) {
      return json({ error: "database_not_configured" }, 503, origin);
    }

    const id = await readId(request, url);
    if (!id) {
      return json({ error: "invalid_id" }, 400, origin);
    }

    try {
      if (request.method === "POST") {
        await env.DB.prepare(
          "INSERT INTO view_counts (slug, views) VALUES (?, 1) " +
          "ON CONFLICT(slug) DO UPDATE SET views = view_counts.views + 1, updated_at = CURRENT_TIMESTAMP",
        ).bind(id).run();
      }
      const row = await env.DB.prepare(
        "SELECT views FROM view_counts WHERE slug = ?",
      ).bind(id).first();
      return json({ id, views: row ? Number(row.views) : 0 }, 200, origin);
    } catch (error) {
      console.error("view counter database error", error);
      return json({ error: "database_error" }, 500, origin);
    }
  },
};
