# ARCHITECTURE DECISION RECORD (ADR): API Routing & User Experience
**Date:** March 16, 2026
**Status:** Approved & Implemented

### Decision: REMOVAL OF PUTER.JS FROM TECH STACK
We have officially decided to remove Puter.js from the BongBari AI Hub architecture. 

### Reasoning
Puter.js operates on a "User-Pays" model, which requires the end-users of our website to authenticate, log in, and create a separate third-party cloud account to process AI requests. 
1. **UX Friction:** Forcing users to create a secondary account ruins the instant, frictionless experience required for our target audience.
2. **Prohibited Embedding:** Relying on embedded external website auth flows is strictly prohibited for this project. We must control the entire user journey.

### New Strategy: Direct Free-Tier API Scaling
To achieve $0 initial infrastructure costs while maintaining a seamless, no-login (or single-login) experience for our users, we will strictly use **Public Free APIs and Developer-Managed Free Tiers**. The developer will hold the API keys, and the backend routing will remain completely invisible to the end-user.

**The Approved "Invisible" API Stack:**
*   **Groq Cloud (LPU):** 14,400 free requests/day for ultra-fast, real-time logic and chat.
*   **Google AI Studio:** 1,500 free requests/day (1M context window) for heavy document processing and Sarkari PDF forms.
*   **SiliconFlow / DeepSeek:** Free token grants and ultra-low-cost API processing natively integrated via our own API keys.
*   **OpenRouter:** 50-1000 free requests/day acting as an invisible fallback router to free open-source models (Llama 3.3, Qwen 3.5) if primary APIs hit rate limits.
*   **Hugging Face Inference / ZeroGPU:** Free backend processing for open-source Voice Cloning (F5-TTS) and Media tasks.

**Result:** The user visits BongBari.com, clicks a button, and gets an instant result. No third-party popups. No external logins. Infinite scaling managed securely on our end.