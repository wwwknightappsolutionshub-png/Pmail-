import { Navigate, Route, Routes } from "react-router-dom";
import { MarketingThemeProvider } from "./hooks/useMarketingTheme";
import { LandingPage } from "./pages/LandingPage";
import { UseCasePage } from "./pages/UseCasePage";
import { UseCaseDemoPage } from "./pages/UseCaseDemoPage";
import { AdminLoginPage } from "./pages/admin/AdminLoginPage";
import { AdminDashboardPage } from "./pages/admin/AdminDashboardPage";
import { PanelLoginPage } from "./pages/panel/PanelLoginPage";
import { PanelDashboardPage } from "./pages/panel/PanelDashboardPage";
import { CheckoutCancelPage, CheckoutMockPage, CheckoutSuccessPage } from "./pages/CheckoutPages";
import { GrowthLayout } from "./pages/growth/GrowthLayout";
import { GrowthOnboardingPage } from "./pages/growth/GrowthOnboardingPage";
import { GrowthDashboardPage } from "./pages/growth/GrowthDashboardPage";
import { GrowthStudioPage } from "./pages/growth/GrowthStudioPage";
import { GrowthPipelinePage } from "./pages/growth/GrowthPipelinePage";
import { GrowthChatbotPage } from "./pages/growth/GrowthChatbotPage";
import { GrowthAnalyticsPage } from "./pages/growth/GrowthAnalyticsPage";
import { GrowthAutomationsPage } from "./pages/growth/GrowthAutomationsPage";
import { GrowthSettingsPage } from "./pages/growth/GrowthSettingsPage";
import { GrowthOptimizationPage } from "./pages/growth/GrowthOptimizationPage";
import { GrowthChannelsPage } from "./pages/growth/GrowthChannelsPage";
import { GrowthAdsSeoPage } from "./pages/growth/GrowthAdsSeoPage";

export function App() {
  return (
    <MarketingThemeProvider>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/use-case" element={<UseCasePage />} />
        <Route path="/use-case/demo/:useCaseId" element={<UseCaseDemoPage />} />
        <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
        <Route path="/checkout/cancel" element={<CheckoutCancelPage />} />
        <Route path="/checkout/mock" element={<CheckoutMockPage />} />
        <Route path="/panel/login" element={<PanelLoginPage />} />
        <Route path="/panel" element={<PanelDashboardPage />} />
        <Route path="/growth" element={<GrowthLayout />}>
          <Route index element={<GrowthDashboardPage />} />
          <Route path="onboarding" element={<GrowthOnboardingPage />} />
          <Route path="dashboard" element={<GrowthDashboardPage />} />
          <Route path="studio" element={<GrowthStudioPage />} />
          <Route path="pipeline" element={<GrowthPipelinePage />} />
          <Route path="chatbot" element={<GrowthChatbotPage />} />
          <Route path="analytics" element={<GrowthAnalyticsPage />} />
          <Route path="automations" element={<GrowthAutomationsPage />} />
          <Route path="optimization" element={<GrowthOptimizationPage />} />
          <Route path="channels" element={<GrowthChannelsPage />} />
          <Route path="ads-seo" element={<GrowthAdsSeoPage />} />
          <Route path="settings" element={<GrowthSettingsPage />} />
        </Route>
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin" element={<AdminDashboardPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </MarketingThemeProvider>
  );
}