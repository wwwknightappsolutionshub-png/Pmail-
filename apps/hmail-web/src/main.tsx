import "./global.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { AuthProvider } from "./context/AuthContext";
import { AddonProvider } from "./context/AddonContext";
import { PwaShell } from "./components/PwaShell";
import { initPwaRegistration } from "./pwaRegistration";

declare global {
  interface Window {
    __PMail_BOOTED__?: boolean;
  }
}

function showBootFailure(message: string) {
  const root = document.getElementById("root");
  if (!root) return;
  root.innerHTML = `
    <div style="min-height:100dvh;display:grid;place-items:center;padding:1.5rem;background:#050a12;color:#e2e8f0;font-family:system-ui,sans-serif;text-align:center">
      <div style="max-width:22rem">
        <div style="font-size:1.35rem;font-weight:600;color:#f8fafc;margin-bottom:0.5rem">PMail+</div>
        <p style="margin:0 0 1rem;font-size:0.92rem;line-height:1.5;color:#94a3b8">${message}</p>
        <button type="button" onclick="location.reload()" style="border:1px solid #475569;background:#0f172a;color:#f8fafc;border-radius:8px;padding:0.55rem 1rem;font-weight:600;cursor:pointer">
          Reload
        </button>
      </div>
    </div>
  `;
}

async function prepareBoot() {
  if (import.meta.env.DEV && "serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  }

  if (import.meta.env.PROD) {
    initPwaRegistration();
  }
}

void prepareBoot()
  .then(() => {
    const mount = document.getElementById("root");
    if (!mount) {
      throw new Error("Root element not found.");
    }

    window.__PMail_BOOTED__ = true;
    createRoot(mount).render(
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
  })
  .catch((error: unknown) => {
    const message =
      error instanceof Error
        ? error.message
        : "The app could not start. Clear site data for this URL, then reload.";
    showBootFailure(message);
  });
