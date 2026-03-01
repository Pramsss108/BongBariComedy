# 🤖 V10 CHAMELEON ENGINE - AI EXECUTION PLAN

> **⚠️ CORE AI DIRECTIVE FOR THIS DOCUMENT**
> Any AI agent reading this document MUST follow the "Vibe Coder Protocol":
> 1. Execute **ONLY ONE PHRASE AT A TIME**.
> 2. After finishing a phrase, **STOP**.
> 3. Explain to the Vibe Coder exactly what was just done.
> 4. State exactly what the next phrase entails.
> 5. **ASK FOR EXPLICIT PERMISSION** before beginning the next phrase. 
> Do not bypass this protocol. Breaking tasks down maximizes code quality.

---

## 🌍 CURRENT STATUS (What is Done)

✅ **Phase 1: Local Environment Restored**
- Frontend Vite Server (`:5173`) and Backend Node Server (`:5000`) are running and communicating correctly.

✅ **Phase 2: Server-Side Fortress Built**
- Humanization pipeline (Burstiness, Vocab Swapper, Flaws) moved to Node.js backend (`server/utils/nlp.ts`).
- Firebase JWT Authentication enforced.

✅ **Phase 2.1: Blank Screen Emergency Fixed**
- Diagnosed missing `useState` variable for `showDeviceOverride`. Fix applied. Page renders perfectly.

---

## 🚀 ROADMAP (What Needs to be Done Before Push)
We will test locally at every single step before pushing to production.

### ✅ PHRASE 2.5: The Anti-Sharing Device Lock (COMPLETE)
- **Goal:** Sync the Backend with our new "Netflix-style" Frontend.
- **Result:** Backend ALREADY returns `409 Conflict` (line 57 of `humanizer.ts`). Frontend catches `409` (line 397 of `free-tools-humanizer.tsx`), sets `showDeviceOverride(true)` to show popup, stores `lastPrompt` for retry. Override handler sends `override: true` back to API which re-binds device.
- **Auto-Test Results (4/4 PASSED):**
  - ✅ Server health: OK (v1.0.1, development)
  - ✅ No token → 401 Unauthorized
  - ✅ Bad token → 401 Unauthorized
  - ✅ Endpoint exists (not 404)
- **No code changes needed.** Full pipeline was already wired correctly.

### ✅ PHRASE 3: Contextual Memory Swapping (COMPLETE)
- **Goal:** Upgrade backend vocab swapper with emotional intelligence.
- **What was done:**
  1. Added `detectSentiment()` in `server/utils/nlp.ts` — lexicon-based classifier using wink-nlp tokens. 30 words per mood (happy/sad/professional), 2-hit threshold to avoid false positives.
  2. Added `sentimentOverlays` map — mood-specific synonym overrides that replace the base swaps when a sentiment is detected. Example: "crucial" → "exciting" (happy) vs "painful" (sad) vs "critical" (professional).
  3. `applyVocabularyEngine()` now auto-detects sentiment OR accepts manual override. Fully backward-compatible — existing calls don't break.
- **Auto-Test Results (13/13 PASSED):**
  - ✅ Happy/Sad/Professional/Neutral detection
  - ✅ 2-hit threshold prevents false positives
  - ✅ Sentiment-aware swaps for happy, sad, professional
  - ✅ Neutral falls back to base synonyms
  - ✅ Backward compatible (no override param still works)
  - ✅ forceBurstiness, computeBurstiness, computeCliche still work

### ✅ PHRASE 4: Semantic Cloaking (COMPLETE)
- **Goal:** Destroy AI meaning-vectors by altering sentence structure.
- **What was done:**
  1. Added `applySemanticCloaking()` in `server/utils/nlp.ts` — detects Active (Subject-Verb-Object) and Passive (Noun-AUX-Verb-by-Noun) sentence patterns using wink-nlp POS tags.
  2. Flips ~30% of eligible sentences between Active↔Passive voice. Skips short sentences (< 4 words) and single-sentence text.
  3. Includes 55+ irregular past participle mappings (built/written/taken/driven etc.) for grammatically correct transformations.
  4. Wired as **Layer 4b** in `server/routes/humanizer.ts` between Vocabulary Engine (4) and Human Flaws (5).
- **Auto-Test Results (9/9 PASSED):**
  - ✅ No crash on normal, short, empty, question text
  - ✅ Passive→Active flipping works (verified over 50 runs)
  - ✅ Active→Passive flipping works (verified over 50 runs)
  - ✅ Preserves core meaning (nouns retained)
  - ✅ Full 4-layer pipeline: 0 cliches, burstiness 53
  - ✅ Phrase 3 regression: sentiment detection still works

### ✅ PHRASE 5: Headless Verification Agent (COMPLETE)
- **Goal:** Auto-verify humanization success before returning to user.
- **What was done:**
  1. Added `runVerificationAgent()` in `server/utils/nlp.ts` — 5-metric in-house AI detector. Returns `VerificationReport` with `humanScore` (0-100), `passed` boolean, per-metric breakdowns, and `failures` list.
  2. **5 Metrics scored:**
     - **Burstiness** (25% weight): Sentence-length variance via `computeBurstiness()`. Target ≥ 40.
     - **Clichés** (25% weight): AI fingerprint phrase count via `computeCliche()`. Target ≤ 2 phrases.
     - **Vocab Repetition** (20% weight): Unique content-word ratio (stop-words filtered). Target ≥ 0.4 ratio.
     - **Sentence Uniformity** (15% weight): Coefficient of variation on sentence lengths. Target CV ≥ 0.30.
     - **Conjunction Density** (15% weight): AI connector overuse (moreover/furthermore/additionally etc.). Target ≤ 1.5 per sentence.
  3. **Auto-heal pipeline:** If verification fails (score < 50 or any metric fails), the system auto re-prompts Groq LLM, re-runs all NLP layers (burstiness → vocab → cloaking → flaws), then re-verifies. Up to 1 auto-heal attempt.
  4. Wired as **Layer 6** in `server/routes/humanizer.ts`. API response now includes `verification: report` object.
  5. **100% in-house math — ZERO external API calls — FREE FOREVER.**
- **Auto-Test Results (12/12 PASSED):**
  - ✅ Returns valid VerificationReport object structure
  - ✅ humanScore always 0-100 range
  - ✅ Detects ROBOTIC text (AI text scored 49/100, caught clichés)
  - ✅ Passes HUMAN-LIKE text (natural text scored 100/100)
  - ✅ Cliché metric catches AI phrases (3+ flagged, FAIL verdict)
  - ✅ Vocabulary repetition catches repeated words (ratio 0.45, score 43)
  - ✅ Conjunction density catches AI connector overuse (1.4/sentence)
  - ✅ Full pipeline output passes detector (score 62/100)
  - ✅ Phrase 3 regression: detectSentiment still works
  - ✅ Phrase 4 regression: applySemanticCloaking still works
  - ✅ Handles empty string (no crash)
  - ✅ Handles single sentence (no crash)

---

### 🟢 PHRASE 6: Final Push & Deploy
- **Action:** Once Phrases 2.5 through 5 are tested locally and approved, execute safe Git deployment.
