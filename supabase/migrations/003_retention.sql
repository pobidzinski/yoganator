-- ============================================================
-- Yoganator — Semen Retention tracker
-- Single-user app: no auth, no RLS (consistent with 001_initial_schema.sql).
-- One row holds the timestamp of the last logged reset; edited in place
-- rather than appended, since only the current streak start matters.
-- ============================================================

CREATE TABLE retention_status (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  last_reset_at TIMESTAMPTZ NOT NULL,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
