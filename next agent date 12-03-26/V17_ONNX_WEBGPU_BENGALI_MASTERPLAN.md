# ♾️ V17 MASTERPLAN: THE 100% OFFLINE BENGALI WEBGPU ENGINE

**STATUS:** ACCEPTED. THIS IS THE HOLY GRAIL.
**Concept:** We replicate the zero-cost, offline success of English `Kokoro` by forcing the Meta MMS Bengali model into the browser using ONNX and `transformers.js`.

---

## 1. The ONNX Conversion Pipeline

Meta MMS (`facebook/mms-tts-ben`) is a PyTorch model. Browsers can't run PyTorch. We must convert it to ONNX format and heavily quantize it so it doesn't crash a user's phone RAM.

### Step 1: Exporting & Quantizing (Using Python locally or in Kaggle/Colab)
```bash
# 1. Install Optimum
pip install optimum[onnx]

# 2. Export the PyTorch model to standard ONNX
optimum-cli export onnx --model facebook/mms-tts-ben ./mms_ben_onnx/

# 3. Quantize it (avx512 / int8) to shrink it by 4x. 
# This is crucial for 6GB mobile RAM limits.
optimum-cli export onnx --model facebook/mms-tts-ben --quantize avx512 ./mms_ben_onnx_quantized/
```

### Step 2: Client-Side Execution (The Next Agent's Job)
The quantized ONNX files must be hosted on GitHub Pages (or a fast CDN). The React frontend will load them via `transformers.js` (WebGPU).

```javascript
import { pipeline } from '@xenova/transformers';

// The Next Agent will build this specific pipeline
const bngTTS = await pipeline('text-to-speech', 'url-to-your-hosted-onnx-folder');
const audioData = await bngTTS("শাগতো বং বারি তে"); 
```

---

## 2. The "Pre-Processing" Magic (BongBari Character Injection)

Because MMS is a robotic VITS model, we have to "trick" it into having comedic timing and emotion *before* we send the text. 

The Next Agent will build a `bengali-preprocessor.ts` file that does the following:

### A. Phonetic Spacing (The Hoshonto Hack)
If the model speaks too fast or merges words poorly, we programmatically add dashes or spaces.
*   *Raw Input:* `ভালোবাসি` (Bhalobashi - spoken fast)
*   *Processed:* `ভা-লো-বা-শি` (Forces micro-pauses for emphasis)

### B. Punctuation Overload
MMS VITS reacts heavily to punctuation.
*   *For a dramatic/scolding voice:* We use regex to replace single exclamation marks with ellipses and pauses. 
*   *Example:* `এই! তুমি কোথায়?` -> `এই! ... তুমি কোথায়? ... শোনো!`

### C. The English-to-Bengali Phonetic Map
Since MMS-BEN cannot read English, any English words (like "WhatsApp" or "Internet") must be automatically regex-swapped to their Bengali phonetic equivalents before TTS generation.
*   "WhatsApp" -> "হোয়াটসঅ্যাপ"
*   "YouTube" -> "ইউটিউব"

---

## 3. The Fallback Architecture

If the user's browser does not support WebGPU, or they are on a low-end device that fails to load the ONNX model:
1.  **Primary:** Local WebGPU ONNX MMS (0ms latency, $0 cost).
2.  **Backup 1:** Puter.js API (if they wrap a Bengali TTS in the future).
3.  **Backup 2:** Cloudflare Worker Proxy rotating between HF Gradio Spaces (dpc/mmstts).

## NEXT STEPS FOR DEVS/AGENTS:
Focus entirely on Objective 1: Converting the model and getting `transformers.js` to execute it. This guarantees unlimited free Bengali TTS forever.
