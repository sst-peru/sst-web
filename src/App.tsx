import { Route, Routes } from "react-router-dom";

import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./features/auth/LoginPage";
import DashboardPage from "./features/dashboard/DashboardPage";
import ExperimentPage from "./features/dashboard/ExperimentPage";
import IpercPage from "./features/iperc/IpercPage";
import InspectionsPage from "./features/reports/InspectionsPage";
import ReportDetailPage from "./features/reports/ReportDetailPage";
import ReportsPage from "./features/reports/ReportsPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/reportes" element={<ReportsPage />} />
        <Route path="/reportes/:id" element={<ReportDetailPage />} />
        <Route path="/iperc" element={<IpercPage />} />
        <Route path="/inspecciones" element={<InspectionsPage />} />
        <Route path="/experimento" element={<ExperimentPage />} />
      </Route>
    </Routes>
  );
}
