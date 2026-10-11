-- Base tables: the lake's rows as the serving readers walk them. `seq` is the walk order
-- (store.EachAnalysis / store.EachNewsItem), which decides every "first of equal times" a
-- screen shows, so a query breaks ties on seq exactly where a scan kept the earlier row.
-- List-valued fields are JSON text.

CREATE TABLE meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
) WITHOUT ROWID;

CREATE TABLE analysis (
  seq                INTEGER PRIMARY KEY,
  record_id          TEXT NOT NULL,
  source_url         TEXT NOT NULL,
  target_countries   TEXT NOT NULL,
  narrative_subjects TEXT NOT NULL,
  subject_categories TEXT,
  sentiment          TEXT,
  analysis_status    TEXT NOT NULL,
  confidence         REAL NOT NULL,
  analyzed_at        TEXT NOT NULL,
  analyzer_version   TEXT NOT NULL,
  run_id             TEXT NOT NULL,
  call_id            TEXT,
  no_call_reason     TEXT
);

CREATE TABLE news_item (
  seq              INTEGER PRIMARY KEY,
  record_id        TEXT NOT NULL,
  source_id        TEXT NOT NULL,
  axis             TEXT NOT NULL,
  rank             INTEGER NOT NULL,
  view_count       INTEGER NOT NULL,
  title            TEXT NOT NULL,
  title_lower      TEXT NOT NULL,
  source_url       TEXT NOT NULL,
  body_hash        TEXT NOT NULL,
  body_available   INTEGER NOT NULL,
  collected_at     TEXT NOT NULL,
  collection_cycle TEXT NOT NULL
);

-- One row per llm_call object file, keyed by its path under silver/llm_call. Files are written
-- once, so a build copies the previous index's rows for files still listed and reads only new
-- ones. A file that does not decode keeps a row with decoded = 0 and is never read again.
-- `canonical` marks the file a call_id lookup opens (store.Lake.LlmCall); only those answer a join.
CREATE TABLE llm_call_file (
  path         TEXT PRIMARY KEY,
  call_id      TEXT NOT NULL,
  canonical    INTEGER NOT NULL,
  decoded      INTEGER NOT NULL,
  run_id       TEXT,
  call_outcome TEXT
) WITHOUT ROWID;
