import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import PoseList from './features/poses/PoseList';
import SessionPlansPage from './features/plans/SessionPlansPage';
import TrainingPage from './features/training/TrainingPage';
import RetentionPage from './features/retention/RetentionPage';
import CalendarPage from './features/calendar/CalendarPage';
import TrackersPage from './features/trackers/TrackersPage';
import KegelPage from './features/kegel/KegelPage';
import WeightPage from './features/weight/WeightPage';

function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/poses" replace />} />
        <Route path="/poses" element={<PoseList />} />
        <Route path="/plans" element={<SessionPlansPage />} />
        <Route path="/training" element={<TrainingPage />} />
        <Route path="/trackers" element={<TrackersPage />} />
        <Route path="/retention" element={<RetentionPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/kegel" element={<KegelPage />} />
        <Route path="/weight" element={<WeightPage />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
