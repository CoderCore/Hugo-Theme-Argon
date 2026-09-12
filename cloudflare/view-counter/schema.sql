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
