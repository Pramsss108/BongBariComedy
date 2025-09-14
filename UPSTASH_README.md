# Environment & Optional Services

## Gemini (Moderation Nuance & Greetings)
- Variable: `GEMINI_API_KEY`
- If absent: heuristic moderation only, more items go `pending_review`.
- If present: AI may auto-approve playful mild slang; still never auto-approves hard flagged sexual/exploit terms.

## Upstash Redis (Durable Rate Limit & Reactions)
- Variables:
  - `UPSTASH_REST_URL`
  - `UPSTASH_REST_TOKEN`
- Used for:
  - 6h rate limit key: `post:<ip>:<deviceHash>` (value=1 with EX TTL)
  - Reaction dedupe key: `reaction:<postId>:<type>:<deviceHash>` (EX ~1 year)
  - Reaction counts: `reaction_counts:<postId>:<type>` (numeric incr)
- Without these vars, in-memory Maps/Sets used (lost on restart).

## Adding .env
Copy `.env.example` → `.env` and fill values:
```
GEMINI_API_KEY=sk-...
UPSTASH_REST_URL=https://xxx.upstash.io
UPSTASH_REST_TOKEN=abcd1234
```

## Security Reminder
Do NOT commit actual `.env` with real keys.
