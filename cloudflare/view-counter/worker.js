const VIEWS_PATH = "/api/views";
const BATCH_PATH = "/api/views/batch";
const TOTAL_SLUG = "__site_total__";
const MAX_ID_LENGTH = 512;
const MAX_BATCH_IDS = 100;
const MAX_BODY_LENGTH = 20000;
const MAX_VIEWS = 2147483647;

// D1 is the only persistent state used by this Worker. The reserved row keeps
// the site-wide total in the same table as the article counters.
// D1 exec() accepts multiple queries separated by newlines. Keep each query
// on one line so the API does not split a multiline CREATE statement midway.
const SCHEMA_SQL = [
  "CREATE TABLE IF NOT EXISTS view_counts (slug TEXT PRIMARY KEY, views INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);",
  "CREATE INDEX IF NOT EXISTS idx_view_counts_updated_at ON view_counts(updated_at);",
  `INSERT OR IGNORE INTO view_counts (slug, views) VALUES ('${TOTAL_SLUG}', COALESCE((SELECT SUM(views) FROM view_counts WHERE slug <> '${TOTAL_SLUG}'), 0));`,
].join("\n");

// Keep one initialization promise per D1 binding. This makes first-request
// setup safe when several authorized requests arrive at the same time, while
// allowing a failed setup to be retried on the next request.
const schemaInitialization = new WeakMap();

async function ensureSchema(env) {
  const database = env.DB;
  if (!database) return;

  let initialization = schemaInitialization.get(database);
  if (!initialization) {
    initialization = database.exec(SCHEMA_SQL).catch((error) => {
      schemaInitialization.delete(database);
      throw error;
    });
    schemaInitialization.set(database, initialization);
  }
  await initialization;
}

function allowedOrigin(request, env) {
  const origin = request.headers.get("Origin");
  // Requests without an Origin (curl, Wrangler smoke tests, and server-side
  // tools) do not need an ACAO header, but should still reach the API.
  if (!origin) return "";
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
    headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, X-View-Counter-Key, X-View-Counter-Admin-Key",
    );
    headers.set("Access-Control-Max-Age", "600");
  }
  return headers;
}

function json(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: responseHeaders(origin),
  });
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function normalizeId(id, allowTotal = false) {
  if (typeof id !== "string") return null;
  const value = id.trim().split("#", 1)[0];
  if (!value || value.length > MAX_ID_LENGTH) return null;
  if (value === TOTAL_SLUG) return allowTotal ? value : null;
  return value.startsWith("/") ? value : null;
}

function normalizeViews(value) {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(number) || number < 0 || number > MAX_VIEWS) return null;
  return number;
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

function authorizedView(request, env) {
  return (
    secretsMatch(request.headers.get("X-View-Counter-Key"), env.VIEW_COUNTER_KEY) ||
    secretsMatch(request.headers.get("X-View-Counter-Admin-Key"), env.VIEW_COUNTER_ADMIN_KEY)
  );
}

function authorizedAdmin(request, env) {
  return secretsMatch(
    request.headers.get("X-View-Counter-Admin-Key"),
    env.VIEW_COUNTER_ADMIN_KEY,
  );
}

async function readBody(request) {
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_LENGTH) return null;
    const body = JSON.parse(text);
    return body && typeof body === "object" && !Array.isArray(body) ? body : null;
  } catch {
    return null;
  }
}

function uniqueNormalizedIds(values) {
  if (!Array.isArray(values) || values.length === 0 || values.length > MAX_BATCH_IDS) return null;
  const ids = [];
  for (const value of values) {
    const id = normalizeId(value);
    if (!id || !ids.includes(id)) {
      if (!id) return null;
      ids.push(id);
    }
  }
  return ids.length > 0 && ids.length <= MAX_BATCH_IDS ? ids : null;
}

function queryIds(url) {
  const values = [...url.searchParams.getAll("id"), ...url.searchParams.getAll("ids")];
  const expanded = values.flatMap((value) => value.split(","));
  return uniqueNormalizedIds(expanded);
}

function normalizeBatchBody(body, singleRequest) {
  if (!body) return null;
  const rawIds = Array.isArray(body.ids)
    ? body.ids
    : hasOwn(body, "id")
      ? [body.id]
      : [];
  const ids = uniqueNormalizedIds(rawIds);
  if (!ids) return null;

  let increment = null;
  if (hasOwn(body, "increment") || hasOwn(body, "incrementId")) {
    increment = normalizeId(hasOwn(body, "increment") ? body.increment : body.incrementId);
    if (!increment) return null;
    if (!ids.includes(increment)) ids.push(increment);
  } else if (singleRequest && ids.length === 1) {
    increment = ids[0];
  }
  if (ids.length > MAX_BATCH_IDS) return null;
  return { ids, increment };
}

function buildSelect(ids) {
  const placeholders = ids.map(() => "?").join(", ");
  return `SELECT slug, views FROM view_counts WHERE slug IN (${placeholders}) OR slug = ?`;
}

function parseCountRows(result, ids) {
  const counts = Object.fromEntries(ids.map((id) => [id, 0]));
  let total = 0;
  for (const row of result.results || []) {
    const views = Number(row.views);
    if (!Number.isSafeInteger(views) || views < 0) continue;
    if (row.slug === TOTAL_SLUG) total = views;
    else if (hasOwn(counts, row.slug)) counts[row.slug] = views;
  }
  return { counts, total };
}

async function readCounts(env, ids) {
  const result = await env.DB.prepare(buildSelect(ids)).bind(...ids, TOTAL_SLUG).all();
  return parseCountRows(result, ids);
}

async function writeAndReadCounts(env, ids, increment) {
  const statements = [];
  if (increment) {
    statements.push(
      env.DB.prepare(
        "INSERT INTO view_counts (slug, views) VALUES (?, 1) " +
          "ON CONFLICT(slug) DO UPDATE SET views = MIN(?, view_counts.views + 1), updated_at = CURRENT_TIMESTAMP",
      ).bind(increment, MAX_VIEWS),
    );
    statements.push(
      env.DB.prepare(
        "INSERT INTO view_counts (slug, views) VALUES (?, 1) " +
          "ON CONFLICT(slug) DO UPDATE SET views = MIN(?, view_counts.views + 1), updated_at = CURRENT_TIMESTAMP",
      ).bind(TOTAL_SLUG, MAX_VIEWS),
    );
  }
  statements.push(env.DB.prepare(buildSelect(ids)).bind(...ids, TOTAL_SLUG));
  const results = await env.DB.batch(statements);
  return parseCountRows(results[results.length - 1], ids);
}

function singleResponse(id, data, origin) {
  const views = id === TOTAL_SLUG ? data.total : data.counts[id] || 0;
  return json({ id, views, total: data.total }, 200, origin);
}

async function handleGet(request, url, env, origin) {
  if (url.searchParams.get("all") === "1") {
    if (!authorizedAdmin(request, env)) return json({ error: "unauthorized" }, 401, origin);
    const result = await env.DB.prepare(
      "SELECT slug, views, updated_at FROM view_counts ORDER BY slug",
    ).all();
    const counts = [];
    let total = 0;
    for (const row of result.results || []) {
      if (row.slug === TOTAL_SLUG) total = Number(row.views) || 0;
      else counts.push(row);
    }
    return json({ counts, total }, 200, origin);
  }

  if (!authorizedView(request, env)) return json({ error: "unauthorized" }, 401, origin);
  const ids = queryIds(url);
  if (!ids) return json({ error: "invalid_ids" }, 400, origin);
  const data = await readCounts(env, ids);
  return ids.length === 1 && url.searchParams.getAll("id").length === 1
    ? singleResponse(ids[0], data, origin)
    : json(data, 200, origin);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = allowedOrigin(request, env);
    if (origin === null) return json({ error: "origin_not_allowed" }, 403, "");
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: responseHeaders(origin) });
    }

    const isViewsPath = url.pathname === VIEWS_PATH || url.pathname === `${VIEWS_PATH}/`;
    const isBatchPath = url.pathname === BATCH_PATH || url.pathname === `${BATCH_PATH}/`;
    if (!isViewsPath && !isBatchPath) return json({ error: "not_found" }, 404, origin);
    if (!env.DB) return json({ error: "database_not_configured" }, 503, origin);

    try {
      let operation;
      if (request.method === "GET" && isViewsPath) {
        // Validate authentication and query shape before initialization.
        if (url.searchParams.get("all") === "1") {
          if (!authorizedAdmin(request, env)) return json({ error: "unauthorized" }, 401, origin);
        } else if (!authorizedView(request, env)) {
          return json({ error: "unauthorized" }, 401, origin);
        } else if (!queryIds(url)) {
          return json({ error: "invalid_ids" }, 400, origin);
        }
        operation = () => handleGet(request, url, env, origin);
      } else if (request.method === "POST" && (isViewsPath || isBatchPath)) {
        if (!authorizedView(request, env)) return json({ error: "unauthorized" }, 401, origin);
        const body = normalizeBatchBody(await readBody(request), isViewsPath);
        if (!body) return json({ error: "invalid_body" }, 400, origin);
        operation = () => writeAndReadCounts(env, body.ids, body.increment).then((data) =>
          isViewsPath && body.ids.length === 1
            ? singleResponse(body.ids[0], data, origin)
            : json(data, 200, origin),
        );
      } else if (request.method === "PUT" && isViewsPath) {
        if (!authorizedAdmin(request, env)) return json({ error: "unauthorized" }, 401, origin);
        const body = await readBody(request);
        const id = normalizeId(body && body.id, true);
        const views = normalizeViews(body && body.views);
        if (!id || views === null) return json({ error: "invalid_views" }, 400, origin);
        operation = () => handlePutBody(id, views, env, origin);
      } else if (request.method === "DELETE" && isViewsPath) {
        if (!authorizedAdmin(request, env)) return json({ error: "unauthorized" }, 401, origin);
        const body = await readBody(request);
        const id = normalizeId(body && body.id);
        if (!id) return json({ error: "invalid_id" }, 400, origin);
        operation = () => handleDeleteId(id, env, origin);
      } else {
        return json({ error: "method_not_allowed" }, 405, origin);
      }

      await ensureSchema(env);
      return await operation();
    } catch (error) {
      console.error("view counter request error", error);
      return json({ error: "database_error" }, 500, origin);
    }
  },
};

async function handlePutBody(id, views, env, origin) {
  await env.DB.prepare(
    "INSERT INTO view_counts (slug, views) VALUES (?, ?) " +
      "ON CONFLICT(slug) DO UPDATE SET views = excluded.views, updated_at = CURRENT_TIMESTAMP",
  ).bind(id, views).run();
  const data = await readCounts(env, [id]);
  return singleResponse(id, data, origin);
}

async function handleDeleteId(id, env, origin) {
  await env.DB.prepare("DELETE FROM view_counts WHERE slug = ?").bind(id).run();
  const data = await readCounts(env, [id]);
  return singleResponse(id, data, origin);
}
