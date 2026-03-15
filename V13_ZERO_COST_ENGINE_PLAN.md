# 🚀 V13 ZERO-COST ENGINE: FINAL IMPLEMENTATION GUIDE
**Status:** ✅ CONFIRMED & APPROVED — Ready for Implementation  
**Scope:** Voice Hub Only (TTS, Voice Cloning, Speech-to-Speech)  
**Cost:** $0.00 (All free tiers)

---

## 📋 The Confirmed Engine Stack

| Engine | Technology | Method | Cost |
|---|---|---|---|
| English TTS | **Kokoro TTS** (82M) | 100% browser, no login, no API | $0 |
| Bengali TTS | **IndicF5 (or MMS)** | API or Cloudflare Worker for high-quality Bangla | $0 |
| English Voice Cloning | **XTTS-v2** on ZeroGPU | Gradio Client inside Cloudflare Worker | $0 |
| Bengali Comedy Features | **Meme Voice Presets** | Angry Kaku, Drama Serial Narrator, Rickshaw Wala | $0 |
| Speech-to-Speech | **Whisper-tiny** + TTS | STT in browser, TTS via above engines | $0 |
| Auth | ~~**Supabase**~~ **Firebase** | Vibe Coder pivot: sticking to existing Google Login | $0 |
| Storage | **Cloudflare R2** | Save generated audio | $0 |

---

## 🏗️ PHASE 1: Supabase Auth + Cloudflare R2

### 🧑 YOU DO (Human Steps — Before Agent Codes)

**Step 1.1: Create Supabase Account**
1. Go to [https://supabase.com](https://supabase.com).
2. Click "Start your project" → Sign in with GitHub.
3. Click "New Project."
4. Set **Project Name** = `bongbari`.
5. Set **Database Password** = something strong (save it).
6. Set **Region** = Mumbai (closest to Kolkata).
7. Click "Create new project." Wait 2 minutes.

**Step 1.2: Get Supabase Keys**
1. In the Supabase dashboard, click **Settings** (gear icon) → **API**.
2. Copy **Project URL** (looks like `https://xxxxx.supabase.co`).
3. Copy **anon public** key (starts with `eyJ...`).
4. **DO NOT** copy the `service_role` key (that's secret).

**Step 1.3: Tell the Agent**
- Paste the **Project URL** and **anon key** when I ask for them. I will put them in your `.env` file.

**Step 1.4: Create Cloudflare R2 Bucket**
1. Go to [https://dash.cloudflare.com](https://dash.cloudflare.com).
2. Click **R2 Object Storage** in the left sidebar.
3. Click **Create Bucket**.
4. Name it `bongbari-audio`.
5. Leave defaults. Click **Create Bucket**.
6. Done. Tell the Agent it's ready.

### 🤖 AGENT DOES (Code Steps)

**Step 1.A: Install Supabase Client**
```
npm install @supabase/supabase-js
```

**Step 1.B: Create `client/src/lib/supabase.ts`**
- Initialize the Supabase client with the user's Project URL and anon key.
- Export a `supabase` singleton for the entire app.

**Step 1.C: Create `client/src/pages/LoginV2.tsx`**
- Build a premium glassmorphism login page.
- Use `supabase.auth.signUp()` and `supabase.auth.signInWithPassword()`.
- On success, redirect to Voice Hub.
- Store session in Supabase (not localStorage manually).

**Step 1.D: Create a Cloudflare Worker for R2 uploads**
- Write a Worker script that accepts audio blobs via POST.
- Saves them to the `bongbari-audio` R2 bucket.
- Returns a public URL for playback.

**Step 1.E: (PIVOT) Kill Supabase, Use Firebase**
- We initially built Supabase but it created a disjointed UX.
- Ripped out all Supabase code.
- Restored `useAuth.ts` and App routing to use the existing Google Firebase login.
- **[DONE]** Auth is successfully protecting `/voice-hub`.

---

## 🗣️ PHASE 2: English TTS (Kokoro) + Bengali TTS (MMS)

### 🧑 YOU DO (Human Steps)

**Step 2.1: Nothing!**
- Kokoro runs 100% in the browser. No account needed.
- Bengali MMS already works via your existing Cloudflare Worker (`orange-fire`).
- Just approve Phase 2 and the Agent will integrate Kokoro.

### 🤖 AGENT DOES (Code Steps)

**Step 2.A: Install Kokoro TTS**
```
npm install kokoro-js
```

**Step 2.B: Create `client/src/lib/kokoro-engine.ts`**
- Import Kokoro TTS.
- **LAZY LOAD:** Only load the 82M model when the user clicks "Generate" (show explicit download progress). *Never preload.*
- Export a function: `generateEnglishSpeech(text: string) → AudioBlob`.
- Use chunking: split text into sentences of ~200 chars, process sequentially.
- **FALLBACK:** If the device throws an Out-Of-Memory error or fails the hardware check, show a friendly UI message explaining that this advanced feature requires a stronger device. Do NOT route to Puter.js or any third party.

**Step 2.C: Create `client/src/lib/device-check.ts` (Hardware Check)**
- Create a utility to check if the device can handle local AI (Kokoro/Whisper).
- Check `navigator.deviceMemory` (needs >= 4GB).
- Check `navigator.hardwareConcurrency` (needs >= 4 CPU cores).
- Export `isDeviceAIElligible() → boolean`.

**Step 2.D: Update `VoiceHub.tsx` — English Tab**
- Replace the old Puter.js `handlePuterTTS` with `generateEnglishSpeech()`.
- **UI FEEDBACK:** Before generating, call `isDeviceAIElligible()`. 
  - If **NO:** Show a polite, brand-aligned warning: *"আপনার ফোনটি একটু বেশি গরম হতে পারে! This heavy AI feature requires a PC or a phone with 4GB+ RAM. Please try from a laptop."* Disable the generate button.
  - If **YES:** Show progress bar, download Kokoro, and show *"⚡ Engine: Premium Local Processing"*.

**Step 2.E: Update `VoiceHub.tsx` — Bengali Tab**
- Keep the existing Cloudflare Worker flow for `mms-tts-ben`.
- Add chunking: split Bengali text by `।` (Bengali period) before sending.
- **EDGE CACHING:** In the CF Worker, hash the text (`SHA256`). Check if the audio exists in R2 first. If yes, return it. If no, call HF and save to R2. This avoids HF rate limits drastically.
- Add local response caching: save generated audio to IndexedDB keyed by text hash.

**Step 2.F: Test**
- English TTS: Type "Hello World" → Audio plays from browser (no network call).
- Bengali TTS: Type "আমি ভালো আছি" → Audio plays via Cloudflare Worker.

---

## 🦸 PHASE 3A: Dedicated Meme Voices & English XTTS

> **MENTOR VERDICT SHIPPED:** We are abandoning heavy GPU Bengali cloning. Instead, BongBari will feature **Preset Meme Voices** ("Angry Kaku", "Sad Poet", "Rickshaw Wala Shout") generated via Pitch Shifting and MMS/IndicF5. This spreads 10x faster and requires 0 queue times! English will retain pure voice cloning via XTTS-v2.

### 🧑 YOU DO (Human Steps)

**Step 3.1: Get Hugging Face Pro (Optional but Recommended)**
1. Go to [https://huggingface.co/settings/billing](https://huggingface.co/settings/billing).
2. Upgrade to **Pro** ($9/month) for 5× more GPU time and queue priority.
3. (If you skip this, cloning still works but users wait longer in queue.)

**Step 3.2: Get Your HF Token**
1. Go to [https://huggingface.co/settings/tokens](https://huggingface.co/settings/tokens).
2. Create a new token with **Read** access.
3. Copy it (starts with `hf_...`).

**Step 3.3: Add HF Token to Cloudflare Worker**
1. Go to Cloudflare Dashboard → Workers → your `orange-fire` worker.
2. Click **Settings** → **Variables**.
3. Ensure `HF_TOKEN` is set to your new token (or update it).
4. Click **Save and Deploy**.

### 🤖 AGENT DOES (Code Steps)

**Step 3.A: Create a NEW Cloudflare Worker: `bongbari-voice-clone`**
- This Worker will use the `@gradio/client` npm package.
- It connects to the public XTTS-v2 ZeroGPU Space on Hugging Face.
- Flow:
  1. Receive POST request with `{ audioBlob, text, language }`.
  2. Use `@gradio/client` to call the XTTS-v2 Space.
  3. Pass `hf_token` in the client headers for authentication.
  4. Wait for the ZeroGPU queue (return queue position to frontend).
  5. Return the cloned audio blob to the frontend.

**Step 3.B: Update `VoiceHub.tsx` — Voice Factory Tab**
- Build a "Record Your Voice" UI (MediaRecorder API, 10-15 seconds).
- **PREMIUM GATE:** To survive HF ZeroGPU queues, Voice Cloning is available to **Logged-In Users Only** (via Supabase), strictly limited to **3 clones/day**. 
- Show a "Cloning in progress... Queue position: X/Y" indicator.
- When audio returns, play it and offer "Save to Cloud" (R2 bucket).
- Display minimum specs warning: "Best on devices with 4GB+ RAM."

**Step 3.C: Test**
- Record 10s of speech → Type new text → Hear the cloned voice speak it.
- Verify the HF token is never exposed in the browser network tab.

---

## 🎙️ PHASE 3B: Speech-to-Speech (Whisper Local + TTS API)

### 🧑 YOU DO (Human Steps)

**Step 3B.1: Nothing!**
- Whisper-tiny runs locally in the browser. No account needed.
- Just approve Phase 3B and the Agent will build the pipeline.

### 🤖 AGENT DOES (Code Steps)

**Step 3B.A: Install Transformers.js**
```
npm install @huggingface/transformers
```

**Step 3B.B: Create `client/src/lib/whisper-engine.ts`**
- Load `Xenova/whisper-tiny` model (~40MB, cached after first load).
- Run in a **Web Worker** to avoid blocking the UI.
- Export function: `transcribeAudio(audioBlob) → string`.

**Step 3B.C: Update `VoiceHub.tsx` — Speech-to-Speech Tab**
- User presses "🎤 Speak" → Records audio via MediaRecorder.
- Audio is sent to `whisper-engine.ts` → Transcribed to text locally ($0).
- Text is sent to Phase 2 TTS engine (Kokoro for English, MMS for Bengali).
- Final audio is played back to the user.
- Total network cost: Only the Bengali TTS API call (if Bengali). English is 100% offline.

**Step 3B.D: Test**
- Speak "Hello, how are you?" → See transcription → Hear it back in Kokoro voice.
- Speak "আমি ভালো আছি" → See transcription → Hear it back in MMS Bengali voice.

---

## 🚦 EXECUTION ORDER

| Order | Phase | Prerequisite | Duration |
|---|---|---|---|
| 1st | Phase 2 (TTS) | None — can start NOW | ~2 hours |
| 2nd | Phase 1 (Auth) | Supabase account created | ~3 hours |
| 3rd | Phase 3A (Cloning) | HF token in CF Worker | ~4 hours |
| 4th | Phase 3B (STS) | Phase 2 TTS working | ~2 hours |

> **Why Phase 2 first?** Because Kokoro TTS requires zero accounts. We can start coding immediately and see results in 30 minutes. Phase 1 (Supabase) requires you to create an account first, so we build TTS while you set that up.

---

## �️ SAFETY RULES FOR THE AI AGENT

These rules prevent hallucination and ensure quality code:

1. **ONE phase at a time.** Do not start Phase 3 until Phase 2 is tested and approved.
2. **No mock data.** Every function must call a real API or real local model. No `setTimeout` fakes.
3. **No exposed secrets.** `hf_token` lives ONLY in Cloudflare Worker environment variables. Never in React code.
4. **Chunk all text.** Split input by sentences (~200 chars) before sending to any TTS engine.
5. **Cache aggressively.** Use IndexedDB to cache generated audio by text hash. Don't re-generate the same phrase twice.
6. **Show loading states.** Every AI call must have a visible progress indicator (spinner, progress bar, queue position).
7. **Strict No-Login Rule:** Never use Puter.js, ElevenLabs, or any API that requires the user to authenticate elsewhere. If a device can't run Kokoro locally, gracefully disable the feature with a friendly message suggesting they use a PC.
8. **Test after every phase.** Run `npm run dev:live` and verify on both desktop Chrome and mobile Chrome.
9. **Lazy Load Everything:** Only load the UI components initially. AI models (Kokoro 80MB, Whisper 40MB) must strictly load *only* when the user clicks the feature.
