# 🎙️ BongBari Zero-Cost Audio Engine: Final Testing Guide

The AI Voice Hub is completely built according to the "Brutal Mentor" V13 Architecture. We have achieved **$0 cost** by leveraging **Browser-Level AI (Kokoro & Whisper)**, **Edge Computing (Cloudflare + MMS)**, and **Native APIs (Web Audio Pitch Shifting)**.

Here is exactly how to test every single feature we just built.

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

## ✅ TAB 2: Voice Factory (Comedy Voice Presets)

**Goal:** Verify our zero-cost offline pitch-shifting workaround to bypass expensive Bengali AI cloning.

1. Go to the **Voice Factory** tab.
2. Click the large empty **"TAP TO RECORD"** square.
3. Dictate a **Bengali** line into your microphone (e.g., *"এই ছেলেটা সারাদিন কি করে! কোনো কাজ নেই শুধু ভিডিও বানায়!"*). 
   - Note: The recorder stops automatically after 15 seconds, or you can tap it to stop early.
4. Once recorded, the box turns orange and says "AUDIO CAPTURED".
5. In Step 2 (Select Comedy Warp), click on **Angry Uncle**.
6. At the bottom, click **PLAY CHARACTER VOICE**.
7. **What to expect:**
   - The audio you just spoke will play back *instantly* with a deeper pitch and slightly slower speed, mimicking an angry uncle.
   - Now click **Kid / Fast** and click play again. It will instantly sound like a Chipmunk.
   - This proves the Web Audio API pitch shifter works natively in-browser.

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

---

## 🛑 What Happens Next?
Once you have tested all three tabs and confirmed they work, we officially have a $0 Engine! The final step for BongBari would be syncing everything nicely to R2/Firebase (if you want users to save their audio clips to a "Gallery") or just leaving it as a purely ephemeral generation tool.
