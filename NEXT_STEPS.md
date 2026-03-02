# Advanced Pipeline Roadmap: BongBari V13+

> **⚠️ GOLDEN BASELINE: V12.3** (commit `29083e1`) scores **0% AI on ZeroGPT**, **91/100 Human Score**.
> Every feature below MUST pass the Quality Gate before merging. If any change degrades quality,
> revert immediately: `git checkout 29083e1 -- server/utils/nlp.ts server/routes/humanizer.ts`
> Full documentation: see `V12_3_GOLDEN_SNAPSHOT.md`

---

## Quality Gate (MANDATORY for every change)

Before merging ANY enhancement below, it MUST pass ALL of these:

| # | Check | Pass Criteria |
|---|---|---|
| 1 | `npx tsx scripts/test-v12-3.ts` | 0 failures, drift ≤ ±10% |
| 2 | ZeroGPT.com test (4-paragraph sample) | ≤ 5% AI detected |
| 3 | Internal human score | ≥ 85/100 |
| 4 | Filler phrases in output | 0 |
| 5 | Word count drift | ≤ ±10% |
| 6 | Meaning check (manual) | No added topics/opinions |

**If ANY check fails → do NOT deploy. Revert and investigate.**

---

## Priority Tier: SAFE Enhancements (Low Risk)

These build on V12.3 without touching the core pipeline rates.

### 1. Expanded Vocabulary Engine Synonyms
- **What:** Add more natural synonym mappings to `applyVocabularyEngine()` (currently 65+ entries).
- **Risk:** LOW — only expands existing word→word replacements.
- **Safety:** Each new synonym must be tested individually. No structural changes.
- **DO NOT:** Add informal slang to academic/professional vibes.

### 2. Verification Agent Metric Tuning
- **What:** Fine-tune the 7 metric weights in `runVerificationAgent()` based on detector feedback.
- **Risk:** LOW — only changes score weighting, not text transformation.
- **Safety:** Always keep pronoun rate as advisory-only (V12.3 lesson: formal text was getting rejected).

### 3. Input Pre-Processing Improvements
- **What:** Enhance `cleanInputText()` to strip more AI fingerprints (em-dashes, bullet formatting, numbered lists).
- **Risk:** LOW — pre-processing only, doesn't touch post-pipeline.
- **Safety:** Must preserve meaning and structure of user's original text.

---

## Priority Tier: MODERATE Enhancements (Test Heavily)

### 4. Adversarial Verification Loop (The Judge)
- **What:** After humanization, run the output through an internal AI-detection scoring heuristic.
  If the score is too "AI-like", re-run the pipeline with adjusted parameters.
- **Risk:** MODERATE — adds a retry loop; could over-process text if thresholds are wrong.
- **Safety Rules:**
  - Maximum 2 retries (not 3-5 as originally proposed — over-looping garbles text).
  - Each retry MUST re-check word count drift (≤ ±10%). If drift exceeds on retry, return best attempt so far.
  - Log every retry for debugging.
  - **DO NOT** change NLP layer rates inside the retry — only re-run the LLM with a tighter prompt.

### 5. Semantic Cloaking Expansion
- **What:** V12.3 already has `applySemanticCloaking()` doing passive→active voice at 30%. Expand to also handle Active→Passive for selected sentences (variety).
- **Risk:** MODERATE — changing voice direction could alter meaning if applied too aggressively.
- **Safety Rules:**
  - Keep combined rate at 30% maximum (not additive).
  - Never reorder arguments or bullet points (meaning distortion risk).
  - Never merge/split sentences here — `forceBurstiness()` already handles splitting at threshold 22.

---

## Priority Tier: HIGH RISK (Defer Until Infrastructure Ready)

### 6. Multi-Model Voting (The Tribunal)
- **What:** Run parallel inferences across 2-3 LLM engines, merge best traits.
- **Risk:** HIGH — consensus merging can introduce meaning drift, word inflation, and style inconsistency.
- **Why Defer:**
  - Requires additional API keys and cost budget.
  - Merging outputs from different models is an unsolved research problem.
  - V12.3 achieves 0% AI with a single model — adding complexity has no proven benefit yet.
- **If Attempted Later:**
  - Start with 2 models, not 3.
  - Use one model for generation, second for verification only (not generation).
  - Never auto-merge outputs — use the verifier to pick the better of two, not blend them.

### 7. Contextual Memory / User Style Profiles
- **What:** Store user preferences and past successful outputs to personalize future runs.
- **Risk:** HIGH — personalization can create feedback loops that drift quality over time.
- **Why Defer:**
  - Requires database schema changes and user session persistence.
  - Privacy implications (storing user text).
  - V12.3 works excellently without personalization.
- **If Attempted Later:**
  - Store only vibe/intensity preferences, NOT text content.
  - Never auto-adjust NLP rates based on history — keep V12.3 rates as floor values.

---

## 🚫 PERMANENTLY REJECTED Ideas

These were tested or analyzed and proven to degrade quality:

| Idea | Why Rejected |
|---|---|
| Re-enable SemanticDrift bridge phrases | Was #1 source of filler ("at least in most cases", "generally speaking") |
| Re-enable DeicticInjection bridges | Added "more or less", "in a way", "roughly speaking" filler spam |
| Raise IMF rate above 25% | At 40%, garbled phrasal verbs ("points can secure messy") |
| Lower burstiness threshold below 22 | At 18, over-split sentences and broke reading flow |
| Raise clause reordering above 20% | At 35%, broke logical argument flow |
| Add discourse markers in NLP layers | LLM handles "Honestly," / "Look," sparingly via prompt; NLP stacking doubled them |

---

## Implementation Order (Recommended)

1. **#1 Vocabulary Expansion** — Safest, most impactful per effort
2. **#3 Input Pre-Processing** — Catches more AI artifacts before pipeline
3. **#2 Verification Tuning** — Refines scoring without touching text
4. **#4 Adversarial Loop** — Only after items 1-3 are stable
5. **#5 Semantic Cloaking** — Only after item 4 is stable
6. **#6 & #7** — Defer indefinitely until there's a proven need

---

*Last updated: March 2, 2026 — Anchored to V12.3 golden baseline (commit `29083e1`)*
