-- ============================================================
-- Yoganator — Kegel trainer moved to a single 12-week PFMT protocol
-- (phases: learning → strength → function → maintenance). The alternating
-- strength/endurance session types are gone, so session_type is dropped
-- (its CHECK constraint goes with it).
--
-- From now on `level` stores the phase number (1–4) a session was run at.
-- Older rows hold the previous levels (1–6); that's harmless — the current
-- phase is derived in the app from dates (week since first session +
-- distinct training days), never from `level`.
--
-- Requires 007_kegel_logs_session_type.sql to have been run first.
-- ============================================================

ALTER TABLE kegel_logs DROP COLUMN session_type;
