# Voice Hub Pipeline Status & Health Report

**Date:** March 2026
**Target Architecture:** Fully Free, Zero-Shot, No-Fake Loading

---

## 🟢 Pipeline 1: Voice Studio (Base TTS)
**Status: STABLE / REVAMPED**
- **UI/UX Update:** Complete. Replaced the generic card with the "STITCH_v1.518" ultra-clean layout. Added ENG/BNG quick toggles, interactive character/token counts, and a high-contrast dark theme.
- **Audio Player Fix:** The play button previously lacked state tracking. It has been fully rewritten using React DOM `ref` binding mapping `currentTime` and `duration`. 
  - ✅ **Play/Pause Toggle:** Now actively displays stop bars vs play triangle. 
  - ✅ **Progress Scrubbing:** Users can click anywhere on the `.wav` progress bar to jump to that timestamp in the speech.
- **English Model:** `Puter.js` serverless engine. Fast, free.
- **Bengali Model:** `dpc-mmstts.hf.space` via POST pipeline. Free.

## 🟢 Pipeline 2: Voice Factory (Voice Cloning)
**Status: STABLE / EMBEDDED**
- **Engine:** F5-TTS (Zero-shot cloning).
- **Architecture:** We successfully bypassed API blockades by integrating `https://f5tts.org` natively via a permissioned `iframe`.
- **Result:** Users get the exact official cloning UX (microphone permissions granted) without you having to pay for scaling Gradio API compute.

## 🟡 Pipeline 3: Speech-to-Speech
**Status: ACTIVE (Watch State)**
- **Engine:** Llasa-8B (OpenVoice Base).
- **Architecture:** `zouyunzouyunzouyun-llasa-8b-tts.hf.space` mapped into the container.
- **Notes:** Because this is a Hugging Face Space, it may enter "Sleep Mode" if no users hit it for 48 hours. The UI warns the user it might need 30-40 seconds to "Restart / Wake Up" on first boot.

---

## 📝 Pending Tasks / Next Steps
1. **Mobile Playtest:** Ensure the new scrubbable audio player shrinks correctly on small iOS/Android screens (handled visually with Flex wrap and `w-full`, but real-world testing is advised).
2. **Audio Download Button:** We have play/pause, but the user might want a "Download .WAV" button on the player in the future.
3. **Wait & Observe:** Monitor if the Hugging Face Bengali Gradio space gets rate-limited by user volume over the next month.

---

## 🧠 Questions for Notebook LM
If you are passing this to Notebook LM for further strategic planning, ask it the following:

> **Q1: API Access for F5-TTS**
> *We are currently iframing `f5tts.org` into our frontend. Is there any way to securely POST audio files to an F5-TTS interface in the background without needing the user to click the iframe? Does Notebook LM have research on F5 API deployment architectures that are completely free?*

> **Q2: Hugging Face Sleep Modes**
> *Our Speech-to-Speech tool relies on a Hugging Face space for Llasa-8b. How do we keep a Hugging Face space "awake" indefinitely for free so users never hit a sleeping container?*

> **Q3: Long-Form Synthesis Chunking**
> *Currently, the text-box limits the user to 800 characters to prevent free model timeouts. Can Notebook LM propose a client-side chunking algorithm that splits long essays, sends them one by one, and stiches the resulting WAV buffers together directly in the browser?*