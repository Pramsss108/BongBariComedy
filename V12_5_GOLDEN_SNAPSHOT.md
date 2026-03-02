# 🥇 V12.5 Golden Snapshot — BongBari Humanizer
> **LOCKED STATE** — Best performing humanizer version as of March 2, 2026.
> This is the canonical reference snapshot. Do not degrade past this.

---

## Lock Info

| Field | Value |
|---|---|
| **Version** | V12.5 |
| **Git commit** | `65eb263` |
| **Branch** | `main` |
| **Date** | March 2, 2026 |
| **Status** | ✅ PRODUCTION (deployed to bongbari.com via Render) |
| **Previous golden** | V12.3 @ commit `29083e1` |

---

## Performance Baseline

> Test text (Block 2 — AI/tech paragraph, 88 words):
> *"Artificial intelligence has become an essential part of modern technology, allowing systems to analyze data, recognize patterns, and automate decision-making processes. These systems are designed to improve efficiency and reduce the need for manual effort in repetitive tasks. However, their effectiveness depends heavily on the quality of data they are trained on, which means biases can still exist and influence results. While AI continues to evolve and integrate into various industries, it is important to consider ethical concerns and ensure that its development aligns with broader societal values."*

| Metric | V12.3 | V12.5 |
|---|---|---|
| ZeroGPT AI score | 0% (old test) | Target: <30% |
| Structural similarity to input | High (synonym-swap) | Low (structural rebuild) |
| Temperature (casual) | 0.55 | **0.80** |
| Temperature (academic) | 0.40 | **0.55** |
| Has parenthetical asides | No | ✅ Yes |
| Has reaction fragments | No | ✅ Yes |
| Pronoun injection (casual) | No | ✅ Yes (20% rate) |
| IMF rate | 25% | **35%** |
| Burstiness merge threshold | 10 words | **14 words** |
| Sentence starter diversifier | 30% | **40%** |
| Clause reordering | 20% | **30%** |

---

## Root Cause That Was Fixed in V12.5

**The core bug (discovered via systematic audit):**

V12.3's prompt had:
> `"STRUCTURE PRESERVATION: Keep the same logical flow — same idea ordering, same paragraph structure"`

This was **rule #5**, but it OVERRODE structural rewriting because the LLM was pattern-matching it as: "just change the words, keep the skeleton." ZeroGPT detects STRUCTURE, not vocabulary. So all good-looking outputs were still 100% AI detected.

**Example of the broken behavior:**
- Input: `"Artificial intelligence has become an essential part of modern technology, allowing systems to analyze data, recognize patterns, and automate decision-making processes."`
- V12.3 output: `"Artificial intelligence is now a key part of modern technology, enabling systems to analyze data, spot patterns, and make decisions automatically."`
- Pattern: `[Topic] is [description], [gerund] [list of 3]` → IDENTICAL structure, just synonyms

**How V12.5 fixed it:**
- Deleted the "structure preservation" rule entirely
- Made "STRUCTURAL REBUILD" rule #1 (was #5)
- Added WRONG vs RIGHT few-shot example in the prompt showing exactly what structural rebuilding looks like
- Raised temperature to 0.80 so the LLM steps outside conservative mode

---

## V12.5 Architecture — NLP Pipeline (16 layers)

```
Input text
  ↓
[LLM Rewrite — Llama-3.3-70B-versatile]
  Temperature: 0.80 casual, 0.55 academic
  Prompt: Holistic structural rebuild + WRONG/RIGHT few-shot example
  ↓
Layer 1:  applyContractionExpansion         — expand AI contractions
Layer 2:  applySentenceVariation            — split/vary sentence lengths
Layer 3:  applyVocabSimplification          — replace formal/AI words
Layer 4:  applyActiveVoice                  — passive to active
Layer 5:  applyIMFApproximation             — inject filler phrases (35%)
Layer 6:  applyPunctuationVariation         — comma splices, dashes
Layer 7:  applyDeicticInjection             — casual "you/we" pronouns (20%)
Layer 8:  applySentenceStarterDiversifier   — And/But/So openers (40%)
Layer 9:  applyClauseReordering             — move clauses around (30%)
Layer 10: forceBurstiness                   — short+long sentence mix (merge threshold: 14w)
Layer 11: applySemanticDrift                — minor meaning drift for variety
Layer 12: applyHedgePhrases                 — uncertainty markers
Layer 13: applyAST                          — abstract syntax tree rewrites
Layer 14: applySemanticDrift (2nd pass)
Layer 14b: applyHumanPatterns (NEW V12.5)   — parenthetical asides + reaction fragments
Layer 15: applyMeaningLock                  — block opinion injection, preserve facts
  ↓
Variant selection → best variant (lowest similarity to input)
  ↓
Output
```

---

## Key Files at This Lock State

| File | Purpose | Key V12.5 Changes |
|---|---|---|
| `server/routes/humanizer.ts` | API endpoint + LLM orchestration | Temp 0.80, holistic prompt rewrite, AST prompt rewrite, Layer 14b |
| `server/utils/nlp.ts` | All 15+ NLP pipeline layers | IMF 35%, burstiness merge 14w, pronouns casual, NEW `applyHumanPatterns()`, starter diversifier 40% |

---

## Restore to V12.5 (Emergency)

If a future change degrades quality, run this to roll back to V12.5:

```powershell
git checkout 65eb263 -- server/utils/nlp.ts server/routes/humanizer.ts
git commit -m "revert(humanizer): restore V12.5 golden state"
git push origin main
```

Wait 3-4 minutes for Render to redeploy, then test on `www.bongbari.com/tools/humanizer`.

---

## Roll Back to V12.3 (Older Golden)

If V12.5 somehow has issues and you need an older safe point:

```powershell
git checkout 29083e1 -- server/utils/nlp.ts server/routes/humanizer.ts
git commit -m "revert(humanizer): restore V12.3 golden state"
git push origin main
```

---

## ⚠️ What NOT to Change in V12.5

These settings were carefully tuned. Changing them without re-testing against ZeroGPT risks going back to 100% AI detected.

| Setting | Location | Current value | Risk if changed |
|---|---|---|---|
| Temperature (casual) | `humanizer.ts` | `0.80` | Lower = synonym swap behavior |
| `buildHolisticPrompt()` first rule | `humanizer.ts` | `"STRUCTURAL REBUILD"` | Moving it down = structure preservation kicks in |
| WRONG/RIGHT few-shot example | `humanizer.ts` | Present | Removing = LLM loses guidance |
| IMF rate | `nlp.ts` | `0.35` | Lower = AI-flat rhythm returns |
| Burstiness merge threshold | `nlp.ts` | `14` words | Lower = short sentences not merged = robotic bursts |
| `applyHumanPatterns` in pipeline | `humanizer.ts` | Layer 14b | Removing = no asides/fragments |

---

*Documented by the engineering process. Next version: V12.6 if future improvements are validated.*
