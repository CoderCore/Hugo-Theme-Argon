const VIEWS_PATH = "/api/views";
const BATCH_PATH = "/api/views/batch";
const COMMENTS_PATH = "/api/comments";
const COMMENT_COUNTS_PATH = "/api/comments/counts";
const AUTH_START_PATH = "/api/auth/github/start";
const AUTH_CALLBACK_PATH = "/api/auth/github/callback";
const AUTH_ME_PATH = "/api/auth/me";
const AUTH_LOGOUT_PATH = "/api/auth/logout";
const ADMIN_STATUS_PATH = "/api/admin/status";
const ADMIN_VIEWS_PATH = "/api/admin/views";
const ADMIN_COMMENTS_PATH = "/api/admin/comments";
const ADMIN_LOGIN_PATH = "/api/admin/auth/login";
const ADMIN_ME_PATH = "/api/admin/auth/me";
const ADMIN_LOGOUT_PATH = "/api/admin/auth/logout";
const TOTAL_SLUG = "__site_total__";
const SESSION_COOKIE = "argon_session";
const ADMIN_SESSION_COOKIE = "argon_admin_session";
const ADMIN_CSRF_COOKIE = "argon_admin_csrf";
const ADMIN_CSRF_HEADER = "X-Admin-CSRF-Token";
const OAUTH_STATE_COOKIE = "argon_oauth_state";
const VOTE_COOKIE = "argon_vote_id";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
const OAUTH_STATE_TTL_SECONDS = 60 * 10;
const VOTE_COOKIE_TTL_SECONDS = 60 * 60 * 24 * 365;
const MAX_ID_LENGTH = 512;
const MAX_BATCH_IDS = 100;
const MAX_BODY_LENGTH = 20000;
const MAX_COMMENT_NAME_LENGTH = 80;
const MAX_COMMENT_CONTENT_LENGTH = 5000;
const MAX_COMMENT_PAGE_SIZE = 50;
const MAX_COMMENT_PAGE_NUMBER = 10000;
const MAX_ADMIN_PAGE_SIZE = 50;
const MAX_ADMIN_SEARCH_LENGTH = 200;
const MAX_VIEWS = 2147483647;
const CSRF_COOKIE = "argon_csrf";
const CSRF_HEADER = "X-CSRF-Token";
const GITHUB_REQUEST_TIMEOUT_MS = 10000;

// D1 is the only persistent state used by this Worker. The reserved row is a
// maintained cache of the site-wide total; it is reconciled once on migration.
// D1 exec() accepts multiple queries separated by newlines. Keep each query
// on one line so the API does not split a multiline CREATE statement midway.
const SCHEMA_SQL = [
  "CREATE TABLE IF NOT EXISTS view_counts (slug TEXT PRIMARY KEY, views INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);",
  "CREATE INDEX IF NOT EXISTS idx_view_counts_updated_at ON view_counts(updated_at);",
  "CREATE TABLE IF NOT EXISTS view_counter_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);",
  `INSERT OR IGNORE INTO view_counts (slug, views) VALUES ('${TOTAL_SLUG}', 0);`,
  "CREATE TABLE IF NOT EXISTS comments (id INTEGER PRIMARY KEY AUTOINCREMENT, post_path TEXT NOT NULL, parent_id INTEGER, author_name TEXT NOT NULL, content TEXT NOT NULL, upvotes INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, github_id TEXT, updated_at TEXT, deleted_at TEXT);",
  "CREATE INDEX IF NOT EXISTS idx_comments_post_created ON comments(post_path, created_at DESC, id DESC);",
  "CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);",
  "CREATE TABLE IF NOT EXISTS comment_votes (comment_id INTEGER NOT NULL, voter_key TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (comment_id, voter_key));",
  "CREATE INDEX IF NOT EXISTS idx_comment_votes_comment ON comment_votes(comment_id);",
  "CREATE TABLE IF NOT EXISTS auth_users (github_id TEXT PRIMARY KEY, login TEXT NOT NULL, display_name TEXT, avatar_url TEXT, profile_url TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);",
  "CREATE TABLE IF NOT EXISTS auth_sessions (token_hash TEXT PRIMARY KEY, github_id TEXT NOT NULL, expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL);",
  "CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires ON auth_sessions(expires_at);",
  "CREATE TABLE IF NOT EXISTS admin_sessions (token_hash TEXT PRIMARY KEY, expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL);",
  "CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON admin_sessions(expires_at);",
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
      const columnNames = new Set((columns.results || []).map((column) => column.name));
      const migrations = [
        ["github_id", "ALTER TABLE comments ADD COLUMN github_id TEXT;"],
        ["updated_at", "ALTER TABLE comments ADD COLUMN updated_at TEXT;"],
        ["deleted_at", "ALTER TABLE comments ADD COLUMN deleted_at TEXT;"],
        ["upvotes", "ALTER TABLE comments ADD COLUMN upvotes INTEGER NOT NULL DEFAULT 0;"],
      ];
      for (const [name, statement] of migrations) {
        if (!columnNames.has(name)) await database.exec(statement);
      }
      if (!columnNames.has("upvotes")) {
        await database.exec(
          "UPDATE comments SET upvotes = (SELECT COUNT(*) FROM comment_votes WHERE comment_votes.comment_id = comments.id);",
        );
      }
      await database.exec(
        "CREATE INDEX IF NOT EXISTS idx_comments_post_rank ON comments(post_path, upvotes DESC, created_at DESC, id DESC);",
      );
      const totalCache = await database.prepare(
        "SELECT value FROM view_counter_meta WHERE key = ?",
      ).bind("site_total_cache_v1").first();
      if (!totalCache) {
        await database.batch([
          database.prepare(
            "UPDATE view_counts SET views = COALESCE((SELECT SUM(views) FROM view_counts WHERE slug <> ?), 0), updated_at = CURRENT_TIMESTAMP WHERE slug = ?",
          ).bind(TOTAL_SLUG, TOTAL_SLUG),
          database.prepare(
            "INSERT OR REPLACE INTO view_counter_meta (key, value) VALUES (?, ?)",
          ).bind("site_total_cache_v1", "ready"),
        ]);
      }
      await database.exec("CREATE INDEX IF NOT EXISTS idx_comments_github_post ON comments(github_id, post_path, id);");
      await database.exec("CREATE INDEX IF NOT EXISTS idx_comments_admin_created ON comments(deleted_at, created_at DESC, id DESC);");
      await database.exec("CREATE TABLE IF NOT EXISTS admin_sessions (token_hash TEXT PRIMARY KEY, expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL);");
      await database.exec("CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON admin_sessions(expires_at);");
      // Older releases used soft deletion. Remove only trees whose every node
      // is already deleted; a deleted parent with live replies must remain as a
      // compact placeholder so the reply tree stays navigable.
      await database.exec(
        "WITH RECURSIVE comment_tree(root_id, id, deleted_at) AS (" +
          "SELECT id, id, deleted_at FROM comments WHERE parent_id IS NULL " +
          "UNION ALL " +
          "SELECT t.root_id, c.id, c.deleted_at FROM comments c JOIN comment_tree t ON c.parent_id = t.id" +
        "), empty_roots AS (" +
          "SELECT root_id FROM comment_tree GROUP BY root_id " +
          "HAVING SUM(CASE WHEN deleted_at IS NULL THEN 1 ELSE 0 END) = 0" +
        ") DELETE FROM comments WHERE id IN (" +
          "SELECT id FROM comment_tree WHERE root_id IN (SELECT root_id FROM empty_roots)" +
        ");",
      );
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
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    Vary: "Origin",
  });
  if (origin) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, X-CSRF-Token, X-Admin-CSRF-Token, X-View-Counter-Key, X-View-Counter-Admin-Key",
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

function publicUser(user) {
  if (!user) return null;
  return {
    login: user.login,
    displayName: user.displayName || user.login,
    avatarUrl: user.avatarUrl || "",
    profileUrl: user.profileUrl || `https://github.com/${encodeURIComponent(user.login)}`,
  };
}

function sessionUser(row) {
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

async function commentVoter(request, user) {
  if (user) return { key: `github:${user.githubId}`, setCookie: null };
  const cookies = parseCookies(request);
  const token = cookies[VOTE_COOKIE] || randomToken(32);
  return {
    key: `cookie:${await sha256(token)}`,
    setCookie: cookies[VOTE_COOKIE]
      ? null
      : cookieHeader(VOTE_COOKIE, token, VOTE_COOKIE_TTL_SECONDS, request, "/", "Lax"),
  };
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
  return sessionUser(row);
}

async function handleAuthMe(request, env, origin) {
  const user = await authenticatedUser(request, env);
  const cookies = parseCookies(request);
  const csrfToken = cookies[CSRF_COOKIE] || randomToken(32);
  const extraHeaders = cookies[CSRF_COOKIE]
    ? undefined
    : { "Set-Cookie": cookieHeader(CSRF_COOKIE, csrfToken, SESSION_TTL_SECONDS, request, "/", "Lax") };
  return json({ authenticated: !!user, user: publicUser(user), csrfToken }, 200, origin, extraHeaders);
}

async function handleAuthLogout(request, env, origin) {
  if (!validMutationContext(request) || !validCsrfToken(request)) {
    return json({ error: "csrf_failed" }, 403, origin);
  }
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
  const response = await fetchWithTimeout("https://github.com/login/oauth/access_token", {
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
  }, GITHUB_REQUEST_TIMEOUT_MS);
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) throw new Error("github_token_exchange_failed");
  return data.access_token;
}

async function fetchGithubUser(accessToken) {
  const response = await fetchWithTimeout("https://api.github.com/user", {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${accessToken}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "Argon-Hugo-Comments",
    },
  }, GITHUB_REQUEST_TIMEOUT_MS);
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

async function authorizedView(request, env) {
  if (secretsMatch(request.headers.get("X-View-Counter-Key"), env.VIEW_COUNTER_KEY)) return true;
  // Public view requests normally have no admin cookie. Avoid a D1 session
  // lookup for them; only a request carrying an admin session can use the
  // legacy admin-compatible view endpoint.
  if (!parseCookies(request)[ADMIN_SESSION_COOKIE]) return false;
  return await authorizedAdmin(request, env);
}

function authorizedAdminKey(request, env) {
  return secretsMatch(
    request.headers.get("X-View-Counter-Admin-Key"),
    env.VIEW_COUNTER_ADMIN_KEY,
  );
}

async function authorizedAdmin(request, env) {
  if (authorizedAdminKey(request, env)) return true;
  const token = parseCookies(request)[ADMIN_SESSION_COOKIE];
  if (!token) return false;
  const row = await env.DB.prepare(
    "SELECT token_hash FROM admin_sessions WHERE token_hash = ? AND expires_at > ?",
  ).bind(await sha256(token), Math.floor(Date.now() / 1000)).first();
  return !!row;
}

function validAdminCsrfToken(request) {
  const cookieToken = parseCookies(request)[ADMIN_CSRF_COOKIE] || "";
  const headerToken = request.headers.get(ADMIN_CSRF_HEADER) || "";
  return !!cookieToken && secretsMatch(headerToken, cookieToken);
}

function validAdminMutation(request, env) {
  return authorizedAdminKey(request, env) ||
    (validMutationContext(request) && validAdminCsrfToken(request));
}

function normalizeAdminSearch(value) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, MAX_ADMIN_SEARCH_LENGTH);
}

function adminPageQuery(url) {
  const page = normalizePage(url.searchParams.get("page"), 1, MAX_COMMENT_PAGE_NUMBER);
  const limit = normalizePage(url.searchParams.get("limit"), 20, MAX_ADMIN_PAGE_SIZE);
  return page && limit ? { page, limit, offset: (page - 1) * limit } : null;
}

function adminPageResponse(rows, page, limit, key) {
  const hasNext = rows.length > limit;
  const pageRows = hasNext ? rows.slice(0, limit) : rows;
  return { [key]: pageRows, page, limit, hasNext };
}

async function handleAdminLogin(request, env, origin) {
  if (!requireJsonContentType(request) || !validMutationContext(request)) {
    return json({ error: "csrf_failed" }, 403, origin);
  }
  const body = await readBody(request);
  const key = typeof body?.key === "string" ? body.key : "";
  if (!secretsMatch(key, env.VIEW_COUNTER_ADMIN_KEY)) {
    return json({ error: "unauthorized" }, 401, origin);
  }

  const token = randomToken(32);
  const csrfToken = randomToken(32);
  const now = Math.floor(Date.now() / 1000);
  await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO admin_sessions (token_hash, expires_at, created_at) VALUES (?, ?, ?)",
    ).bind(await sha256(token), now + ADMIN_SESSION_TTL_SECONDS, now),
    env.DB.prepare("DELETE FROM admin_sessions WHERE expires_at <= ?").bind(now),
  ]);
  return json({ authenticated: true, csrfToken }, 200, origin, {
    "Set-Cookie": [
      cookieHeader(ADMIN_SESSION_COOKIE, token, ADMIN_SESSION_TTL_SECONDS, request, "/", "Lax"),
      cookieHeader(ADMIN_CSRF_COOKIE, csrfToken, ADMIN_SESSION_TTL_SECONDS, request, "/", "Lax"),
    ],
  });
}

async function handleAdminMe(request, env, origin) {
  if (!(await authorizedAdmin(request, env))) {
    return json({ authenticated: false }, 401, origin);
  }
  const cookies = parseCookies(request);
  const csrfToken = cookies[ADMIN_CSRF_COOKIE] || randomToken(32);
  const extraHeaders = cookies[ADMIN_CSRF_COOKIE]
    ? undefined
    : { "Set-Cookie": cookieHeader(ADMIN_CSRF_COOKIE, csrfToken, ADMIN_SESSION_TTL_SECONDS, request, "/", "Lax") };
  return json({ authenticated: true, csrfToken }, 200, origin, extraHeaders);
}

async function handleAdminLogout(request, env, origin) {
  const adminKey = authorizedAdminKey(request, env);
  if (!(await authorizedAdmin(request, env))) {
    return json({ authenticated: false }, 401, origin);
  }
  if (!adminKey && (!validMutationContext(request) || !validAdminCsrfToken(request))) {
    return json({ error: "csrf_failed" }, 403, origin);
  }
  const token = parseCookies(request)[ADMIN_SESSION_COOKIE];
  if (token) {
    await env.DB.prepare("DELETE FROM admin_sessions WHERE token_hash = ?").bind(await sha256(token)).run();
  }
  return json({ authenticated: false }, 200, origin, {
    "Set-Cookie": [
      clearCookieHeader(ADMIN_SESSION_COOKIE, request, "/"),
      clearCookieHeader(ADMIN_CSRF_COOKIE, request, "/"),
    ],
  });
}

async function handleAdminStatus(request, env, origin) {
  if (!(await authorizedAdmin(request, env))) return json({ error: "unauthorized" }, 401, origin);
  return json({ ok: true, scope: "admin" }, 200, origin);
}

async function handleAdminViewsGet(request, url, env, origin) {
  if (!(await authorizedAdmin(request, env))) return json({ error: "unauthorized" }, 401, origin);
  const pagination = adminPageQuery(url);
  const search = normalizeAdminSearch(url.searchParams.get("search"));
  if (!pagination) return json({ error: "invalid_query" }, 400, origin);

  let result;
  if (search) {
    result = await env.DB.prepare(
      "SELECT slug, views, updated_at FROM view_counts " +
        "WHERE slug <> ? AND slug LIKE ? ORDER BY slug LIMIT ? OFFSET ?",
    ).bind(TOTAL_SLUG, `%${search}%`, pagination.limit + 1, pagination.offset).all();
  } else {
    result = await env.DB.prepare(
      "SELECT slug, views, updated_at FROM view_counts " +
        "WHERE slug <> ? ORDER BY slug LIMIT ? OFFSET ?",
    ).bind(TOTAL_SLUG, pagination.limit + 1, pagination.offset).all();
  }
  const totalRow = await env.DB.prepare(
    "SELECT views FROM view_counts WHERE slug = ?",
  ).bind(TOTAL_SLUG).first();
  return json(
    {
      ...adminPageResponse(result.results || [], pagination.page, pagination.limit, "views"),
      total: Number(totalRow?.views) || 0,
    },
    200,
    origin,
  );
}

async function handleAdminCommentsGet(request, url, env, origin) {
  if (!(await authorizedAdmin(request, env))) return json({ error: "unauthorized" }, 401, origin);
  const pagination = adminPageQuery(url);
  const post = normalizeAdminSearch(url.searchParams.get("post"));
  const author = normalizeAdminSearch(url.searchParams.get("author"));
  const status = url.searchParams.get("status") || "active";
  if (!pagination || !["active", "deleted", "all"].includes(status)) {
    return json({ error: "invalid_query" }, 400, origin);
  }

  const conditions = [];
  const values = [];
  if (status === "active") conditions.push("c.deleted_at IS NULL");
  if (status === "deleted") conditions.push("c.deleted_at IS NOT NULL");
  if (post) { conditions.push("c.post_path LIKE ?"); values.push(`%${post}%`); }
  if (author) {
    conditions.push("(c.author_name LIKE ? OR c.github_id LIKE ?)");
    values.push(`%${author}%`, `%${author}%`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const result = await env.DB.prepare(
    "SELECT c.id, c.post_path, c.parent_id, c.author_name, c.content, c.created_at, " +
      "c.updated_at, c.deleted_at, c.github_id, u.avatar_url AS avatar_url, " +
      "u.profile_url AS profile_url, c.upvotes AS upvotes, 0 AS upvoted, " +
      "1 AS can_edit, 1 AS can_delete FROM comments c " +
      "LEFT JOIN auth_users u ON u.github_id = c.github_id " +
      `${where} ORDER BY c.created_at DESC, c.id DESC LIMIT ? OFFSET ?`,
  ).bind(...values, pagination.limit + 1, pagination.offset).all();
  return json(
    adminPageResponse((result.results || []).map(commentRow), pagination.page, pagination.limit, "comments"),
    200,
    origin,
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

function fetchWithTimeout(input, init, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort("request_timeout"), timeoutMs);
  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timeout));
}

function clientKey(request) {
  return request.headers.get("CF-Connecting-IP") || "anonymous";
}

async function enforceRateLimit(binding, key) {
  if (!binding || typeof binding.limit !== "function") return true;
  const result = await binding.limit({ key });
  return result?.success !== false;
}

function validMutationContext(request) {
  const fetchSite = (request.headers.get("Sec-Fetch-Site") || "").toLowerCase();
  return fetchSite !== "cross-site";
}

function validCsrfToken(request) {
  const cookieToken = parseCookies(request)[CSRF_COOKIE] || "";
  const headerToken = request.headers.get(CSRF_HEADER) || "";
  return !!cookieToken && secretsMatch(headerToken, cookieToken);
}

function requireJsonContentType(request) {
  return (request.headers.get("Content-Type") || "").split(";", 1)[0].trim().toLowerCase() ===
    "application/json";
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

function normalizeCommentId(value) {
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
  if (increment && increment !== TOTAL_SLUG) {
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
  const deleted = !!row.deleted_at;
  return {
    id: Number(row.id),
    postPath: row.post_path,
    parentId: row.parent_id === null ? null : Number(row.parent_id),
    authorName: deleted ? "评论已删除" : row.author_name,
    avatarUrl: deleted ? "" : row.avatar_url || "",
    profileUrl: deleted ? "" : row.profile_url || "",
    content: deleted ? "" : row.content,
    createdAt: row.created_at,
    updatedAt: deleted ? "" : row.updated_at || "",
    upvotes: deleted ? 0 : Number(row.upvotes) || 0,
    upvoted: !deleted && Number(row.upvoted) === 1,
    deleted,
    canEdit: !deleted && Number(row.can_edit) === 1,
    canDelete: !deleted && Number(row.can_delete) === 1,
  };
}

async function handleCommentsGet(request, url, env, origin) {
  const postPath = normalizePostPath(url.searchParams.get("post"));
  const page = normalizePage(url.searchParams.get("page"), 1, MAX_COMMENT_PAGE_NUMBER);
  const limit = normalizePage(url.searchParams.get("limit"), 20, MAX_COMMENT_PAGE_SIZE);
  if (!postPath || !page || !limit) return json({ error: "invalid_query" }, 400, origin);

  const user = await authenticatedUser(request, env);
  const githubId = user ? user.githubId : "";
  const voter = await commentVoter(request, user);
  const offset = (page - 1) * limit;
  const result = await env.DB.prepare(
    "SELECT c.id, c.post_path, c.parent_id, c.author_name, c.content, c.created_at, " +
      "COUNT(*) OVER() AS total_count, " +
      "c.updated_at, c.deleted_at, u.avatar_url AS avatar_url, u.profile_url AS profile_url, " +
      "c.upvotes AS upvotes, " +
      "CASE WHEN EXISTS (SELECT 1 FROM comment_votes v WHERE v.comment_id = c.id AND v.voter_key = ?) THEN 1 ELSE 0 END AS upvoted, " +
      "CASE WHEN c.github_id = ? THEN 1 ELSE 0 END AS can_edit, " +
      "CASE WHEN c.github_id = ? THEN 1 ELSE 0 END AS can_delete " +
      "FROM comments c LEFT JOIN auth_users u ON u.github_id = c.github_id " +
      "WHERE c.post_path = ? ORDER BY upvotes DESC, c.created_at DESC, c.id DESC LIMIT ? OFFSET ?",
  ).bind(voter.key, githubId, githubId, postPath, limit, offset).all();
  const total = result.results?.length ? Number(result.results[0].total_count) || 0 : 0;

  return json({
    comments: (result.results || []).map(commentRow),
    page,
    limit,
    total,
    pages: total === 0 ? 0 : Math.ceil(total / limit),
  }, 200, origin, voter.setCookie ? { "Set-Cookie": voter.setCookie } : undefined);
}

async function handleCommentCountsGet(url, env, origin) {
  const posts = uniqueNormalizedIds(url.searchParams.getAll("post"));
  if (!posts) return json({ error: "invalid_query" }, 400, origin);

  const counts = Object.fromEntries(posts.map((post) => [post, 0]));
  const placeholders = posts.map(() => "?").join(", ");
  const result = await env.DB.prepare(
    `SELECT post_path, COUNT(*) AS total FROM comments WHERE post_path IN (${placeholders}) GROUP BY post_path`,
  ).bind(...posts).all();
  for (const row of result.results || []) {
    if (hasOwn(counts, row.post_path)) counts[row.post_path] = Number(row.total) || 0;
  }
  return json({ counts }, 200, origin);
}

async function handleCommentsPost(request, env, origin) {
  if (!requireJsonContentType(request) || !validMutationContext(request) || !validCsrfToken(request)) {
    return json({ error: "csrf_failed" }, 403, origin);
  }
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

  const user = await authenticatedUser(request, env);
  if (!user && !allowGuestComments(env)) {
    return json({ error: "auth_required" }, 401, origin);
  }

  if (parentId) {
    const parent = await env.DB.prepare(
      "SELECT id FROM comments WHERE id = ? AND post_path = ?",
    ).bind(parentId, postPath).first();
    if (!parent) return json({ error: "parent_not_found" }, 400, origin);
  }

  if (!(await enforceRateLimit(env.COMMENT_RATE_LIMITER, user ? `user:${user.githubId}` : `ip:${clientKey(request)}`))) {
    return json({ error: "rate_limited" }, 429, origin, { "Retry-After": "60" });
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
    "SELECT c.id, c.post_path, c.parent_id, c.author_name, c.content, c.created_at, " +
      "c.updated_at, c.deleted_at, u.avatar_url AS avatar_url, u.profile_url AS profile_url, " +
      "c.upvotes AS upvotes, " +
      "0 AS upvoted, " +
      "1 AS can_edit, 1 AS can_delete " +
      "FROM comments c LEFT JOIN auth_users u ON u.github_id = c.github_id WHERE c.id = ?",
  ).bind(id).first();
  return json({ comment: row ? commentRow(row) : null }, 201, origin);
}

async function findOwnedComment(request, commentId, env, origin) {
  const admin = await authorizedAdmin(request, env);
  // A valid admin key is sufficient for admin operations; avoid an extra
  // session lookup on those requests. Ordinary users still require GitHub
  // session ownership below.
  const user = admin ? null : await authenticatedUser(request, env);
  if (!user && !admin) return { response: json({ error: "auth_required" }, 401, origin) };
  const row = await env.DB.prepare(
    "SELECT id, post_path, github_id, deleted_at FROM comments WHERE id = ?",
  ).bind(commentId).first();
  if (!row || row.deleted_at) return { response: json({ error: "comment_not_found" }, 404, origin) };
  if (!admin && String(row.github_id || "") !== user.githubId) {
    return { response: json({ error: "comment_forbidden" }, 403, origin) };
  }
  if (!(await enforceRateLimit(env.COMMENT_RATE_LIMITER, admin ? "admin" : `user:${user.githubId}`))) {
    return { response: json({ error: "rate_limited" }, 429, origin, { "Retry-After": "60" }) };
  }
  return { user, row, admin };
}

async function handleCommentPut(request, commentId, env, origin) {
  const adminKey = authorizedAdminKey(request, env);
  const admin = await authorizedAdmin(request, env);
  if (!requireJsonContentType(request) || !validMutationContext(request) ||
      (admin ? (!adminKey && !validAdminCsrfToken(request)) : !validCsrfToken(request))) {
    return json({ error: "csrf_failed" }, 403, origin);
  }
  const body = await readBody(request);
  const content = normalizeCommentContent(body && body.content);
  if (!content) return json({ error: "invalid_comment" }, 400, origin);
  const ownership = await findOwnedComment(request, commentId, env, origin);
  if (ownership.response) return ownership.response;
  if (ownership.admin) {
    await env.DB.prepare(
      "UPDATE comments SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL",
    ).bind(content, commentId).run();
  } else {
    await env.DB.prepare(
      "UPDATE comments SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND github_id = ? AND deleted_at IS NULL",
    ).bind(content, commentId, ownership.user.githubId).run();
  }
  const row = await env.DB.prepare(
    "SELECT c.id, c.post_path, c.parent_id, c.author_name, c.content, c.created_at, " +
      "c.updated_at, c.deleted_at, u.avatar_url AS avatar_url, u.profile_url AS profile_url, " +
      "c.upvotes AS upvotes, " +
      "0 AS upvoted, " +
      "1 AS can_edit, 1 AS can_delete " +
      "FROM comments c LEFT JOIN auth_users u ON u.github_id = c.github_id WHERE c.id = ?",
  ).bind(commentId).first();
  return json({ comment: row ? commentRow(row) : null }, 200, origin);
}

async function handleCommentDelete(request, commentId, env, origin) {
  const adminKey = authorizedAdminKey(request, env);
  const admin = await authorizedAdmin(request, env);
  if (!validMutationContext(request) ||
      (admin ? (!adminKey && !validAdminCsrfToken(request)) : !validCsrfToken(request))) {
    return json({ error: "csrf_failed" }, 403, origin);
  }
  const ownership = await findOwnedComment(request, commentId, env, origin);
  if (ownership.response) return ownership.response;
  if (ownership.admin) {
    await env.DB.prepare(
      "UPDATE comments SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP " +
        "WHERE id = ? AND deleted_at IS NULL",
    ).bind(commentId).run();
  } else {
    await env.DB.prepare(
      "UPDATE comments SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP " +
        "WHERE id = ? AND github_id = ? AND deleted_at IS NULL",
    ).bind(commentId, ownership.user.githubId).run();
  }
  await pruneCommentTreeIfEmpty(commentId, env);
  return json({ deleted: true, id: commentId }, 200, origin);
}

async function handleCommentUpvote(request, commentId, env, origin) {
  if (!validMutationContext(request) || !validCsrfToken(request)) {
    return json({ error: "csrf_failed" }, 403, origin);
  }
  const user = await authenticatedUser(request, env);
  if (!user && !allowGuestComments(env)) {
    return json({ error: "auth_required" }, 401, origin);
  }
  const voter = await commentVoter(request, user);
  const comment = await env.DB.prepare(
    "SELECT c.id, c.upvotes, EXISTS (SELECT 1 FROM comment_votes v WHERE v.comment_id = c.id AND v.voter_key = ?) AS existing " +
      "FROM comments c WHERE c.id = ? AND c.deleted_at IS NULL",
  ).bind(voter.key, commentId).first();
  if (!comment) return json({ error: "comment_not_found" }, 404, origin);

  const rateKey = user ? `user:${user.githubId}` : `ip:${clientKey(request)}`;
  if (!(await enforceRateLimit(env.COMMENT_RATE_LIMITER, `vote:${rateKey}`))) {
    return json({ error: "rate_limited" }, 429, origin, { "Retry-After": "60" });
  }
  const existing = Number(comment.existing) === 1;
  const delta = existing ? -1 : 1;
  const statements = [];
  if (existing) {
    statements.push(env.DB.prepare(
      "DELETE FROM comment_votes WHERE comment_id = ? AND voter_key = ?",
    ).bind(commentId, voter.key));
  } else {
    statements.push(env.DB.prepare(
      "INSERT INTO comment_votes (comment_id, voter_key) VALUES (?, ?)",
    ).bind(commentId, voter.key));
  }
  statements.push(env.DB.prepare(
    "UPDATE comments SET upvotes = MAX(0, upvotes + ?) WHERE id = ? AND deleted_at IS NULL",
  ).bind(delta, commentId));
  statements.push(env.DB.prepare("SELECT upvotes FROM comments WHERE id = ?").bind(commentId));
  const results = await env.DB.batch(statements);
  const updated = results[results.length - 1]?.results?.[0];
  const upvotes = Number(updated?.upvotes);
  return json({ id: commentId, upvotes: Number.isSafeInteger(upvotes) ? upvotes : Math.max(0, Number(comment.upvotes) + delta), upvoted: !existing }, 200, origin,
    voter.setCookie ? { "Set-Cookie": voter.setCookie } : undefined);
}

async function pruneCommentTreeIfEmpty(commentId, env) {
  const root = await env.DB.prepare(
    "WITH RECURSIVE ancestors(id, parent_id) AS (" +
      "SELECT id, parent_id FROM comments WHERE id = ? " +
      "UNION ALL " +
      "SELECT c.id, c.parent_id FROM comments c JOIN ancestors a ON c.id = a.parent_id" +
    "), root AS (" +
      "SELECT id FROM ancestors WHERE parent_id IS NULL LIMIT 1" +
    "), comment_tree(id) AS (" +
      "SELECT id FROM comments WHERE id = (SELECT id FROM root) " +
      "UNION ALL " +
      "SELECT c.id FROM comments c JOIN comment_tree p ON c.parent_id = p.id" +
    ") SELECT (SELECT id FROM root) AS root_id, " +
      "SUM(CASE WHEN c.deleted_at IS NULL THEN 1 ELSE 0 END) AS active " +
      "FROM comments c JOIN comment_tree t ON t.id = c.id",
  ).bind(commentId).first();
  if (!root?.root_id || Number(root.active) !== 0) return;
  const tree =
    "WITH RECURSIVE comment_tree(id) AS (" +
      "SELECT id FROM comments WHERE id = ? " +
      "UNION ALL " +
      "SELECT c.id FROM comments c JOIN comment_tree p ON c.parent_id = p.id" +
    ") ";
  await env.DB.batch([
    env.DB.prepare(tree + "DELETE FROM comment_votes WHERE comment_id IN (SELECT id FROM comment_tree);").bind(root.root_id),
    env.DB.prepare(tree + "DELETE FROM comments WHERE id IN (SELECT id FROM comment_tree);").bind(root.root_id),
  ]);
}

function singleResponse(id, data, origin) {
  const views = id === TOTAL_SLUG ? data.total : data.counts[id] || 0;
  return json({ id, views, total: data.total }, 200, origin);
}

async function handleGet(request, url, env, origin) {
  if (url.searchParams.get("all") === "1") {
    if (!(await authorizedAdmin(request, env))) return json({ error: "unauthorized" }, 401, origin);
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

  if (!(await authorizedView(request, env))) return json({ error: "unauthorized" }, 401, origin);
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
    const isCommentCountsPath = url.pathname === COMMENT_COUNTS_PATH || url.pathname === `${COMMENT_COUNTS_PATH}/`;
    const commentItemMatch = url.pathname.match(/^\/api\/comments\/([1-9]\d*)\/?$/);
    const commentItemId = commentItemMatch ? normalizeCommentId(commentItemMatch[1]) : null;
    const isCommentItemPath = !!commentItemId;
    const commentVoteMatch = url.pathname.match(/^\/api\/comments\/([1-9]\d*)\/upvote\/?$/);
    const commentVoteId = commentVoteMatch ? normalizeCommentId(commentVoteMatch[1]) : null;
    const isCommentVotePath = !!commentVoteId;
    const isAuthStartPath = url.pathname === AUTH_START_PATH || url.pathname === `${AUTH_START_PATH}/`;
    const isAuthCallbackPath = url.pathname === AUTH_CALLBACK_PATH || url.pathname === `${AUTH_CALLBACK_PATH}/`;
    const isAuthMePath = url.pathname === AUTH_ME_PATH || url.pathname === `${AUTH_ME_PATH}/`;
    const isAuthLogoutPath = url.pathname === AUTH_LOGOUT_PATH || url.pathname === `${AUTH_LOGOUT_PATH}/`;
    const isAuthPath = isAuthStartPath || isAuthCallbackPath || isAuthMePath || isAuthLogoutPath;
    const isAdminLoginPath = url.pathname === ADMIN_LOGIN_PATH || url.pathname === `${ADMIN_LOGIN_PATH}/`;
    const isAdminMePath = url.pathname === ADMIN_ME_PATH || url.pathname === `${ADMIN_ME_PATH}/`;
    const isAdminLogoutPath = url.pathname === ADMIN_LOGOUT_PATH || url.pathname === `${ADMIN_LOGOUT_PATH}/`;
    const isAdminStatusPath = url.pathname === ADMIN_STATUS_PATH || url.pathname === `${ADMIN_STATUS_PATH}/`;
    const isAdminViewsPath = url.pathname === ADMIN_VIEWS_PATH || url.pathname === `${ADMIN_VIEWS_PATH}/`;
    const isAdminCommentsPath = url.pathname === ADMIN_COMMENTS_PATH || url.pathname === `${ADMIN_COMMENTS_PATH}/`;
    const isAdminAuthPath = isAdminLoginPath || isAdminMePath || isAdminLogoutPath;
    if (!isViewsPath && !isBatchPath && !isCommentsPath && !isCommentCountsPath && !isCommentItemPath && !isCommentVotePath && !isAuthPath && !isAdminAuthPath && !isAdminStatusPath && !isAdminViewsPath && !isAdminCommentsPath) return json({ error: "not_found" }, 404, origin);
    if (!env.DB) return json({ error: "database_not_configured" }, 503, origin);

    try {
      let operation;
      if (request.method === "GET" && isAuthStartPath) {
        operation = async () => {
          if (!(await enforceRateLimit(env.AUTH_RATE_LIMITER, `ip:${clientKey(request)}`))) {
            return json({ error: "rate_limited" }, 429, "", { "Retry-After": "60" });
          }
          return handleAuthStart(request, url, env);
        };
      } else if (request.method === "GET" && isAuthCallbackPath) {
        operation = async () => {
          if (!(await enforceRateLimit(env.AUTH_RATE_LIMITER, `callback:${clientKey(request)}`))) {
            return json({ error: "rate_limited" }, 429, "", { "Retry-After": "60" });
          }
          return handleAuthCallback(request, url, env);
        };
      } else if (request.method === "GET" && isAuthMePath) {
        operation = () => handleAuthMe(request, env, origin);
      } else if (request.method === "POST" && isAuthLogoutPath) {
        operation = () => handleAuthLogout(request, env, origin);
      } else if (request.method === "POST" && isAdminLoginPath) {
        operation = async () => {
          if (!(await enforceRateLimit(env.AUTH_RATE_LIMITER, `admin-login:${clientKey(request)}`))) {
            return json({ error: "rate_limited" }, 429, origin, { "Retry-After": "60" });
          }
          return handleAdminLogin(request, env, origin);
        };
      } else if (request.method === "GET" && isAdminMePath) {
        operation = () => handleAdminMe(request, env, origin);
      } else if (request.method === "POST" && isAdminLogoutPath) {
        operation = () => handleAdminLogout(request, env, origin);
      } else if (request.method === "GET" && isAdminStatusPath) {
        operation = () => handleAdminStatus(request, env, origin);
      } else if (request.method === "GET" && isAdminViewsPath) {
        operation = () => handleAdminViewsGet(request, url, env, origin);
      } else if (request.method === "GET" && isAdminCommentsPath) {
        operation = () => handleAdminCommentsGet(request, url, env, origin);
      } else if (request.method === "GET" && isCommentsPath) {
        operation = () => handleCommentsGet(request, url, env, origin);
      } else if (request.method === "GET" && isCommentCountsPath) {
        operation = () => handleCommentCountsGet(url, env, origin);
      } else if (request.method === "POST" && isCommentsPath) {
        operation = () => handleCommentsPost(request, env, origin);
      } else if (request.method === "PUT" && isCommentItemPath) {
        operation = () => handleCommentPut(request, commentItemId, env, origin);
      } else if (request.method === "DELETE" && isCommentItemPath) {
        operation = () => handleCommentDelete(request, commentItemId, env, origin);
      } else if (request.method === "POST" && isCommentVotePath) {
        operation = () => handleCommentUpvote(request, commentVoteId, env, origin);
      } else if (request.method === "GET" && isViewsPath) {
        // Validate authentication and query shape before initialization.
        if (url.searchParams.get("all") === "1") {
          if (!(await authorizedAdmin(request, env))) return json({ error: "unauthorized" }, 401, origin);
        } else if (!(await authorizedView(request, env))) {
          return json({ error: "unauthorized" }, 401, origin);
        } else if (!queryIds(url)) {
          return json({ error: "invalid_ids" }, 400, origin);
        }
        operation = () => handleGet(request, url, env, origin);
      } else if (request.method === "POST" && (isViewsPath || isBatchPath)) {
        if (!(await authorizedView(request, env))) return json({ error: "unauthorized" }, 401, origin);
        if (!requireJsonContentType(request)) return json({ error: "invalid_content_type" }, 415, origin);
        const body = normalizeBatchBody(await readBody(request), isViewsPath);
        if (!body) return json({ error: "invalid_body" }, 400, origin);
        operation = () => writeAndReadCounts(env, body.ids, body.increment).then((data) =>
          isViewsPath && body.ids.length === 1
            ? singleResponse(body.ids[0], data, origin)
            : json(data, 200, origin),
        );
      } else if (request.method === "PUT" && isViewsPath) {
        if (!(await authorizedAdmin(request, env))) return json({ error: "unauthorized" }, 401, origin);
        if (!validAdminMutation(request, env)) return json({ error: "csrf_failed" }, 403, origin);
        if (!requireJsonContentType(request)) return json({ error: "invalid_content_type" }, 415, origin);
        const body = await readBody(request);
        const id = normalizeId(body && body.id, true);
        const views = normalizeViews(body && body.views);
        if (!id || views === null) return json({ error: "invalid_views" }, 400, origin);
        operation = () => handlePutBody(id, views, env, origin);
      } else if (request.method === "DELETE" && isViewsPath) {
        if (!(await authorizedAdmin(request, env))) return json({ error: "unauthorized" }, 401, origin);
        if (!validAdminMutation(request, env)) return json({ error: "csrf_failed" }, 403, origin);
        if (!requireJsonContentType(request)) return json({ error: "invalid_content_type" }, 415, origin);
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
  if (id === TOTAL_SLUG) return json({ error: "site_total_is_calculated" }, 400, origin);
  const previous = await env.DB.prepare(
    "SELECT views FROM view_counts WHERE slug = ?",
  ).bind(id).first();
  const oldViews = Number(previous?.views) || 0;
  const delta = views - oldViews;
  await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO view_counts (slug, views) VALUES (?, ?) " +
        "ON CONFLICT(slug) DO UPDATE SET views = excluded.views, updated_at = CURRENT_TIMESTAMP",
    ).bind(id, views),
    env.DB.prepare(
      "INSERT INTO view_counts (slug, views) VALUES (?, ?) " +
        "ON CONFLICT(slug) DO UPDATE SET views = MAX(0, MIN(?, view_counts.views + ?)), updated_at = CURRENT_TIMESTAMP",
    ).bind(TOTAL_SLUG, 0, MAX_VIEWS, delta),
  ]);
  const data = await readCounts(env, [id]);
  return singleResponse(id, data, origin);
}

async function handleDeleteId(id, env, origin) {
  if (id === TOTAL_SLUG) return json({ error: "site_total_is_calculated" }, 400, origin);
  const previous = await env.DB.prepare(
    "SELECT views FROM view_counts WHERE slug = ?",
  ).bind(id).first();
  const oldViews = Number(previous?.views) || 0;
  await env.DB.batch([
    env.DB.prepare("DELETE FROM view_counts WHERE slug = ?").bind(id),
    env.DB.prepare(
      "UPDATE view_counts SET views = MAX(0, views - ?), updated_at = CURRENT_TIMESTAMP WHERE slug = ?",
    ).bind(oldViews, TOTAL_SLUG),
  ]);
  const data = await readCounts(env, [id]);
  return singleResponse(id, data, origin);
}
