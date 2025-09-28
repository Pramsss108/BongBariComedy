import { defineConfig, type ViteDevServer } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import fs from "fs";
import type { IncomingMessage, ServerResponse } from "http";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ command, mode }) => ({
  plugins: [
    react(),
    // Load runtime error overlay only during local development server
    ...(command === 'serve' ? [runtimeErrorOverlay()] : []),
    // Dev-only: emulate Netlify Functions for promo marquee so no Netlify CLI is required
    ...(command === 'serve' && process.env.NETLIFY !== "1"
      ? [
          {
            name: "dev-functions-mock-homepage-promo",
            configureServer(server: ViteDevServer) {
        const storeFile = path.resolve(__dirname, ".dev", "promo.json");
              const ensureFile = () => {
                try { fs.mkdirSync(path.dirname(storeFile), { recursive: true }); } catch {}
                if (!fs.existsSync(storeFile)) {
                  const initial = { enabled: true, speed: 60, items: [] as Array<{id:string;text:string;active:boolean;createdAt:string;updatedAt:string}> };
                  try { fs.writeFileSync(storeFile, JSON.stringify(initial, null, 2), "utf-8"); } catch {}
                }
              };
              const readPromo = () => {
                ensureFile();
                try { return JSON.parse(fs.readFileSync(storeFile, "utf-8")); } catch { return { enabled: true, speed: 60, items: [] }; }
              };
              const writePromo = (obj: any) => {
                ensureFile();
                try { fs.writeFileSync(storeFile, JSON.stringify(obj, null, 2), "utf-8"); } catch {}
              };

              const match = (url: string | undefined) => (url || "").startsWith("/.netlify/functions/homepage-promo");

              server.middlewares.use(async (
                req: IncomingMessage & { url?: string },
                res: ServerResponse,
                next: (err?: any) => void,
              ) => {
                if (!match(req.url)) return next();
                // CORS
                res.setHeader("Access-Control-Allow-Origin", "*");
                res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
                res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
                if (req.method === "OPTIONS") { res.statusCode = 200; return res.end(""); }

                const url = req.url || "";
                const promo = readPromo();

                const sendJSON = (obj: any, code = 200) => { res.statusCode = code; res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(obj)); };
                const sendOK = () => { res.statusCode = 200; res.setHeader("Content-Type", "text/plain"); res.end("OK"); };

                if (req.method === "GET") {
                  // Return full object in dev for admin; public callers also fine
                  return sendJSON({ enabled: !!promo.enabled, speed: Number(promo.speed) || 60, items: Array.isArray(promo.items) ? promo.items : [] });
                }

                // parse body
                let body = "";
                req.on("data", (c: any) => (body += c));
                req.on("end", () => {
                  try { body = body || "{}"; } catch {}
                  let json: any = {};
                  try { json = JSON.parse(body as string); } catch { json = {}; }

                  if (req.method === "POST") {
                    const text = String(json.text || "").trim();
                    if (!text) return sendJSON({ error: "text required" }, 400);
                    const item = { id: `${Date.now()}-${Math.random().toString(36).slice(2,7)}`, text, active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
                    const next = { ...promo, items: [item, ...(Array.isArray(promo.items) ? promo.items : [])] };
                    writePromo(next);
                    return sendJSON(item);
                  }

                  if (req.method === "PUT") {
                    if (url === "/.netlify/functions/homepage-promo") {
                      const next = { ...promo };
                      if (typeof json.enabled === "boolean") next.enabled = json.enabled;
                      if (typeof json.speed === "number") next.speed = json.speed;
                      writePromo(next);
                      return sendOK();
                    }
                    const id = url.split("/").pop();
                    const items = Array.isArray(promo.items) ? promo.items : [];
                    const idx = items.findIndex((i: any) => i.id === id);
                    if (idx < 0) return sendJSON({ error: "Not Found" }, 404);
                    const nextItems = [...items];
                    nextItems[idx] = { ...nextItems[idx], ...("text" in json ? { text: String(json.text) } : {}), ...("active" in json ? { active: !!json.active } : {}), updatedAt: new Date().toISOString() };
                    writePromo({ ...promo, items: nextItems });
                    return sendOK();
                  }

                  if (req.method === "DELETE") {
                    const id = url.split("/").pop();
                    const items = Array.isArray(promo.items) ? promo.items : [];
                    const nextItems = items.filter((i: any) => i.id !== id);
                    writePromo({ ...promo, items: nextItems });
                    return sendOK();
                  }

                  res.statusCode = 405; res.end("Method Not Allowed");
                });
              });
            },
          },
        ]
      : []),
    ...(command === 'serve' && process.env.REPL_ID !== undefined
      ? [
          // Replit cartographer should be dev-only
          // Use dynamic import promise without top-level await in factory
          (async () => (await import("@replit/vite-plugin-cartographer")).cartographer())(),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return undefined;
          // Group common heavy libs into their own chunks to keep the main entry light
          if (id.includes('/react/')) return 'react-vendor'; // catches react, react-dom
          if (id.includes('@radix-ui')) return 'radix';
          if (id.includes('framer-motion')) return 'motion';
          if (id.includes('lucide-react')) return 'icons';
          if (id.includes('recharts')) return 'recharts';
          if (id.includes('embla-carousel')) return 'embla';
          if (id.includes('react-day-picker')) return 'daypicker';
          if (id.includes('@tanstack/react-query')) return 'react-query';
          if (id.includes('wouter')) return 'wouter';
          // Fallback: let Rollup decide or merge into a generic vendor chunk
          return undefined;
        },
      },
    },
  },
  
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
    proxy: {
      '/api': {
        // If Netlify Dev is running, proxy to it (serves /.netlify/functions & redirects),
        // otherwise fall back to legacy Express dev server on :5000.
        target: process.env.NETLIFY ? 'http://localhost:8888' : 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
      // Direct calls to "/.netlify/functions/*" during dev should hit Netlify Dev (8888)
      // Vite will proxy these so the browser stays same-origin (5173 -> 5173)
      '/.netlify/functions': {
        target: 'http://localhost:8888',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path, // keep full path
      },
    },
  },
}));

// Build-test: client change to trigger workflow build
// Test: deploy from main after removing environment restrictions
