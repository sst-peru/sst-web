import { Navigate, Route, Routes } from "react-router-dom";

import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./features/auth/AuthContext";
import LoginPage from "./features/auth/LoginPage";
import RegisterPage from "./features/auth/RegisterPage";
import CommitteePage from "./features/committee/CommitteePage";
import DashboardPage from "./features/dashboard/DashboardPage";
import ExperimentPage from "./features/dashboard/ExperimentPage";
import EppPage from "./features/epp/EppPage";
import InspectionsPage from "./features/inspections/InspectionsPage";
import LandingPage from "./features/landing/LandingPage";
import IpercPage from "./features/iperc/IpercPage";
import NewReportPage from "./features/reports/NewReportPage";
import ReportDetailPage from "./features/reports/ReportDetailPage";
import ReportsPage from "./features/reports/ReportsPage";
import UsersPage from "./features/users/UsersPage";
import type { ReactNode } from "react";

/** Solo managers. Un operario que llegue por URL va a sus reportes, no a un 403. */
function ManagerRoute({ children }: { children: ReactNode }) {
  const { canManage } = useAuth();
  return canManage ? <>{children}</> : <Navigate to="/reportes" replace />;
}

/** El tablero es para managers; el operario arranca en sus reportes. */
function Inicio() {
  const { canManage } = useAuth();
  return canManage ? <DashboardPage /> : <Navigate to="/reportes" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/inicio" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/registro" element={<RegisterPage />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Inicio />} />
        <Route path="/reportes" element={<ReportsPage />} />
        <Route path="/reportes/nuevo" element={<NewReportPage />} />
        <Route path="/reportes/:id" element={<ReportDetailPage />} />
        <Route path="/iperc" element={<IpercPage />} />
        <Route path="/inspecciones" element={<InspectionsPage />} />
        <Route path="/epp" element={<EppPage />} />
        <Route path="/comite" element={<CommitteePage />} />
        <Route
          path="/experimento"
          element={
            <ManagerRoute>
              <ExperimentPage />
            </ManagerRoute>
          }
        />
        <Route
          path="/usuarios"
          element={
            <ManagerRoute>
              <UsersPage />
            </ManagerRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
