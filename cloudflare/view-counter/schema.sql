CREATE TABLE IF NOT EXISTS view_counts (
  slug TEXT PRIMARY KEY,
  views INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_view_counts_updated_at
  ON view_counts(updated_at);

-- The reserved row stores the site-wide total in this same table.
-- INSERT OR IGNORE preserves an existing total and seeds older databases from
-- their article counts the first time the new schema is applied.
INSERT OR IGNORE INTO view_counts (slug, views)
  VALUES ('__site_total__', COALESCE((SELECT SUM(views) FROM view_counts WHERE slug <> '__site_total__'), 0));

CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_path TEXT NOT NULL,
  parent_id INTEGER,
  author_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  github_id TEXT,
  updated_at TEXT,
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_comments_post_created
  ON comments(post_path, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_comments_parent
  ON comments(parent_id);

CREATE INDEX IF NOT EXISTS idx_comments_github_post
  ON comments(github_id, post_path, id);

CREATE INDEX IF NOT EXISTS idx_comments_admin_created
  ON comments(deleted_at, created_at DESC, id DESC);

-- One immutable upvote per authenticated GitHub user or anonymous browser.
CREATE TABLE IF NOT EXISTS comment_votes (
  comment_id INTEGER NOT NULL,
  voter_key TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (comment_id, voter_key)
);

CREATE INDEX IF NOT EXISTS idx_comment_votes_comment
  ON comment_votes(comment_id);

-- GitHub identity is the only supported login provider.
CREATE TABLE IF NOT EXISTS auth_users (
  github_id TEXT PRIMARY KEY,
  login TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  profile_url TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Store only a hash of the browser session token.
CREATE TABLE IF NOT EXISTS auth_sessions (
  token_hash TEXT PRIMARY KEY,
  github_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires
  ON auth_sessions(expires_at);

-- Short-lived OAuth state and PKCE verifier; callback deletes the row.
CREATE TABLE IF NOT EXISTS oauth_states (
  state_hash TEXT PRIMARY KEY,
  code_verifier TEXT NOT NULL,
  return_to TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_oauth_states_expires
  ON oauth_states(expires_at);
