const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function signToken(payload, expiresIn = '7d') {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

function requireAuth(event) {
  const auth = (event.headers && (event.headers.authorization || event.headers.Authorization)) || '';
  if (!auth || !/^Bearer\s+/i.test(auth)) {
    const err = new Error('401 Unauthorized');
    err.statusCode = 401;
    throw err;
  }
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  const payload = verifyToken(token);
  if (!payload) {
    const err = new Error('401 Unauthorized');
    err.statusCode = 401;
    throw err;
  }
  return payload;
}

module.exports = { signToken, verifyToken, requireAuth };
