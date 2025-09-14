// Periodic warmer to keep YouTube caches fresh in Netlify Blobs
// Invoked by Netlify Scheduled Functions (see netlify.toml [[scheduled]])

async function fetchWithTimeout(url, ms = 5000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    return r;
  } catch (e) {
    clearTimeout(t);
    throw e;
  }
}

exports.handler = async () => {
  const channelId = process.env.YOUTUBE_CHANNEL_ID || '';
  const base = process.env.URL || process.env.DEPLOY_PRIME_URL || '';
  const origin = base || '';
  const qs = channelId ? `?channelId=${encodeURIComponent(channelId)}` : '';
  const endpoints = [
    `${origin}/.netlify/functions/youtube/latest${qs}`,
    `${origin}/.netlify/functions/youtube/popular${qs}`,
  ];
  try {
    const results = await Promise.allSettled(endpoints.map((u) => fetchWithTimeout(u).then(r => r.ok)));
    const ok = results.every(r => r.status === 'fulfilled');
    return { statusCode: 200, body: JSON.stringify({ ok, warmed: endpoints }) };
  } catch (e) {
    return { statusCode: 200, body: JSON.stringify({ ok: false }) };
  }
};
