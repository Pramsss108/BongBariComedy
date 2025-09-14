const { requireAuth } = require('./_utils/jwt');

exports.handler = async (event) => {
  const { httpMethod, path } = event;
  if (httpMethod === 'POST' && /\/message$/.test(path)) {
    try {
      // Public endpoint for chatbot; auth not required
      const body = JSON.parse(event.body || '{}');
      const userMessage = String(body.message || '').trim();
      if (!userMessage) return { statusCode: 400, body: 'message required' };
      const hasBn = /[\u0980-\u09ff]/.test(userMessage);

      const key = process.env.GEMINI_API_KEY;
      const model = 'gemini-1.5-flash';
      let text = '';
      if (key) {
        try {
          const ctrl = new AbortController();
          const to = setTimeout(() => ctrl.abort(), 3500);
          const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: userMessage }] }], generationConfig: { maxOutputTokens: 120, temperature: 0.7 } }),
            signal: ctrl.signal,
          });
          clearTimeout(to);
          if (resp.ok) {
            const j = await resp.json();
            text = ((j?.candidates?.[0]?.content?.parts || []).map(p => p?.text || '').join('') || '').trim();
          }
        } catch (_) { /* ignore and fallback */ }
      }
      if (!text) {
        text = hasBn ? 'হাসি রেডি—এক লাইন clue dile punch kore debo!' : 'Punchline ready—give me one line clue.';
      }
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ response: text }) };
    } catch (e) {
      return { statusCode: 400, body: 'Bad Request' };
    }
  }
  return { statusCode: 405, body: 'Method Not Allowed' };
};
