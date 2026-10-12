CREATE INDEX analysis_record ON analysis (record_id, seq);
-- Covers the run panel's counts: a whole-corpus reprocess run is ~200 k rows.
CREATE INDEX analysis_run ON analysis (run_id, analysis_status, no_call_reason);
CREATE INDEX news_item_record ON news_item (record_id, seq);
CREATE INDEX news_item_url ON news_item (source_url, collected_at);
CREATE INDEX news_item_axis ON news_item (axis, collected_at);
CREATE INDEX llm_call_file_id ON llm_call_file (call_id);
CREATE INDEX article_pick_bucket ON article_pick (axis, bucket_unit, time_bucket);

CREATE TABLE record_latest (
  record_id        TEXT PRIMARY KEY,
  record_id_lower  TEXT NOT NULL,
  seq              INTEGER NOT NULL,
  versions         INTEGER NOT NULL,
  analyzed_at      TEXT NOT NULL,
  analysis_status  TEXT NOT NULL,
  sentiment        TEXT,
  confidence       REAL NOT NULL,
  analyzer_version TEXT NOT NULL,
  run_id           TEXT NOT NULL,
  call_id          TEXT,
  no_call_reason   TEXT,
  exchange_state   TEXT NOT NULL,
  call_outcome     TEXT,
  title            TEXT,
  title_lower      TEXT,
  source_id        TEXT,
  collected_at     TEXT
);

INSERT INTO record_latest
SELECT a.record_id, go_lower(a.record_id), a.seq, a.versions, a.analyzed_at, a.analysis_status,
       a.sentiment, a.confidence, a.analyzer_version, a.run_id, a.call_id, a.no_call_reason,
       CASE
         WHEN a.no_call_reason IS NOT NULL THEN 'no-call'
         WHEN a.call_id IS NULL THEN 'unrecorded'
         WHEN c.call_id IS NULL THEN 'call-record-absent'
         ELSE 'call'
       END,
       CASE WHEN a.no_call_reason IS NULL THEN c.call_outcome END,
       n.title, n.title_lower, n.source_id, n.collected_at
FROM (
  SELECT *,
         row_number() OVER (PARTITION BY record_id ORDER BY analyzed_at DESC, seq) AS pick,
         count(*) OVER (PARTITION BY record_id) AS versions
  FROM analysis
) AS a
LEFT JOIN (
  SELECT record_id, title, title_lower, source_id, collected_at,
         row_number() OVER (PARTITION BY record_id ORDER BY collected_at DESC, seq) AS pick
  FROM news_item
) AS n ON n.record_id = a.record_id AND n.pick = 1
LEFT JOIN llm_call_file AS c ON c.call_id = a.call_id AND c.canonical = 1 AND c.decoded = 1
WHERE a.pick = 1;

-- The list walks one of these in its own order and stops at the page: every filter's column
-- leads an index, and the search's lowered texts ride along so a search reads no table rows.
CREATE INDEX record_latest_recent ON record_latest (analyzed_at DESC, record_id, record_id_lower, title_lower);
CREATE INDEX record_latest_run ON record_latest (run_id, analyzed_at DESC, record_id);
CREATE INDEX record_latest_status ON record_latest (analysis_status, analyzed_at DESC, record_id);
CREATE INDEX record_latest_outcome ON record_latest (call_outcome, analyzed_at DESC, record_id);
CREATE INDEX record_latest_no_call ON record_latest (no_call_reason, analyzed_at DESC, record_id);

-- How many distinct articles carried each body text, over every observation: an article is its
-- source URL, or its record when it has none (econ_aggregation.aggregate.article_key). An empty
-- hash is "no text kept", not a text they all share.
CREATE TABLE body_share (
  body_hash TEXT PRIMARY KEY,
  shares    INTEGER NOT NULL
) WITHOUT ROWID;

INSERT INTO body_share
SELECT body_hash, count(DISTINCT CASE WHEN source_url <> '' THEN source_url ELSE record_id END)
FROM news_item WHERE body_hash <> '' GROUP BY body_hash;

CREATE TABLE run_call (
  run_id       TEXT NOT NULL,
  call_outcome TEXT NOT NULL,
  calls        INTEGER NOT NULL,
  PRIMARY KEY (run_id, call_outcome)
) WITHOUT ROWID;

INSERT INTO run_call
SELECT run_id, call_outcome, count(*) FROM llm_call_file WHERE decoded = 1 GROUP BY run_id, call_outcome;

ANALYZE;
