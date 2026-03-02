# Advanced Pipeline Roadmap: BongBari V13+

This document outlines the strategic progression for the BongBari AI Text Humanizer. **None of these features are implemented yet**, they are solely laid out here for theoretical review as requested.

## 1. The Adversarial Loop (The Judge and the Lawyer)
Currently, the pipeline accepts the first draft the model produces (with some server-side modifications).
**The Plan:** 
- Implement an internal *Adversarial Verification Loop*.
- Once a draft is generated, an internal *Detector Agent (The Judge)* scores it.
- If the draft scores >90% AI probability, it is immediately rejected.
- The pipeline instructs the *Generator Agent (The Lawyer)*: "Try again, it sounds too AI. Fix the intro and adjust the entropy."
- The system will naturally loop 3-5 times until it forces out a truly organic draft.

## 2. Semantic Cloaking (The Shape-Shifter)
Most traditional humanizers simply perform synonym swapping (e.g. happy -> ecstatic). AI detectors easily flag this because the underlying structure remains identical.
**The Plan:**
- Restructure the *sentence DNA* using Semantic Cloaking.
- Actively manipulate the text voice (e.g., Passive to Active, or vice versa).
- Invert the sequence of bullet points and arguments.
- Merge disjointed sentences and shatter long ones. 
- Defeat pattern-recognition engines at the structural level, not just the vocabulary level.

## 3. Multi-Model Voting (The Tribunal)
Right now, the heavy lifting relies on a single node/engine.
**The Plan:**
- Run parallel inferences across three distinct LLM engines simultaneously.
- **Node A (The Workhorse):** A 70B parameter model processes the deep structural rewrite.
- **Node B (The Chaotic):** An 8B parameter model injects intentional, organic human flaws, slang, and dialect.
- **Node C (The Polisher):** A specialized model corrects structural grammar while strictly preserving the "vibe" and tone.
- A final consensus step merges the best traits from all three, resulting in an untraceable synthesis.

## 4. Phase 3 & 5 Roadmap Connectors
- **Phase 3 - Contextual Memory:** Storing user preferences and previous successful mutations to train a personalized style profile.
- **Phase 5 - Headless Verification Agent:** Offloading the detector "Judge" onto a microservice to constantly probe and test the newest detection engines released by competitors, ensuring our humanizer stays ahead of the algorithmic curve.
