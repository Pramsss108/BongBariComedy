import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { CreateMLCEngine, InitProgressReport } from '@mlc-ai/web-llm';
import ReactMarkdown from 'react-markdown';
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";

// ─── Config ────────────────────────────────────────────────────────────────────
const WEBLLM_MODEL = "Llama-3.2-1B-Instruct-q4f16_1-MLC";
const GROQ_MODEL = "llama-3.1-8b-instant";
const GROQ_MAX_WORDS = 5000; // Groq handles up to 5000+ words easily using the AST engine

// ─── AI Clichés ────────────────────────────────────────────────────────────────
const AI_CLICHES = [
  "in conclusion", "delve into", "it's worth noting", "it is worth noting",
  "a tapestry of", "moreover", "furthermore", "in the realm of",
  "it is important to note", "navigating", "showcasing", "at its core",
  "underpins", "underscores", "multifaceted", "nuanced", "in today's world",
  "revolutionize", "game-changer", "paradigm shift", "foster", "facilitate",
  "utilize", "seamlessly", "cutting-edge", "state-of-the-art", "holistic",
];

// Boot messages
const BOOT_MSGS = [
  "🔥 Loading AI...", "🧠 Your GPU is the server now...",
  "🔒 100% private — stays on your device...",
  "⚡ Loading model weights...", "♾️ One download = unlimited forever...",
];

// ─── HTML → Markdown converter (for paste) ─────────────────────────────────────
function htmlToMarkdown(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;

  const convert = (el: Node): string => {
    if (el.nodeType === Node.TEXT_NODE) return el.textContent || '';
    if (el.nodeType !== Node.ELEMENT_NODE) return '';
    const element = el as HTMLElement;
    const tag = element.tagName.toLowerCase();
    const inner = Array.from(element.childNodes).map(convert).join('').trim();
    if (!inner) return '';  // Skip empty elements (removes stray dashes)

    switch (tag) {
      case 'b': case 'strong': return `**${inner}**`;
      case 'i': case 'em': return `*${inner}*`;
      case 'h1': return `\n## ${inner}\n`;
      case 'h2': return `\n## ${inner}\n`;
      case 'h3': return `\n### ${inner}\n`;
      case 'p': { const t = inner.trim(); return t ? `\n${t}\n` : ''; }
      case 'br': return '\n';
      case 'li': { const t = inner.trim(); return t ? `- ${t}\n` : ''; }
      case 'ul': case 'ol': return `\n${inner}\n`;
      case 'a': return inner;
      case 'code': return `\`${inner}\``;
      case 'blockquote': return `\n> ${inner}\n`;
      default: return inner;
    }
  };

  return convert(div)
    .replace(/^\s*-\s*$/gm, '')     // Remove bare lone dashes
    .replace(/\n{3,}/g, '\n\n')     // Max 2 newlines in a row
    .trim();
}

// ─── Local Humanization Functions (Zero AI, Zero Hallucination) ────────────────
// These run instantly and never fabricate content — pure local text transforms.

function insertContractions(text: string): string {
  return text
    .replace(/\bdo not\b/gi, "don't").replace(/\bdoes not\b/gi, "doesn't")
    .replace(/\bcannot\b/gi, "can't").replace(/\bwill not\b/gi, "won't")
    .replace(/\bwould not\b/gi, "wouldn't").replace(/\bcould not\b/gi, "couldn't")
    .replace(/\bshould not\b/gi, "shouldn't").replace(/\bmight not\b/gi, "mightn't")
    .replace(/\bis not\b/gi, "isn't").replace(/\bare not\b/gi, "aren't")
    .replace(/\bwas not\b/gi, "wasn't").replace(/\bwere not\b/gi, "weren't")
    .replace(/\bhave not\b/gi, "haven't").replace(/\bhas not\b/gi, "hasn't")
    .replace(/\bhad not\b/gi, "hadn't").replace(/\bdid not\b/gi, "didn't")
    .replace(/\bhe is\b/gi, "he's").replace(/\bshe is\b/gi, "she's")
    .replace(/\bit is\b/gi, "it's").replace(/\bthey are\b/gi, "they're")
    .replace(/\bwe are\b/gi, "we're").replace(/\byou are\b/gi, "you're")
    .replace(/\bthat is\b/gi, "that's").replace(/\bthere is\b/gi, "there's")
    .replace(/\bI am\b/g, "I'm").replace(/\bthey have\b/gi, "they've");
}

function replaceAIClichés(text: string): string {
  return text
    .replace(/\bmoreover\b/gi, 'also')
    .replace(/\bfurthermore\b/gi, 'and')
    .replace(/\bin addition\b/gi, 'also')
    .replace(/\bit is worth noting( that)?\b/gi, 'worth noting')
    .replace(/\bit's worth noting( that)?\b/gi, 'worth noting')
    .replace(/\bdelve into\b/gi, 'explore')
    .replace(/\bshowcase\b/gi, 'show')
    .replace(/\bin conclusion\b/gi, 'so')
    .replace(/\bto summarize\b/gi, 'basically')
    .replace(/\butilize\b/gi, 'use')
    .replace(/\bfacilitate\b/gi, 'help')
    .replace(/\bnumerous\b/gi, 'many')
    .replace(/\bsignificant\b/gi, 'major')
    .replace(/\bsignificantly\b/gi, 'greatly')
    .replace(/\brobust\b/gi, 'strong')
    .replace(/\bcomprehensive\b/gi, 'full')
    .replace(/\bultimately\b/gi, 'in the end')
    .replace(/\bimplementing\b/gi, 'using')
    .replace(/\bencompass\b/gi, 'cover')
    .replace(/\bsailent\b/gi, 'key');
}

// Bullet → prose: local template, zero AI, zero hallucination
// Bullet → prose: local template, zero AI, zero hallucination
// Adds a natural human connector and turns the bullet into a flowing sentence
function localHumanizeBullet(text: string, index: number): string {
  // Strip existing transition words to prevent double-connectors
  const cleanedText = text.replace(/^(Also,|Furthermore,|Moreover,|In addition,|And,|Plus,|Not to mention,|There is also the fact that|Additionally,|Ultimately,|To sum up,|Finally,)\s*/i, '');
  let t = insertContractions(replaceAIClichés(cleanedText));
  // Ensure sentence ends with period
  if (!/[.!?]$/.test(t)) t += '.';

  if (index === 0) {
    // First bullet: capitalize, no connector (makes the first point hit harder)
    return t.charAt(0).toUpperCase() + t.slice(1);
  }
  const connectors = ['Plus,', 'There is also the fact that', 'On top of that,', 'Not to mention,'];
  // First item gets a strong follow-on, the rest rotate
  const connector = index === 1 ? "Also," : connectors[index % connectors.length];
  const lower = t.charAt(0).toLowerCase() + t.slice(1);
  return `${connector} ${lower}`;
}

// ─── Scoring ───────────────────────────────────────────────────────────────────
function computeBurstiness(text: string): number {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const lengths = sentences.map(s => s.trim().split(/\s+/).length).filter(l => l > 1);
  if (lengths.length < 2) return 50;

  // Calculate standard variance
  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance = lengths.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / lengths.length;
  let score = Math.min(100, Math.round((Math.sqrt(variance) / mean) * 220)); // significantly boosted multiplier

  // Massive boost if the text uses small, fragmented paragraphs (staccato human writing)
  const paragraphs = text.split('\n\n').filter(p => p.trim().length > 0);
  if (paragraphs.length >= 2) {
    score += paragraphs.length * 15; // Massive boost for breaking up blocks
  }

  return Math.min(100, score);
}

function computeCliche(text: string): { score: number; count: number } {
  const lower = text.toLowerCase();
  const count = AI_CLICHES.filter(c => lower.includes(c)).length;
  return { score: Math.max(0, 100 - count * 12), count };
}

// ─── Prompts ───────────────────────────────────────────────────────────────────
function buildHumanizePrompt(text: string, inputWords: number): string {
  // Groq full-text mode: 2-pass with all humanization techniques
  return `Rewrite the text below as clean, flowing prose. Make it sound like a real person wrote it.

STRICT RULES:
- Output ~${inputWords} words. Do NOT write more.
- Do NOT repeat any sentence. Every idea appears ONCE.
- Do NOT add facts not in the original. ONLY use info from the text.
- Convert bullet points into natural flowing sentences or short paragraphs.
- Plain text only — no ## headings, no - bullets, no **bold**.
- Vary sentence lengths: mix short punchy (4-7 words) with longer flowing ones (15-20 words).
- Use contractions: don't, it's, they've, there's, wasn't.
- Use active voice: "they found" not "it was found".
- Replace AI phrases: moreover→also, furthermore→and, in conclusion→so, it is worth noting→worth noting.
- Add natural hedges where appropriate: "honestly", "basically", "to be fair".
- Output ONLY the rewritten text. No labels, no explanation.

[Text — ${inputWords} words]:
${text}`;
}

// ─── Type-Aware Sentence Prompts (NO sliding window — 1B hallucinates with context) ────────────
// Each phrase type gets a specific, strict transformation instruction.
// Ultra-tight prompts = less hallucination room for the 1B model.

function detectPassiveVoice(text: string): boolean {
  return /\b(is|are|was|were|be|been|being)\s+\w+ed\b/i.test(text);
}

function buildSentencePrompt(phrase: string, isTitle: boolean, isBullet: boolean): string {
  const wordCount = phrase.trim().split(/\s+/).length;

  if (isTitle) {
    // Title → casual statement or rhetorical question
    return `Rephrase this title to sound casual, like a real person would say it. Same meaning. No markdown. Output ONLY the rephrased title, nothing else:
"${phrase}"`;
  }

  if (isBullet) {
    // Bullet → flowing prose clause with natural connector
    return `Convert this bullet point into a natural flowing sentence. Add a conversational connector word if needed. Same meaning. Do NOT add new facts. Output ONLY the sentence, no bullet symbol, no markdown:
"${phrase}"`;
  }

  if (detectPassiveVoice(phrase) && wordCount <= 20) {
    // Passive → active voice conversion
    return `Rewrite this sentence in active voice. Change "it was/is [verb]ed" to who/what did the action. Same meaning. Output ONLY the rewritten sentence:
"${phrase}"`;
  }

  // Default: The "Dumb Down" Persona (Shatter Protocol)
  // Forces small local models to avoid trying to sound smart, dropping perplexity
  return `Rewrite this text. Speak like a lazy college student. Use contractions. Cut big words. Do NOT add new information. Output ONLY the rewritten text:
"${phrase}"`;
}


// Split input into processable phrases (sentences + bullet items)
function splitIntoPhrases(text: string): Array<{ text: string; isTitle: boolean; isBullet: boolean }> {
  const lines = text.split(/\n/).map(l => l.trim()).filter(Boolean);
  const result: Array<{ text: string; isTitle: boolean; isBullet: boolean }> = [];

  for (const line of lines) {
    const isMdHeading = /^#{1,3}\s+/.test(line);
    const isBullet = /^[-*•]\s+/.test(line);
    const cleanLine = line.replace(/^#{1,3}\s+/, '').replace(/^[-*•]\s+/, '').replace(/\*\*/g, '').trim();

    if (!cleanLine) continue;

    if (isMdHeading) {
      result.push({ text: cleanLine, isTitle: true, isBullet: false });
    } else if (isBullet) {
      result.push({ text: cleanLine, isTitle: false, isBullet: true });
    } else {
      // Regular paragraph: Group sentences into chunks (max ~40 words) for speed & native context
      const sentences = cleanLine.match(/[^.!?]+[.!?]*(?:\s|$)/g) || [cleanLine];
      let currentChunk = '';
      let chunkWordCount = 0;

      for (const s of sentences) {
        const t = s.trim();
        if (t.length < 3) continue;
        const words = t.split(/\s+/).length;

        if (chunkWordCount + words > 40 && currentChunk) {
          result.push({ text: currentChunk.trim(), isTitle: false, isBullet: false });
          currentChunk = t;
          chunkWordCount = words;
        } else {
          currentChunk += (currentChunk ? ' ' : '') + t;
          chunkWordCount += words;
        }
      }
      if (currentChunk) {
        result.push({ text: currentChunk.trim(), isTitle: false, isBullet: false });
      }
    }
  }
  return result.filter(p => p.text.length > 3);
}

// ─── Local Instant Judge (zero latency, no extra AI call) ──────────────────
// Lightweight quality gate — catches garbage without rejecting valid rewrites.
// Does NOT use exact keyword matching (synonyms fail that — "credible" → "verifiable" = 0%).
// Instead: checks output is non-empty, reasonable length, no self-repetition, no new AI clichés.
function judgeSentence(original: string, rewritten: string): { pass: boolean; reason: string } {
  if (!rewritten || rewritten.length < 4) return { pass: false, reason: 'empty output' };

  // Strict hallucination check: Did the AI include conversational filler?
  if (/^(Rewritten|Output|Result|Here is|Here are|Here's|Sure,|I have rewritten|I can help|The rewritten|Rewrite:|Two shorter sentences:?)/i.test(rewritten.trim())) {
    return { pass: false, reason: 'conversational filler detected' };
  }

  // Reject if model echoed the original text (hallucinated duplication common in 1B)
  // i.e., it appended the original sentence to its rewrite instead of replacing it
  if (rewritten.toLowerCase().includes(original.toLowerCase()) && rewritten.length > original.length * 1.5) {
    return { pass: false, reason: 'echo duplication' };
  }

  // Reject if model wrote way too much (hallucinated a paragraph from 1 sentence)
  if (rewritten.length > original.length * 2.5 && original.length > 20) return { pass: false, reason: 'too long' };

  // Reject if output is drastically shorter (loss of meaning)
  if (rewritten.length < original.length * 0.4 && original.length > 30) return { pass: false, reason: 'too short' };

  // Reject if model just repeated the exact original verbatim
  if (rewritten.trim().toLowerCase() === original.trim().toLowerCase()) {
    return { pass: false, reason: 'identical to input' };
  }

  // Reject if model output contains an obvious internal repetition loop
  const words = rewritten.toLowerCase().split(/\s+/);
  if (words.length > 6) {
    const half1 = words.slice(0, Math.floor(words.length / 2)).join(' ');
    const half2 = words.slice(Math.floor(words.length / 2)).join(' ');
    if (half1 === half2) return { pass: false, reason: 'repetition loop' };
  }

  // Reject if AI clichés were introduced that weren't in the original
  const rewrLower = rewritten.toLowerCase();
  const origLower = original.toLowerCase();
  const clicheIntroduced = AI_CLICHES.some(c => rewrLower.includes(c) && !origLower.includes(c));
  if (clicheIntroduced) return { pass: false, reason: 'AI cliché introduced' };

  return { pass: true, reason: 'accepted' };
}


// ─── Markdown Components ───────────────────────────────────────────────────────
const mdC = {
  h1: ({ children }: any) => <h1 className="text-xl font-bold text-[#39FF14] mb-2 mt-3 font-tech">{children}</h1>,
  h2: ({ children }: any) => <h2 className="text-lg font-bold text-[#39FF14]/75 mb-2 mt-2 font-tech">{children}</h2>,
  h3: ({ children }: any) => <h3 className="text-base font-semibold text-white mb-1 mt-2">{children}</h3>,
  p: ({ children }: any) => <p className="mb-2.5 leading-relaxed text-gray-200 text-[15px]">{children}</p>,
  strong: ({ children }: any) => <strong className="text-white font-bold">{children}</strong>,
  em: ({ children }: any) => <em className="text-gray-300 italic">{children}</em>,
  ul: ({ children }: any) => <ul className="mb-2.5 ml-3 space-y-1 list-none">{children}</ul>,
  ol: ({ children }: any) => <ol className="mb-2.5 ml-4 list-decimal space-y-1">{children}</ol>,
  li: ({ children }: any) => (
    <li className="flex items-start gap-2 text-gray-200 text-[15px]">
      <span className="text-[#39FF14] mt-1 flex-none text-xs">▸</span><span>{children}</span>
    </li>
  ),
  code: ({ children }: any) => <code className="bg-white/10 px-1 py-0.5 rounded text-[#39FF14] font-mono text-sm">{children}</code>,
  blockquote: ({ children }: any) => <blockquote className="border-l-2 border-[#39FF14]/30 pl-3 my-2 text-gray-400 italic">{children}</blockquote>,
};

// ─── Types ─────────────────────────────────────────────────────────────────────
type EngineMode = 'webllm' | 'groq';
type EnginePhase = 'booting' | 'ready' | 'no_webgpu' | 'gpu_lost' | 'error';
interface Score { total: number; burstiness: number; clicheCount: number }
type Vibe = 'academic' | 'casual' | 'genz';
type FlawLevel = 'none' | 'low' | 'high';

// ─── Main Component ────────────────────────────────────────────────────────────
export default function FreeToolsHumanizer() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, sessionId } = useAuth();

  const [internalMode, setInternalMode] = useState<EngineMode>(() =>
    (localStorage.getItem('hum_mode') as EngineMode) || 'webllm'
  );

  const mode = internalMode;

  const setMode = useCallback((newMode: EngineMode) => {
    if (newMode === 'groq' && !isAuthenticated) {
      setLocation('/login?redirect=/tools/humanizer');
      return;
    }
    setInternalMode(newMode);
  }, [isAuthenticated, setLocation]);

  const [inputText, setInputText] = useState('');
  const [resultText, setResultText] = useState('');
  const [vibe, setVibe] = useState<Vibe>('casual');
  const [flawLevel, setFlawLevel] = useState<FlawLevel>('low');
  const [isProcessing, setIsProcessing] = useState(false);
  const [copyText, setCopyText] = useState('Copy Result');
  const [showPreview, setShowPreview] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [statusLog, setStatusLog] = useState<string[]>([]);
  const [currentPhrase, setCurrentPhrase] = useState(0);
  const [totalPhrases, setTotalPhrases] = useState(0);
  const [score, setScore] = useState<Score | null>(null);

  const [hardwareLimit, setHardwareLimit] = useState(300); // Dynamic Aukat default

  const [enginePhase, setEnginePhase] = useState<EnginePhase>('booting');
  const [loadingProgress, setLoadingProgress] = useState<InitProgressReport | null>(null);
  const [bootMsgIndex, setBootMsgIndex] = useState(0);

  const engineRef = useRef<any>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { document.title = 'BongBari Humanizer | Free AI Text Converter'; }, []);
  useEffect(() => { localStorage.setItem('hum_mode', mode); }, [mode]);

  // Dynamic Hardware Profiling (Auto-Aukat)
  useEffect(() => {
    // navigator.deviceMemory gives RAM in GB (maxes out at 8 typically)
    const mem = (navigator as any).deviceMemory || 8;
    const cores = navigator.hardwareConcurrency || 4;

    if (mem <= 4 || cores <= 4) setHardwareLimit(150);        // Low End: Safe Mode
    else if (mem >= 16 || cores >= 10) setHardwareLimit(400); // High End: Power Mode
    else setHardwareLimit(300);                               // Mid End: Standard Mode
  }, []);

  // Boot message cycler
  useEffect(() => {
    if (enginePhase !== 'booting') return;
    const t = setInterval(() => setBootMsgIndex(i => (i + 1) % BOOT_MSGS.length), 2200);
    return () => clearInterval(t);
  }, [enginePhase]);

  // GPU lost handler
  const handleGpuLost = useCallback(() => {
    engineRef.current = null;
    setEnginePhase('gpu_lost');
    setMode('groq');
    setIsProcessing(false);
    setStatusMsg('');
  }, []);

  // WebLLM init
  useEffect(() => {
    if (mode === 'groq') { setEnginePhase('ready'); return; }
    if (!(navigator as any).gpu) { setEnginePhase('no_webgpu'); return; }

    let mounted = true;
    setEnginePhase('booting');
    engineRef.current = null;

    (async () => {
      try {
        const e = await CreateMLCEngine(WEBLLM_MODEL, {
          initProgressCallback: (r: InitProgressReport) => { if (mounted) setLoadingProgress(r); }
        });
        if (!mounted) return;
        engineRef.current = e;
        setEnginePhase('ready');
      } catch (err: any) {
        if (!mounted) return;
        if (err?.message?.includes('disposed') || err?.message?.includes('GPU') || err?.message?.includes('Instance')) {
          handleGpuLost();
        } else {
          setEnginePhase('error');
        }
      }
    })();

    return () => { mounted = false; };
  }, [mode, handleGpuLost]);

  const modeLimit = mode === 'groq' ? GROQ_MAX_WORDS * 6 : hardwareLimit * 6; // chars ≈ 6 per word
  const wordLimit = mode === 'groq' ? GROQ_MAX_WORDS : hardwareLimit;
  const wordCount = inputText.trim() ? inputText.trim().split(/\s+/).length : 0;
  const isOverLimit = wordCount > wordLimit;

  // ── Smart paste handler — converts HTML clipboard to markdown, auto-shows Preview ──
  const handlePaste = useCallback(async (e?: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (e) {
      const html = e.clipboardData?.getData('text/html');
      if (html && html.trim().length > 10) {
        e.preventDefault();
        const md = htmlToMarkdown(html);
        setInputText(prev => (prev + md).slice(0, modeLimit));
        setShowPreview(true); // Auto-show Preview so user sees clean rendered view
        return;
      }
      return; // Let native paste handle plain text
    }
    // Button paste
    try {
      const text = await navigator.clipboard.readText();
      setInputText(prev => (prev + text).slice(0, modeLimit));
    } catch { /* silent */ }
  }, [modeLimit]);

  // ── Secure Proxy Groq inference ──
  const groqInfer = useCallback(async (prompt: string, onChunk: (t: string) => void): Promise<string> => {
    // We hit our own secure backend proxy. The proxy attaches the secret API key.
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (sessionId) {
      headers['Authorization'] = `Bearer ${sessionId}`;
    }
    const res = await fetch("/api/humanize/groq", {
      method: 'POST',
      headers,
      body: JSON.stringify({ prompt, model: GROQ_MODEL, vibe, flawLevel }),
    });

    if (res.status === 429) {
      throw new Error("Groq daily limit reached. Sign up for unlimited access!");
    }

    if (!res.ok) {
      throw new Error(`Cloud API Error: Configuration failed or server offline.`);
    }

    // For now, the proxy doesn't stream (it waits for full response) to keep the backend simple and secure.
    // We simulate a fast stream to keep the UI feeling responsive.
    const data = await res.json();
    const text = data.text || "";
    onChunk(text); // instantly provide full text to satisfy the promise structure
    return text;
  }, [sessionId, vibe, flawLevel]);

  // ── WebLLM inference ──
  const webllmInfer = useCallback(async (prompt: string, onChunk: (t: string) => void): Promise<string> => {
    const e = engineRef.current;
    if (!e) throw new Error('Engine not ready — please refresh the page');
    try {
      // Extract actual text word count from the last line of the prompt (after the tag)
      const textStart = prompt.lastIndexOf('[Text to rewrite');
      const actualText = textStart > -1 ? prompt.slice(prompt.indexOf('\n', textStart) + 1) : prompt;
      const textWords = actualText.trim().split(/\s+/).length;

      const stream = await e.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        max_tokens: Math.max(80, Math.min(700, Math.round(textWords * 8 * 1.6))),
        temperature: 0.75 + Math.random() * 0.2, // Randomize temp between 0.75 and 0.95
        repetition_penalty: 1.15,
        stream: true,
      });
      let full = '';
      for await (const chunk of stream) {
        full += chunk.choices?.[0]?.delta?.content || '';
        onChunk(full);
      }
      return full;
    } catch (err: any) {
      if (err?.message?.includes('disposed') || err?.message?.includes('Instance') || err?.message?.includes('device')) {
        handleGpuLost();
        throw new Error('GPU ran out of memory. Switched to Groq Cloud Mode. Add your free Groq key to continue.');
      }
      throw err;
    }
  }, [handleGpuLost]);

  const infer = useCallback((prompt: string, onChunk: (t: string) => void = () => { }) => {
    if (mode === 'groq' || enginePhase === 'gpu_lost') {
      return groqInfer(prompt, onChunk);
    }
    return webllmInfer(prompt, onChunk);
  }, [mode, enginePhase, groqInfer, webllmInfer]);

  // ── Main Humanize ──
  // WebLLM: phrase-by-phrase (proven for 1B model — each phrase fits perfectly in context)
  // Groq: full-text 2-pass (8B handles it fine, better coherence)
  const handleHumanize = useCallback(async () => {
    if (!inputText.trim() || isProcessing || isOverLimit) return;
    if (enginePhase !== 'ready' && enginePhase !== 'gpu_lost') return;

    setIsProcessing(true);
    setResultText('');
    setScore(null);

    const isGroq = mode === 'groq' || enginePhase === 'gpu_lost';

    try {
      let outputText = '';

      if (isGroq) {
        // ── GROQ: Single-pass V8 Cognitive Engine (Handles formatting & logic mathematically) ──
        setStatusMsg(`Humanizing...`);
        // Send the exact raw text. The backend AST Engine handles ALL prompting and instructions now.
        outputText = await infer(inputText, t => setResultText(t));

        // Calculate score
        const burstiness = computeBurstiness(outputText);
        const { count } = computeCliche(outputText);
        const s: Score = { total: Math.round(burstiness * 0.7 + Math.max(0, 100 - count * 12) * 0.3), burstiness, clicheCount: count };
        setScore(s);
      } else {
        // ── WEBLLM: Phrase-by-phrase with local Judge ──
        // Pipeline: Atomize → Humanize → Judge → Accept/Fallback → Stitch
        const phrases = splitIntoPhrases(inputText);
        if (phrases.length === 0) throw new Error('No text to process');

        setTotalPhrases(phrases.length);
        setStatusLog([]);
        const humanizedPhrases: string[] = [];
        const log: string[] = [];

        // ── The Shape-Shifter Protocol (Format Disruption) ──
        // ── Algorithmic Topology Analysis (Smart Stage) ──
        // Analyzes list structure deterministically instead of using random chance.
        // Rule 1: If > 5 bullets, it's likely an AI-generated essay → SMASH.
        // Rule 2: If bullets are long (avg > 12 words), it's dense AI text → SMASH.
        // Rule 3: If bullets are short & tight (avg <= 12 words, <= 5 items) → KEEP as a human-like list.
        const bulletPhrases = phrases.filter(p => p.isBullet);
        const avgBulletWords = bulletPhrases.length > 0
          ? bulletPhrases.reduce((acc, p) => acc + p.text.split(/\s+/).length, 0) / bulletPhrases.length
          : 0;

        const shouldKeepBullets = bulletPhrases.length > 0 && bulletPhrases.length <= 5 && avgBulletWords <= 12;
        const shapeShifterStitch = (phrasesArr: typeof phrases, humanizedArr: string[]) => {
          let out = '';
          let currentParaLength = 0;

          for (let j = 0; j < humanizedArr.length; j++) {
            const ph = phrasesArr[j];
            const text = humanizedArr[j];

            if (ph.isTitle) {
              out += (out ? '\n\n' : '') + text + '\n\n';
              currentParaLength = 0;
              continue;
            }

            if (ph.isBullet) {
              if (shouldKeepBullets) {
                // Keep the list structure, but the words themselves were still rewritten by localHumanizeBullet
                // We strip the connector word if we are keeping the bullet symbol, or let it stay for flavor
                out += (out && !out.endsWith('\n\n') && !out.endsWith('\n') ? '\n' : '') + '- ' + text.replace(/^(Also, |And |There's also |On top of that, |Plus, |Honestly, |There is also the fact that |Not to mention, )/i, '');
              } else {
                // Bullet-Smash: Do NOT output '- '. Join them into a flowing paragraph.
                // localHumanizeBullet already capitalized and added connectors ("Also,", etc)
                out += (out && !out.endsWith('\n\n') ? ' ' : '') + text;
                currentParaLength++;
              }
            } else {
              // Paragraph-Shatter: Humans write in staccato (1-2 sentences per line block)
              // If we've built up 2 sentences, force a paragraph break to make it punchy
              const connectors = ["Also,", "Plus,", "Honestly,", "Basically,", "Like,", "And", "But"];
              // 30% chance to add a connector when attaching a new sentence to an existing paragraph
              const useConnector = currentParaLength > 0 && Math.random() > 0.7;

              let finalPiece = text;
              let prefix = '';

              if (useConnector) {
                prefix = connectors[Math.floor(Math.random() * connectors.length)] + ' ';
                finalPiece = finalPiece.charAt(0).toLowerCase() + finalPiece.slice(1);
              }

              if (currentParaLength >= 2) {
                out += '\n\n' + text;
                currentParaLength = 1;
              } else {
                out += (out && !out.endsWith('\n\n') ? ' ' : '') + prefix + finalPiece;
                currentParaLength++;
              }
            }
          }
          return out.trim();
        };

        for (let i = 0; i < phrases.length; i++) {
          const phrase = phrases[i];
          setCurrentPhrase(i + 1);
          setStatusMsg(`Phrase ${i + 1}/${phrases.length} — Humanizing...`);

          // ── Routing: Bullets bypass AI, Sentences use AI ──
          let humanized = phrase.text; // default keep original

          if (phrase.isBullet) {
            // Instant local conversion (no hallucination possible)
            humanized = localHumanizeBullet(phrase.text, i);
            log.push(`✓ ${i + 1}/${phrases.length}: local template conversion`);
          } else {
            // Send to 1B Model
            try {
              const raw = await infer(buildSentencePrompt(phrase.text, phrase.isTitle, phrase.isBullet));
              // Clean: aggressively strip multi-line conversational fillers & markdown
              const lines = raw.split('\n').map(l => l.trim()).filter(l => l.length > 0);
              const cleanedLines = lines.filter(l => !/^(Rewritten|Output|Result|Here is|Here are|Here's|Sure,|I have rewritten|I can help|The rewritten|Rewrite:|Two shorter sentences:?)/i.test(l));
              const cleaned = cleanedLines.join(' ')
                .replace(/^["""']|["""']$/g, '')
                .replace(/^[-*•]\s+/, '')
                .replace(/^#{1,4}\s+/, '')
                .replace(/\*\*/g, '')
                .trim();

              if (cleaned && cleaned.length >= 4) {
                // Judge: verify meaning preserved (instant, no extra AI call)
                const verdict = judgeSentence(phrase.text, cleaned);
                if (verdict.pass) {
                  humanized = cleaned;
                  log.push(`✓ ${i + 1}/${phrases.length}: AI rewritten`);
                } else {
                  // Judge failed — keep original sentence (safe fallback)
                  humanized = phrase.text;
                  log.push(`↩ ${i + 1}/${phrases.length}: fallback — ${verdict.reason}`);
                }
              } else {
                log.push(`↩ ${i + 1}/${phrases.length}: fallback — empty output`);
              }
            } catch {
              log.push(`↩ ${i + 1}/${phrases.length}: fallback — inference error`);
            }
          }

          humanizedPhrases.push(humanized); // ← was missing! array was always empty

          const structuredSoFar = shapeShifterStitch(phrases, humanizedPhrases);
          setStatusLog([...log]);
          setResultText(structuredSoFar);
          await new Promise(r => setTimeout(r, 20));
        }

        // Final structured stitch
        outputText = shapeShifterStitch(phrases, humanizedPhrases);
        setResultText(outputText);
        setCurrentPhrase(0);
        setTotalPhrases(0);
      }

      // ── Score the final output ──
      setStatusMsg('Scoring...');
      const burstiness = computeBurstiness(outputText);
      const { count } = computeCliche(outputText);
      const finalScore: Score = {
        total: Math.round(burstiness * 0.7 + Math.max(0, 100 - count * 12) * 0.3),
        burstiness, clicheCount: count,
      };
      setScore(finalScore);
      setStatusMsg('');
    } catch (e: any) {
      const msg = e?.message || 'Unknown error. Please try again.';
      setResultText(`*⚠️ ${msg}*`);
      setStatusMsg('');
    } finally {
      setIsProcessing(false);
    }
  }, [inputText, isProcessing, isOverLimit, enginePhase, mode, infer]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); handleHumanize(); }
  }, [handleHumanize]);

  // Inject global <style> into document.head to nuke belan cursor while on this page
  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'humanizer-cursor-override';
    style.textContent = `
      .magical-belan-portal, .belan-cursor-responsive, .particle-container,
      [data-belan-cursor], .magical-cursor-container, .global-cursor-follower {
        display: none !important;
        opacity: 0 !important;
        visibility: hidden !important;
      }
      body, body * { cursor: none !important; }
    `;
    document.head.appendChild(style);
    return () => { document.getElementById('humanizer-cursor-override')?.remove(); };
  }, []);

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(resultText); setCopyText('COPIED!'); setTimeout(() => setCopyText('Copy Result'), 2500); }
    catch { /* silent */ }
  };

  const progressPercent = loadingProgress?.progress ? Math.round(loadingProgress.progress * 100) : 0;
  const isReady = enginePhase === 'ready' || enginePhase === 'gpu_lost';
  const modeIsGroq = mode === 'groq' || enginePhase === 'gpu_lost';
  const canHumanize = isReady && !!inputText.trim() && !isProcessing && !isOverLimit;
  const accent = modeIsGroq ? '#818cf8' : '#39FF14';
  const accentDim = modeIsGroq ? 'rgba(99,102,241,0.65)' : 'rgba(57,255,20,0.65)';
  const scoreColor = (s: number) => s >= 75 ? '#39FF14' : s >= 55 ? '#facc15' : '#f87171';

  // Cyber cursor tracking
  const [cursorPos, setCursorPos] = useState({ x: -100, y: -100 });
  const [cursorHover, setCursorHover] = useState(false);
  useEffect(() => {
    const move = (e: MouseEvent) => setCursorPos({ x: e.clientX, y: e.clientY });
    const over = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      setCursorHover(!!(el.closest('button') || el.closest('a') || el.closest('[role=button]') || el.style.cursor === 'pointer' || el.classList.contains('cursor-pointer')));
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseover', over);
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseover', over); };
  }, []);

  return (
    <div className="fixed inset-0 z-50 font-sans text-gray-100 flex flex-col" style={{ background: '#050505' }}>
      <style dangerouslySetInnerHTML={{
        __html: `
        .cs::-webkit-scrollbar{width:3px}.cs::-webkit-scrollbar-thumb{background:rgba(57,255,20,.18);border-radius:10px}
        .panel{position:relative;border-radius:14px;background:rgba(8,8,8,.9);border:1px solid rgba(255,255,255,.05)}
        .panel::before{content:"";position:absolute;inset:0;border-radius:14px;padding:1px;background:linear-gradient(145deg,rgba(255,255,255,.09) 0%,transparent 55%);-webkit-mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);-webkit-mask-composite:xor;mask-composite:exclude;pointer-events:none}
        .spin{border:2px solid rgba(57,255,20,.06);border-top:2px solid #39FF14;border-radius:50%;animation:spin .85s linear infinite}
        .spin-g{border:2px solid rgba(99,102,241,.06);border-top:2px solid #818cf8;border-radius:50%;animation:spin .85s linear infinite}
        @keyframes spin{to{transform:rotate(360deg)}}
        .font-tech{font-family:'Orbitron',monospace}
        .mpill{display:flex;border-radius:999px;overflow:hidden;border:1px solid rgba(255,255,255,.07)}
        .mbtn{padding:4px 14px;font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;cursor:none!important;transition:all .25s;white-space:nowrap;font-family:'Orbitron',monospace}
        .mon-free{background:rgba(57,255,20,.12);color:#39FF14}
        .mon-groq{background:rgba(99,102,241,.16);color:#818cf8}
        .moff{background:transparent;color:rgba(255,255,255,.2)}.moff:hover{color:rgba(255,255,255,.42)}
        /* Suppress all native cursors on humanizer */
        *{cursor:none!important}
      ` }} />

      {/* Cyber cursor dot removed to respect global system cursors */}
      <AnimatePresence>
        {enginePhase === 'booting' && mode === 'webllm' && (
          <motion.div initial={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.5 } }}
            className="fixed inset-0 z-[200] flex flex-col items-center justify-center"
            style={{ background: 'rgba(2,2,2,0.97)', backdropFilter: 'blur(20px)' }}>
            <div className="relative flex items-center justify-center mb-10">
              <div className="absolute w-32 h-32 rounded-full border border-[#39FF14]/5 animate-[spin_7s_linear_infinite]" />
              <div className="absolute w-20 h-20 rounded-full border border-[#39FF14]/8 animate-[spin_4s_linear_infinite_reverse]" />
              <div className="spin" style={{ width: 54, height: 54 }} />
            </div>
            <h2 className="font-tech text-base text-white font-bold tracking-widest uppercase">BongBari Humanizer</h2>
            <p className="text-[#39FF14]/40 text-[8px] font-tech uppercase tracking-widest mt-1 mb-6">On Device · WebGPU · Private</p>
            <AnimatePresence mode="wait">
              <motion.p key={bootMsgIndex} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                className="text-white/38 text-sm text-center px-8 mb-8 font-light">{BOOT_MSGS[bootMsgIndex]}</motion.p>
            </AnimatePresence>
            <div className="w-64 md:w-80">
              <div className="flex justify-between text-[8px] text-white/18 mb-1.5 font-mono">
                <span>Downloading model</span><span>{progressPercent}%</span>
              </div>
              <div className="w-full h-[3px] bg-white/5 rounded-full overflow-hidden">
                <motion.div className="h-full rounded-full" style={{ background: 'linear-gradient(90deg,#39FF14,#00ffaa)' }}
                  animate={{ width: `${progressPercent}%` }} transition={{ duration: 0.4 }} />
              </div>
              <p className="text-white/12 text-[7px] font-mono mt-1.5 text-center">Downloads once · works offline forever · your GPU · your privacy</p>
            </div>
            <button onClick={() => { setMode('groq'); }}
              className="mt-8 text-white/20 text-[10px] border border-white/7 px-5 py-2 rounded-full hover:text-indigo-400 hover:border-indigo-400/30 transition-all cursor-pointer">
              Skip → Use Groq Cloud Power (Faster)
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── NO WebGPU / GPU LOST ── */}
      <AnimatePresence>
        {(enginePhase === 'no_webgpu' || enginePhase === 'gpu_lost') && mode === 'webllm' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-4 p-6 text-center"
            style={{ background: 'rgba(2,2,2,0.97)' }}>
            <span className="text-4xl">{enginePhase === 'gpu_lost' ? '⚡' : '📱'}</span>
            <h2 className="font-tech text-base text-white font-bold tracking-widest uppercase">
              {enginePhase === 'gpu_lost' ? 'GPU Memory Limit Reached' : 'WebGPU Not Supported'}
            </h2>
            <p className="text-white/30 text-sm max-w-sm">
              {enginePhase === 'gpu_lost'
                ? 'Your GPU ran out of memory. Switch to Groq Cloud — it\'s faster, more powerful, and free.'
                : 'Your browser can\'t run AI locally. Use Groq Cloud — free and more powerful.'}
            </p>
            <button onClick={() => { setMode('groq'); setEnginePhase('ready'); }}
              className="mt-2 bg-indigo-500/14 border border-indigo-400/32 text-indigo-300 font-tech text-[11px] uppercase tracking-widest px-6 py-3 rounded-xl cursor-pointer hover:bg-indigo-500/20 transition-all">
              Use Groq Cloud Mode →
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── HEADER ── */}
      <header className="h-[56px] flex-none flex items-center justify-between px-3 md:px-5 border-b border-white/5 bg-black/50 backdrop-blur-md z-50">
        <Link href="/tools">
          <button className="px-3 py-1.5 rounded-xl border border-white/7 text-white/35 text-xs hover:text-[#39FF14] hover:border-[#39FF14]/28 transition-all flex items-center gap-1.5 group cursor-pointer">
            <span className="group-hover:-translate-x-0.5 transition-transform text-xs">←</span>
            <span className="hidden md:inline font-tech text-[9px] uppercase tracking-wider">Tools</span>
          </button>
        </Link>

        <div className="absolute left-1/2 -translate-x-1/2 flex items-baseline gap-1.5">
          <span className="text-lg md:text-xl font-serif italic text-white">BongBari</span>
          <div className="flex items-center gap-2">
            <span className="font-tech text-xs md:text-sm text-[#39FF14] uppercase tracking-widest font-bold" style={{ textShadow: '0 0 10px rgba(57,255,20,0.38)' }}>Humanizer</span>
            <span className="font-tech text-[9px] text-[#39FF14] border border-[#39FF14]/50 px-1.5 py-0.5 rounded-md tracking-widest shadow-[0_0_8px_rgba(57,255,20,0.2)]">V8</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="mpill hidden md:flex">
            <button className={`mbtn ${!modeIsGroq ? 'mon-free' : 'moff'}`} onClick={() => setMode('webllm')}>⚡ Free</button>
            <button className={`mbtn ${modeIsGroq ? 'mon-groq' : 'moff'}`} onClick={() => setMode('groq')}>🚀 Groq</button>
          </div>
          {isReady && (
            <span className="hidden md:block text-[7px] font-tech uppercase tracking-widest border px-2 py-1 rounded"
              style={{ color: accent, borderColor: accentDim + '44', background: modeIsGroq ? 'rgba(99,102,241,0.07)' : 'rgba(57,255,20,0.07)' }}>
              {modeIsGroq ? 'Groq ✓' : 'WebGPU ✓'}
            </span>
          )}
          {enginePhase === 'booting' && (
            <span className="hidden md:block text-[7px] font-tech uppercase tracking-widest text-white/22 border border-white/7 px-2 py-1 rounded animate-pulse">
              {progressPercent > 0 ? `${progressPercent}%` : '...'}
            </span>
          )}
        </div>
      </header >

      {/* Mobile mode toggle */}
      < div className="flex md:hidden items-center justify-center py-2 border-b border-white/5 flex-none" >
        <div className="mpill">
          <button className={`mbtn ${!modeIsGroq ? 'mon-free' : 'moff'}`} onClick={() => setMode('webllm')}>⚡ Free Unlimited</button>
          <button className={`mbtn ${modeIsGroq ? 'mon-groq' : 'moff'}`} onClick={() => setMode('groq')}>🚀 Groq Power</button>
        </div>
      </div >

      {/* ── WORK AREA ── */}
      < main className="flex-1 flex flex-col md:flex-row overflow-hidden p-2 md:p-4 gap-2 md:gap-4 relative min-h-0" >

        {/* INPUT */}
        < section className="flex-1 flex flex-col min-h-0" style={{ minHeight: 'min(33dvh,170px)' }
        }>
          <div className="panel flex-1 p-4 flex flex-col min-h-0 relative">
            <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-white/5 flex-none">
              <div className="flex items-center gap-2">
                <label className="font-tech text-[9px] uppercase tracking-widest text-[#39FF14] font-bold">Input</label>
                {wordCount > 0 && (
                  <span className={`text-[8px] font-mono flex items-center gap-1.5 ${isOverLimit ? 'text-red-400' : 'text-white/20'}`}>
                    {wordCount}/{wordLimit}w {isOverLimit ? '⚠️ Over limit' : ''}
                    {!modeIsGroq && (
                      <span className="px-1 py-0.5 rounded text-[7px] uppercase tracking-widest border"
                        style={{
                          borderColor: hardwareLimit === 150 ? '#f87171' : hardwareLimit >= 400 ? '#39FF14' : '#fbbf24',
                          color: hardwareLimit === 150 ? '#f87171' : hardwareLimit >= 400 ? '#39FF14' : '#fbbf24', background: 'rgba(255,255,255,0.05)'
                        }}>
                        {hardwareLimit === 150 ? 'Safe Mode' : hardwareLimit >= 400 ? 'Power Mode' : 'Standard Mode'}
                      </span>
                    )}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowPreview(p => !p)}
                  className="text-[8px] font-tech uppercase tracking-widest border border-white/7 px-2 py-0.5 rounded cursor-pointer transition-all hover:border-[#39FF14]/28"
                  style={{ color: showPreview ? '#39FF14' : 'rgba(255,255,255,.2)' }}>{showPreview ? 'Raw' : 'Preview'}</button>
              </div>
            </div>

            {/* Word limit hint */}
            {wordCount === 0 && (
              <p className="text-white/14 text-[8px] font-mono mb-2 flex-none flex items-center gap-1.5">
                {modeIsGroq ? `Max ${GROQ_MAX_WORDS} words (Groq cloud)` : `Max ${hardwareLimit} words (On-device limit)`}
                {!modeIsGroq && (
                  <span className="px-1 py-0.5 rounded text-[7px] uppercase tracking-widest border"
                    style={{
                      borderColor: hardwareLimit === 150 ? '#f87171' : hardwareLimit >= 400 ? '#39FF14' : '#fbbf24',
                      color: hardwareLimit === 150 ? '#f87171' : hardwareLimit >= 400 ? '#39FF14' : '#fbbf24', background: 'rgba(255,255,255,0.05)'
                    }}>
                    {hardwareLimit === 150 ? 'Safe' : hardwareLimit >= 400 ? 'Power' : 'Standard'} Mode
                  </span>
                )}
              </p>
            )}

            <div className="flex-1 relative min-h-0">
              {showPreview ? (
                <div className="absolute inset-0 overflow-y-auto cs">
                  <ReactMarkdown components={mdC}>{inputText || '*Paste text here to preview markdown...*'}</ReactMarkdown>
                </div>
              ) : (
                <textarea ref={textAreaRef} value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  className="absolute inset-0 w-full h-full bg-transparent border-none focus:ring-0 focus:outline-none text-[15px] leading-relaxed resize-none cs placeholder-white/8 font-light text-gray-100"
                  placeholder={`Paste AI-generated text here…\n(Formatted text from web pages is auto-converted to markdown)`}
                  spellCheck={false} />
              )}
            </div>

            {/* Paste button */}
            <button onClick={() => handlePaste()} title="Paste from clipboard"
              className="absolute bottom-4 right-4 bg-black/60 hover:bg-[#39FF14]/7 p-2.5 rounded-xl border border-white/6 hover:border-[#39FF14]/28 transition-all group cursor-pointer z-10">
              <svg className="h-4 w-4 text-white/28 group-hover:text-[#39FF14] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </button>
          </div>
        </section >

        {/* HUMANIZE BUTTON & PRO CONTROLS */}
        <div className="relative md:flex-none flex flex-col items-center justify-center flex-none md:w-[140px] gap-1.5 my-3 md:my-0 z-40">

          {modeIsGroq && (
            <div className="flex w-full md:w-auto md:flex-col gap-2 mb-2 md:mb-3 bg-black/40 border border-white/5 rounded-xl p-2 backdrop-blur-sm">
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-[7px] font-tech text-[#39FF14] uppercase tracking-widest px-1">Vibe</label>
                <select value={vibe} onChange={e => setVibe(e.target.value as Vibe)} className="bg-white/5 border border-white/10 rounded-md text-[9px] text-white/80 p-1.5 outline-none focus:border-[#39FF14]/50 hover:bg-white/10 transition-colors cursor-pointer w-full text-center">
                  <option value="academic">Academic</option>
                  <option value="casual">Casual</option>
                  <option value="genz">Gen-Z</option>
                </select>
              </div>
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-[7px] font-tech text-[#39FF14] uppercase tracking-widest px-1">Human Flaws</label>
                <select value={flawLevel} onChange={e => setFlawLevel(e.target.value as FlawLevel)} className="bg-white/5 border border-white/10 rounded-md text-[9px] text-white/80 p-1.5 outline-none focus:border-[#39FF14]/50 hover:bg-white/10 transition-colors cursor-pointer w-full text-center">
                  <option value="none">Flawless</option>
                  <option value="low">Natural</option>
                  <option value="high">Messy</option>
                </select>
              </div>
            </div>
          )}

          <motion.button onClick={handleHumanize} disabled={!canHumanize}
            whileHover={canHumanize ? { scale: 1.06 } : undefined}
            whileTap={canHumanize ? { scale: 0.93 } : undefined}
            animate={isProcessing ? {
              boxShadow: modeIsGroq
                ? ['0 0 12px rgba(99,102,241,.2)', '0 0 28px rgba(99,102,241,.45)', '0 0 12px rgba(99,102,241,.2)']
                : ['0 0 12px rgba(57,255,20,.15)', '0 0 28px rgba(57,255,20,.45)', '0 0 12px rgba(57,255,20,.15)'],
              transition: { repeat: Infinity, duration: 1.2 }
            } : canHumanize ? { boxShadow: `0 0 18px ${accentDim}44` } : { boxShadow: 'none' }}>

            {/* Mobile */}
            <div className="flex md:hidden w-[min(280px,78vw)] items-center justify-center gap-3 px-5 py-4 rounded-2xl border-2 transition-all duration-300"
              style={{ background: canHumanize ? 'linear-gradient(135deg,#0a0a0a,#060606)' : '#050505', borderColor: canHumanize ? accent : 'rgba(255,255,255,0.07)', opacity: !isReady ? 0.35 : 1 }}>
              {isProcessing
                ? <><div className={modeIsGroq ? 'spin-g' : 'spin'} style={{ width: 16, height: 16 }} /><span className="font-tech text-xs font-bold uppercase tracking-widest" style={{ color: accent }}>{statusMsg || 'Working…'}</span></>
                : <><svg className="w-5 h-5 flex-none" style={{ color: canHumanize ? accent : 'rgba(255,255,255,0.14)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  <span className="font-tech text-sm font-bold uppercase tracking-widest" style={{ color: canHumanize ? accent : 'rgba(255,255,255,0.14)' }}>
                    {isOverLimit ? `Over ${wordLimit}w limit` : !isReady ? 'Loading...' : !inputText.trim() ? 'Paste First' : 'Humanize'}</span></>}
            </div>

            {/* Desktop */}
            <div className="hidden md:flex w-[112px] h-[112px] rounded-[18px] flex-col items-center justify-center gap-2 border-2 transition-all duration-300"
              style={{ background: canHumanize ? 'linear-gradient(145deg,#0d0d0d,#060606)' : '#050505', borderColor: canHumanize ? accentDim : 'rgba(255,255,255,0.07)', opacity: !isReady ? 0.28 : 1 }}>
              {isProcessing
                ? <><div className={modeIsGroq ? 'spin-g' : 'spin'} style={{ width: 25, height: 25 }} /><span className="font-tech text-[8px] font-bold uppercase tracking-widest text-center leading-tight" style={{ color: accent }}>Working</span></>
                : <><svg className="w-7 h-7" style={{ color: canHumanize ? accent : 'rgba(255,255,255,0.11)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  <span className="font-tech text-[9px] font-bold uppercase tracking-wider text-center leading-tight" style={{ color: canHumanize ? accent : 'rgba(255,255,255,0.11)', textShadow: canHumanize ? `0 0 8px ${accentDim}` : 'none' }}>
                    {isOverLimit ? 'Over Limit' : !isReady ? 'Loading' : 'Humanize'}</span></>}
            </div>
          </motion.button>
          <div className="flex items-center gap-1" style={{ opacity: canHumanize && !isProcessing ? 0.2 : 0, transition: 'opacity 0.3s' }}>
            <kbd className="text-[6px] font-mono bg-white/7 border border-white/10 rounded px-1 py-0.5 text-white">Ctrl</kbd>
            <span className="text-[6px] text-white/25">+</span>
            <kbd className="text-[6px] font-mono bg-white/7 border border-white/10 rounded px-1 py-0.5 text-white">↵</kbd>
          </div>
        </div >

        {/* OUTPUT */}
        < section className="flex-1 flex flex-col min-h-0" style={{ minHeight: 'min(33dvh,170px)' }}>
          <div className="panel flex-1 p-4 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-white/5 flex-none">
              <label className="font-tech text-[9px] uppercase tracking-widest text-[#39FF14] font-bold">Result</label>
              <div className="flex gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500/22" /><span className="w-2 h-2 rounded-full bg-yellow-400/22" /><span className="w-2 h-2 rounded-full bg-[#39FF14]/28" /></div>
            </div>

            {/* Score */}
            <AnimatePresence>
              {score && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-3 flex-none">
                  <div className="rounded-xl border border-white/5 p-3" style={{ background: 'rgba(4,4,4,0.85)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-tech text-[8px] uppercase tracking-widest text-white/28">Human Score</span>
                      <span className="font-tech text-xl font-bold" style={{ color: scoreColor(score.total) }}>{score.total}<span className="text-xs text-white/16">/100</span></span>
                    </div>
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden mb-2">
                      <motion.div className="h-full rounded-full" animate={{ width: `${score.total}%` }} transition={{ duration: 0.65, ease: 'easeOut' }}
                        style={{ background: `linear-gradient(90deg,${scoreColor(score.total)},${score.total > 74 ? '#00ffaa' : score.total > 54 ? '#fbbf24' : '#f87171'})` }} />
                    </div>
                    <div className="flex gap-3 text-[7px] font-mono text-white/20">
                      <span>Burstiness: <span style={{ color: scoreColor(score.burstiness) }}>{score.burstiness}</span></span>
                      <span>Clichés: <span style={{ color: score.clicheCount === 0 ? '#39FF14' : '#f87171' }}>{score.clicheCount === 0 ? 'None ✓' : `${score.clicheCount} found`}</span></span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex-1 relative min-h-0">
              {/* Processing overlay */}
              <AnimatePresence>
                {isProcessing && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-20 rounded-xl p-4"
                    style={{ background: 'rgba(3,3,3,0.88)', backdropFilter: 'blur(8px)' }}>
                    <div className={modeIsGroq ? 'spin-g' : 'spin'} style={{ width: 36, height: 36 }} />
                    <p className="font-tech text-[9px] font-bold tracking-widest uppercase animate-pulse text-center" style={{ color: accent }}>
                      {statusMsg || 'Humanizing…'}
                    </p>
                    {/* Live Judge Log — shows per-phrase verdicts in real-time */}
                    {!modeIsGroq && statusLog.length > 0 && (
                      <div className="w-full max-w-[240px] max-h-[90px] overflow-y-auto cs rounded-lg border border-white/6 px-2 py-1.5" style={{ background: 'rgba(0,0,0,0.5)' }}>
                        {statusLog.map((line, i) => (
                          <p key={i} className="text-[7px] font-mono leading-relaxed truncate"
                            style={{ color: line.startsWith('✓') ? '#39FF14' : 'rgba(251,191,36,0.7)' }}>
                            {line}
                          </p>
                        ))}
                      </div>
                    )}
                    {!modeIsGroq && totalPhrases > 0 && (
                      <div className="w-full max-w-[240px]">
                        <div className="flex justify-between text-[6px] font-mono text-white/18 mb-1">
                          <span>Phrase {currentPhrase}/{totalPhrases}</span>
                          <span>{Math.round((currentPhrase / totalPhrases) * 100)}%</span>
                        </div>
                        <div className="w-full h-[2px] bg-white/5 rounded-full overflow-hidden">
                          <motion.div className="h-full rounded-full bg-[#39FF14]"
                            animate={{ width: `${(currentPhrase / totalPhrases) * 100}%` }}
                            transition={{ duration: 0.3 }} />
                        </div>
                      </div>
                    )}
                    <p className="text-white/14 text-[7px] font-mono border border-white/5 px-2 py-0.5 rounded-full">
                      {modeIsGroq ? 'Groq · Llama 3.1 8B · Fast' : 'WebGPU · Phrase-by-Phrase · Local'}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Empty */}
              {!isProcessing && !resultText && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
                  <div className="text-center"><p className="text-3xl mb-2" style={{ opacity: 0.04 }}>✦</p>
                    <p className="text-white/8 text-xs">Your result appears here</p></div>
                </div>
              )}

              {/* Result */}
              {!isProcessing && resultText && (
                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                  className="absolute inset-0 overflow-y-auto cs">
                  <ReactMarkdown components={mdC}>{resultText}</ReactMarkdown>
                </motion.div>
              )}

              {/* Streaming preview */}
              {isProcessing && resultText && (
                <div className="absolute inset-0 overflow-y-auto cs" style={{ zIndex: 5, opacity: 0.28 }}>
                  <ReactMarkdown components={mdC}>{resultText}</ReactMarkdown>
                </div>
              )}
            </div>

            <div className="mt-3 flex-none">
              <motion.button whileTap={{ scale: 0.97 }} onClick={handleCopy} disabled={!resultText || isProcessing}
                className={`w-full py-3 rounded-xl border text-[9px] font-tech uppercase tracking-widest font-bold transition-all cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${copyText === 'COPIED!' ? 'border-[#39FF14] text-[#39FF14] bg-[#39FF14]/6' : 'border-white/5 text-white/35 hover:border-[#39FF14]/28 hover:text-[#39FF14]'}`}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                {copyText}
              </motion.button>
            </div>
          </div>
        </section >
      </main >
    </div >
  );
}
