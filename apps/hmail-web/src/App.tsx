import { Navigate, Route, Routes, useParams } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { LoginPage } from "./pages/LoginPage";
import { BespokeMailShellPage } from "./pages/BespokeMailShellPage";
import { MailPage } from "./pages/MailPage";
import { CareerWorkspacePage } from "./pages/CareerWorkspacePage";
import { CareerScannerPage } from "./pages/CareerScannerPage";
import { CareerCvHubPanel } from "./components/CareerCvHubPanel";
import { CareerHistoryPanel } from "./components/CareerHistoryPanel";
import { CareerCvBuilderPanel } from "./components/CareerCvBuilderPanel";
import { CareerApplyAssistPanel } from "./components/CareerApplyAssistPanel";
import { JobHunterPanel } from "./components/JobHunterPanel";
import { AddonsPage } from "./pages/AddonsPage";
import { BusinessVerticalPage } from "./pages/BusinessVerticalPage";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="app-loading">Loading PMail+…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.businessVertical) return <BusinessVerticalPage />;
  return <>{children}</>;
}

function CareerCvLegacyRedirect() {
  const { id } = useParams<{ id?: string }>();
  return <Navigate to={id ? `/career/build/${id}` : "/career/build"} replace />;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/login/:tenantSlug" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <BespokeMailShellPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/mail/production"
        element={
          <ProtectedRoute>
            <MailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/career"
        element={
          <ProtectedRoute>
            <CareerWorkspacePage />
          </ProtectedRoute>
        }
      >
        <Route index element={<CareerCvHubPanel />} />
        <Route path="scan" element={<CareerScannerPage />} />
        <Route path="build" element={<CareerCvBuilderPanel />} />
        <Route path="build/:id" element={<CareerCvBuilderPanel />} />
        <Route path="apply" element={<CareerApplyAssistPanel />} />
        <Route path="track" element={<CareerHistoryPanel />} />
        <Route path="settings" element={<JobHunterPanel />} />
        <Route path="cv" element={<Navigate to="/career/build" replace />} />
        <Route path="cv/:id" element={<CareerCvLegacyRedirect />} />
        <Route path="scanner" element={<Navigate to="/career/scan" replace />} />
        <Route path="apply-assist" element={<Navigate to="/career/apply" replace />} />
        <Route path="job-sites" element={<Navigate to="/career/track" replace />} />
        <Route path="interview-prep" element={<Navigate to="/career/track" replace />} />
      </Route>
      <Route
        path="/addons"
        element={
          <ProtectedRoute>
            <AddonsPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
