-- ============================================================
-- Yoganator — Training completion log (for the calendar view)
-- One row per finished training run. session_plan_id is SET NULL on plan
-- deletion (unlike poses' ON DELETE RESTRICT) — history should survive
-- deleting an old plan, since the calendar only cares that a day was
-- practiced, not which plan was used.
-- ============================================================

CREATE TABLE training_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_plan_id UUID REFERENCES session_plans (id) ON DELETE SET NULL,
  completed_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_training_logs_completed_at ON training_logs (completed_at);
