import "./global.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { AuthProvider } from "./context/AuthContext";
import { AddonProvider } from "./context/AddonContext";
import { PwaShell } from "./components/PwaShell";
import { initPwaRegistration } from "./pwaRegistration";

initPwaRegistration();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AddonProvider>
          <PwaShell>
            <App />
          </PwaShell>
        </AddonProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
