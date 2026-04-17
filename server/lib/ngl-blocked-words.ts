// ──────────────────────────────────────────────────────────────────
// NGL Bad-Word Filter (Group B1)
// Lightweight profanity / hate-speech blocklist for Bengali + English.
// Conservative list: only obvious slurs and targeted hate terms.
// For nuanced abuse detection see PRO-tier AI Shield (future).
// ──────────────────────────────────────────────────────────────────

// English slurs + targeted hate terms (lowercased substrings)
const EN_BLOCKED: readonly string[] = [
  'fuck', 'fucker', 'fucking', 'motherfucker', 'mofo',
  'bitch', 'bastard', 'asshole', 'cunt', 'dick', 'pussy',
  'slut', 'whore', 'hoe',
  'nigger', 'nigga', 'faggot', 'fag', 'retard', 'retarded',
  'chink', 'paki', 'spic', 'kike', 'tranny',
  'kys', 'kill yourself', 'go die', 'commit suicide',
  'rape', 'rapist', 'molest', 'pedo', 'pedophile',
];

// Bengali / Hinglish slurs (common ones written in Bengali + roman script)
const BN_BLOCKED: readonly string[] = [
  // Romanised Bengali/Hindi slurs
  'madarchod', 'madarchoda', 'mc', 'bhenchod', 'behenchod', 'bkl',
  'chutiya', 'chutia', 'chutiye', 'bsdk', 'bhosdike', 'bhosdi',
  'randi', 'randibaaz', 'gandu', 'gaand', 'chodu', 'chod',
  'harami', 'haramkhor', 'kutta', 'kuttar bacha', 'suar',
  'jhaat', 'lauda', 'lund', 'loda',
  // Bengali script
  'মাদারচোদ', 'বেনচোদ', 'ভেনচোদ', 'চুতিয়া', 'চোদ', 'চোদা',
  'রান্ডি', 'গান্ডু', 'গাঁড়', 'হারামী', 'হারামি', 'কুত্তা',
  'ঝাঁট', 'লৌড়া', 'লন্ড', 'শুয়োর', 'শালা চোদ', 'মা চুদি',
];

const ALL_BLOCKED: readonly string[] = [...EN_BLOCKED, ...BN_BLOCKED];

/**
 * Returns true if text contains any blocked slur. Case-insensitive
 * substring match; Bengali script matched as-is.
 */
export function containsBlockedWord(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  const lower = text.toLowerCase();
  for (const word of ALL_BLOCKED) {
    // Bengali script doesn't have a lowercase form — match directly on text.
    // For Latin entries, match on lowered copy.
    if (/[a-z]/.test(word) ? lower.includes(word) : text.includes(word)) {
      return true;
    }
  }
  return false;
}

/** Returns the first matched blocked word (for logging, optional) */
export function firstBlockedWord(text: string): string | null {
  if (!text || typeof text !== 'string') return null;
  const lower = text.toLowerCase();
  for (const word of ALL_BLOCKED) {
    if (/[a-z]/.test(word) ? lower.includes(word) : text.includes(word)) {
      return word;
    }
  }
  return null;
}
