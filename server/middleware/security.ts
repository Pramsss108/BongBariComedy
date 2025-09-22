import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// CSRF Token Management
const csrfTokens = new Map<string, { token: string; expires: number }>();

export const generateCSRFToken = (sessionId: string): string => {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = Date.now() + 3600000; // 1 hour expiry
  csrfTokens.set(sessionId, { token, expires });
  return token;
};

export const validateCSRFToken = (sessionId: string, token: string): boolean => {
  const stored = csrfTokens.get(sessionId);
  if (!stored) return false;
  if (stored.expires < Date.now()) {
    csrfTokens.delete(sessionId);
    return false;
  }
  return stored.token === token;
};

// Clean expired tokens periodically
setInterval(() => {
  const now = Date.now();
  for (const entry of Array.from(csrfTokens.entries())) {
    const [sessionId, data] = entry;
    if (data.expires < now) csrfTokens.delete(sessionId);
  }
}, 300000);

// Rate Limiting
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

export const rateLimit = (maxRequests: number = 100, windowMs: number = 60000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const identifier = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    
    let entry = rateLimitMap.get(identifier);
    
    if (!entry || entry.resetTime < now) {
      entry = {
        count: 1,
        resetTime: now + windowMs
      };
      rateLimitMap.set(identifier, entry);
      return next();
    }
    
    entry.count++;
    
    if (entry.count > maxRequests) {
      return res.status(429).json({ 
        message: 'Too many requests, please try again later.' 
      });
    }
    
    next();
  };
};

// Brute Force Protection for Login
const loginAttempts = new Map<string, { attempts: number; blockedUntil: number }>();

export const checkBruteForce = (identifier: string): boolean => {
  const entry = loginAttempts.get(identifier);
  if (!entry) return true;
  
  if (entry.blockedUntil > Date.now()) {
    return false; // Still blocked
  }
  
  if (entry.attempts >= 5) {
    // Block for 15 minutes after 5 failed attempts
    entry.blockedUntil = Date.now() + 900000;
    return false;
  }
  
  return true;
};

export const recordFailedLogin = (identifier: string) => {
  const entry = loginAttempts.get(identifier) || { attempts: 0, blockedUntil: 0 };
  entry.attempts++;
  loginAttempts.set(identifier, entry);
};

export const clearLoginAttempts = (identifier: string) => {
  loginAttempts.delete(identifier);
};

// Security Headers Middleware
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Content Security Policy - more permissive for development
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (isDevelopment) {
    // Less restrictive CSP for development
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self' http: https: ws: wss:; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' http: https:; " +
      "style-src 'self' 'unsafe-inline' http: https:; " +
      "img-src 'self' data: http: https: blob:; " +
      "font-src 'self' data: http: https:; " +
      "connect-src 'self' http: https: ws: wss:; " +
      "frame-src 'self' http: https:;"
    );
  } else {
    // Stricter CSP for production
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.youtube.com https://s.ytimg.com https://fonts.googleapis.com; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "font-src 'self' https://fonts.gstatic.com data:; " +
      "img-src 'self' data: https: blob:; " +
      "media-src 'self' https:; " +
      "connect-src 'self' https://www.googleapis.com https://youtube.googleapis.com ws: wss:; " +
      "frame-src 'self' https://www.youtube.com https://youtube.com; " +
      "object-src 'none'; " +
      "base-uri 'self'; " +
      "form-action 'self'; " +
      "frame-ancestors 'none';"
    );
  }
  
  // Additional Security Headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  next();
};

// Input Sanitization Helper
export const sanitizeInput = (input: any): any => {
  if (typeof input === 'string') {
    // Remove any script tags and dangerous HTML
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .trim();
  }
  
  if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  }
  
  if (input && typeof input === 'object') {
    const sanitized: any = {};
    for (const key in input) {
      if (input.hasOwnProperty(key)) {
        sanitized[key] = sanitizeInput(input[key]);
      }
    }
    return sanitized;
  }
  
  return input;
};

// Sanitization Middleware
export const sanitizeBody = (req: Request, res: Response, next: NextFunction) => {
  if (req.body) {
    req.body = sanitizeInput(req.body);
  }
  next();
};

// Session Validation Middleware
export const validateSession = async (req: Request, res: Response, next: NextFunction) => {
  const sessionId = req.body?.sessionId || req.headers['x-session-id'];
  
  if (!sessionId) {
    return next();
  }
  
  // Add session validation logic here if needed
  // For now, we'll just pass the session ID along
  (req as any).sessionId = sessionId;
  next();
};

// IP-based Request Tracking for Enhanced Security
const requestHistory = new Map<string, number[]>();

export const trackRequests = (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  
  let history = requestHistory.get(ip) || [];
  // Keep only requests from last 5 minutes
  history = history.filter(time => time > now - 300000);
  history.push(now);
  
  // Detect suspicious activity (more than 5000 requests in 5 minutes - very high threshold)
  if (history.length > 5000) {
    console.warn(`Suspicious activity detected from IP: ${ip}`);
    // Could implement additional blocking logic here
  }
  
  requestHistory.set(ip, history);
  next();
};

// Clean up old request history periodically
setInterval(() => {
  const now = Date.now();
  for (const entry of Array.from(requestHistory.entries())) {
    const [ip, history] = entry;
    const filtered = history.filter(t => t > now - 300000);
    if (filtered.length === 0) requestHistory.delete(ip); else requestHistory.set(ip, filtered);
  }
}, 600000);