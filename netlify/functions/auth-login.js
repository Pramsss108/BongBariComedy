const { signToken } = require('./_utils/jwt');

const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'bongbari2025';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  try {
    const body = JSON.parse(event.body || '{}');
    const { username, password } = body;
    if (username === ADMIN_USER && password === ADMIN_PASSWORD) {
      const token = signToken({ sub: username, role: 'admin' }, '7d');
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) };
    }
    return { statusCode: 401, body: 'Invalid credentials' };
  } catch (e) {
    return { statusCode: 400, body: e?.message || 'Bad Request' };
  }
};
