const VIEWS_PATH = "/api/views";
const SETTINGS_PATH = "/api/settings";
const SETTINGS_ROW_KEY = "appearance";
const MAX_ID_LENGTH = 512;
const MAX_SETTINGS_LENGTH = 20000;

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

function normalizeId(id) {
  if (typeof id !== "string") return null;
  const value = id.trim().split("#", 1)[0];
  if (!value || value.length > MAX_ID_LENGTH || !value.startsWith("/")) return null;
  return value;
}

function normalizeViews(value) {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(number) || number < 0 || number > 2147483647) return null;
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
    const body = await request.json();
    return body && typeof body === "object" && !Array.isArray(body) ? body : null;
  } catch {
    return null;
  }
}

function isValidUrl(value) {
  return value === "" || value.startsWith("/") || /^https?:\/\//i.test(value);
}

function copyString(source, target, key, maxLength, validate) {
  if (!hasOwn(source, key)) return;
  if (typeof source[key] !== "string") return;
  const value = source[key].trim();
  if (value.length > maxLength || (validate && !validate(value))) return;
  target[key] = value;
}

function copyBoolean(source, target, key) {
  if (hasOwn(source, key) && typeof source[key] === "boolean") target[key] = source[key];
}

function copyOpacity(source, target) {
  if (!hasOwn(source, "pageBackgroundOpacity")) return;
  const value = Number(source.pageBackgroundOpacity);
  if (Number.isFinite(value) && value >= 0 && value <= 1) target.pageBackgroundOpacity = value;
}

function copyRange(source, target, key, minimum, maximum) {
  if (!hasOwn(source, key)) return;
  const value = Number(source[key]);
  if (Number.isFinite(value) && value >= minimum && value <= maximum) target[key] = value;
}

function copyEnum(source, target, key, values) {
  if (hasOwn(source, key) && typeof source[key] === "string" && values.includes(source[key])) {
    target[key] = source[key];
  }
}

function sanitizeSettings(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;

  const output = {};
  copyString(input, output, "title", 200);
  copyString(input, output, "themeColor", 16, (value) => /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value));
  copyString(input, output, "pageBackgroundUrl", 2048, isValidUrl);
  copyString(input, output, "pageBackgroundDarkUrl", 2048, isValidUrl);
  copyOpacity(input, output);
  copyRange(input, output, "cardRadius", 0, 48);
  copyEnum(input, output, "cardShadow", ["", "small", "default", "big"]);
  copyEnum(input, output, "font", ["sans-serif", "serif"]);
  copyBoolean(input, output, "transparentBanner");

  const groupSpecs = {
    banner: {
      strings: ["title", "subtitle", "backgroundUrl"],
      enums: {
        backgroundColorType: ["shape-primary", "shape-default", "shape-dark", "shape-info", "shape-success", "shape-warning", "shape-danger"],
        size: ["full", "mini", "fullscreen", "hidden"],
      },
      booleans: ["backgroundHideShapes"],
    },
    sidebar: {
      strings: ["bannerTitle", "bannerSubtitle", "authorName", "authorImage", "authorDescription"],
      booleans: [],
    },
    toolbar: {
      strings: ["title", "icon", "iconLink"],
      booleans: ["blur"],
    },
  };
  for (const [groupName, spec] of Object.entries(groupSpecs)) {
    const source = input[groupName];
    if (!source || typeof source !== "object" || Array.isArray(source)) continue;
    const target = {};
    for (const key of spec.strings) {
      const validator = key.toLowerCase().includes("url") || key === "authorImage" || key === "icon" || key === "iconLink"
        ? isValidUrl
        : null;
      copyString(source, target, key, key === "authorDescription" ? 1000 : 512, validator);
    }
    for (const [key, values] of Object.entries(spec.enums || {})) copyEnum(source, target, key, values);
    for (const key of spec.booleans) copyBoolean(source, target, key);
    if (Object.keys(target).length) output[groupName] = target;
  }

  const encoded = JSON.stringify(output);
  return encoded.length <= MAX_SETTINGS_LENGTH ? output : null;
}

async function getSettings(env) {
  const row = await env.DB.prepare(
    "SELECT value FROM site_settings WHERE setting_key = ?",
  ).bind(SETTINGS_ROW_KEY).first();
  if (!row || typeof row.value !== "string") return {};
  try {
    return sanitizeSettings(JSON.parse(row.value)) || {};
  } catch {
    return {};
  }
}

async function handleSettings(request, env, origin) {
  if (request.method === "GET") {
    return json({ settings: await getSettings(env) }, 200, origin);
  }
  if (!authorizedAdmin(request, env)) return json({ error: "unauthorized" }, 401, origin);

  if (request.method === "DELETE") {
    await env.DB.prepare("DELETE FROM site_settings WHERE setting_key = ?").bind(SETTINGS_ROW_KEY).run();
    return json({ settings: {} }, 200, origin);
  }
  if (request.method !== "PUT") return json({ error: "method_not_allowed" }, 405, origin);

  const body = await readBody(request);
  const raw = body && hasOwn(body, "settings") ? body.settings : body;
  const settings = sanitizeSettings(raw);
  if (!settings) return json({ error: "invalid_settings" }, 400, origin);
  await env.DB.prepare(
    "INSERT INTO site_settings (setting_key, value) VALUES (?, ?) " +
      "ON CONFLICT(setting_key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP",
  ).bind(SETTINGS_ROW_KEY, JSON.stringify(settings)).run();
  return json({ settings }, 200, origin);
}

async function handleViews(request, url, env, origin) {
  if (request.method === "GET" && url.searchParams.get("all") === "1") {
    if (!authorizedAdmin(request, env)) return json({ error: "unauthorized" }, 401, origin);
    const result = await env.DB.prepare(
      "SELECT slug, views, updated_at FROM view_counts ORDER BY slug",
    ).all();
    return json({ counts: result.results || [] }, 200, origin);
  }

  if (request.method === "GET" || request.method === "POST") {
    if (!authorizedView(request, env)) return json({ error: "unauthorized" }, 401, origin);
  } else if (request.method === "PUT" || request.method === "DELETE") {
    if (!authorizedAdmin(request, env)) return json({ error: "unauthorized" }, 401, origin);
  } else {
    return json({ error: "method_not_allowed" }, 405, origin);
  }

  const body = request.method === "GET" ? null : await readBody(request);
  const id = request.method === "GET"
    ? normalizeId(url.searchParams.get("id"))
    : normalizeId(body && body.id);
  if (!id) return json({ error: "invalid_id" }, 400, origin);

  if (request.method === "POST") {
    await env.DB.prepare(
      "INSERT INTO view_counts (slug, views) VALUES (?, 1) " +
        "ON CONFLICT(slug) DO UPDATE SET views = view_counts.views + 1, updated_at = CURRENT_TIMESTAMP",
    ).bind(id).run();
  } else if (request.method === "PUT") {
    if (!body || !hasOwn(body, "views")) return json({ error: "invalid_views" }, 400, origin);
    const views = normalizeViews(body.views);
    if (views === null) return json({ error: "invalid_views" }, 400, origin);
    await env.DB.prepare(
      "INSERT INTO view_counts (slug, views) VALUES (?, ?) " +
        "ON CONFLICT(slug) DO UPDATE SET views = excluded.views, updated_at = CURRENT_TIMESTAMP",
    ).bind(id, views).run();
  } else if (request.method === "DELETE") {
    await env.DB.prepare("DELETE FROM view_counts WHERE slug = ?").bind(id).run();
  }

  const row = await env.DB.prepare(
    "SELECT views FROM view_counts WHERE slug = ?",
  ).bind(id).first();
  return json({ id, views: row ? Number(row.views) : 0 }, 200, origin);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = allowedOrigin(request, env);
    if (origin === null) return json({ error: "origin_not_allowed" }, 403, "");
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: responseHeaders(origin) });
    }
    if (!env.DB) return json({ error: "database_not_configured" }, 503, origin);

    try {
      if (url.pathname === SETTINGS_PATH || url.pathname === `${SETTINGS_PATH}/`) {
        return await handleSettings(request, env, origin);
      }
      if (url.pathname === VIEWS_PATH || url.pathname === `${VIEWS_PATH}/`) {
        return await handleViews(request, url, env, origin);
      }
      return json({ error: "not_found" }, 404, origin);
    } catch (error) {
      console.error("view counter request error", error);
      return json({ error: "database_error" }, 500, origin);
    }
  },
};
