const VIEWS_PATH = "/api/views";
const BATCH_PATH = "/api/views/batch";
const COMMENTS_PATH = "/api/comments";
const AUTH_START_PATH = "/api/auth/github/start";
const AUTH_CALLBACK_PATH = "/api/auth/github/callback";
const AUTH_ME_PATH = "/api/auth/me";
const AUTH_LOGOUT_PATH = "/api/auth/logout";
const TOTAL_SLUG = "__site_total__";
const SESSION_COOKIE = "argon_session";
const OAUTH_STATE_COOKIE = "argon_oauth_state";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
const OAUTH_STATE_TTL_SECONDS = 60 * 10;
const MAX_ID_LENGTH = 512;
const MAX_BATCH_IDS = 100;
const MAX_BODY_LENGTH = 20000;
const MAX_COMMENT_NAME_LENGTH = 80;
const MAX_COMMENT_CONTENT_LENGTH = 5000;
const MAX_COMMENT_PAGE_SIZE = 50;
const MAX_VIEWS = 2147483647;

// D1 is the only persistent state used by this Worker. The reserved row keeps
// the site-wide total in the same table as the article counters.
// D1 exec() accepts multiple queries separated by newlines. Keep each query
// on one line so the API does not split a multiline CREATE statement midway.
const SCHEMA_SQL = [
  "CREATE TABLE IF NOT EXISTS view_counts (slug TEXT PRIMARY KEY, views INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);",
  "CREATE INDEX IF NOT EXISTS idx_view_counts_updated_at ON view_counts(updated_at);",
  `INSERT OR IGNORE INTO view_counts (slug, views) VALUES ('${TOTAL_SLUG}', COALESCE((SELECT SUM(views) FROM view_counts WHERE slug <> '${TOTAL_SLUG}'), 0));`,
  "CREATE TABLE IF NOT EXISTS comments (id INTEGER PRIMARY KEY AUTOINCREMENT, post_path TEXT NOT NULL, parent_id INTEGER, author_name TEXT NOT NULL, content TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);",
  "CREATE INDEX IF NOT EXISTS idx_comments_post_created ON comments(post_path, created_at DESC, id DESC);",
  "CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);",
  "CREATE TABLE IF NOT EXISTS auth_users (github_id TEXT PRIMARY KEY, login TEXT NOT NULL, display_name TEXT, avatar_url TEXT, profile_url TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);",
  "CREATE TABLE IF NOT EXISTS auth_sessions (token_hash TEXT PRIMARY KEY, github_id TEXT NOT NULL, expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL);",
  "CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires ON auth_sessions(expires_at);",
  "CREATE TABLE IF NOT EXISTS oauth_states (state_hash TEXT PRIMARY KEY, code_verifier TEXT NOT NULL, return_to TEXT NOT NULL, expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL);",
  "CREATE INDEX IF NOT EXISTS idx_oauth_states_expires ON oauth_states(expires_at);",
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
    initialization = (async () => {
      await database.exec(SCHEMA_SQL);
      const columns = await database.prepare("PRAGMA table_info(comments)").all();
      if (!(columns.results || []).some((column) => column.name === "github_id")) {
        await database.exec("ALTER TABLE comments ADD COLUMN github_id TEXT;");
      }
    })().catch((error) => {
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
    headers.set("Access-Control-Allow-Credentials", "true");
    headers.set("Access-Control-Max-Age", "600");
  }
  return headers;
}

function json(data, status, origin, extraHeaders) {
  const headers = responseHeaders(origin);
  for (const [name, value] of Object.entries(extraHeaders || {})) {
    if (Array.isArray(value)) value.forEach((item) => headers.append(name, item));
    else headers.set(name, value);
  }
  return new Response(JSON.stringify(data), {
    status,
    headers,
  });
}

function redirect(location, extraHeaders) {
  const headers = new Headers({ Location: location, "Cache-Control": "no-store" });
  for (const [name, value] of Object.entries(extraHeaders || {})) {
    if (Array.isArray(value)) value.forEach((item) => headers.append(name, item));
    else headers.set(name, value);
  }
  return new Response(null, { status: 302, headers });
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

function base64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function randomToken(byteLength = 32) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return base64Url(bytes);
}

async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return base64Url(new Uint8Array(digest));
}

function parseCookies(request) {
  const cookies = {};
  for (const part of (request.headers.get("Cookie") || "").split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    const name = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (name) cookies[name] = value;
  }
  return cookies;
}

function cookieHeader(name, value, maxAge, request, path, sameSite) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  const effectiveSameSite = sameSite === "None" && !secure ? "Lax" : sameSite;
  return `${name}=${value}; Max-Age=${maxAge}; Path=${path}; HttpOnly; SameSite=${effectiveSameSite}${secure}`;
}

function clearCookieHeader(name, request, path) {
  return cookieHeader(name, "", 0, request, path, "Lax");
}

function githubRedirectUri(request, env) {
  return String(env.GITHUB_REDIRECT_URI || "").trim() ||
    new URL(AUTH_CALLBACK_PATH, request.url).href;
}

function allowedOrigins(env) {
  return String(env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeReturnTo(value, request, env) {
  const origins = allowedOrigins(env);
  const fallbackOrigin = origins[0] || new URL(request.url).origin;
  try {
    const target = new URL(value || "/", `${fallbackOrigin}/`);
    if (!["http:", "https:"].includes(target.protocol)) return null;
    if (!origins.includes(target.origin)) return null;
    return target.href;
  } catch {
    return null;
  }
}

function authResultUrl(returnTo, result) {
  const target = new URL(returnTo);
  target.searchParams.set("argon_auth", result);
  return target.href;
}

function publicUser(row) {
  if (!row) return null;
  return {
    githubId: String(row.github_id),
    login: row.login,
    displayName: row.display_name || row.login,
    avatarUrl: row.avatar_url || "",
    profileUrl: row.profile_url || `https://github.com/${encodeURIComponent(row.login)}`,
  };
}

function allowGuestComments(env) {
  return String(env.COMMENTS_ALLOW_GUESTS || "").toLowerCase() === "true";
}

async function authenticatedUser(request, env) {
  const token = parseCookies(request)[SESSION_COOKIE];
  if (!token) return null;
  const tokenHash = await sha256(token);
  const now = Math.floor(Date.now() / 1000);
  const row = await env.DB.prepare(
    "SELECT u.github_id, u.login, u.display_name, u.avatar_url, u.profile_url " +
      "FROM auth_sessions s JOIN auth_users u ON u.github_id = s.github_id " +
      "WHERE s.token_hash = ? AND s.expires_at > ?",
  ).bind(tokenHash, now).first();
  return publicUser(row);
}

async function handleAuthMe(request, env, origin) {
  const user = await authenticatedUser(request, env);
  return json({ authenticated: !!user, user }, 200, origin);
}

async function handleAuthLogout(request, env, origin) {
  const token = parseCookies(request)[SESSION_COOKIE];
  if (token) {
    await env.DB.prepare("DELETE FROM auth_sessions WHERE token_hash = ?").bind(await sha256(token)).run();
  }
  return json({ authenticated: false, user: null }, 200, origin, {
    "Set-Cookie": clearCookieHeader(SESSION_COOKIE, request, "/"),
  });
}

async function handleAuthStart(request, url, env) {
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
    return json({ error: "github_oauth_not_configured" }, 503, "");
  }
  const returnTo = normalizeReturnTo(url.searchParams.get("returnTo"), request, env);
  if (!returnTo) return json({ error: "invalid_return_to" }, 400, "");

  const state = randomToken();
  const codeVerifier = randomToken(48);
  const codeChallenge = await sha256(codeVerifier);
  const now = Math.floor(Date.now() / 1000);
  await env.DB.prepare("DELETE FROM oauth_states WHERE expires_at <= ?").bind(now).run();
  await env.DB.prepare(
    "INSERT INTO oauth_states (state_hash, code_verifier, return_to, expires_at, created_at) VALUES (?, ?, ?, ?, ?)",
  ).bind(await sha256(state), codeVerifier, returnTo, now + OAUTH_STATE_TTL_SECONDS, now).run();

  const authorizeUrl = new URL("https://github.com/login/oauth/authorize");
  authorizeUrl.searchParams.set("client_id", String(env.GITHUB_CLIENT_ID));
  authorizeUrl.searchParams.set("redirect_uri", githubRedirectUri(request, env));
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("code_challenge", codeChallenge);
  authorizeUrl.searchParams.set("code_challenge_method", "S256");
  authorizeUrl.searchParams.set("scope", "read:user");
  return redirect(authorizeUrl.href, {
    "Set-Cookie": cookieHeader(OAUTH_STATE_COOKIE, state, OAUTH_STATE_TTL_SECONDS, request, "/api/auth", "Lax"),
  });
}

async function exchangeGithubCode(code, codeVerifier, request, env) {
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: String(env.GITHUB_CLIENT_ID),
      client_secret: String(env.GITHUB_CLIENT_SECRET),
      code,
      redirect_uri: githubRedirectUri(request, env),
      code_verifier: codeVerifier,
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) throw new Error("github_token_exchange_failed");
  return data.access_token;
}

async function fetchGithubUser(accessToken) {
  const response = await fetch("https://api.github.com/user", {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${accessToken}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "Argon-Hugo-Comments",
    },
  });
  const user = await response.json().catch(() => ({}));
  if (!response.ok || !Number.isSafeInteger(user.id) || !user.login) {
    throw new Error("github_user_fetch_failed");
  }
  return user;
}

async function handleAuthCallback(request, url, env) {
  const state = url.searchParams.get("state") || "";
  const stateCookie = parseCookies(request)[OAUTH_STATE_COOKIE] || "";
  const stateHash = state ? await sha256(state) : "";
  const now = Math.floor(Date.now() / 1000);
  const record = stateHash ? await env.DB.prepare(
    "SELECT state_hash, code_verifier, return_to FROM oauth_states WHERE state_hash = ? AND expires_at > ?",
  ).bind(stateHash, now).first() : null;
  const clearState = { "Set-Cookie": clearCookieHeader(OAUTH_STATE_COOKIE, request, "/api/auth") };
  if (!record || !stateCookie || !secretsMatch(state, stateCookie)) {
    return json({ error: "invalid_oauth_state" }, 400, "", clearState);
  }
  await env.DB.prepare("DELETE FROM oauth_states WHERE state_hash = ?").bind(stateHash).run();
  if (url.searchParams.get("error")) {
    return redirect(authResultUrl(record.return_to, "cancelled"), clearState);
  }
  const code = url.searchParams.get("code");
  if (!code) return redirect(authResultUrl(record.return_to, "error"), clearState);

  try {
    const accessToken = await exchangeGithubCode(code, record.code_verifier, request, env);
    const githubUser = await fetchGithubUser(accessToken);
    const githubId = String(githubUser.id);
    await env.DB.prepare(
      "INSERT INTO auth_users (github_id, login, display_name, avatar_url, profile_url, created_at, updated_at) " +
        "VALUES (?, ?, ?, ?, ?, ?, ?) " +
        "ON CONFLICT(github_id) DO UPDATE SET login = excluded.login, display_name = excluded.display_name, " +
        "avatar_url = excluded.avatar_url, profile_url = excluded.profile_url, updated_at = excluded.updated_at",
    ).bind(
      githubId,
      String(githubUser.login),
      String(githubUser.name || githubUser.login),
      String(githubUser.avatar_url || ""),
      String(githubUser.html_url || `https://github.com/${githubUser.login}`),
      now,
      now,
    ).run();
    const sessionToken = randomToken(32);
    await env.DB.prepare(
      "INSERT INTO auth_sessions (token_hash, github_id, expires_at, created_at) VALUES (?, ?, ?, ?)",
    ).bind(await sha256(sessionToken), githubId, now + SESSION_TTL_SECONDS, now).run();
    await env.DB.prepare("DELETE FROM auth_sessions WHERE expires_at <= ?").bind(now).run();
    return redirect(authResultUrl(record.return_to, "success"), {
      "Set-Cookie": [
        clearState["Set-Cookie"],
        cookieHeader(SESSION_COOKIE, sessionToken, SESSION_TTL_SECONDS, request, "/", "None"),
      ],
    });
  } catch (error) {
    console.error("GitHub OAuth callback failed", error);
    return redirect(authResultUrl(record.return_to, "error"), clearState);
  }
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

function normalizePostPath(value) {
  return normalizeId(value);
}

function normalizePage(value, fallback, maximum) {
  const number = Number(value || fallback);
  return Number.isSafeInteger(number) && number >= 1 && number <= maximum ? number : null;
}

function normalizeCommentName(value) {
  if (typeof value !== "string") return null;
  const name = value.trim();
  return name && name.length <= MAX_COMMENT_NAME_LENGTH ? name : null;
}

function normalizeCommentContent(value) {
  if (typeof value !== "string") return null;
  const content = value.trim();
  return content && content.length <= MAX_COMMENT_CONTENT_LENGTH ? content : null;
}

function normalizeParentId(value) {
  if (value === undefined || value === null || value === "") return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
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

function commentRow(row) {
  return {
    id: Number(row.id),
    postPath: row.post_path,
    parentId: row.parent_id === null ? null : Number(row.parent_id),
    authorName: row.author_name,
    content: row.content,
    createdAt: row.created_at,
  };
}

async function handleCommentsGet(request, url, env, origin) {
  const postPath = normalizePostPath(url.searchParams.get("post"));
  const page = normalizePage(url.searchParams.get("page"), 1, 1000000);
  const limit = normalizePage(url.searchParams.get("limit"), 20, MAX_COMMENT_PAGE_SIZE);
  if (!postPath || !page || !limit) return json({ error: "invalid_query" }, 400, origin);

  const totalResult = await env.DB.prepare(
    "SELECT COUNT(*) AS total FROM comments WHERE post_path = ?",
  ).bind(postPath).first();
  const total = Number(totalResult?.total) || 0;
  const offset = (page - 1) * limit;
  const result = await env.DB.prepare(
    "SELECT id, post_path, parent_id, author_name, content, created_at " +
      "FROM comments WHERE post_path = ? ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?",
  ).bind(postPath, limit, offset).all();

  return json({
    comments: (result.results || []).map(commentRow),
    page,
    limit,
    total,
    pages: total === 0 ? 0 : Math.ceil(total / limit),
  }, 200, origin);
}

async function handleCommentsPost(request, env, origin) {
  const body = await readBody(request);
  const postPath = normalizePostPath(body && (body.postPath || body.post));
  const content = normalizeCommentContent(body && body.content);
  const parentId = normalizeParentId(body && body.parentId);
  if (!postPath || !content) {
    return json({ error: "invalid_comment" }, 400, origin);
  }
  if (body && body.parentId !== undefined && body.parentId !== null && body.parentId !== "" && !parentId) {
    return json({ error: "invalid_parent" }, 400, origin);
  }

  if (parentId) {
    const parent = await env.DB.prepare(
      "SELECT id FROM comments WHERE id = ? AND post_path = ?",
    ).bind(parentId, postPath).first();
    if (!parent) return json({ error: "parent_not_found" }, 400, origin);
  }

  const user = await authenticatedUser(request, env);
  if (!user && !allowGuestComments(env)) {
    return json({ error: "auth_required" }, 401, origin);
  }
  const authorName = user
    ? normalizeCommentName(user.displayName || user.login)
    : normalizeCommentName(body && (body.authorName || body.name));
  if (!authorName) return json({ error: "invalid_comment" }, 400, origin);

  const result = await env.DB.prepare(
    "INSERT INTO comments (post_path, parent_id, author_name, content, github_id) VALUES (?, ?, ?, ?, ?)",
  ).bind(postPath, parentId, authorName, content, user ? user.githubId : null).run();
  const id = Number(result.meta?.last_row_id);
  if (!Number.isSafeInteger(id) || id < 1) return json({ error: "insert_failed" }, 500, origin);
  const row = await env.DB.prepare(
    "SELECT id, post_path, parent_id, author_name, content, created_at FROM comments WHERE id = ?",
  ).bind(id).first();
  return json({ comment: row ? commentRow(row) : null }, 201, origin);
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
    const isCommentsPath = url.pathname === COMMENTS_PATH || url.pathname === `${COMMENTS_PATH}/`;
    const isAuthStartPath = url.pathname === AUTH_START_PATH || url.pathname === `${AUTH_START_PATH}/`;
    const isAuthCallbackPath = url.pathname === AUTH_CALLBACK_PATH || url.pathname === `${AUTH_CALLBACK_PATH}/`;
    const isAuthMePath = url.pathname === AUTH_ME_PATH || url.pathname === `${AUTH_ME_PATH}/`;
    const isAuthLogoutPath = url.pathname === AUTH_LOGOUT_PATH || url.pathname === `${AUTH_LOGOUT_PATH}/`;
    const isAuthPath = isAuthStartPath || isAuthCallbackPath || isAuthMePath || isAuthLogoutPath;
    if (!isViewsPath && !isBatchPath && !isCommentsPath && !isAuthPath) return json({ error: "not_found" }, 404, origin);
    if (!env.DB) return json({ error: "database_not_configured" }, 503, origin);

    try {
      let operation;
      if (request.method === "GET" && isAuthStartPath) {
        operation = () => handleAuthStart(request, url, env);
      } else if (request.method === "GET" && isAuthCallbackPath) {
        operation = () => handleAuthCallback(request, url, env);
      } else if (request.method === "GET" && isAuthMePath) {
        operation = () => handleAuthMe(request, env, origin);
      } else if (request.method === "POST" && isAuthLogoutPath) {
        operation = () => handleAuthLogout(request, env, origin);
      } else if (request.method === "GET" && isCommentsPath) {
        operation = () => handleCommentsGet(request, url, env, origin);
      } else if (request.method === "POST" && isCommentsPath) {
        operation = () => handleCommentsPost(request, env, origin);
      } else if (request.method === "GET" && isViewsPath) {
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
