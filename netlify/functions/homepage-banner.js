const { blobs } = require('@netlify/blobs');
const store = blobs('homepage-store');
const KEY = 'banner.json';
const defaultBanner = { title: "বং বাড়ি", subtitle: "কলকাতার ঘরোয়া কমেডি - আমাদের গল্প" };
async function readBanner() {
  const b = await store.get(KEY, { type: 'json' });
  return b && typeof b === 'object' ? b : defaultBanner;
}
async function writeBanner(banner) {
  await store.set(KEY, JSON.stringify(banner));
}

exports.handler = async (event) => {
  const { httpMethod } = event;
  if (httpMethod === 'GET') {
    const banner = await readBanner();
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(banner) };
  }
  if (httpMethod === 'POST') {
    try {
      const data = JSON.parse(event.body || '{}');
      const banner = { ...(await readBanner()), ...data };
      await writeBanner(banner);
      return { statusCode: 200, body: 'OK' };
    } catch {
      return { statusCode: 400, body: 'Bad Request' };
    }
  }
  return { statusCode: 405, body: 'Method Not Allowed' };
};
