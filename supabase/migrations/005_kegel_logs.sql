-- ============================================================
-- Yoganator — Kegel training completion log
-- One row per finished Kegel session. `level` records the difficulty level
-- (1..6) the session was run at, so progression (one level up every 3
-- completed sessions, either type) can be derived purely from COUNT(*) plus
-- this history. `session_type` records which of the two alternating session
-- types (strength: fast+long+elevator, or endurance: long submaximal holds)
-- was run, so the app can pick the opposite type for the next session.
-- ============================================================

CREATE TABLE kegel_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level        INTEGER NOT NULL,
  session_type TEXT NOT NULL CHECK (session_type IN ('strength', 'endurance')),
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_kegel_logs_completed_at ON kegel_logs (completed_at);
