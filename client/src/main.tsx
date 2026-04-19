import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App";
import "./index.css";
import "./mobile-overrides.css";

// Defer P2P tunnel — don't block first paint
if (typeof window !== 'undefined') {
  const startTunnel = () => import("./lib/tunnelClient").then(m => m.startTunnelClient());
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(startTunnel, { timeout: 5000 });
  } else {
    setTimeout(startTunnel, 3000);
  }

  // Unregister old service workers in production to avoid stale-cache white screens.
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.getRegistrations()
        .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
        .catch(() => { /* non-fatal */ });
    });
  }
}

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
