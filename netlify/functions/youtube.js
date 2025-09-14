const { getStore } = require('@netlify/blobs');

const RSS_URL = (channelId) => `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`;
const YT_SEARCH = (params) => `https://www.googleapis.com/youtube/v3/search?${params}`;

async function fetchJSON(url, opts = {}, timeoutMs = 4000) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { ...opts, signal: ctrl.signal });
    clearTimeout(id);
    if (!r.ok) throw new Error('http ' + r.status);
    return await r.json();
  } finally {
    clearTimeout(id);
  }
}

async function fetchText(url, timeoutMs = 4000) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    clearTimeout(id);
    if (!r.ok) throw new Error('http ' + r.status);
    return await r.text();
  } finally {
    clearTimeout(id);
  }
}

function parseRSS(xml) {
  // Minimal parse for entries
  const items = [];
  const regex = /<entry>[\s\S]*?<yt:videoId>(.*?)<\/yt:videoId>[\s\S]*?<title>(.*?)<\/title>[\s\S]*?<published>(.*?)<\/published>[\s\S]*?<media:thumbnail[^>]*url=\"(.*?)\"/g;
  let m;
  while ((m = regex.exec(xml)) && items.length < 6) {
    const [_, videoId, rawTitle, publishedAt, thumb] = m;
    const title = rawTitle.replace(/&amp;/g, '&');
    items.push({ videoId, title, thumbnail: thumb, publishedAt });
  }
  return items;
}

async function getLatestFromAPI(channelId, apiKey) {
  const params = new URLSearchParams({
    key: apiKey,
    channelId,
    part: 'snippet',
    type: 'video',
    order: 'date',
    maxResults: '6',
  }).toString();
  const j = await fetchJSON(YT_SEARCH(params));
  return (j.items || []).map((it) => ({
    videoId: it.id?.videoId,
    title: it.snippet?.title,
    thumbnail: `https://img.youtube.com/vi/${it.id?.videoId}/hqdefault.jpg`,
    publishedAt: it.snippet?.publishedAt,
  })).filter(v => v.videoId);
}

async function getPopularFromAPI(channelId, apiKey) {
  const params = new URLSearchParams({
    key: apiKey,
    channelId,
    part: 'snippet',
    type: 'video',
    order: 'viewCount',
    maxResults: '6',
  }).toString();
  const j = await fetchJSON(YT_SEARCH(params));
  return (j.items || []).map((it) => ({
    videoId: it.id?.videoId,
    title: it.snippet?.title,
    thumbnail: `https://img.youtube.com/vi/${it.id?.videoId}/hqdefault.jpg`,
    publishedAt: it.snippet?.publishedAt,
  })).filter(v => v.videoId);
}

async function getCached(key) {
  const store = getStore('youtube-cache');
  try {
    const s = await store.get(key);
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}

async function setCached(key, value) {
  const store = getStore('youtube-cache');
  try {
    await store.set(key, JSON.stringify(value), { addRandomSuffix: false });
  } catch {}
}

exports.handler = async (event) => {
  const path = event.path || '';
  const qs = event.queryStringParameters || {};
  const requestOrigin = event.headers?.origin || '';
  const channelParam = String(qs.channelId || '').trim();
  const channelId = channelParam || process.env.YOUTUBE_CHANNEL_ID || '';
  const apiKey = process.env.YOUTUBE_API_KEY || '';

  const isLatest = /\/latest$/.test(path);
  const isPopular = /\/popular$/.test(path);
  const isRefresh = /\/refresh$/.test(path);

  const baseHeaders = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': requestOrigin || '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: baseHeaders, body: '' };
  }

  if (isRefresh) {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, headers: baseHeaders, body: JSON.stringify({ error: 'method not allowed' }) };
    }
    // Invalidate cache for this channel
    const store = getStore('youtube-cache');
    const keys = [
      `latest:${channelId || 'default'}`,
      `popular:${channelId || 'default'}`,
    ];
    try {
      for (const k of keys) {
        try { await store.delete(k); } catch {}
      }
    } catch {}
    return { statusCode: 200, headers: baseHeaders, body: JSON.stringify({ ok: true, refreshed: true }) };
  }

  if (!isLatest && !isPopular) {
    return { statusCode: 400, headers: baseHeaders, body: JSON.stringify({ error: 'invalid endpoint' }) };
  }

  const cacheKey = `${isLatest ? 'latest' : 'popular'}:${channelId || 'default'}`;
  const TTL_MS = isLatest ? 5 * 60 * 1000 : 15 * 60 * 1000; // 5min latest, 15min popular
  const cached = await getCached(cacheKey);
  if (cached && Array.isArray(cached.items) && cached.items.length && (Date.now() - (cached.ts || 0) < TTL_MS)) {
    // Return array directly for client consumption
    return { statusCode: 200, headers: baseHeaders, body: JSON.stringify(cached.items) };
  }

  try {
    let items = [];
    if (channelId) {
      if (apiKey) {
        items = isLatest
          ? await getLatestFromAPI(channelId, apiKey)
          : await getPopularFromAPI(channelId, apiKey);
      }
      if (!items.length) {
        // RSS fallback
        const xml = await fetchText(RSS_URL(channelId));
        items = parseRSS(xml);
      }
    }
    // Always set something, even empty, to avoid hot loops
    await setCached(cacheKey, { items, ts: Date.now() });
  // Return array directly for client consumption
  return { statusCode: 200, headers: baseHeaders, body: JSON.stringify(items) };
  } catch (e) {
  // On error, return empty array to match client expectations
  return { statusCode: 200, headers: baseHeaders, body: JSON.stringify([]) };
  }
};
