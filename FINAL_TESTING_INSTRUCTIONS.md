# 🧪 BONG BARI COMEDY: FINAL SYSTEM TEST & SIGN-OFF

Run these tests manually in your live dev server (`npm run dev:live`) or on the production build to verify the AI Voice Hub is completely stable before closing this phase of development.

---

## TEST 1: The Offline English TTS (Kokoro)
**Goal:** Verify the browser can load the heavy WebGPU model and generate speech offline.

1.  Open the App and navigate to **Voice Studio**.
2.  Ensure the Text Control toggle is set to **ENG**.
3.  Type a test phrase: `"Welcome to Bong Bari Comedy. This is a test of the offline English voice engine."`
4.  Select the voice: **Emma (British Female)**.
5.  Click **Generate Audio**.
6.  *Expected Result:* You should see a progress bar saying "Loading Kokoro 82M model...". Once loaded, it should generate audio quickly. The audio player should appear at the bottom, and the play button should work.

## TEST 2: The Bengali TTS Pipeline (Meta MMS)
**Goal:** Verify the `bengali-tts-engine.ts` correctly fetches from the HuggingFace MMS Space without crashing.

1.  In Voice Studio, switch the Text Control toggle to **BNG**.
2.  Type a Bengali test phrase: `"বাচ্চারা বাগানে খেলছে আর পাখি কিচিরমিচি করছে।"` (Use multiple punctuation marks to test the sentence splitting logic).
3.  Ensure the Engine Selector is set to **Meta MMS**.
4.  Click **Generate Audio**.
5.  *Expected Result:* The progress bar should say `[Meta MMS] Sentence 1/1...`. It should take a few seconds, fetch the raw audio from the HuggingFace server, stitch it together, and present a playable WAV file.

## TEST 3: The Engine Fallback / Error Handling
**Goal:** Verify that if the server goes down or your internet drops, the app doesn't white-screen (crash).

1.  Keep the app open in BNG mode.
2.  **Turn off your computer's Wi-Fi** (or throttle network to 'Offline' in Chrome DevTools).
3.  Click **Generate Audio**.
4.  *Expected Result:* The app should quickly realize the fetch failed. It should attempt the retry logic (attempt 1, attempt 2). Finally, it will throw a clean red error message saying: `"Bengali TTS failed. MMS Space may be temporarily overloaded. Please retry."` The app UI should remain perfectly responsive.

## TEST 4: The Speech-to-Text Upload (Whisper)
**Goal:** Verify audio files can be uploaded and transcribed in the browser.

1.  Go to the **Speech to Text** tab.
2.  Upload a short MP3 or WAV file of someone speaking in English.
3.  Click **Generate Transcript**.
4.  *Expected Result:* The Web Worker should load the Whisper model and print the transcription text into the output box without any server-side database involvement.

---

**✅ Final Sign-Off:** If all 4 tests pass, the Voice Hub architecture is officially locked in, stable, and $0 cost. You are cleared to end development on this subsystem and transfer to the Next Agent.
