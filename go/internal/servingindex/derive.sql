-- Derived tables and lookup indexes, run once the base tables are loaded.

CREATE INDEX analysis_record ON analysis (record_id, seq);
CREATE INDEX analysis_run ON analysis (run_id);
CREATE INDEX news_item_record ON news_item (record_id, seq);
CREATE INDEX news_item_url ON news_item (source_url, collected_at);
CREATE INDEX llm_call_file_id ON llm_call_file (call_id);

-- The debug list's row per record: its newest analysis (the earliest-walked of equal times)
-- beside the title of its newest collection (likewise) and what the analysis's call came to.
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

CREATE INDEX record_latest_recent ON record_latest (analyzed_at DESC, record_id);
CREATE INDEX record_latest_run ON record_latest (run_id, analyzed_at DESC, record_id);

-- Calls per run and outcome, over every llm_call file that decodes.
CREATE TABLE run_call (
  run_id       TEXT NOT NULL,
  call_outcome TEXT NOT NULL,
  calls        INTEGER NOT NULL,
  PRIMARY KEY (run_id, call_outcome)
) WITHOUT ROWID;

INSERT INTO run_call
SELECT run_id, call_outcome, count(*) FROM llm_call_file WHERE decoded = 1 GROUP BY run_id, call_outcome;

ANALYZE;
