exports.handler = async () => {
  const aiKey = Boolean(process.env.GEMINI_API_KEY);
  // We can’t access server caches here; just report AI key presence for now.
  // Client will still use /api/youtube/* endpoints that cache via blobs.
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok: true, ready: true, yt: { latest: 0, popular: 0 }, trends: { items: 0 }, aiReady: aiKey })
  };
};
