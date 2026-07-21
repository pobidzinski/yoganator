-- ============================================================
-- Yoganator — Initial Schema
-- Single-user app: no auth, no RLS, no user_id columns.
-- ============================================================

CREATE TABLE poses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  image_url   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_poses_name ON poses (name);

CREATE TABLE session_plans (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_session_plans_name ON session_plans (name);

-- pose-in-plan junction, ordered, with independently configurable
-- prep (countdown before pose) and hold (duration of the pose) times
CREATE TABLE session_plan_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_plan_id UUID NOT NULL REFERENCES session_plans (id) ON DELETE CASCADE,
  pose_id         UUID NOT NULL REFERENCES poses (id)         ON DELETE RESTRICT,
  position        INTEGER NOT NULL DEFAULT 0,
  prep_seconds    INTEGER NOT NULL DEFAULT 10 CHECK (prep_seconds >= 0),
  hold_seconds    INTEGER NOT NULL DEFAULT 30 CHECK (hold_seconds > 0)
);

CREATE INDEX idx_session_plan_items_plan_id ON session_plan_items (session_plan_id);
CREATE INDEX idx_session_plan_items_pose_id ON session_plan_items (pose_id);
