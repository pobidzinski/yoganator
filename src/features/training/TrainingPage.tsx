import TrainingSelectScreen from './TrainingSelectScreen';
import TrainingRunnerScreen from './TrainingRunnerScreen';
import { useTrainingStore } from './trainingStore';

export default function TrainingPage() {
  const planId = useTrainingStore((s) => s.planId);

  if (planId) return <TrainingRunnerScreen />;
  return <TrainingSelectScreen />;
}
