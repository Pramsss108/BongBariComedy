import type { Handler } from '@netlify/functions';
import { signToken } from './_utils/jwt';

// Simple in-function admin; for production, move to Supabase/Auth provider
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'bongbari2025';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  try {
    const body = JSON.parse(event.body || '{}');
    const { username, password } = body;
    if (username === ADMIN_USER && password === ADMIN_PASSWORD) {
      const token = signToken({ sub: username, role: 'admin' }, '7d');
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      };
    }
    return { statusCode: 401, body: 'Invalid credentials' };
  } catch (e: any) {
    return { statusCode: 400, body: e?.message || 'Bad Request' };
  }
};
