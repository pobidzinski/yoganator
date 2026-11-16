-- ============================================================
-- Yoganator — fix: kegel_logs.session_type was added to 005_kegel_logs.sql
-- after that migration had already been run against the live database, so
-- the column was never actually created. Every insert/select against
-- session_type has been silently failing since. This adds the missing
-- column, backfilling the one pre-existing row as 'strength' (the actual
-- session type it was run as).
-- ============================================================

ALTER TABLE kegel_logs ADD COLUMN session_type TEXT;

UPDATE kegel_logs SET session_type = 'strength' WHERE session_type IS NULL;

ALTER TABLE kegel_logs ALTER COLUMN session_type SET NOT NULL;
ALTER TABLE kegel_logs ADD CONSTRAINT kegel_logs_session_type_check CHECK (session_type IN ('strength', 'endurance'));
