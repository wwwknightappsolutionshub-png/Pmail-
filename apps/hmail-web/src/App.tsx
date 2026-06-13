import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { LoginPage } from "./pages/LoginPage";
import { MailPage } from "./pages/MailPage";
import { AddonsPage } from "./pages/AddonsPage";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="app-loading">Loading PMail+…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
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
            <MailPage />
          </ProtectedRoute>
        }
      />
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
