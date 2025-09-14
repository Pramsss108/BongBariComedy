const { requireAuth } = require('./_utils/jwt');
const { blobs } = require('@netlify/blobs');

function todayKey() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0,10);
}

async function readDay(store, key) {
  try {
    const data = await store.get(`${key}.json`, { type: 'json' });
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}
async function writeDay(store, key, arr) {
  await store.set(`${key}.json`, JSON.stringify(arr));
}

exports.handler = async (event) => {
  const { httpMethod, path: reqPath, queryStringParameters } = event;
  const store = blobs('memes-store');

  // Public feed
  if (reqPath.endsWith('/public')) {
    const limit = Math.max(1, Math.min(50, parseInt(queryStringParameters?.limit || '10')));
    // Collect published from recent days (last 14 keys)
    const list = [];
    const days = [];
    const now = new Date();
    for (let i = 0; i < 14; i++) {
      const dt = new Date(now.getTime() - i * 86400000);
      const key = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0,10);
      days.push(key);
    }
    for (const key of days) {
      const items = await readDay(store, key);
      for (const m of items) if (m.status === 'published') list.push(m);
      if (list.length >= limit) break;
    }
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(list.slice(0, limit)) };
  }

  // Admin routes
  let user;
  try { user = requireAuth(event); } catch (e) { const status = e.statusCode || 401; return { statusCode: status, body: 'Unauthorized' }; }

  if (httpMethod === 'GET') {
    const key = queryStringParameters?.dateKey || todayKey();
    const arr = await readDay(store, key);
    const statusFilter = queryStringParameters?.status;
    const filtered = statusFilter && statusFilter !== 'all' ? arr.filter(m => m.status === statusFilter) : arr;
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(filtered) };
  }

  if (httpMethod === 'POST' && /\/publish$/.test(reqPath)) {
    const id = reqPath.split('/').pop();
    const key = queryStringParameters?.dateKey || todayKey();
    const arr = await readDay(store, key);
    const idx = arr.findIndex(m => m.id === id);
    if (idx >= 0) {
      arr[idx].status = 'published';
      arr[idx].publishedAt = new Date().toISOString();
      await writeDay(store, key, arr);
    }
    return { statusCode: 200, body: 'OK' };
  }

  if (httpMethod === 'POST' && reqPath.endsWith('/generate')) {
    const b = JSON.parse(event.body || '{}');
    const count = Math.max(1, Math.min(12, parseInt(b.count || '5')));
    const language = String(b.language || 'auto');
    const key = queryStringParameters?.dateKey || todayKey();
    const arr = await readDay(store, key);
    for (let i = 0; i < count; i++) {
      arr.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        dateKey: key,
        idea: `Trending meme idea #${arr.length + 1} (${language})` ,
        topics: [],
        language,
        status: 'idea',
        createdAt: new Date().toISOString(),
      });
    }
    await writeDay(store, key, arr);
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(arr) };
  }

  if (httpMethod === 'PUT') {
    const id = reqPath.split('/').pop();
    const key = queryStringParameters?.dateKey || todayKey();
    const arr = await readDay(store, key);
    const idx = arr.findIndex(m => m.id === id);
    if (idx >= 0) {
      const patch = JSON.parse(event.body || '{}');
      arr[idx] = { ...arr[idx], ...patch, updatedAt: new Date().toISOString() };
      await writeDay(store, key, arr);
    }
    return { statusCode: 200, body: 'OK' };
  }

  return { statusCode: 405, body: 'Method Not Allowed' };
};
