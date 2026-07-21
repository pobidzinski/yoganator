import type { Pose } from '../poses/types';

export interface SessionPlanItem {
  id: string;
  session_plan_id: string;
  pose_id: string;
  position: number;
  prep_seconds: number;
  hold_seconds: number;
  pose: Pose;
}

export interface SessionPlan {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  session_plan_items: SessionPlanItem[];
}
