import { generate } from 'youtube-po-token-generator';
// Simple token cache
let cachedToken: {
  visitorData: string;
  poToken: string;
  expiresAt: number;
} | null = null;

// Extends token life by keeping it valid for 6 hours (typical po token validity is 12-24 hrs)
const TOKEN_LIFETIME_MS = 6 * 60 * 60 * 1000;

let isFetching = false;
let fetchPromise: Promise<{visitorData: string, poToken: string}> | null = null;

export async function getPoToken(): Promise<{ visitorData: string; poToken: string }> {
  const now = Date.now();

  // If cache is valid, return it
  if (cachedToken && now < cachedToken.expiresAt) {
    return {
      visitorData: cachedToken.visitorData,
      poToken: cachedToken.poToken
    };
  }

  // If already fetching, wait for that promise
  if (isFetching && fetchPromise) {
    return fetchPromise;
  }

  isFetching = true;
  fetchPromise = (async () => {
    try {
      console.log('[PoToken] Generating Proof-of-Origin token NATIVELY in memory (bypassing OOM killer)...');
      
      const parsed = await generate();
      
      if (!parsed || !parsed.visitorData || !parsed.poToken) {
        throw new Error('Invalid structure returned by youtube-po-token-generator instance.');
      }

      cachedToken = {
        visitorData: parsed.visitorData,
        poToken: parsed.poToken,
        expiresAt: Date.now() + TOKEN_LIFETIME_MS
      };

      console.log(`[PoToken] 🟢 Native RAM-optimized Token Generation Success!`);
      return { visitorData: parsed.visitorData, poToken: parsed.poToken };
    } catch (err) {
      console.error('[PoToken] ❌ Token generation failed natively:', err);
      throw err;
    } finally {
      isFetching = false;
      fetchPromise = null;
    }
  })();

  return fetchPromise;
}