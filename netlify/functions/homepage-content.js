const { requireAuth } = require('./_utils/jwt');
const { blobs } = require('@netlify/blobs');
const store = blobs('homepage-store');
const KEY = 'content.json';

async function readContent() {
  const data = await store.get(KEY, { type: 'json' });
  return Array.isArray(data) ? data : [];
}
async function writeContent(arr) {
  await store.set(KEY, JSON.stringify(arr));
}

exports.handler = async (event) => {
  const { httpMethod } = event;
  try { requireAuth(event); } catch (e) { return { statusCode: e.statusCode || 401, body: 'Unauthorized' }; }

  if (httpMethod === 'GET') {
    const content = await readContent();
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(content) };
  }
  if (httpMethod === 'POST') {
    const content = await readContent();
    const item = JSON.parse(event.body || '{}');
    item.id = Date.now();
    content.push({ ...item, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    await writeContent(content);
    return { statusCode: 200, body: 'OK' };
  }
  if (httpMethod === 'PUT') {
    const id = Number((event.path || '').split('/').pop());
    const patch = JSON.parse(event.body || '{}');
    const content = await readContent();
    const i = content.findIndex(x => x.id === id);
    if (i >= 0) content[i] = { ...content[i], ...patch, updatedAt: new Date().toISOString() };
    await writeContent(content);
    return { statusCode: 200, body: 'OK' };
  }
  if (httpMethod === 'DELETE') {
    const id = Number((event.path || '').split('/').pop());
    const content = await readContent();
    const next = content.filter(x => x.id !== id);
    await writeContent(next);
    return { statusCode: 200, body: 'OK' };
  }
  return { statusCode: 405, body: 'Method Not Allowed' };
};
