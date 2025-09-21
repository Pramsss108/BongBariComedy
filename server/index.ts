// Load environment configuration first
import './env';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { youtubeService } from "./youtubeService";
import { trendsService } from "./trendsService";

const app = express();
// Increase payload limits for image uploads (50MB limit)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));
// Always send bodies; avoid 304-empty issues during dev
app.disable('etag');

// Minimal CORS for API
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', CORS_ORIGIN);
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

  // Graceful shutdown to prevent EADDRINUSE on fast restarts (Windows/nodemon)
  const shutdown = () => {
    try {
      server.close(() => log("HTTP server closed"));
    } catch {}
    try { youtubeService.stop(); } catch {}
    try { trendsService.stop(); } catch {}
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

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    // Do not crash the process on route errors in dev; keep server alive
    console.error('[express] route error:', err);
  });

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
          try { server.close(); } catch {}
          setTimeout(() => process.exit(0), 50);
        }
      };
      server.once('error', onError);
      try {
  server.listen(port, "0.0.0.0", () => {
          server.removeListener('error', onError);
          log(`serving on port ${port}`);
        });
      } catch (e: any) {
        onError(e);
      }
    };
    attempt();
  };

  listenWithRetry();

})();
