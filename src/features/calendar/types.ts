export interface TrainingLog {
  id: string;
  session_plan_id: string | null;
  completed_at: string; // ISO timestamp
}
