const { blobs } = require('@netlify/blobs');
const { requireAuth } = require('./_utils/jwt');

const store = blobs('homepage-store');
const KEY = 'promo.json';

async function readPromo() {
  const data = await store.get(KEY, { type: 'json' });
  if (data && typeof data === 'object') return data;
  return { enabled: false, speed: 60, items: [] };
}

async function writePromo(promo) {
  await store.set(KEY, JSON.stringify(promo));
}

exports.handler = async (event) => {
  const { httpMethod, path } = event;

  const baseHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: baseHeaders, body: '' };
  }

  // GET: if authenticated, return full config; else public view
  if (httpMethod === 'GET') {
    const promo = await readPromo();
    const auth = (event.headers && (event.headers.authorization || event.headers.Authorization)) || '';
  if (/^Bearer\s+/i.test(auth)) {
      try {
        requireAuth(event); // will throw if invalid
        // Return full object for admin
    return { statusCode: 200, headers: baseHeaders, body: JSON.stringify({
          enabled: Boolean(promo.enabled),
          speed: Number(promo.speed) || 60,
          items: Array.isArray(promo.items) ? promo.items : [],
        }) };
      } catch { /* fallthrough to public */ }
    }
    // Public filtered response
    const publicPromo = {
      enabled: Boolean(promo.enabled),
      speed: Number(promo.speed) || 60,
      items: Array.isArray(promo.items) ? promo.items.filter(i => i.active).map(i => ({ id: i.id, text: i.text })) : [],
    };
  return { statusCode: 200, headers: baseHeaders, body: JSON.stringify(publicPromo) };
  }

  // Admin routes (POST/PUT/DELETE)
  try { requireAuth(event); } catch (e) { return { statusCode: e.statusCode || 401, headers: baseHeaders, body: 'Unauthorized' }; }

  // Add new template item
  if (httpMethod === 'POST') {
    const body = JSON.parse(event.body || '{}');
    const text = String(body.text || '').trim();
    if (!text) return { statusCode: 400, body: 'text required' };
    const promo = await readPromo();
    const item = { id: `${Date.now()}-${Math.random().toString(36).slice(2,7)}`, text, active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    promo.items = Array.isArray(promo.items) ? [item, ...promo.items] : [item];
    await writePromo(promo);
  return { statusCode: 200, headers: baseHeaders, body: JSON.stringify(item) };
  }

  // Update settings globally
  if (httpMethod === 'PUT' && /\/homepage-promo$/.test(path)) {
    const patch = JSON.parse(event.body || '{}');
    const promo = await readPromo();
    if (typeof patch.enabled === 'boolean') promo.enabled = patch.enabled;
    if (typeof patch.speed === 'number') promo.speed = patch.speed;
    await writePromo(promo);
  return { statusCode: 200, headers: baseHeaders, body: 'OK' };
  }

  // Update or delete an item by id
  const id = (path || '').split('/').pop();
  if (!id) return { statusCode: 400, body: 'Bad Request' };

  if (httpMethod === 'PUT') {
    const patch = JSON.parse(event.body || '{}');
    const promo = await readPromo();
    const idx = Array.isArray(promo.items) ? promo.items.findIndex(i => i.id === id) : -1;
  if (idx < 0) return { statusCode: 404, headers: baseHeaders, body: 'Not Found' };
    promo.items[idx] = { ...promo.items[idx], ...('text' in patch ? { text: String(patch.text) } : {}), ...('active' in patch ? { active: Boolean(patch.active) } : {}), updatedAt: new Date().toISOString() };
    await writePromo(promo);
  return { statusCode: 200, headers: baseHeaders, body: 'OK' };
  }

  if (httpMethod === 'DELETE') {
    const promo = await readPromo();
    promo.items = Array.isArray(promo.items) ? promo.items.filter(i => i.id !== id) : [];
    await writePromo(promo);
    return { statusCode: 200, headers: baseHeaders, body: 'OK' };
  }

  return { statusCode: 405, headers: baseHeaders, body: 'Method Not Allowed' };
};
