import { lazy, Suspense, type ReactNode } from "react";
import { Navigate, Route, Routes, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { LoginPage } from "./pages/LoginPage";
import { PmailLoadingScreen } from "./components/PmailLoadingScreen";
import { RouteLoadingFallback } from "./components/RouteLoadingFallback";

const WelcomePage = lazy(() => import("./pages/WelcomePage").then((m) => ({ default: m.WelcomePage })));
const BespokeMailShellPage = lazy(() =>
  import("./pages/BespokeMailShellPage").then((m) => ({ default: m.BespokeMailShellPage })),
);
const MailPage = lazy(() => import("./pages/MailPage").then((m) => ({ default: m.MailPage })));
const CareerWorkspacePage = lazy(() =>
  import("./pages/CareerWorkspacePage").then((m) => ({ default: m.CareerWorkspacePage })),
);
const CareerScannerPage = lazy(() =>
  import("./pages/CareerScannerPage").then((m) => ({ default: m.CareerScannerPage })),
);
const CareerCvHubPanel = lazy(() =>
  import("./components/CareerCvHubPanel").then((m) => ({ default: m.CareerCvHubPanel })),
);
const CareerHistoryPanel = lazy(() =>
  import("./components/CareerHistoryPanel").then((m) => ({ default: m.CareerHistoryPanel })),
);
const CareerCvBuilderPanel = lazy(() =>
  import("./components/CareerCvBuilderPanel").then((m) => ({ default: m.CareerCvBuilderPanel })),
);
const CareerApplyAssistPanel = lazy(() =>
  import("./components/CareerApplyAssistPanel").then((m) => ({ default: m.CareerApplyAssistPanel })),
);
const JobHunterPanel = lazy(() => import("./components/JobHunterPanel").then((m) => ({ default: m.JobHunterPanel })));
const AddonsPage = lazy(() => import("./pages/AddonsPage").then((m) => ({ default: m.AddonsPage })));
const BusinessVerticalPage = lazy(() =>
  import("./pages/BusinessVerticalPage").then((m) => ({ default: m.BusinessVerticalPage })),
);

function AuthenticatedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <PmailLoadingScreen subtitle="Signing you in…" />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <PmailLoadingScreen subtitle="Signing you in…" />;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.businessVertical) {
    return (
      <Suspense fallback={<RouteLoadingFallback subtitle="Loading workspace setup…" />}>
        <BusinessVerticalPage />
      </Suspense>
    );
  }
  return <>{children}</>;
}

function LazyRoute({ children, subtitle = "Loading…" }: { children: ReactNode; subtitle?: string }) {
  return <Suspense fallback={<RouteLoadingFallback subtitle={subtitle} />}>{children}</Suspense>;
}

function CareerCvLegacyRedirect() {
  const { id } = useParams<{ id?: string }>();
  return <Navigate to={id ? `/career/build/${id}` : "/career/build"} replace />;
}

function DiscoverRedirect() {
  const { tenantSlug } = useParams<{ tenantSlug?: string }>();
  const [searchParams] = useSearchParams();
  const query = searchParams.toString();
  const target = tenantSlug ? `/welcome/${tenantSlug}` : "/welcome";
  return <Navigate to={query ? `${target}?${query}` : target} replace />;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/login/:tenantSlug" element={<LoginPage />} />
      <Route
        path="/welcome"
        element={
          <LazyRoute subtitle="Loading welcome…">
            <WelcomePage />
          </LazyRoute>
        }
      />
      <Route
        path="/welcome/:tenantSlug"
        element={
          <LazyRoute subtitle="Loading welcome…">
            <WelcomePage />
          </LazyRoute>
        }
      />
      <Route path="/discover" element={<DiscoverRedirect />} />
      <Route path="/discover/:tenantSlug" element={<DiscoverRedirect />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <LazyRoute subtitle="Loading PMail+…">
              <BespokeMailShellPage />
            </LazyRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/mail/production"
        element={
          <ProtectedRoute>
            <LazyRoute subtitle="Loading mail…">
              <MailPage />
            </LazyRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/career"
        element={
          <ProtectedRoute>
            <LazyRoute subtitle="Loading career workspace…">
              <CareerWorkspacePage />
            </LazyRoute>
          </ProtectedRoute>
        }
      >
        <Route
          index
          element={
            <LazyRoute subtitle="Loading CV hub…">
              <CareerCvHubPanel />
            </LazyRoute>
          }
        />
        <Route
          path="scan"
          element={
            <LazyRoute subtitle="Loading scanner…">
              <CareerScannerPage />
            </LazyRoute>
          }
        />
        <Route
          path="build"
          element={
            <LazyRoute subtitle="Loading CV builder…">
              <CareerCvBuilderPanel />
            </LazyRoute>
          }
        />
        <Route
          path="build/:id"
          element={
            <LazyRoute subtitle="Loading CV builder…">
              <CareerCvBuilderPanel />
            </LazyRoute>
          }
        />
        <Route
          path="apply"
          element={
            <LazyRoute subtitle="Loading apply assist…">
              <CareerApplyAssistPanel />
            </LazyRoute>
          }
        />
        <Route
          path="track"
          element={
            <LazyRoute subtitle="Loading history…">
              <CareerHistoryPanel />
            </LazyRoute>
          }
        />
        <Route
          path="settings"
          element={
            <LazyRoute subtitle="Loading settings…">
              <JobHunterPanel />
            </LazyRoute>
          }
        />
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
          <AuthenticatedRoute>
            <LazyRoute subtitle="Loading add-ons…">
              <AddonsPage />
            </LazyRoute>
          </AuthenticatedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
