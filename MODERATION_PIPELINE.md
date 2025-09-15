# Automated Moderation Pipeline (Interim Phase 1.5)

Status: Heuristic + optional Gemini assisted moderation integrated into `/api/submit-story`.

## Goals
- Allow culturally authentic mild Bengali khisti (light slang) that is playful, while blocking hateful / explicit / exploitative / spam content.
- Reduce manual review volume by auto-approving clearly safe submissions.
- Keep ambiguous or medium-risk content in a pending queue for admin approval.

## Flow
1. User submits story.
2. Server runs `analyzeStory(text)` from `server/moderation.ts`.
3. Heuristic scan produces flags, severity (0+), and preliminary decision.
4. If decision is `pending` and `GEMINI_API_KEY` is set → escalate to Gemini for nuance classification (intent: playful | neutral | hateful | sexual | spam).
5. Safety post-processing enforces: hard disallowed or hateful => reject; sexual (non-exploit) stays pending; playful may be upgraded to approve (future iteration — currently conservative: stays pending unless severity 0).
6. If final decision `approve` → story is auto-published into in-memory `approved` list.
7. Else → stored in `pending` with `moderation` metadata.

## Heuristic Components
- Word Lists:
  - Mild slang (low severity) – culturally connective, often acceptable.
  - Contextual medium slang – may be playful or insulting: require review.
  - Disallowed core – explicit sexual exploitation / severe abuse terms: reject.
- Spam Indicators:
  - >2 external links
  - Character flood (same char repeated 7+ times)
  - Excessive length (>1000 chars truncated anyway)

## Decision Table (Simplified)
| Condition | Decision |
|-----------|----------|
| Severity 0 | approve (auto) |
| Mild slang only | pending |
| Contextual harsher slang | pending |
| Explicit sexual / exploitation | reject |
| Hateful targeting (AI) | reject |
| Spam (medium) | pending |
| Spam (high / combined) | reject |

## Data Stored (Pending Item)
```ts
moderation: {
  flags: string[];        // e.g. ['mild:khisti','spam:links','ai_mild:word']
  reason: string;         // short summary
  usedAI: boolean;        // whether Gemini applied
  severity: number;       // heuristic severity (0 benign, higher risk)
  decision: string;       // approve | pending | reject (final)
}
```

## Submit Endpoint Behavior
- Auto-approved response:
```json
{ "message": "Story published", "postId": "P101", "approvedId": "A102", "auto": true }
```
- Pending response:
```json
{ "message": "Story queued for review", "postId": "P101", "decision": "pending", "reason": "Contains mild cultural slang" }
```
- Rate limited response:
```json
{ "message": "Too many submissions. Please wait a few minutes." }
```

## Admin UI Integration
- Displays moderation chips: decision (color), reason (truncated), AI badge, flags.
- Sanitization button remains for light manual adjustments.

## Environment Variable
`GEMINI_API_KEY` (optional). Without it: heuristic only (higher pending volume, still safe).

## Safety Constraints
- AI output JSON parse failures fallback safely to heuristic result.
- AI cannot override hard disallowed or hateful categories to approve.
- Auto-approval restricted to severity 0 to minimize false negatives.

## Future Enhancements
- Persist moderation decisions & history (DB + audit log).
- Expand Bengali morphological normalization (suffix stripping, common transliterations).
- Dynamic lexicon updates from admin feedback.
- Device trust scoring to fast-track consistent positive contributors.
- User-facing rejection categories & localized feedback formatting.
- Additional model cross-check (ensemble) for sensitive categories.

## Quick Dev Test
1. Submit a clean short Bengali story → should auto publish.
2. Submit story with mild slang (in `mildSlang`) → pending.
3. Submit with a disallowed core term → reject.
4. Submit spam (3+ links) → pending or reject based on combined signals.
5. (If API key set) Submit ambiguous contextual slang → check AI badge appears in pending item.

---
Interim pipeline: safe-by-default, conservative pending strategy, ready for iterative expansion.
