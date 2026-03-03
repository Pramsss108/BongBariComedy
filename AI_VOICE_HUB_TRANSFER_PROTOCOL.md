# 📜 AI VOICE HUB: TRANSFER PROTOCOL (VIBE CODER EDITION)

## 🎯 Mission & Vision
To provide a **100% Free, Secure, and Professional** AI Voice Suite for Vibe Coders.
- **Goal**: High-quality Text-to-Speech (TTS) and Voice Cloning in **English** and **Bengali**.
- **Philosophy**: Use high-quality open-source models (MMS, Bark, OpenVoice) and secure them via edge computing (Cloudflare).

---

## 🏗️ Technical Architecture (The "No-Fake" Engine)

### 1. English Engine (Puter.js)
- **Status**: FULLY OPERATIONAL.
- **Provider**: [Puter.js](https://puter.com).
- **App ID**: `app-a327756c-4843-416e-83d1-d5a61c4ef0ba` (Check `client/index.html`).
- **Function**: Lightning fast, high-quality English TTS.

### 2. Bengali & Multi-Lang Engine (Hugging Face + Cloudflare)
- **Status**: FULLY OPERATIONAL & SECURE.
- **Model**: `facebook/mms-tts-ben` (Meta MMS). 
- **The "Guard"**: A Cloudflare Worker acts as a proxy to hide the Hugging Face API key.
- **Worker URL**: `https://orange-fire-1b9d.guitarguitarabhijit.workers.dev/`.
- **Key**: Stored as `HF_TOKEN` in Cloudflare Worker Variables.

### 3. Voice Factory (Cloning)
- **Status**: READY FOR EXPANSION.
- **Logic**: Built in `VoiceHub.tsx`.
- **Process**: Captures file `Blobs` from the UI and posts them to a Hugging Face Space (OpenVoice V2).

---

## 🛠️ Next "Vibe Coder" Steps
- **Translate Engine**: Integrate a free translation API (like Google Translate or LibreTranslate) to allow "Translate + Speak" in one click.
- **Recording API**: Connect the mobile microphone to the "Record" buttons for direct capture (currently uses file upload).
- **Library Phase**: Add a "Save Result" feature to store audio in Firebase or Local Storage.

## 📁 Important Files
- **Main UI**: `client/src/pages/VoiceHub.tsx`
- **Security**: `C:\Users\guita\.gemini\antigravity\brain\75261c14-dcf8-42c8-bfd8-36e04224fb07\CLOUDFLARE_PROXY_WKR.js` (The source code for the Cloudflare Worker).
- **Detailed Guide**: `C:\Users\guita\.gemini\antigravity\brain\75261c14-dcf8-42c8-bfd8-36e04224fb07\VIBE_CODER_GUIDE.md`

---
**Agent Note**: The user is a "Vibe Coder." Prioritize premium aesthetics, free tools, and crystal-clear setup instructions. No "hallucinations" or mock logic—keep it real and functional.

🚀 *Handoff Complete. Mission Active.* 🎙️
