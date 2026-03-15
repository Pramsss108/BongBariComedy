import type { Express } from "express";
import { createServer, type Server } from "http";
import admin from 'firebase-admin';
import './middleware/firebaseAuth'; // Ensure Firebase Admin is initialized
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
  registerHumanizerRoutes,
  registerCmsRoutes,
  registerSystemRoutes,
  registerDebugRoutes,
  registerDownloaderRoutes
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
export const isAuthenticated = async (req: any, res: any, next: any) => {
  let sessionId = req.headers.authorization?.replace('Bearer ', '');
  
  // Phase 15: Allow sessionId in query param for direct download/stream links
  // (Browser navigations cannot set custom headers)
  if (!sessionId && req.query.sessionId) {
    sessionId = String(req.query.sessionId);
  }

  let session: any = sessionId ? sessions.get(sessionId) : null;

  // If simple session check fails, try verifying as Firebase ID Token
  if (!session && sessionId) {
    try {
      // Only proceed if Firebase Admin is initialized
      if (admin.apps.length > 0) {
        const decodedToken = await admin.auth().verifyIdToken(sessionId);
        // Create a transient session object for this request
        session = {
          username: decodedToken.email || decodedToken.uid,
          createdAt: new Date(decodedToken.auth_time * 1000), // auth_time in seconds
          googleUser: {
            email: decodedToken.email,
            name: decodedToken.name || 'Firebase User',
            picture: decodedToken.picture
          }
        };
      }
    } catch (err) {
      // Token verification failed - invalid or expired
      //console.debug('Firebase token verification failed:', err.message);
    }
  }

  if (!session) return res.status(401).json({ message: "Unauthorized" });

  // Only check local session expiration (Firebase verifyIdToken handles its own expiration)
  if (sessions.has(sessionId)) {
    const isExpired = Date.now() - session.createdAt.getTime() > 24 * 60 * 60 * 1000;
    if (isExpired) {
      sessions.delete(sessionId);
      return res.status(401).json({ message: "Session expired" });
    }
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
  // --- Debug Routes (For AI Agents) ---
  const debugRouter = registerDebugRoutes();
  app.use("/api/debug", debugRouter);

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
  registerHumanizerRoutes(app, sessions, getDeviceIdFromReq);
  registerCmsRoutes(app);
  registerSystemRoutes(app);
  registerDownloaderRoutes(app, isAuthenticated); // Phrase 2/3/5/14/16: Social Media Downloader (now with Auth)

  // --- Administrative Diagnostics ---
  app.get('/api/admin/device-logs', isAuthenticated, (req, res) => {
    res.json(deviceLogs.slice(-100));
  });

  const httpServer = createServer(app);
  return httpServer;
}
