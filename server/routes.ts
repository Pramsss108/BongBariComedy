import type { Express } from "express";
import { createServer, type Server } from "http";
import {
  securityHeaders,
  sanitizeBody,
  trackRequests,
  validateCSRFToken
} from "./middleware/security";
import {
  registerAuthRoutes,
  registerCommunityRoutes,
  registerAiRoutes,
  registerCmsRoutes,
  registerSystemRoutes
} from "./routes/index";

/**
 * Shared session store for the application.
 * In production, this should be moved to Redis or a database.
 */
export const sessions = new Map<string, {
  username: string;
  createdAt: Date;
  googleUser?: { email: string; name: string; picture?: string }
}>();

/**
 * Middleware: Verify if the user is authenticated via session ID.
 */
export const isAuthenticated = (req: any, res: any, next: any) => {
  const sessionId = req.headers.authorization?.replace('Bearer ', '');
  const session = sessionId ? sessions.get(sessionId) : null;

  if (!session) return res.status(401).json({ message: "Unauthorized" });

  const isExpired = Date.now() - session.createdAt.getTime() > 24 * 60 * 60 * 1000;
  if (isExpired) {
    sessions.delete(sessionId);
    return res.status(401).json({ message: "Session expired" });
  }

  req.user = session;
  req.sessionId = sessionId;
  next();
};

/**
 * Middleware: Validate CSRF tokens for state-changing requests.
 */
export const validateCSRF = (req: any, res: any, next: any) => {
  if (req.method === 'GET') return next();
  const sessionId = req.sessionId || req.headers.authorization?.replace('Bearer ', '');
  const csrfToken = req.headers['x-csrf-token'] || req.body?.csrfToken;

  if (!sessionId || !csrfToken) {
    return res.status(403).json({ message: "Missing CSRF token" });
  }

  if (!validateCSRFToken(sessionId, csrfToken)) {
    return res.status(403).json({ message: "Invalid CSRF token" });
  }

  next();
};

/**
 * Register all application routes.
 */
export async function registerRoutes(app: Express): Promise<Server> {
  // --- Infrastructure Setup ---
  interface DeviceLogEvent { ts: number; deviceId: string; ip: string | undefined; action: string; meta?: any; }
  const deviceLogs: DeviceLogEvent[] = [];
  const MAX_LOGS = 500;
  const recentPostsInMemory = new Map<string, number>();

  const upstashUrl = process.env.UPSTASH_REST_URL;
  const upstashToken = process.env.UPSTASH_REST_TOKEN;

  const upstashUtils = {
    upstashGet: async (key: string): Promise<boolean> => {
      if (!upstashUrl || !upstashToken) return false;
      try {
        const r = await fetch(`${upstashUrl}/get/${encodeURIComponent(key)}`, { headers: { Authorization: `Bearer ${upstashToken}` } });
        const j = await r.json();
        return j.result != null;
      } catch { return false; }
    },
    upstashSetEx: async (key: string, ttlSec: number): Promise<void> => {
      if (!upstashUrl || !upstashToken) return;
      try {
        await fetch(`${upstashUrl}/set/${encodeURIComponent(key)}/1?EX=${ttlSec}`, { headers: { Authorization: `Bearer ${upstashToken}` } });
      } catch { }
    }
  };

  const getDeviceIdFromReq = (req: any): string => {
    const header = (req.headers['x-device-id'] as string) || '';
    if (header) return header.slice(0, 64);
    const cookie = (req.headers.cookie || '').match(/bbc_device_id=([^;]+)/)?.[1];
    return cookie ? decodeURIComponent(cookie).slice(0, 64) : 'unknown';
  };

  const logEvent = (req: any, action: string, meta?: any) => {
    const entry: DeviceLogEvent = { ts: Date.now(), deviceId: req.deviceId, ip: req.ip, action, meta };
    deviceLogs.push(entry);
    if (deviceLogs.length > MAX_LOGS) deviceLogs.splice(0, deviceLogs.length - MAX_LOGS);
  };

  // --- Global Middleware ---
  app.use(securityHeaders);
  app.use(trackRequests);
  app.use(sanitizeBody);
  app.use((req: any, _res, next) => {
    req.deviceId = getDeviceIdFromReq(req);
    next();
  });

  // --- Modular Route Registration ---
  registerAuthRoutes(app, sessions);
  registerCommunityRoutes(app, logEvent, upstashUtils, recentPostsInMemory);
  registerAiRoutes(app, sessions, getDeviceIdFromReq);
  registerCmsRoutes(app);
  registerSystemRoutes(app);

  // --- Administrative Diagnostics ---
  app.get('/api/admin/device-logs', isAuthenticated, (req, res) => {
    res.json(deviceLogs.slice(-100));
  });

  const httpServer = createServer(app);
  return httpServer;
}
