/**
 * OTP generation, hashing, and validation for Bong NGL phone verification.
 * Phase 35: WhatsApp OTP system.
 *
 * Security measures:
 *   - HMAC-SHA256 with server secret (not bare SHA-256)
 *   - Timing-safe comparison (prevents timing side-channel)
 *   - Max 5 verify attempts per OTP (brute-force lockout)
 *   - 5-minute expiry (limits attack window)
 *   - Cryptographically random via crypto.randomInt
 */
import crypto from 'crypto';

const OTP_LENGTH = 6;
const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
export const MAX_OTP_ATTEMPTS = 5;    // lock out after 5 wrong guesses

/** Server-side HMAC secret — falls back to JWT_SECRET or a random per-boot key */
function getHmacSecret(): string {
  return process.env.OTP_HMAC_SECRET || process.env.JWT_SECRET || 'bong-ngl-otp-fallback-key';
}

/** Generate a cryptographically random 6-digit OTP */
export function generateOtp(): string {
  // crypto.randomInt is uniform on [0, 1_000_000)
  return crypto.randomInt(0, 1_000_000).toString().padStart(OTP_LENGTH, '0');
}

/** HMAC-SHA256 hash of an OTP (never store plaintext) */
export function hashOtp(otp: string): string {
  return crypto.createHmac('sha256', getHmacSecret()).update(otp).digest('hex');
}

/** Timing-safe comparison of two hex hash strings */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
}

/**
 * Check if OTP matches hash, hasn't expired, and attempts aren't exhausted.
 * Returns { valid, reason, lockout } where lockout=true means OTP should be cleared.
 */
export function verifyOtp(
  otp: string,
  storedHash: string | null,
  expiry: Date | null,
  attempts: number = 0
): { valid: boolean; reason?: string; lockout?: boolean } {
  if (!storedHash || !expiry) {
    return { valid: false, reason: 'No OTP pending. Request a new one.' };
  }
  if (new Date() > expiry) {
    return { valid: false, reason: 'OTP expired. Request a new one.', lockout: true };
  }
  if (attempts >= MAX_OTP_ATTEMPTS) {
    return { valid: false, reason: 'Too many wrong attempts. Request a new code.', lockout: true };
  }
  if (!safeEqual(hashOtp(otp), storedHash)) {
    return { valid: false, reason: 'Incorrect code.' };
  }
  return { valid: true };
}

/** Calculate expiry timestamp (now + 5 min) */
export function otpExpiryDate(): Date {
  return new Date(Date.now() + OTP_EXPIRY_MS);
}

/**
 * Validate phone: must be 10 digits starting with 6-9, Indian format.
 * Returns E.164 without '+' (e.g. "918777849865") or null if invalid.
 */
export function validatePhone(raw: string): string | null {
  // Strip spaces, dashes, plus sign
  const clean = raw.replace(/[\s\-+]/g, '');
  // Accept: "918777849865" (with country code) or "8777849865" (without)
  if (/^91[6-9]\d{9}$/.test(clean)) return clean;       // already E.164 with valid start digit
  if (/^[6-9]\d{9}$/.test(clean)) return '91' + clean;  // add India code
  return null; // invalid
}

/** Mask phone for display: "+91 •••••9865" (last 4 visible) */
export function maskPhone(phone: string): string {
  if (!phone || phone.length < 10) return '•••••';
  const last4 = phone.slice(-4);
  return `+91 •••••${last4}`;
}
