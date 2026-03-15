# 🎙️ BongBari Dual-Path Voice Engine: Final Testing Guide (V15)

The AI Voice Hub has been updated! As requested, we realized that the Voice Factory needed to support **BOTH** true AI voice cloning (for English) AND our zero-cost Pitch Shifting workaround (for Bengali). 

Here is how to test our completely finished, production-ready V15 pipeline.

---

## ✅ TAB 1: Voice Studio (Text-to-Speech)

**Goal:** Verify that both the English Offline Engine and Bengali Edge Engine are working seamlessly.

### Test A: English Premium Local (Kokoro TTS)
1. Go to the **Voice Studio** tab.
2. Select **ENG** language at the top right of the text box.
3. Observe the green blinking light says: `Premium Local (Offline)`.
4. Type an English script (max 800 chars): *"Hello! Welcome to BongBari Comedy. This audio is being generated entirely on my device for zero cost."*
5. Click **GENERATE AUDIO**.
6. **What to expect:** 
   - You will see a loading state downloading the *Kokoro ONNX Engine* directly to your browser memory (this takes ~10-20 seconds the very first time).
   - Once downloaded, it generates the audio. The UI shifts and shows the black audio player.
   - Hit **Play**. You should hear a flawless, professional American female voice (`af_sky`).

### Test B: Bengali Native Edge (Meta MMS)
1. Still in the **Voice Studio** tab.
2. Click the **BNG** toggle. 
3. Observe the green blinking light says: `Online (Edge)`.
4. Type a Bengali script: *"নমস্কার! বংবাড়ি কমেডিতে আপনাদের স্বাগত। কেমন আছেন সবাই?"*
5. Click **GENERATE AUDIO**.
6. **What to expect:**
   - It will bypass local processing and hit our Cloudflare Worker proxy instantly.
   - It will return the generated Bengali audio via the HuggingFace MMS API.
   - Hit **Play**. You should hear AI-generated Bengali.

---

## ✅ TAB 2: Voice Factory (The Dual-Path Engine)

**Goal:** Verify that our "Engine Pipeline Route" correctly swaps between HuggingFace ZeroGPU Cloning (ENG) and Native Browser Warping (BNG).

### Test C: True Voice Cloning (🌍 MULTILINGUAL AI CLONE)
1. Go to the **Voice Factory** tab.
2. Ensure the top toggle is set to **🌍 AI CLONE (MULTILINGUAL)**.
3. Observe that we now have **two** inputs (this was what we were missing!), plus a **Language Dropdown**.
4. **Step 1:** Click the Microphone and read a sentence for 10 seconds (e.g., *"This is my natural speaking voice. I want the AI to learn how I sound."*).
5. **Step 2:** Next to "WHAT SHOULD THE CLONE SAY?", click the dropdown and select **🇮🇳 Hindi**, **🇪🇸 Spanish**, or keep it **🇺🇸 English**.
6. Type a sentence in that language (e.g., *"नमस्ते, मेरा नाम एआई है"*).
7. Click **CLONE VOICE**.
8. **What to expect:** 
    - The button will spin and say "CONNECTING TO ZEROGPU XTTS..."
    - A secure request is sent to your `bongbari-voice-clone` Cloudflare Worker with the target language.
    - Within 10-20 seconds, the Audio Player will appear.
    - Hit **Play**. The AI will speak the Hindi/Spanish/English text, *using the voice you just recorded*.

### Test D: Native Pitch Shifting (🇧🇩 BNG)
1. Still in the **Voice Factory** tab, switch the top toggle to **🇧🇩 BNG (Comedy Warp)**.
2. Observe the UI instantly changes. The text box disappears, and the Comedy Presets appear.
3. Click the Microphone. Dictate a **Bengali** line into your microphone (e.g., *"এই ছেলেটা সারাদিন কি করে! কোনো কাজ নেই শুধু ভিডিও বানায়!"*). 
4. Once recorded, the box turns orange and says "Audio Captured".
5. In Step 2 (Select Comedy Warp), click on **Angry Uncle**.
6. At the bottom, click **PLAY CHARACTER VOICE**.
7. **What to expect:**
   - The audio you just spoke will play back *instantly* with a deeper pitch and slightly slower speed. No loading spinners, no GPU costs. Pure 0ms browser magic.

---

## ✅ TAB 3: Speech-to-Speech (Whisper pipeline)

**Goal:** Verify the heavy dual-AI pipeline (Local Whisper STT → Local Kokoro TTS).

1. Go to the **Speech-to-Speech** tab.
2. Click the **"TAP TO RECORD"** microphone box.
3. Speak a simple sentence in **broken English** with your natural accent (e.g., *"Helo, my nam is Rajesh and I am testing di audio."*). Stop the recording.
4. Click **CONVERT SPEECH**.
5. **What to expect (The Magic Sequence):**
   - The UI will say `Loading Local Whisper (STT)...` and download the `Xenova/whisper-tiny` model into your browser cache (~40MB).
   - It will say `Transcribing your speech...` as it processes your recording.
   - The transcribed text will appear elegantly on the screen (e.g., *"Hello, my name is Rajesh and I am testing the audio."*).
   - The UI will instantly jump to `Synthesizing Perfect English (Kokoro TTS)...`.
   - The audio player appears.
   - Hit **Play**. You will hear the completely transformed, fluent American AI speaking exactly what you just dictated.
