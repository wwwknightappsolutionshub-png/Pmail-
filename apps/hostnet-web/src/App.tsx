import { lazy, Suspense, type ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { MarketingThemeProvider } from "./hooks/useMarketingTheme";
import { RouteSeo } from "./components/RouteSeo";

const LandingPage = lazy(() => import("./pages/LandingPage").then((m) => ({ default: m.LandingPage })));
const UseCasePage = lazy(() => import("./pages/UseCasePage").then((m) => ({ default: m.UseCasePage })));
const UseCaseDemoPage = lazy(() => import("./pages/UseCaseDemoPage").then((m) => ({ default: m.UseCaseDemoPage })));
const MarketingAddonsPage = lazy(() =>
  import("./pages/MarketingAddonsPage").then((m) => ({ default: m.MarketingAddonsPage })),
);
const MarketingAddonDetailPage = lazy(() =>
  import("./pages/MarketingAddonDetailPage").then((m) => ({ default: m.MarketingAddonDetailPage })),
);
const HostingPlansPage = lazy(() =>
  import("./pages/HostingPlansPage").then((m) => ({ default: m.HostingPlansPage })),
);
const HostingPlanDetailPage = lazy(() =>
  import("./pages/HostingPlanDetailPage").then((m) => ({ default: m.HostingPlanDetailPage })),
);
const AdminLoginPage = lazy(() => import("./pages/admin/AdminLoginPage").then((m) => ({ default: m.AdminLoginPage })));
const AdminDashboardPage = lazy(() =>
  import("./pages/admin/AdminDashboardPage").then((m) => ({ default: m.AdminDashboardPage })),
);
const PanelLoginPage = lazy(() => import("./pages/panel/PanelLoginPage").then((m) => ({ default: m.PanelLoginPage })));
const PanelDashboardPage = lazy(() =>
  import("./pages/panel/PanelDashboardPage").then((m) => ({ default: m.PanelDashboardPage })),
);
const CheckoutSuccessPage = lazy(() =>
  import("./pages/CheckoutPages").then((m) => ({ default: m.CheckoutSuccessPage })),
);
const CheckoutCancelPage = lazy(() =>
  import("./pages/CheckoutPages").then((m) => ({ default: m.CheckoutCancelPage })),
);
const CheckoutMockPage = lazy(() => import("./pages/CheckoutPages").then((m) => ({ default: m.CheckoutMockPage })));
const GrowthLayout = lazy(() => import("./pages/growth/GrowthLayout").then((m) => ({ default: m.GrowthLayout })));
const GrowthOnboardingPage = lazy(() =>
  import("./pages/growth/GrowthOnboardingPage").then((m) => ({ default: m.GrowthOnboardingPage })),
);
const GrowthDashboardPage = lazy(() =>
  import("./pages/growth/GrowthDashboardPage").then((m) => ({ default: m.GrowthDashboardPage })),
);
const GrowthStudioPage = lazy(() =>
  import("./pages/growth/GrowthStudioPage").then((m) => ({ default: m.GrowthStudioPage })),
);
const GrowthPipelinePage = lazy(() =>
  import("./pages/growth/GrowthPipelinePage").then((m) => ({ default: m.GrowthPipelinePage })),
);
const GrowthChatbotPage = lazy(() =>
  import("./pages/growth/GrowthChatbotPage").then((m) => ({ default: m.GrowthChatbotPage })),
);
const GrowthAnalyticsPage = lazy(() =>
  import("./pages/growth/GrowthAnalyticsPage").then((m) => ({ default: m.GrowthAnalyticsPage })),
);
const GrowthAutomationsPage = lazy(() =>
  import("./pages/growth/GrowthAutomationsPage").then((m) => ({ default: m.GrowthAutomationsPage })),
);
const GrowthSettingsPage = lazy(() =>
  import("./pages/growth/GrowthSettingsPage").then((m) => ({ default: m.GrowthSettingsPage })),
);
const GrowthOptimizationPage = lazy(() =>
  import("./pages/growth/GrowthOptimizationPage").then((m) => ({ default: m.GrowthOptimizationPage })),
);
const GrowthChannelsPage = lazy(() =>
  import("./pages/growth/GrowthChannelsPage").then((m) => ({ default: m.GrowthChannelsPage })),
);
const GrowthAdsSeoPage = lazy(() =>
  import("./pages/growth/GrowthAdsSeoPage").then((m) => ({ default: m.GrowthAdsSeoPage })),
);

function RouteFallback() {
  return (
    <div
      style={{
        minHeight: "40dvh",
        display: "grid",
        placeItems: "center",
        padding: "1.5rem",
        color: "var(--text, #334155)",
      }}
      role="status"
      aria-live="polite"
    >
      Loading…
    </div>
  );
}

function LazyRoute({ children }: { children: ReactNode }) {
  return <Suspense fallback={<RouteFallback />}>{children}</Suspense>;
}

export function App() {
  return (
    <MarketingThemeProvider>
      <RouteSeo />
      <Routes>
        <Route
          path="/"
          element={
            <LazyRoute>
              <LandingPage />
            </LazyRoute>
          }
        />
        <Route
          path="/use-case"
          element={
            <LazyRoute>
              <UseCasePage />
            </LazyRoute>
          }
        />
        <Route
          path="/use-case/demo/:useCaseId"
          element={
            <LazyRoute>
              <UseCaseDemoPage />
            </LazyRoute>
          }
        />
        <Route
          path="/hosting"
          element={
            <LazyRoute>
              <HostingPlansPage />
            </LazyRoute>
          }
        />
        <Route
          path="/hosting/:slug"
          element={
            <LazyRoute>
              <HostingPlanDetailPage />
            </LazyRoute>
          }
        />
        <Route
          path="/addons"
          element={
            <LazyRoute>
              <MarketingAddonsPage />
            </LazyRoute>
          }
        />
        <Route
          path="/addons/:slug"
          element={
            <LazyRoute>
              <MarketingAddonDetailPage />
            </LazyRoute>
          }
        />
        <Route
          path="/checkout/success"
          element={
            <LazyRoute>
              <CheckoutSuccessPage />
            </LazyRoute>
          }
        />
        <Route
          path="/checkout/cancel"
          element={
            <LazyRoute>
              <CheckoutCancelPage />
            </LazyRoute>
          }
        />
        <Route
          path="/checkout/mock"
          element={
            <LazyRoute>
              <CheckoutMockPage />
            </LazyRoute>
          }
        />
        <Route
          path="/panel/login"
          element={
            <LazyRoute>
              <PanelLoginPage />
            </LazyRoute>
          }
        />
        <Route
          path="/panel"
          element={
            <LazyRoute>
              <PanelDashboardPage />
            </LazyRoute>
          }
        />
        <Route
          path="/growth"
          element={
            <LazyRoute>
              <GrowthLayout />
            </LazyRoute>
          }
        >
          <Route index element={<LazyRoute><GrowthDashboardPage /></LazyRoute>} />
          <Route path="onboarding" element={<LazyRoute><GrowthOnboardingPage /></LazyRoute>} />
          <Route path="dashboard" element={<LazyRoute><GrowthDashboardPage /></LazyRoute>} />
          <Route path="studio" element={<LazyRoute><GrowthStudioPage /></LazyRoute>} />
          <Route path="pipeline" element={<LazyRoute><GrowthPipelinePage /></LazyRoute>} />
          <Route path="chatbot" element={<LazyRoute><GrowthChatbotPage /></LazyRoute>} />
          <Route path="analytics" element={<LazyRoute><GrowthAnalyticsPage /></LazyRoute>} />
          <Route path="automations" element={<LazyRoute><GrowthAutomationsPage /></LazyRoute>} />
          <Route path="optimization" element={<LazyRoute><GrowthOptimizationPage /></LazyRoute>} />
          <Route path="channels" element={<LazyRoute><GrowthChannelsPage /></LazyRoute>} />
          <Route path="ads-seo" element={<LazyRoute><GrowthAdsSeoPage /></LazyRoute>} />
          <Route path="settings" element={<LazyRoute><GrowthSettingsPage /></LazyRoute>} />
        </Route>
        <Route
          path="/admin/login"
          element={
            <LazyRoute>
              <AdminLoginPage />
            </LazyRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <LazyRoute>
              <AdminDashboardPage />
            </LazyRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </MarketingThemeProvider>
  );
}
