import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

export interface JwtPayload {
  sub: string; // user id or username
  role?: 'admin' | 'user';
}

export function signToken(payload: JwtPayload, expiresIn: string = '7d'): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export function requireAuth(event: any): JwtPayload {
  const auth = event.headers?.authorization || event.headers?.Authorization;
  if (!auth || !/^Bearer\s+/i.test(auth)) {
    throw new Error('401 Unauthorized');
  }
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  const payload = verifyToken(token);
  if (!payload) throw new Error('401 Unauthorized');
  return payload;
}
