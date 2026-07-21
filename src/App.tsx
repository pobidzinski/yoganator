import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import PoseList from './features/poses/PoseList';
import SessionPlansPage from './features/plans/SessionPlansPage';
import TrainingPage from './features/training/TrainingPage';

function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/poses" replace />} />
        <Route path="/poses" element={<PoseList />} />
        <Route path="/plans" element={<SessionPlansPage />} />
        <Route path="/training" element={<TrainingPage />} />
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
