import { Navigate, Route, Routes } from "react-router-dom";
import { LandingPage } from "./pages/LandingPage";
import { AdminLoginPage } from "./pages/admin/AdminLoginPage";
import { AdminDashboardPage } from "./pages/admin/AdminDashboardPage";
import { PanelLoginPage } from "./pages/panel/PanelLoginPage";
import { PanelDashboardPage } from "./pages/panel/PanelDashboardPage";
import { CheckoutCancelPage, CheckoutMockPage, CheckoutSuccessPage } from "./pages/CheckoutPages";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
      <Route path="/checkout/cancel" element={<CheckoutCancelPage />} />
      <Route path="/checkout/mock" element={<CheckoutMockPage />} />
      <Route path="/panel/login" element={<PanelLoginPage />} />
      <Route path="/panel" element={<PanelDashboardPage />} />
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/admin" element={<AdminDashboardPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}