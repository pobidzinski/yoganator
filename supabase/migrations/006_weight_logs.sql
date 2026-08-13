-- ============================================================
-- Yoganator — Daily body weight log
-- One row per calendar day. UNIQUE(date) lets the app upsert on conflict,
-- so re-logging the same day corrects it instead of creating a duplicate.
-- ============================================================

CREATE TABLE weight_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date       DATE NOT NULL UNIQUE,
  weight_kg  NUMERIC(5,2) NOT NULL CHECK (weight_kg > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_weight_logs_date ON weight_logs (date);
