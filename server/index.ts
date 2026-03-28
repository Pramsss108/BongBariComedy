// Load environment configuration first (Reload trigger for .env changes)
import './env';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import cron from "node-cron";
import { ProxyScraper } from "./proxyScraperService";
import { ProxyKitchen } from "./proxyService";
import { startRustVerifier, stopRustVerifier } from "./rustVerifier";
import { youtubeService } from "./youtubeService";
import { trendsService } from "./trendsService";

const app = express();
// Increase payload limits for image uploads (50MB limit)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));
// Always send bodies; avoid 304-empty issues during dev
app.disable('etag');

// Minimal CORS for API - Allow production domains
const allowedOrigins = [
  'http://localhost:5173',              // Development
  'https://www.bongbari.com',           // Production domain
  'https://bongbari.com',               // Domain without www
  'https://pramsss108.github.io'        // GitHub Pages fallback
];

const CORS_ORIGIN = process.env.NODE_ENV === 'production' ? allowedOrigins : '*';
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (Array.isArray(CORS_ORIGIN)) {
    if (origin && CORS_ORIGIN.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
    }
  } else {
    res.header('Access-Control-Allow-Origin', CORS_ORIGIN);
  }
  res.header('Vary', 'Origin');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-CSRF-Token');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Root health endpoint (must be before static fallbacks)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

(async () => {
  const server = await registerRoutes(app);

  // Strict 404 JSON response for any unmet API routes to explicitly prevent React HTML fallback
  app.use('/api', (req, res) => {
    res.status(404).json({ message: "API endpoint not found", path: req.path });
  });

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message, details: err?.message });
    console.error('[express] route error:', err);
  });

  // Graceful shutdown to prevent EADDRINUSE on fast restarts (Windows/nodemon)
  const shutdown = () => {
    try {
      server.close(() => log("HTTP server closed"));
    } catch { }
    try { youtubeService.stop(); } catch { }
    try { trendsService.stop(); } catch { }
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
  process.once('SIGUSR2', shutdown as any); // nodemon on Windows

  // Start background YouTube fetcher if configured
  const channelId = process.env.YOUTUBE_CHANNEL_ID;
  if (channelId) {
    youtubeService.start(channelId);
    log(`YouTube background fetcher running for ${channelId}`);
  } else {
    log('YOUTUBE_CHANNEL_ID not set; YouTube sections will be empty.');
  }

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);

  // Retry listen if port is momentarily busy (previous process releasing)
  const listenWithRetry = (retries = 8, delayMs = 700) => {
    let attempts = 0;
    const attempt = () => {
      attempts++;
      const onError = (err: any) => {
        if (err && err.code === 'EADDRINUSE' && attempts < retries) {
          log(`port ${port} busy, retrying in ${delayMs}ms…`);
          setTimeout(() => {
            server.removeListener('error', onError);
            attempt();
          }, delayMs);
        } else {
          console.error('[express] listen error:', err);
          // Prevent endless loops during dev restarts: if we cannot bind after retries,
          // exit gracefully so the first instance can continue serving.
          try { server.close(); } catch { }
          setTimeout(() => process.exit(0), 50);
        }
      };
      server.once('error', onError);
      try {
        server.listen(port, "0.0.0.0", () => {
          server.removeListener('error', onError);
          log(`serving on port ${port}`);

          // Initialize Red Team Proxy Hunter (Phase 1 & 2)
          // Startup: immediate hunt, then every 3 hours continuously
          // Daily 3AM: full re-validation sweep to purge dead proxies
          log('Initializing Red Team Proxy Hunter Auto-Scheduler...');

          // Phase 17: Boot Rust turbo-verifier sidecar (500+ concurrent tasks)
          startRustVerifier();
          process.on('exit',    () => stopRustVerifier());
          process.on('SIGTERM', () => stopRustVerifier());
          process.on('SIGINT',  () => stopRustVerifier());

          // Set next hunt time on schedule so UI can show it
          const setNextHunt = () => {
            const next = new Date(Date.now() + 2 * 60 * 60 * 1000);
            ProxyScraper.nextHuntAt = next;
            ProxyScraper.huntDetails.nextHuntAt = next.toISOString();
          };
          const setNextReval = () => {
            ProxyScraper.nextRevalAt = new Date(Date.now() + 30 * 60_000);
          };

          // Immediate startup: initialize counters + geo-enrich existing + hunt
          setNextHunt();
          setNextReval();
          // Initialize counters from existing storage (survives restart)
          // Batch geo-enrich any proxies with missing country/tier data
          // Delay initial hunt by 20s to ensure Rust verifier is ready
          (async () => {
            await ProxyScraper.initFromStorage();
            await ProxyScraper.enrichExistingProxies();
            await new Promise(r => setTimeout(r, 20_000));
            ProxyScraper.runHunt();
          })();

          // Every 2 hours — continuous mining (+ auto-chains verify after each hunt)
          cron.schedule('0 */2 * * *', () => {
            log('Initiating Scheduled Red Team Proxy Hunt (2h cycle)...');
            setNextHunt();
            ProxyScraper.runHunt();
          });

          // Daily 3AM — full re-validate entire pool, purge dead proxies
          cron.schedule('0 3 * * *', () => {
            log('Initiating Daily Re-Validation Sweep (3AM full pass)...');
            ProxyScraper.runRevalidation();
          });

          // Phase 14: Every 30 min — tiered revalidation + drain pending verify queue
          cron.schedule('*/30 * * * *', () => {
            log('Initiating Tiered Re-Validation Pass (30m cycle)...');
            setNextReval();
            ProxyScraper.runRevalidation();
            // Also drain any pending raw candidates accumulated by hunt or beast_harvest
            ProxyScraper.runVerifyQueue();
          });

          // Phase 30: Every 12 hours — purge expired BIN entries (>24h old)
          cron.schedule('0 */12 * * *', async () => {
            log('Initiating BIN purge (removing entries >24h old)...');
            const result = await ProxyKitchen.purgeBinExpired(24);
            log(`BIN purge complete — ${result.purged} expired entries removed`);
          });

          // Daily 6AM — auto-audit all OSINT sources (probe, heal, report dead)
          cron.schedule('0 6 * * *', async () => {
            log('Initiating Daily Source Health Audit...');
            await ProxyScraper.auditSourceHealth();
          });
        });
      } catch (e: any) {
        onError(e);
      }
    };
    attempt();
  };

  listenWithRetry();

})();
// Triggering reload to pick up GROQ_API_KEY from .env
