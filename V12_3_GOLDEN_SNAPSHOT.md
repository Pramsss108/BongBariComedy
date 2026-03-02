# 🏆 V12.3 GOLDEN SNAPSHOT — Best Output Quality (March 2, 2026)

> **This is the reference document.** If future changes EVER lower humanizer quality,
> revert to this commit and re-deploy. Every layer, every number, every decision is documented here.

## 📌 Version Identity

| Field | Value |
|---|---|
| **Version** | V12.3 |
| **Commit Hash** | `29083e121f451766ea3d6c4d319c06bf8bb6b8b7` |
| **Date** | March 2, 2026 |
| **Branch** | `main` |
| **Status** | ✅ Pushed, Built, Live on Render + GitHub Pages |

### How to Restore This Exact Version
```powershell
git checkout 29083e1 -- server/utils/nlp.ts server/routes/humanizer.ts
npm run deploy:safe
```

---

## 📊 Proven Test Results

| Metric | Result |
|---|---|
| **ZeroGPT Score** | **0% AI** (screenshot verified) |
| **Internal Human Score** | **91/100** |
| **Burstiness** | 100/100 PASS |
| **Clichés Found** | 0 |
| **Word Count Drift** | -3% (88w → 85w) — within ±10% |
| **Meaning Preserved** | ✅ No new concepts added |
| **Filler Injected** | 0 phrases |
| **Garbled Phrases** | 0 |
| **Pipeline Stability** | 4/4 runs identical |

---

## 🔧 The 15-Layer NLP Pipeline (Exact Order)

Every layer runs sequentially in `server/routes/humanizer.ts` lines 278-330.
The NLP functions live in `server/utils/nlp.ts` (1195 lines).

### Layer Execution Order

| # | Layer | Function | What It Does | Key Parameter |
|---|---|---|---|---|
| 1 | **Input Cleaning** | `cleanInputText()` (client) | Strips AI formatting, filler before sending to server | N/A |
| 2 | **Conjunction Purge** | `applyConjunctionPurge()` | Removes "Furthermore", "Moreover", "Additionally" etc. from sentence starts | Strips 21 patterns |
| 3 | **Vocabulary Engine** | `applyVocabularyEngine()` | Replaces 65+ AI cliché words with natural alternatives (sentiment-aware) | 100% match rate |
| 4 | **IMF Approximation** | `applyIMFApproximation()` | Replaces predictable tokens to raise perplexity | **25% rate**, 40+ phrasal verb guards |
| 4b | **Semantic Cloaking** | `applySemanticCloaking()` | Passive→Active voice reversal on eligible sentences | 30% of sentences |
| 6 | **Starter Diversifier** | `applySentenceStarterDiversifier()` | Rewrites "The X is...", "It is important…", "There are…" starters | **30% rate** |
| 7 | **Burstiness Engine** | `forceBurstiness()` | Splits sentences >22 words at ", and " / ", which " / ", so " / ", but " | Threshold: **22 words** |
| 8 | **Human Flaws** | `applyHumanFlaws()` | Injects "don't"/"can't" contractions, occasional lowercase "i" | Low = 15% I→i, 50% contraction |
| 9 | **Paragraph Rhythm** | `applyParagraphRhythm()` | Extracts punch paragraphs (4-12 words) for CoV boost | 5+ sentence paras, every 3rd |
| 10 | **Zipf Normalization** | `applyZipfNormalization()` | Thins over-represented mid-frequency words (Zipf deviation) | 30% thinning, ranks 3-15 |
| 11 | **Denominalization** | `applyDenominalization()` | "the implementation of" → "implementing" | 65% rate, 18 patterns |
| 12 | **Clause Reordering** | `applyClauseReordering()` | Moves trailing because/since/although clauses to front | **20% rate** |
| 13 | **Deictic Injection** | `applyDeicticInjection()` | Pronoun injection (genz only). **Bridge injection DISABLED** | Bridges = 0% |
| 14 | **Semantic Drift** | `applySemanticDrift()` | Hedging bridge injection. **DISABLED in V12.3** | Returns text unchanged |
| 15 | **Verification Agent** | `runVerificationAgent()` | 7-metric scoring: burstiness, clichés, vocab ratio, uniformity, conjunction density, pronoun rate, nominalization | Weighted composite |

### Auto-Heal Loop
If verification score < 50 or any metric fails, the system:
1. Sends the output back to Groq with an aggressive healing prompt
2. Re-runs the full 15-layer pipeline on the healed text
3. Re-verifies and returns the best result

---

## 🔑 Critical Parameters (DO NOT CHANGE)

These exact values produce the 0% AI / 91 human score result:

```
IMF replacement rate:           25%  (was 40%, garbled phrasal verbs)
IMF phrasal verb guards:        40+  (context-aware regex, prevents "make sure" → "result in sure")
Burstiness split threshold:     22   (was 18, over-splitting broke flow)
Sentence starter rewrite rate:  30%  (was 40%, too many rewrites)
Clause reordering rate:         20%  (was 35%, broke logical flow)
Deictic bridge injection:       DISABLED  (was 20%, added filler "more or less")
Semantic drift bridges:         DISABLED  (was 30%, added "at least in most cases")
Pronoun rate metric:            Advisory only (never hard-fails)
```

---

## 🚫 What Was REMOVED in V12.3 (And Why)

### 1. DeicticInjection Bridge Phrases — DISABLED
**Old behavior:** Appended ", more or less", ", in a way", ", roughly speaking" to 20% of sentences.
**Problem:** Added filler words that inflated word count by ~15% and broke meaning lock.
**Fix:** Set `bridgeProb = 0`. Function still does pronoun injection for genz vibe.

### 2. SemanticDrift Bridge Phrases — DISABLED
**Old behavior:** Appended ", at least in most cases", ", generally speaking", ", to some degree" to 30% of every 5th sentence.
**Problem:** The #1 source of filler inflation. These phrases appeared in the garbled output.
**Fix:** Early return `return s;` at top of mapping function. Skeleton preserved for V13.

### 3. LLM Prompt — Tightened Massively
**Old:** 12 rules, meaning lock was just "NEVER add opinions".
**New:** 14 rules. Added CRITICAL meaning lock (no new examples/topics), WORD COUNT LOCK (±10%), DISCOURSE MARKER LIMIT (max 1 per 3 paragraphs), NO FILLER rule.

### 4. IMF Phrasal Verb Protection — Added
**Old:** Blind 40% replacement. "make sure" → "result in sure", "show up" → "expose up".
**New:** Context-aware regex guards (checks words before/after each token). 40+ protected phrase patterns. Rate lowered to 25%.

---

## 📁 Key Files

| File | Purpose |
|---|---|
| `server/utils/nlp.ts` | All 15 NLP layer functions (1220+ lines) |
| `server/routes/humanizer.ts` | API endpoint, LLM prompt, pipeline orchestration (374 lines) |
| `client/src/pages/free-tools-humanizer.tsx` | Frontend UI, auth, mode switching (819 lines) |
| `client/src/lib/nlp.ts` | Client-side input cleaning |
| `scripts/test-v12-3.ts` | Pipeline test script (run with `npx tsx scripts/test-v12-3.ts`) |

---

## 🧪 How to Test (Non-Coder)

### Quick Pipeline Test
```powershell
npx tsx scripts/test-v12-3.ts
```
Expected output:
- Word count drift: -3% or less
- Failures: NONE
- Human Score: 65+ (NLP-only, without LLM)

### Full End-to-End Test
1. `npm run dev:live` (starts both servers)
2. Open `http://localhost:5173/tools/humanizer`
3. Paste this test text:
   > Artificial intelligence has become an essential part of modern technology, allowing systems to analyze data, recognize patterns, and automate decision-making processes. These systems are designed to improve efficiency and reduce the need for manual effort in repetitive tasks. However, their effectiveness depends heavily on the quality of data they are trained on, which means biases can still exist and influence results. While AI continues to evolve and integrate into various industries, it is important to consider ethical concerns and ensure that its development aligns with broader societal values.
4. Click REWRITE
5. Copy output → paste into ZeroGPT.com
6. Expected: **0% AI GPT**

---

## 📈 Version History (Quality Trajectory)

| Version | Date | ZeroGPT Score | Key Change |
|---|---|---|---|
| V12.1 | Mar 1, 2026 | ~60% AI | Initial 15-layer pipeline, had infinite loop bug |
| V12.2 | Mar 2, 2026 | ~28% AI | Fixed meaning drift, removed opinion injection |
| **V12.3** | **Mar 2, 2026** | **0% AI** | **Disabled filler bridges, IMF phrasal guards, tightened prompts** |

---

## ⚠️ Rules for Future Agents

1. **NEVER re-enable SemanticDrift bridges** without word-count regression testing
2. **NEVER raise IMF rate above 25%** — 40% garbles phrasal verbs
3. **NEVER lower burstiness threshold below 22** — 18 over-splits
4. **NEVER add "Honestly,", "Look,", "you know" to NLP layers** — the LLM handles this sparingly via prompt
5. **ALWAYS run `npx tsx scripts/test-v12-3.ts` before deploying** — drift must be within ±10%
6. **ALWAYS test on ZeroGPT.com after ANY NLP change** — screenshot the result
7. **If quality drops: `git checkout 29083e1 -- server/utils/nlp.ts server/routes/humanizer.ts` then `npm run deploy:safe`**

---

*This document was created as a golden reference. The V12.3 engine is production-proven and verified.*
