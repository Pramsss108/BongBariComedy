import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

const execFileAsync = promisify(execFile);

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
      console.log('[PoToken] Generating precise Proof-of-Origin token via isolated child process...');
      
      // Bypass npx to avoid issues on windows vs linux and reduce overhead
      // Point directly to the module's bin script
      const binPath = path.resolve(process.cwd(), 'node_modules', 'youtube-po-token-generator', 'bin', 'cli.mjs');
      const { stdout } = await execFileAsync(
        process.execPath, 
        [binPath], 
        {
          env: { ...process.env }, // inherit process.env (HTTP_PROXY etc)
          timeout: 25000,
          maxBuffer: 1024 * 1024
        }
      );

      const parsed = JSON.parse(stdout.trim());
      
      if (!parsed.visitorData || !parsed.poToken) {
        throw new Error('Invalid JSON structure returned by youtube-po-token-generator');
      }

      console.log('[PoToken] Successfully generated PO Token. Caching for 6 hours.');

      cachedToken = {
        visitorData: parsed.visitorData,
        poToken: parsed.poToken,
        expiresAt: now + TOKEN_LIFETIME_MS
      };

      return { visitorData: parsed.visitorData, poToken: parsed.poToken };
    } catch (err: any) {
      console.error('[PoToken] Error generating token:', err.message || err);
      // Fallback: throw so the main logic can decide to proceed without token or fail.
      throw new Error('Failed to generate Proof of Origin token.');
    } finally {
      isFetching = false;
      fetchPromise = null;
    }
  })();

  return fetchPromise;
}