# 🧠 AI Researcher Prompt: Zero-Cost Bengali TTS Quest

***Instructions for User:** Copy and paste the text below exactly as written into NotebookLM, ChatGPT Deep Research, or your dedicated Researcher AI Agent. This prompt is precision-engineered to get you viable, zero-cost production architectures.*

---

**System Role:** You are an elite, production-focused AI Architect specializing in zero-cost ($0), high-performance inference pipelines for indie developers. Your goal is to find actionable, completely free solutions for Bengali Text-to-Speech (TTS).

**Current Architecture Context:**
- We have successfully built a web app.
- For English TTS, we use `Kokoro-82M` completely offline in the browser via WebGPU/WASM. Cost is $0.
- For Bengali TTS, we currently rely on the **Meta MMS (facebook/mms-tts-ben)** model. We are calling it via the free HuggingFace Gradio Space API (`dpc/mmstts`).
- We know that HuggingFace "ZeroGPU" spaces block external API calls (`@gradio/client`) with Cloudflare Turnstile, so any solution MUST NOT rely on ZeroGPU spaces if it's meant to be an API.
- We do not want to self-host expensive GPU instances. We have a Cloudflare Worker architecture acting as our proxy.

**Your Research Objectives (Please answer systematically):**

1. **The Ultimate Free API Search:**
   Apart from the `dpc/mmstts` Gradio Space and the default HuggingFace Serverless Inference API (which rate-limits and cold-starts), are there *any* other completely free, public APIs, endpoints, or un-metered cloud functions reliably serving Bengali TTS (VITS, FastSpeech, etc.) in 2024/2025? Provide exact URLs and integration methods.

2. **The WebGPU Offline Frontier (Like Kokoro, but for Bengali):**
   We achieved 100% offline, zero-cost English TTS using Kokoro 82M in the browser via WebGPU. 
   - Is there *any* equivalent, lightweight Bengali TTS model that can be compiled to ONNX and run entirely in the browser using `transformers.js` or a WebGPU pipeline? 
   - If not natively available, how feasible is it to convert the `facebook/mms-tts-ben` model to ONNX for `transformers.js` so it runs locally on the user's phone/PC browser? Provide a technical roadmap for this conversion if possible.

3. **Exploiting Alternative Free Tiers:**
   Are there alternative platforms (like Google Colab, Kaggle, or Render) where we can deploy a lightweight Bengali TTS container (e.g., using a quantized VITS model) that stays "awake" or cold-starts incredibly fast, completely on a free tier without requiring a credit card? What is the specific deployment strategy?

4. **The "Pre-Processing" Magic:**
   If we are stuck with the Meta MMS Bengali model as our only free API, what are the undocumented developer tricks (preprocessing strings, SSML hacks, phonetic respelling) to make the robotic MMS voice sound more natural, pause correctly with comedic timing, and simulate emotion? 

**Constraint Warning for AI:** Do not suggest AWS, Google Cloud TTS, Azure TTS, or ElevenLabs. Do not suggest paying for HuggingFace Pro endpoints. Do not suggest solutions that require us to buy hardware. Everything must be $0 scalable production infrastructure or 100% client-side execution.
