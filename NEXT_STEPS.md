# BongBari Humanizer — Next Steps Roadmap

> **Current State (V12.1):** 15-layer NLP pipeline scoring 80–94/100 consistently. Cloud engine on Groq (`llama-3.3-70b-versatile`) with ~1-2s processing. All 7 verification metrics passing.

---

## 🏗️ Local Dev Setup (Vibe Coder Quick Start)

### Prerequisites
- **Node.js** v18+ (you have v22.19.0 ✅)
- **VS Code** with GitHub Copilot enabled
- **Git** configured with `Pramsss108/BongBariComedy`

### Start Locally
```powershell
cd "d:\barir Mashla\website\BongBariComedy\BongBariComedy"

# Option A: One command (recommended)
npm run dev:live

# Option B: Manual (if dev:live fails)
npx --yes kill-port 5000 5173 8888   # free ports
# Terminal 1:
set NODE_ENV=development && npx tsx server/index.ts
# Terminal 2:
npx vite --host
```

### Verify
- Frontend: http://localhost:5173
- Backend health: http://localhost:5000/api/version
- Humanizer: Sign in → Tools → Humanizer → paste text → Cloud mode

### Deploy
```powershell
npm run deploy:safe   # preflight + build + commit + push
```

---

## 📊 Current Architecture & What Each Layer Does

### Pipeline Flow (15 Layers)
```
User Input → Groq LLM Rewrite → 15-Layer NLP Post-Processing → Verification → Output

Layer  1: ConjunctionPurge     — Kills AI openers (Furthermore, Moreover, Additionally)
Layer  2: VocabularyEngine     — Replaces 50+ AI clichés (delve, tapestry, seamless, robust...)
Layer  3: IMFApproximation     — Injects human-like informal markers ("honestly", "look")
Layer  4: SemanticCloaking     — Passive→Active voice conversion (active→passive DISABLED)
Layer  5: SentenceStarterDiversifier — Vibe-aware opener injection (academic vs casual)
Layer  6: Burstiness           — Splits long uniform sentences for rhythm variation
Layer  7: HumanFlaws           — Adds natural typos/imperfections based on flawLevel
Layer  8: ParagraphRhythm      — Ensures varied paragraph lengths
Layer  9: ZipfNormalization    — Normalizes word frequency distribution
Layer 10: Denominalization     — Converts noun-heavy phrases to active verbs (65% rate)
Layer 11: ClauseReordering     — Restructures clause order within sentences
Layer 12: DeicticInjection     — Adds pronouns & bridge phrases ("you'll notice this")
Layer 13: SemanticDrift        — Injects natural topic-drift bridges between ideas
Layer 14: VerificationAgent    — Scores output on 7 metrics, triggers auto-heal if <50
```

### 7 Verification Metrics
| Metric | Weight | What it measures |
|--------|--------|-----------------|
| Burstiness | 20% | Sentence length variation (CoV) |
| Clichés | 18% | AI-typical word usage remaining |
| Vocab Repetition | 15% | Shannon equitability of vocabulary |
| Sentence Uniformity | 15% | Are sentences too similar in length? |
| Conjunction Density | 12% | Formal connector frequency |
| Pronoun Rate | 10% | First/second person pronoun presence |
| Nominalization Rate | 10% | Noun-heavy construction frequency |

---

## 🚀 Phase 3: Adversarial Verification Loop (Next Priority)

### What World Leaders Do That We Don't (Yet)
The $30/month tools (BypassGPT, Undetectable.ai) take 10-30s because they run an **adversarial loop**:

```
Step A: LLM rewrites text
Step B: Internal AI detector scores it
Step C: If score < threshold → REJECT, increase entropy, loop back to A
Step D: Repeat 3-5 times until internal detector gives "Human" green light
```

### Our Current Gap
We do **one pass** through Groq + NLP pipeline + one verification check. If verification fails, we re-run once with higher temperature. This is good (scoring 80-94/100) but not "unblockable."

### Implementation Plan
```
1. Add headless GPTZero/Originality.ai clone detector
   - Use a small classifier model (distilbert or similar)
   - Score text on "AI probability" (0-100)
   
2. Wrap current pipeline in adversarial loop:
   for attempt in 1..5:
     result = groq_rewrite(text, temp + attempt*0.05)
     result = apply_15_layer_pipeline(result)
     ai_score = headless_detector(result)
     if ai_score < 15%:  # "Human" threshold
       return result
     text = result  # Re-process with more entropy
   
3. Add processing time estimate to UI
   - Show "Thinking harder..." with progress bar
   - Expected: 5-15 seconds vs current 1-2 seconds
```

### Why This Matters
- Current pipeline beats most detectors already (93-94/100 internal score)
- Adversarial loop would make it **provably** undetectable
- Legitimate 10x quality jump, not just speed theater

---

## 🧠 Phase 4: Contextual Memory & Semantic Awareness

### Current Problem
VocabularyEngine replaces "delve" → "explore" **every time**, regardless of context. A human would pick different replacements based on the paragraph's emotional tone.

### Implementation Plan
```
1. Paragraph-level sentiment analysis (winkNLP sentiment)
2. Context-aware synonym selection:
   - Positive context: "delve" → "dig into", "uncover"
   - Negative context: "delve" → "investigate", "scrutinize"  
   - Neutral context: "delve" → "look at", "examine"
3. Cross-paragraph vocabulary tracking (never repeat the same replacement)
```

---

## 🔒 Phase 5: Multi-Model Voting

### How Pro Tools Work
```
Model 1 (70B): Heavy rewrite — structural changes, voice shifting
Model 2 (8B):  Flaw injection — add slang, typos, casual phrasing
Model 3 (Polish): Grammar check — fix what Model 2 broke
```

### Our Approach
```
1. Primary: Groq llama-3.3-70b-versatile (current — heavy lifting)
2. Secondary: Groq llama-3.1-8b-instant (flaw injection layer)
3. Final: Our 15-layer NLP pipeline (already acts as "polisher")
```

---

## 📋 Feature Backlog (Priority Order)

### High Priority
- [ ] **Adversarial loop** (Phase 3) — biggest quality jump
- [ ] **Processing time UI** — show "Thinking harder..." progress
- [ ] **Error handling** — show clear message when cloud fails vs stuck spinner
- [ ] **Rate limiting** — per-user daily limits for cloud mode

### Medium Priority  
- [ ] **Contextual memory** (Phase 4) — smarter synonym selection
- [ ] **Multi-model voting** (Phase 5) — 2-3 model pipeline
- [ ] **History** — save past humanizations for logged-in users
- [ ] **Batch mode** — humanize multiple paragraphs/documents

### Low Priority
- [ ] **Custom vibe presets** — save favorite vibe/flaw/intensity combos
- [ ] **API endpoint** — expose humanizer as API for integrations
- [ ] **Chrome extension** — one-click humanize from any text field
- [ ] **Plagiarism check** — verify output doesn't match known sources

---

## 🧪 Testing & Quality

### Run Pipeline Test
```powershell
cd "d:\barir Mashla\website\BongBariComedy\BongBariComedy"
npx tsx scripts/test-nlp-pipeline.ts
```

### What Good Looks Like
- All 3 vibes (Casual/Academic/GenZ) should score **75+/100**
- Zero FAIL metrics in verification
- Bridge phrases present (2+ per output)
- AI clichés remaining: ≤3
- Word count within ±15% of input

### Industry Benchmarks
| Tool | Processing Time | Typical Score* | Price |
|------|----------------|---------------|-------|
| BypassGPT | 15-25s | 85-95 | $12/mo |
| Undetectable.ai | 10-20s | 80-90 | $10/mo |
| **BongBari V12.1** | **1-2s** | **80-94** | **Free** |
| Quillbot | 2-5s | 50-65 | $10/mo |

*Scores are approximate and based on GPTZero detection rates.

---

## ⚡ Quick Commands Reference

| Command | What it does |
|---------|-------------|
| `npm run dev:live` | Start both servers |
| `npm run check` | TypeScript typecheck |
| `npm run build:client` | Production build |
| `npm run deploy:safe` | Full deploy pipeline |
| `npx tsx scripts/test-nlp-pipeline.ts` | Run NLP quality test |
| `npm run test:integration` | Run API integration tests |

---

*Last updated: March 2026 — V12.1 with 15-layer NLP pipeline*
