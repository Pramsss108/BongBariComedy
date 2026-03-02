# HUMANIZER V13 FIX PLAN — Originality.ai Bypass Strategy

## STATUS: PLANNING (No code changes yet — read fully before executing)

---

## THE PROBLEM (Proven by Originality.ai screenshot — 100% AI Confident)

The current V12.5 pipeline produces text that **looks like an AI trying to sound human** rather than actual human writing. Every detector (Originality.ai, GPTZero, ZeroGPT, Turnitin) catches it instantly. The root cause is NOT a single bug — it's a **systemic architecture flaw** across 6 proven failure patterns.

---

## DIAGNOSED ROOT CAUSES (6 Proven Failure Patterns)

### Pattern 1: Over-Structured "Fake Casual"
- **WHERE IT HAPPENS:** System prompt in `humanizer.ts` lines 163-185 (Holistic prompt)
- **THE FLAW:** Prompt tells LLM to use "rhetorical questions", "fragments", "em-dash asides" aggressively
- **DETECTOR LOGIC:** Question→Answer→Question→Answer creates LOW ENTROPY pattern blocks that math detectors flag instantly
- **EXAMPLE:** "So, what's the big deal about cows? They're domestic animals..." — scripted conversational style

### Pattern 2: Em-Dash Spam
- **WHERE IT HAPPENS:** `forceBurstiness()` in `nlp.ts` lines 138-145 joins short sentences with " — " (em-dash)
- **THE FLAW:** Every pair of short sentences gets em-dashed together creating "stylized rewriting engine" fingerprint
- **DETECTOR LOGIC:** High em-dash density per 100 words is a known AI-humanizer signature
- **FIX:** Limit em-dash to MAX 1 per paragraph. Use commas, semicolons, or just keep sentences separate.

### Pattern 3: NLP Pipeline Over-Processing (Too Many Layers)
- **WHERE IT HAPPENS:** `humanizer.ts` lines 299-342 — 15 NLP layers stacked sequentially
- **THE FLAW:** Each layer adds its own fingerprint. By layer 15, the text has:
  - Vocabulary replacements from `applyVocabularyEngine` (changes "important" → "central")
  - IMF replacements from `applyIMFApproximation` (changes "shows" → "reveals")  
  - Starter replacements from `applySentenceStarterDiversifier` (adds "Still,", "In practice,")
  - Pattern injections from `applyHumanPatterns` (adds "(no surprise there)", "That matters.")
  - These STACK creating multi-tone instability: casual + dramatic + informative = DETECTOR FLAG
- **MATH VIEW:** Each layer drops perplexity predictability while RAISING burstiness artificially. The combined output has:
  - Perplexity: artificial spikes (not natural human range 20-50)
  - Burstiness: over-forced (not organic)
  - Pattern repetition: high (each NLP layer repeats at predictable intervals)

### Pattern 4: Meaning Distortion
- **WHERE IT HAPPENS:** `applyIMFApproximation()` + `applyVocabularyEngine()` + `applyDenominalization()`
- **THE FLAW:** Aggressive synonym replacement creates wrong English: "we use it to result in curd" instead of "we use it to make curd"
- **DETECTOR LOGIC:** These are "low-quality transformations" that no human would write — flagged as rewrite engine artifacts

### Pattern 5: Filler Phrase Injection
- **WHERE IT HAPPENS:** `applyHumanPatterns()` lines 1050-1085 injects parenthetical asides like "(no surprise there)", "(for better or worse)", "(at least for now)"
- **THE FLAW:** These are meaning-neutral FILLER that a human would never add to well-structured text
- **DETECTOR LOGIC:** Extra tone injection with no semantic purpose = AI rewrite signature

### Pattern 6: Sentence Fragment Abuse  
- **WHERE IT HAPPENS:** `applyHumanPatterns()` + `applyParagraphRhythm()` inject "That matters.", "Not ideal.", "Big difference."
- **THE FLAW:** Human text has organic fragments that emerge from context. These are FORCED fragments with no contextual trigger
- **DETECTOR LOGIC:** Fragment spam creates artificial burstiness — detectors see the rhythm is manufactured

---

## V13 FIX STRATEGY (20 Precise Phrases for AI Agents)

### PHRASE 1: Rewrite the Holistic System Prompt
- **FILE:** `server/routes/humanizer.ts` → `buildHolisticPrompt()`
- **REMOVE:** All instructions about "rhetorical questions", "sentence fragments", "em-dash asides", "short punchy sentences under 7 words"
- **REPLACE WITH:** "Rewrite the following text in your own words. Keep the same meaning and facts. Use natural sentence flow. Write like a competent human — not a creative writing exercise. Avoid gimmicks."
- **CRITICAL:** The prompt must NOT tell the LLM to add stylistic devices. The LLM should just write clean prose.

### PHRASE 2: Rewrite the AST-Block System Prompt
- **FILE:** `server/routes/humanizer.ts` → `buildASTPrompt()`
- **SAME FIX AS PHRASE 1:** Remove all forced style instructions. Keep only: meaning lock, word count lock, AST structure lock, no AI clichés.

### PHRASE 3: Kill the "WRONG vs RIGHT" Examples in Prompts
- **FILE:** `server/routes/humanizer.ts` lines 163-185
- **PROBLEM:** The example teaches the LLM to OVER-restructure. The "RIGHT" example itself uses em-dashes, rhetorical questions, and fragments — exactly what detectors catch.
- **FIX:** Remove the example entirely OR replace with a subtle, clean example that shows natural paraphrasing without gimmicks.

### PHRASE 4: Slash the NLP Pipeline from 15 Layers to 5 Essential Layers
- **FILE:** `server/routes/humanizer.ts` lines 299-342
- **KEEP:** (1) `applyConjunctionPurge` — strips AI discourse markers (proven useful), (2) `applyVocabularyEngine` — replaces AI cliché words (proven useful), (3) `applyHumanFlaws` — controlled contractions/typos (mild, useful), (4) `applySemanticCloaking` — voice flip on 30% sentences (subtle), (5) `runVerificationAgent` — the in-house detector (keep for scoring)
- **DISABLE:** `applyIMFApproximation`, `applySentenceStarterDiversifier`, `forceBurstiness`, `applyParagraphRhythm`, `applyZipfNormalization`, `applyDenominalization`, `applyClauseReordering`, `applyDeicticInjection`, `applySemanticDrift`, `applyHumanPatterns`
- **WHY:** These 10 layers compound into an OVER-ENGINEERED fingerprint. Less is more.

### PHRASE 5: Fix `forceBurstiness()` Em-Dash Limit
- **FILE:** `server/utils/nlp.ts` → `forceBurstiness()`
- **CURRENT:** Joins ALL adjacent short sentences (<14 words each) with " — "
- **FIX:** Add a counter. Maximum 1 em-dash join per paragraph. After that, leave sentences separate.

### PHRASE 6: Defang `applyIMFApproximation()` 
- **FILE:** `server/utils/nlp.ts` → `applyIMFApproximation()`
- **PROBLEM:** Replaces 35% of common words with alternatives creating garbled English
- **FIX:** Either DISABLE entirely (Phrase 4) or drop rate to 10% max and add grammar-safe guards

### PHRASE 7: Remove Filler Injections from `applyHumanPatterns()`
- **FILE:** `server/utils/nlp.ts` → `applyHumanPatterns()`
- **FIX:** Delete the `casualAsides` array: "(and it shows)", "(no surprise there)", "(for better or worse)" etc.
- **FIX:** Delete the `casualFragments` array: "That matters.", "Not ideal.", "Big difference." etc.
- **OR:** Disable this entire function (Phrase 4)

### PHRASE 8: Remove Sentence Starter Diversifier Aggression
- **FILE:** `server/utils/nlp.ts` → `applySentenceStarterDiversifier()`
- **PROBLEM:** Prepends "Still,", "In practice,", "And", "But", "So" to 40% of sentences — creates pattern density
- **FIX:** Either DISABLE (Phrase 4) or drop to 15% and remove "Still," and "In practice," (they sound forced)

### PHRASE 9: Fix the Auto-Heal Prompt
- **FILE:** `server/routes/humanizer.ts` lines 345-365
- **PROBLEM:** The healing prompt tells the model to add "STRUCTURAL CHAOS" with em-dashes, short punchy sentences, rhetorical questions — the exact same things that caused the ORIGINAL detection
- **FIX:** Replace healing prompt with: "This text reads like AI. Simplify it. Use straightforward sentence structure. Vary length naturally — don't force it. Remove any gimmicky fragments or rhetorical devices."

### PHRASE 10: Temperature & Top-P Recalibration
- **FILE:** `server/routes/humanizer.ts` lines 127-137
- **CURRENT:** Casual vibe = temp 0.80, top_p 0.90
- **PROBLEM:** 0.80 temp causes the LLM to OVER-restructure, creating the fake-casual fingerprint
- **FIX:** Casual = temp 0.60, top_p 0.85. Let the model write more conservatively. Academic = temp 0.45. GenZ = temp 0.75.

### PHRASE 11: Contraction Consistency Enforcement
- **FILE:** `server/utils/nlp.ts` → `applyHumanFlaws()`
- **CURRENT:** Only converts "do not" → "don't" and "cannot" → "can't" at 50%
- **FIX:** Add ALL common contractions: "will not" → "won't", "is not" → "isn't", "are not" → "aren't", "does not" → "doesn't", "has not" → "hasn't", "could not" → "couldn't", "would not" → "wouldn't", "should not" → "shouldn't". Rate: 85% for casual, 40% for academic, 95% for genz.

### PHRASE 12: Paragraph Structure Rules for Prompt
- **FILE:** `server/routes/humanizer.ts` → `buildHolisticPrompt()`
- **ADD RULE:** "Paragraphs should be 2-4 sentences each. Do NOT create 1-sentence paragraphs for dramatic effect. Do NOT create paragraphs longer than 5 sentences."
- **WHY:** The paragraph rhythm layer was creating artificial 1-sentence paragraphs. Natural human writing rarely does this in informational text.

### PHRASE 13: Remove Clause Reordering Layer
- **FILE:** `server/utils/nlp.ts` → `applyClauseReordering()`
- **PROBLEM:** Flips "because" clauses to front at 30% rate — creates noticeably odd sentence starts
- **FIX:** DISABLE (Phrase 4). Let the LLM handle clause order naturally in its initial rewrite.

### PHRASE 14: Update Verification Agent Thresholds
- **FILE:** `server/utils/nlp.ts` → `runVerificationAgent()`
- **PROBLEM:** Passes text at humanScore >= 50 — this is too low. Originality.ai catches text that scores 50-70 on internal metrics.
- **FIX:** Raise pass threshold to >= 65. On failure, the auto-heal should use the SIMPLIFIED prompt (Phrase 9), not the "structural chaos" one.

### PHRASE 15: Vocabulary Engine Scope Reduction
- **FILE:** `server/utils/nlp.ts` → `applyVocabularyEngine()`
- **CURRENT:** 40+ synonyms with random replacement
- **PROBLEM:** Over-replacement creates vocabulary that doesn't match the tone (e.g., "central" instead of "important" in casual text)
- **FIX:** For casual vibe, keep ONLY the top-10 most blatant AI words (delve, tapestry, leverage, utilize, robust, holistic, seamlessly, paradigm, foster, multifaceted). Leave everything else alone.

### PHRASE 16: Test with the EXACT Originality.ai Input
- **FILE:** Manual testing step
- **INPUT TEXT:** The cow essay that scored 100% AI in the screenshot
- **PROCESS:** Run it through the V13 pipeline, paste output into Originality.ai, screenshot result
- **TARGET:** Score below 40% AI (ideally below 20%)

### PHRASE 17: A/B Test Simple vs Complex Pipeline
- **PROCESS:** Run same input through (A) LLM-only with clean prompt, zero NLP layers and (B) LLM + 5 essential layers
- **MEASURE:** Which one scores lower on Originality.ai
- **HYPOTHESIS:** (A) will score lower because the NLP layers ADD detectable patterns rather than removing them

### PHRASE 18: Healing Loop Iteration Cap
- **FILE:** `server/routes/humanizer.ts` lines 345-380
- **CURRENT:** Runs 1 heal attempt
- **FIX:** Allow up to 2 heal attempts (with different prompts each time). If still failing after 2, return best variant with warning.

### PHRASE 19: Output Length Guard
- **FILE:** `server/routes/humanizer.ts`
- **PROBLEM:** NLP layers can inflate or deflate word count beyond ±10% tolerance
- **FIX:** Add a final word-count check AFTER the full pipeline. If output exceeds ±15% of input, return the PRE-NLP LLM output instead.

### PHRASE 20: Client-Side Feedback Loop
- **FILE:** `client/src/pages/humanizer.tsx` (or wherever the UI is)
- **ADD:** Show the verification report score prominently. If score < 65, show amber warning: "This may still be flagged by some detectors. Try re-running or switching to Academic vibe."
- **WHY:** Sets user expectations and gives them actionable next steps.

---

## EXECUTION ORDER (For AI Agents)

1. **Phrase 1 + 2 + 3:** Rewrite prompts (biggest impact, zero risk)
2. **Phrase 4:** Disable 10 NLP layers (massive simplification)
3. **Phrase 10:** Temperature recalibration
4. **Phrase 9:** Fix auto-heal prompt
5. **Phrase 5:** Fix burstiness em-dash limit
6. **Phrase 11:** Contraction enforcement
7. **Phrase 15:** Vocabulary engine scope reduction
8. **Phrase 14:** Verification threshold raise
9. **Phrase 12 + 18 + 19:** Prompt rules + healing loop + length guard
10. **Phrase 16 + 17:** Test and measure

---

## GOLDEN RULE FOR ALL AGENTS

**The output should read like clean, slightly varied human text.**

- NOT "AI trying to look human" (gimmicks, fragments, dashes everywhere)
- NOT "synonym-swapped AI" (same structure, different words)  
- YES "naturally rewritten prose" (different framing, same facts, clean grammar)

**If the output sounds like it's TRYING to sound human, it has already failed.**

---

## FILES THAT WILL BE MODIFIED

| File | What Changes |
|------|-------------|
| `server/routes/humanizer.ts` | System prompts, temperature, pipeline order, healing prompt |
| `server/utils/nlp.ts` | Disable 10 layers, fix burstiness, fix vocabulary scope |
| `client/src/pages/humanizer.tsx` | Add score warning UI (optional, Phrase 20) |
