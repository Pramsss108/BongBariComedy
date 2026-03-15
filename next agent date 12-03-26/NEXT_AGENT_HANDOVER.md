# 🤖 BONG BARI COMEDY: AI AGENT HANDOVER PROTOCOL

**CRITICAL INSTRUCTION FOR NEXT AI AGENT:**
You are inheriting a high-performance, specifically engineered codebase. This project uses a **Vibe Coding** methodology. **DO NOT** rewrite systems without explicit instruction. **DO NOT** hallucinatory code. Read this document carefully before making ANY changes.

---

## 1. Project Context & Vibe
- **App:** BongBariComedy - A web platform for AI audio tools (Voice Studio, Sarkari Compress, AI Detector).
- **Stack:** React (Vite), TypeScript, Tailwind CSS, Lucide Icons.
- **Aesthetic:** "Premium Cyber Sentinel" - Dark mode, glassmorphism (`bg-black/40 backdrop-blur-md`), neon glowing borders (`border-[#F59E0B]/50`), buttery smooth transitions.
- **Deployment:** Frontend on GitHub Pages (`/client`), Backend proxy/logic via Cloudflare Workers or Render (`/server`).

---

## 2. What We Have Built (Current State)

### The Voice Hub (`client/src/pages/VoiceHub.tsx`)
This is the core feature. It has two modes:
1.  **ENG (Offline First):** Uses `Kokoro-82M` running 100% locally in the browser via WebWorker (`kokoro-engine.ts`). It costs $0 and runs instantly.
2.  **BNG (Server API):** Uses **Meta MMS** (`mms-tts-ben`). Handled via a direct fetch to a free HuggingFace Gradio Space. We built a robust retry mechanism.

### Key Files & Locations
- **Main UI:** `client/src/pages/VoiceHub.tsx`
- **Bengali TTS Engine:** `client/src/lib/bengali-tts-engine.ts` (Locked to MMS. Clean API route).
- **English TTS Worker:** `client/src/lib/kokoro-engine.ts` (Browser-based WebGPU processing).
- **Speech-to-Text:** `client/src/lib/whisper-engine.ts` (Browser-based Whisper model).

---

## 3. STRICT RULES: What NOT To Do (Anti-Hallucination)

1.  **DO NOT TOUCH THE BENGALI TTS PIPELINE:** The `bengali-tts-engine.ts` file is locked. It uses Meta MMS. We have already tested Indic Parler (ZeroGPU blocked), Bangladeshi VITS (Dead), and HF Inference API (Unreliable). **Do not attempt to switch the API endpoint to a ZeroGPU HuggingFace Space.** It will fail due to Cloudflare Turnstile blocks.
2.  **NO FAKE APIS:** Never implement a `setTimeout` function that pretends to generate audio. If an API doesn't work, throw an error and show the user.
3.  **NO PLACEHOLDERS:** Do not write `// TODO: implement this logic`. Write the full code.
4.  **RESPECT THE UI:** Buttons must have the classes `transition-all duration-300 active:scale-95`. Dropdowns must use dark mode styling. Do not introduce default white browser UI elements.
5.  **NO LOCAL FILE SYSTEM CALLS IN BROWSER:** This app runs on GitHub pages. You cannot use `fs` or `path` modules in the `client/` directory.

---

## 4. What is Left (The "Antigravity" Master Prompt for Next Build)

**Objective:** Build a "No-Latency Bengali Voice Hub".

If you are continuing development, your primary directives are:
1.  **The ONNX WebGPU Frontier:** Use `transformers.js` (v3+) with a quantized MMS-TTS-BEN ONNX model for 100% offline client-side TTS (replicating our Kokoro success). See `V17_ONNX_WEBGPU_BENGALI_MASTERPLAN.md` for the exact export script and roadmap.
2.  **The "Pre-Processing" Magic:** Write `bengali-preprocessor.ts` to hack the robotic MMS voice. Implement Phonetic Respelling (`Bha-lo-ba-shi`), Punctuation Overload (`Ei! ...`), and English-to-Bengali phonetic auto-translation so the model pauses naturally and sounds like a Bong Bari comedic star.
3.  **The Proxy Fallback:** Setup a Cloudflare Worker Proxy to rotate between 5 different HF Gradio Spaces (dpc/mmstts, etc) as a pure backup if WebGPU fails on the user's phone.
4.  **$0 Permanent Storage:** Store the final generated `.wav` files in GitHub Releases or Cloudflare R2 automatically so they are hosted for $0 forever.

**ACKNOWLEDGE THIS HANDOVER:** When you start your session, confirm you have read the "AI AGENT HANDOVER PROTOCOL" and the V17 Masterplan.
