import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { CreateMLCEngine, InitProgressReport } from '@mlc-ai/web-llm';
import ReactMarkdown from 'react-markdown';
import { useAuth } from "@/hooks/useAuth";
import { auth } from "@/lib/firebase";
import { useLocation } from "wouter";
import { buildApiUrl } from '@/lib/queryClient';
import { cleanInputText } from '@/lib/nlp';

// ─── Segmented Pill Control (replaces dropdown — no z-index clashes) ──────────
function PillSelect({
  value, onChange, options, disabled, label
}: {
  value: string; onChange: (v: string) => void;
  options: { value: string, label: string }[]; disabled: boolean; label: string
}) {
  return (
    <div className={`flex flex-col gap-1 ${disabled ? 'opacity-40 pointer-events-none' : ''}`}>
      <label className="text-[7px] font-black text-amber-500 uppercase tracking-widest text-center">{label}</label>
      <div className="flex rounded-lg overflow-hidden border border-white/10 bg-black/30">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-wider transition-all ${
              value === opt.value
                ? 'bg-amber-500 text-black shadow-inner'
                : 'text-white/40 hover:text-white/80 hover:bg-white/5'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
// Keep PremiumSelect as alias so nothing else breaks
const PremiumSelect = PillSelect;


// ─── Config ────────────────────────────────────────────────────────────────────
const WEBLLM_MODEL = "Llama-3.2-1B-Instruct-q4f16_1-MLC";
const GROQ_MODEL = "llama-3.1-8b-instant";
const GROQ_MAX_WORDS = 1000;

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

// ─── HTML → Markdown converter ─────────────────────────────────────
function htmlToPlainText(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;

  const convert = (el: Node): string => {
    if (el.nodeType === Node.TEXT_NODE) return el.textContent || '';
    if (el.nodeType !== Node.ELEMENT_NODE) return '';
    const element = el as HTMLElement;
    const tag = element.tagName.toLowerCase();
    const inner = Array.from(element.childNodes).map(convert).join('').trim();
    if (!inner) return '';

    switch (tag) {
      case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6':
        return `\n\n${inner}\n\n`;
      case 'p': return `\n\n${inner}\n\n`;
      case 'br': return '\n';
      case 'li': return `\n- ${inner}`;
      case 'ul': case 'ol': return `${inner}\n`;
      case 'hr': return '\n\n';
      // Strip all formatting — just return inner text
      default: return inner;
    }
  };

  return convert(div)
    .replace(/\n{3,}/g, '\n\n')  // max 2 newlines
    .replace(/[ \t]{2,}/g, ' ')  // collapse spaces
    .trim();
}
// Keep old name as alias so nothing else breaks
const htmlToMarkdown = htmlToPlainText;

// ─── Local Humanization Functions ────────────────
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

function localHumanizeBullet(text: string, index: number): string {
  const cleanedText = text.replace(/^(Also,|Furthermore,|Moreover,|In addition,|And,|Plus,|Not to mention,|There is also the fact that|Additionally,|Ultimately,|To sum up,|Finally,)\s*/i, '');
  let t = insertContractions(replaceAIClichés(cleanedText));
  if (!/[.!?]$/.test(t)) t += '.';

  if (index === 0) return t.charAt(0).toUpperCase() + t.slice(1);
  const connectors = ['Plus,', 'There is also the fact that', 'On top of that,', 'Not to mention,'];
  const connector = index === 1 ? "Also," : connectors[index % connectors.length];
  const lower = t.charAt(0).toLowerCase() + t.slice(1);
  return `${connector} ${lower}`;
}

// ─── Scoring ───────────────────────────────────────────────────────────────────
function computeBurstiness(text: string): number {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const lengths = sentences.map(s => s.trim().split(/\s+/).length).filter(l => l > 1);
  if (lengths.length < 2) return 50;
  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance = lengths.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / lengths.length;
  let score = Math.min(100, Math.round((Math.sqrt(variance) / mean) * 220));
  const paragraphs = text.split('\n\n').filter(p => p.trim().length > 0);
  if (paragraphs.length >= 2) score += paragraphs.length * 15;
  return Math.min(100, score);
}

function computeCliche(text: string): { score: number; count: number } {
  const lower = text.toLowerCase();
  const count = AI_CLICHES.filter(c => lower.includes(c)).length;
  return { score: Math.max(0, 100 - count * 12), count };
}

// ─── Sentence Helpers ──────────────────────────────────────────────────────────
function detectPassiveVoice(text: string): boolean {
  return /\b(is|are|was|were|be|been|being)\s+\w+ed\b/i.test(text);
}

function buildSentencePrompt(phrase: string, isTitle: boolean, isBullet: boolean): string {
  const wordCount = phrase.trim().split(/\s+/).length;
  if (isTitle) return `Rephrase this title to sound casual, like a real person would say it. Same meaning. No markdown. Output ONLY the rephrased title, nothing else:\n"${phrase}"`;
  if (isBullet) return `Convert this bullet point into a natural flowing sentence. Same meaning. No facts added. Output ONLY the sentence, no bullet, no markdown:\n"${phrase}"`;
  if (detectPassiveVoice(phrase) && wordCount <= 20) return `Rewrite this sentence in active voice. Output ONLY the rewritten sentence:\n"${phrase}"`;
  return `Rewrite this text. Speak like a lazy college student. Use contractions. Cut big words. Output ONLY the rewritten text:\n"${phrase}"`;
}

function splitIntoPhrases(text: string): Array<{ text: string; isTitle: boolean; isBullet: boolean }> {
  const lines = text.split(/\n/).map(l => l.trim()).filter(Boolean);
  const result: Array<{ text: string; isTitle: boolean; isBullet: boolean }> = [];
  for (const line of lines) {
    const isMdHeading = /^#{1,3}\s+/.test(line);
    const isBullet = /^[-*•]\s+/.test(line);
    const cleanLine = line.replace(/^#{1,3}\s+/, '').replace(/^[-*•]\s+/, '').replace(/\*\*/g, '').trim();
    if (!cleanLine) continue;
    if (isMdHeading) result.push({ text: cleanLine, isTitle: true, isBullet: false });
    else if (isBullet) result.push({ text: cleanLine, isTitle: false, isBullet: true });
    else {
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
      if (currentChunk) result.push({ text: currentChunk.trim(), isTitle: false, isBullet: false });
    }
  }
  return result.filter(p => p.text.length > 3);
}

function judgeSentence(original: string, rewritten: string): { pass: boolean; reason: string } {
  if (!rewritten || rewritten.length < 4) return { pass: false, reason: 'empty' };
  if (/^(Rewritten|Output|Result|Here is|Here are|Here's|Sure,|I have rewritten|I can help|The rewritten|Rewrite:|Two shorter)/i.test(rewritten.trim())) return { pass: false, reason: 'filler' };
  if (rewritten.toLowerCase().includes(original.toLowerCase()) && rewritten.length > original.length * 1.5) return { pass: false, reason: 'echo' };
  if (rewritten.length > original.length * 2.5 && original.length > 20) return { pass: false, reason: 'too long' };
  if (rewritten.length < original.length * 0.4 && original.length > 30) return { pass: false, reason: 'too short' };
  if (rewritten.trim().toLowerCase() === original.trim().toLowerCase()) return { pass: false, reason: 'identical' };
  const words = rewritten.toLowerCase().split(/\s+/);
  if (words.length > 6) {
    const half1 = words.slice(0, Math.floor(words.length / 2)).join(' ');
    const half2 = words.slice(Math.floor(words.length / 2)).join(' ');
    if (half1 === half2) return { pass: false, reason: 'loop' };
  }
  const rewrLower = rewritten.toLowerCase();
  const origLower = original.toLowerCase();
  const introduced = AI_CLICHES.some(c => rewrLower.includes(c) && !origLower.includes(c));
  if (introduced) return { pass: false, reason: 'cliché introduced' };
  return { pass: true, reason: 'accepted' };
}

// ─── Rendering Components ───────────────────────────────────────────────────────
const mdC = {
  h1: ({ children }: any) => <h1 className="text-xl font-bold text-amber-400 mb-2 mt-3 tracking-tight">{children}</h1>,
  h2: ({ children }: any) => <h2 className="text-lg font-bold text-amber-300 mb-2 mt-2 tracking-tight">{children}</h2>,
  h3: ({ children }: any) => <h3 className="text-base font-semibold text-white mb-1 mt-2">{children}</h3>,
  p: ({ children }: any) => <p className="mb-2.5 leading-relaxed text-gray-200 text-[15px]">{children}</p>,
  strong: ({ children }: any) => <strong className="text-white font-bold">{children}</strong>,
  em: ({ children }: any) => <em className="text-gray-300 italic">{children}</em>,
  ul: ({ children }: any) => <ul className="mb-2.5 ml-3 space-y-1 list-none">{children}</ul>,
  ol: ({ children }: any) => <ol className="mb-2.5 ml-4 list-decimal space-y-1">{children}</ol>,
  li: ({ children }: any) => (
    <li className="flex items-start gap-2 text-gray-200 text-[15px]">
      <span className="text-amber-400 mt-1 flex-none text-xs">▸</span><span>{children}</span>
    </li>
  ),
  code: ({ children }: any) => <code className="bg-white/10 px-1 py-0.5 rounded text-amber-300 font-mono text-sm">{children}</code>,
  blockquote: ({ children }: any) => <blockquote className="border-l-2 border-amber-500/30 pl-3 my-2 text-gray-400 italic">{children}</blockquote>,
};

// ─── Main Logic ────────────────────────────────────────────────────────────────
type EngineMode = 'webllm' | 'groq';
type EnginePhase = 'booting' | 'ready' | 'no_webgpu' | 'gpu_lost' | 'error';
interface Score { total: number; burstiness: number; clicheCount: number; failures?: string[] }
type Vibe = 'academic' | 'casual' | 'genz';
type FlawLevel = 'none' | 'low' | 'high';
type Intensity = 'safe' | 'balanced' | 'wild';

export default function FreeToolsHumanizer() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, sessionId } = useAuth();
  const [internalMode, setInternalMode] = useState<EngineMode>(() => (localStorage.getItem('hum_mode') as EngineMode) || 'webllm');
  const [showWelcome, setShowWelcome] = useState(true);
  const [inputText, setInputText] = useState('');
  const [resultText, setResultText] = useState('');
  const [vibe, setVibe] = useState<Vibe>('casual');
  const [flawLevel, setFlawLevel] = useState<FlawLevel>('low');
  const [intensity, setIntensity] = useState<Intensity>('balanced');
  const [mobileActiveTab, setMobileActiveTab] = useState<'input' | 'output'>('input');
  const [isProcessing, setIsProcessing] = useState(false);
  const [copyText, setCopyText] = useState('Copy Result');
  const [statusMsg, setStatusMsg] = useState('');
  const [statusLog, setStatusLog] = useState<string[]>([]);
  const [currentPhrase, setCurrentPhrase] = useState(0);
  const [totalPhrases, setTotalPhrases] = useState(0);
  const [score, setScore] = useState<Score | null>(null);
  const [hardwareLimit, setHardwareLimit] = useState(300);
  const [enginePhase, setEnginePhase] = useState<EnginePhase>('booting');
  const [loadingProgress, setLoadingProgress] = useState<InitProgressReport | null>(null);
  const [bootMsgIndex, setBootMsgIndex] = useState(0);
  const [showDeviceOverride, setShowDeviceOverride] = useState(false);
  const [lastPrompt, setLastPrompt] = useState('');
  const engineRef = useRef<any>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const lastVerificationRef = useRef<any>(null);

  useEffect(() => { document.title = 'BongBari Humanizer | Free AI Text Converter'; }, []);
  useEffect(() => { localStorage.setItem('hum_mode', internalMode); }, [internalMode]);

  useEffect(() => {
    const mem = (navigator as any).deviceMemory || 8;
    const cores = navigator.hardwareConcurrency || 4;
    setHardwareLimit(mem <= 4 || cores <= 4 ? 150 : mem >= 16 || cores >= 10 ? 400 : 300);
  }, []);

  useEffect(() => {
    if (enginePhase !== 'booting') return;
    const t = setInterval(() => setBootMsgIndex(i => (i + 1) % BOOT_MSGS.length), 2200);
    return () => clearInterval(t);
  }, [enginePhase]);

  const handleGpuLost = useCallback(() => {
    engineRef.current = null;
    setEnginePhase('gpu_lost');
    setInternalMode('groq');
    setIsProcessing(false);
    setStatusMsg('');
  }, []);

  useEffect(() => {
    if (showWelcome) return;
    if (internalMode === 'groq') {
      if (engineRef.current) engineRef.current = null;
      setEnginePhase('ready');
      return;
    }
    if (!(navigator as any).gpu) { setEnginePhase('no_webgpu'); return; }
    let mounted = true;
    setEnginePhase('booting');
    (async () => {
      try {
        const e = await CreateMLCEngine(WEBLLM_MODEL, { initProgressCallback: r => mounted && setLoadingProgress(r) });
        if (!mounted) return;
        engineRef.current = e;
        setEnginePhase('ready');
      } catch (err: any) {
        if (mounted) handleGpuLost();
      }
    })();
    return () => { mounted = false; };
  }, [internalMode, showWelcome, handleGpuLost]);

  const wordLimit = internalMode === 'groq' ? GROQ_MAX_WORDS : hardwareLimit;
  const wordCount = inputText.trim() ? inputText.trim().split(/\s+/).length : 0;
  const isOverLimit = wordCount > wordLimit;
  const outputWordCount = resultText.trim() ? resultText.trim().split(/\s+/).length : 0;
  const wordDrift = outputWordCount && wordCount ? outputWordCount - wordCount : 0;

  const handlePaste = useCallback(async (e?: React.ClipboardEvent) => {
    if (e) {
      const html = e.clipboardData?.getData('text/html');
      if (html && html.trim().length > 10) {
        e.preventDefault();
        setInputText(prev => (prev + htmlToMarkdown(html)).slice(0, wordLimit * 7));
        return;
      }
      return;
    }
    try { const t = await navigator.clipboard.readText(); setInputText(prev => (prev + t).slice(0, wordLimit * 7)); } catch { }
  }, [wordLimit]);

  const infer = useCallback(async (prompt: string, onChunk: (t: string) => void = () => { }, isOverride = false) => {
    if (internalMode === 'groq' || enginePhase === 'gpu_lost') {
      const authHeader: Record<string, string> = {};
      try {
        const freshToken = await auth.currentUser?.getIdToken();
        if (freshToken) authHeader['Authorization'] = `Bearer ${freshToken}`;
      } catch (err: any) {
        console.error("Failed to fetch fresh token", err.message || err);
      }
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000); // 90s timeout (Render cold starts)
      
      let gRes;
      try {
        gRes = await fetch(buildApiUrl('/api/humanize/groq'), {
          method: "POST", headers: { "Content-Type": "application/json", ...authHeader },
          body: JSON.stringify({ prompt, vibe, flawLevel, intensity, override: isOverride }),
          signal: controller.signal
        });
      } catch (networkError: any) {
        if (networkError.name === 'AbortError') {
          throw new Error("Server timeout. It might be waking up, please try again.");
        }
        throw new Error("Network error connecting to API.");
      } finally {
        clearTimeout(timeoutId);
      }

      if (gRes.status === 409) {
        setLastPrompt(prompt);
        // We can't easily store onChunk in state if it's a callback, but we can store the intention
        setShowDeviceOverride(true);
        throw new Error("DEVICE_MISMATCH");
      }

      if (!gRes.ok) throw new Error("Cloud Engine Error.");
      const gData = await gRes.json();
      lastVerificationRef.current = gData.verification || null;
      onChunk(gData.text || "");
      return gData.text || "";
    }
    const e = engineRef.current;
    if (!e) throw new Error('Engine not ready');
    const stream = await e.chat.completions.create({ messages: [{ role: 'user', content: prompt }], max_tokens: 800, temperature: 0.85, stream: true });
    let full = '';
    for await (const chunk of stream) { full += chunk.choices?.[0]?.delta?.content || ''; onChunk(full); }
    return full;
  }, [internalMode, enginePhase, vibe, flawLevel]);

  const handleHumanize = useCallback(async () => {
    if (!inputText.trim() || isProcessing || isOverLimit || (enginePhase !== 'ready' && enginePhase !== 'gpu_lost')) return;
    setIsProcessing(true); setResultText(''); setScore(null);
    setStatusMsg('Initializing V12 Pipeline...');
    setMobileActiveTab('output');
    setStatusLog(["Extracting AST nodes..."]);

    // LAYER 1: V9 Input Cleaning & Pre-processing
    // Strip predictable AI formats and conversational filler before it even hits the engine
    const { cleanedText } = cleanInputText(inputText);

    try {
      if (internalMode === 'groq') {
        setStatusMsg('Humanizing...');
        const finalOutput = await infer(cleanedText, t => setResultText(t));
        setResultText(finalOutput);

        const v = lastVerificationRef.current;
        if (v) {
          setScore({ total: v.humanScore, burstiness: v.metrics.burstiness.score, clicheCount: v.metrics.cliches.count, failures: v.failures || [] });
        } else {
          const b = computeBurstiness(finalOutput);
          const count = computeCliche(finalOutput).count;
          setScore({ total: Math.round(b * 0.7 + Math.max(0, 100 - count * 12) * 0.3), burstiness: b, clicheCount: count, failures: [] });
        }
      } else {
        const phrases = splitIntoPhrases(cleanedText);
        setTotalPhrases(phrases.length); setStatusLog([]);
        const humanized: string[] = []; const log: string[] = [];

        const bulletPhrases = phrases.filter(p => p.isBullet);
        const avgB = bulletPhrases.length > 0 ? bulletPhrases.reduce((acc, p) => acc + p.text.split(/\s+/).length, 0) / bulletPhrases.length : 0;
        const keepB = bulletPhrases.length > 0 && bulletPhrases.length <= 5 && avgB <= 12;

        const stitch = (phArr: any[], humArr: string[]) => {
          let out = ''; let pLen = 0;
          for (let j = 0; j < humArr.length; j++) {
            const ph = phArr[j]; const text = humArr[j];
            if (ph.isTitle) { out += (out ? '\n\n' : '') + text + '\n\n'; pLen = 0; }
            else if (ph.isBullet) {
              if (keepB) out += (out && !out.endsWith('\n') ? '\n' : '') + '- ' + text.replace(/^(Also, |Plus, )/i, '');
              else { out += (out && !out.endsWith('\n\n') ? ' ' : '') + text; pLen++; }
            } else {
              if (pLen >= 2) { out += '\n\n' + text; pLen = 1; }
              else { out += (out && !out.endsWith('\n\n') ? ' ' : '') + text; pLen++; }
            }
          }
          return out.trim();
        };

        for (let i = 0; i < phrases.length; i++) {
          setCurrentPhrase(i + 1); setStatusMsg(`Phrase ${i + 1}/${phrases.length}...`);
          let human = phrases[i].text;
          if (phrases[i].isBullet) { human = localHumanizeBullet(phrases[i].text, i); log.push(`✓ ${i + 1}: Local`); }
          else {
            try {
              const res = await infer(buildSentencePrompt(phrases[i].text, phrases[i].isTitle, phrases[i].isBullet));
              const clean = res.replace(/^(Rewritten|Output|Result|Here is|Here's|Sure).*\n/i, '').replace(/\*\*/g, '').trim();
              if (judgeSentence(phrases[i].text, clean).pass) { human = clean; log.push(`✓ ${i + 1}: AI`); }
              else log.push(`↩ ${i + 1}: Safe`);
            } catch { log.push(`↩ ${i + 1}: Fail`); }
          }
          humanized.push(human); setStatusLog([...log]); setResultText(stitch(phrases, humanized));
        }
        const final = stitch(phrases, humanized);

        // Local WebLLM mode is a free preview. It DOES NOT rely on the V12 Server-Side Fortress.
        // It outputs the raw LLM output without the proprietary algorithms, keeping our IP secure.
        setResultText(final);

        let finalB = computeBurstiness(final);
        let finalCount = computeCliche(final).count;

        setScore({ total: Math.round(finalB * 0.7 + Math.max(0, 100 - finalCount * 12) * 0.3), burstiness: finalB, clicheCount: finalCount });
      }
    } catch (e: any) {
      if (e.message === "DEVICE_MISMATCH") {
        setIsProcessing(false);
        setStatusMsg('Security Check Required');
        return;
      }
      console.error(e);
      setIsProcessing(false);
      setStatusMsg(e.message || 'Error. Check connection.');
    } finally {
      setIsProcessing(false);
    }
  }, [inputText, isProcessing, isOverLimit, enginePhase, internalMode, infer, mobileActiveTab]);

  const handleDeviceOverride = async () => {
    setShowDeviceOverride(false);
    setIsProcessing(true);
    setStatusMsg('Re-authorizing device...');
    try {
      const finalOutput = await infer(lastPrompt, t => setResultText(t), true);
      setResultText(finalOutput);
      const v = lastVerificationRef.current;
      if (v) {
        setScore({ total: v.humanScore, burstiness: v.metrics.burstiness.score, clicheCount: v.metrics.cliches.count, failures: v.failures || [] });
      } else {
        const b = computeBurstiness(finalOutput);
        const count = computeCliche(finalOutput).count;
        setScore({ total: Math.round(b * 0.7 + Math.max(0, 100 - count * 12) * 0.3), burstiness: b, clicheCount: count, failures: [] });
      }
    } catch (e: any) {
      console.error(e);
      setStatusMsg(e.message || 'Override Failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const isReady = enginePhase === 'ready' || enginePhase === 'gpu_lost';
  const modeIsGroq = internalMode === 'groq' || enginePhase === 'gpu_lost';
  const canHumanize = isReady && !!inputText.trim() && !isProcessing && !isOverLimit;
  const accent = modeIsGroq ? '#f59e0b' : '#facc15';
  const scoreColor = (s: number) => s >= 75 ? '#facc15' : s >= 55 ? '#fbbf24' : '#f87171';

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(resultText);
      setCopyText('COPIED!');
      setTimeout(() => setCopyText('Copy Result'), 2500);
    } catch { /* silent */ }
  }, [resultText]);

  return (
    <div className="fixed inset-0 z-50 font-sans text-gray-100 flex flex-col bg-zinc-950 overflow-hidden">
      <style dangerouslySetInnerHTML={{
        __html: `
        .cs::-webkit-scrollbar{width:3px}.cs::-webkit-scrollbar-thumb{background:rgba(250,204,21,.25);border-radius:10px}
        .panel{position:relative;border-radius:16px;background:rgba(12,12,14,.9);border:1px solid rgba(255,255,255,.07);box-shadow:0 4px 24px -1px rgba(0,0,0,.3)}
        .panel::before{content:"";position:absolute;inset:0;border-radius:16px;padding:1px;background:linear-gradient(145deg,rgba(255,255,255,.1) 0%,transparent 55%);-webkit-mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);-webkit-mask-composite:xor;mask-composite:exclude;pointer-events:none}
        .spin{border:2px solid rgba(250,204,21,.1);border-top:2px solid #facc15;border-radius:50%;animation:spin .85s linear infinite}
        @keyframes spin{to{transform:rotate(360deg)}}
        .font-tech{font-family:'Orbitron',monospace}
        .mpill{display:flex;border-radius:999px;overflow:hidden;border:1px solid rgba(255,255,255,.07)}
        .mbtn{padding:4px 14px;font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;transition:all .25s;white-space:nowrap;font-family:'Orbitron',monospace}
        .mon-free{background:rgba(57,255,20,.12);color:#39FF14}
        .mon-groq{background:rgba(245,158,11,.16);color:#f59e0b}
        .moff{background:transparent;color:rgba(255,255,255,.2)}.moff:hover{color:rgba(255,255,255,.42)}
      ` }} />

      {/* Boot Overlay */}
      <AnimatePresence>
        {enginePhase === 'booting' && internalMode === 'webllm' && !showWelcome && (
          <motion.div initial={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-zinc-950/98 backdrop-blur-xl">
            <div className="spin mb-6" style={{ width: 50, height: 50 }} />
            <p className="font-bold text-amber-400 uppercase tracking-widest text-[10px]">{BOOT_MSGS[bootMsgIndex]}</p>
            <div className="w-64 h-1 bg-white/5 rounded-full mt-4 overflow-hidden"><motion.div className="h-full bg-amber-500" animate={{ width: `${loadingProgress?.progress ? loadingProgress.progress * 100 : 0}%` }} /></div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Welcome Modal */}
      <AnimatePresence>
        {showWelcome && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="panel w-full max-w-xl p-6 md:p-8 border-amber-500/20 shadow-2xl my-auto">
              <h2 className="text-2xl md:text-3xl font-black text-amber-500 mb-2 text-center">BongBari Humanizer</h2>
              <p className="text-gray-300 text-sm mb-6 leading-relaxed text-center font-medium">Please choose your AI engine. (Explained simply for our Bong community!)</p>

              <div className="flex flex-col md:flex-row gap-4 mb-6 w-full">
                {/* Cloud Power */}
                <div
                  onClick={() => {
                    if (!isAuthenticated) return setLocation('/login');
                    setInternalMode('groq');
                    setShowWelcome(false);
                  }}
                  className="flex-1 p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 hover:scale-[1.02] transition-all cursor-pointer flex flex-col items-center text-center gap-2 group shadow-[0_0_15px_rgba(245,158,11,0.1)]"
                >
                  <div className="text-4xl mb-1 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]">🚀</div>
                  <h3 className="font-black text-amber-500 uppercase tracking-widest text-sm md:text-base">Cloud AI</h3>
                  <div className="flex-1 flex flex-col justify-center">
                    <p className="text-xs text-amber-100/80 leading-relaxed font-medium">
                      <strong className="text-amber-400">Best Quality & Fastest Speed.</strong><br />
                      Sign in <span className="underline decoration-amber-500/50 underline-offset-2">one time</span> for Lifetime Free access. Highly recommended!
                    </p>
                  </div>
                  <button className="mt-3 text-[11px] bg-amber-500 text-black px-6 py-2.5 rounded-full font-black uppercase tracking-widest group-hover:bg-amber-400 transition-colors shadow-lg">Choose Cloud</button>
                </div>

                {/* Local Free */}
                <div
                  onClick={() => { setInternalMode('webllm'); setShowWelcome(false); }}
                  className="flex-1 p-5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:scale-[1.02] transition-all cursor-pointer flex flex-col items-center text-center gap-2 group"
                >
                  <div className="text-4xl mb-1 opacity-80">⚡</div>
                  <h3 className="font-black text-gray-300 uppercase tracking-widest text-sm md:text-base">Local AI</h3>
                  <div className="flex-1 flex flex-col justify-center">
                    <p className="text-xs text-gray-400 leading-relaxed font-medium">
                      <strong className="text-gray-200">No Sign In Needed.</strong><br />
                      Works on your device, but quality is lower and it takes much longer.
                    </p>
                  </div>
                  <button className="mt-3 text-[11px] bg-white/10 text-white border border-white/20 px-6 py-2.5 rounded-full font-bold uppercase tracking-widest group-hover:bg-white/20 transition-colors">Choose Local</button>
                </div>
              </div>
              <p className="text-[10px] text-white/40 text-center uppercase tracking-widest font-bold">Premium AI Text Transformation</p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <header className="h-[56px] flex-none flex items-center justify-between px-3 md:px-5 border-b border-white/5 bg-zinc-950/50 backdrop-blur-md z-40 relative">
        <Link href="/tools">
          <button className="px-3 py-1.5 rounded-xl border border-white/7 text-white/35 text-xs hover:text-amber-500 hover:border-amber-500/30 transition-all flex items-center gap-1.5 group cursor-pointer z-10 flex-shrink-0">
            <span className="group-hover:-translate-x-0.5 transition-transform text-xs">←</span>
            <span className="hidden md:inline font-tech text-[9px] uppercase tracking-wider">Tools</span>
          </button>
        </Link>

        {/* Center Title - Responsive Flex instead of Absolute positioning */}
        <div className="flex-1 flex justify-center items-center gap-1.5 px-2 min-w-0">
          <span className="hidden sm:inline text-lg md:text-xl font-serif italic text-white truncate" style={{ fontFamily: 'Georgia, serif' }}>BongBari</span>
          <div className="flex items-center gap-1 md:gap-2 truncate">
            <span className="font-tech text-xs md:text-sm text-amber-500 uppercase tracking-widest font-bold truncate" style={{ textShadow: '0 0 10px rgba(245,158,11,0.38)' }}>Humanizer</span>
            <span className="font-tech text-[9px] text-amber-500 border border-amber-500/50 px-1 py-0.5 rounded-md tracking-widest shadow-[0_0_8px_rgba(245,158,11,0.2)] flex-shrink-0">V12</span>
          </div>
        </div>

        {/* Model Toggle - Visible on Mobile now */}
        <div className="flex items-center gap-2 z-10 flex-shrink-0">
          <div className="mpill flex">
            <button className={`mbtn ${!modeIsGroq ? 'mon-free' : 'moff'} !px-2 sm:!px-3`} onClick={() => setInternalMode('webllm')}>⚡<span className="hidden sm:inline ml-1">Free</span></button>
            <button className={`mbtn ${modeIsGroq ? 'mon-groq' : 'moff'} !px-2 sm:!px-3`} onClick={() => {
              if (!isAuthenticated) return setLocation('/login');
              setInternalMode('groq');
            }}>🚀<span className="hidden sm:inline ml-1">Cloud</span></button>
          </div>
        </div>
      </header>

      {/* Mobile Tabs */}
      <div className="flex md:hidden bg-zinc-950/80 backdrop-blur-md border-b border-zinc-500/20 m-3 mb-0 rounded-xl overflow-hidden shadow-lg p-1 gap-1 relative z-20">
        <button onClick={() => setMobileActiveTab('input')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-lg transition-colors shadow-inner ${mobileActiveTab === 'input' ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30' : 'text-zinc-500 hover:text-zinc-300'}`}>Inputs & Config</button>
        <button onClick={() => setMobileActiveTab('output')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-lg transition-colors shadow-inner relative ${mobileActiveTab === 'output' ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30' : 'text-zinc-500 hover:text-zinc-300'}`}>
          Result
          {isProcessing && <div className="absolute top-1/2 -translate-y-1/2 right-3 w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />}
        </button>
      </div>

      {/* Main Area */}
      <main className="flex-1 flex flex-col md:flex-row p-3 md:p-4 gap-3 md:gap-4 overflow-y-auto overflow-x-hidden md:overflow-hidden min-h-0 relative z-10 pb-20 md:pb-4">

        {/* INPUT */}
        <section className={`flex-1 flex flex-col min-h-[35vh] md:min-h-0 ${mobileActiveTab === 'output' ? 'hidden md:flex' : 'flex'}`}>
          <div className="panel flex-1 p-5 md:p-6 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
              <label className="text-xs font-bold text-amber-500 uppercase tracking-[0.2em] bg-amber-500/10 px-3 py-1 rounded border border-amber-500/20">Input Layer</label>
              <span className={`font-mono text-xs ${isOverLimit ? 'text-red-400' : 'text-gray-400 font-semibold'}`}>{wordCount}/{wordLimit}w</span>
            </div>
            <div className="flex-1 relative">
              <textarea ref={textAreaRef} value={inputText} onChange={e => setInputText(e.target.value)} onKeyDown={e => (e.ctrlKey && e.key === 'Enter' && handleHumanize())} onPaste={handlePaste}
                className="absolute inset-0 w-full h-full bg-transparent border-none focus:ring-0 text-white leading-relaxed text-[16px] resize-none cs placeholder-white/30"
                placeholder="Paste AI text here... It stays editable even after humanizing." />
            </div>
            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-white/5">
              {inputText && <button onClick={() => setInputText('')} className="p-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors border border-red-500/10"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>}
              <button onClick={() => handlePaste()} className="p-2 rounded-xl bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 transition-colors border border-amber-500/10"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg></button>
            </div>
          </div>
        </section>

        {/* CONTROLS & HUMANIZE */}
        <div className={`relative w-full md:w-[200px] lg:w-[220px] md:flex-none flex flex-col items-center justify-center gap-5 my-2 md:my-0 z-40 flex-shrink-0 ${mobileActiveTab === 'output' ? 'hidden md:flex' : 'flex'}`}>

          <div className={`flex flex-col w-full gap-3 bg-black/40 border border-white/5 rounded-2xl p-3 md:p-4 backdrop-blur-sm transition-opacity duration-300 ${modeIsGroq ? 'opacity-100 shadow-xl' : 'opacity-40 pointer-events-none'}`} title={!modeIsGroq ? "Cloud Engine Features Only" : ""}>
            <PillSelect
              label="Vibe" value={vibe} onChange={(v) => setVibe(v as Vibe)} disabled={!modeIsGroq}
              options={[{ value: 'academic', label: 'Academic' }, { value: 'casual', label: 'Casual' }, { value: 'genz', label: 'Gen-Z' }]}
            />
            <PillSelect
              label="Flaws" value={flawLevel} onChange={(v) => setFlawLevel(v as FlawLevel)} disabled={!modeIsGroq}
              options={[{ value: 'none', label: 'Perfect' }, { value: 'low', label: 'Natural' }, { value: 'high', label: 'Messy' }]}
            />
            <PillSelect
              label="Intensity" value={intensity} onChange={(v) => setIntensity(v as Intensity)} disabled={!modeIsGroq}
              options={[{ value: 'safe', label: 'Safe' }, { value: 'balanced', label: 'Balanced' }, { value: 'wild', label: 'Wild' }]}
            />
          </div>

          <motion.div className="w-full flex items-center justify-center">
            <motion.button onClick={handleHumanize} disabled={!canHumanize} whileHover={canHumanize ? { scale: 1.05 } : {}} whileTap={canHumanize ? { scale: 0.95 } : {}}
              className={`w-full max-w-[140px] aspect-square rounded-[32px] flex flex-col items-center justify-center gap-3 transition-all shadow-[0_4px_30px_rgba(0,0,0,0.5)] hover:shadow-amber-500/30 ${canHumanize ? 'bg-amber-500 border-2 border-amber-400' : 'bg-white/5 border border-white/10 opacity-30 cursor-not-allowed'}`}
              style={canHumanize ? { boxShadow: '0 0 40px -10px #f59e0b' } : {}}>
              {isProcessing ? <div className="spin" style={{ width: 32, height: 32, borderTopColor: '#000', borderColor: 'rgba(0,0,0,0.1)' }} /> : <svg className="w-10 h-10 text-black" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
              <span className={`text-[12px] font-black uppercase tracking-widest ${canHumanize ? 'text-black' : 'text-white'}`}>{isProcessing ? 'Working' : 'Rewrite'}</span>
            </motion.button>
          </motion.div>

          <div className="hidden md:flex flex-col items-center gap-1 opacity-20 text-[10px] font-mono mt-2">
            <span>Ctrl + Enter</span>
          </div>
        </div>

        {/* OUTPUT */}
        <section className={`flex-1 flex flex-col min-h-[40vh] md:min-h-0 ${mobileActiveTab === 'input' ? 'hidden md:flex' : 'flex'}`}>
          <div className="panel flex-1 p-5 md:p-6 flex flex-col min-h-0 relative">
            <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
              <label className="text-xs font-bold text-amber-500 uppercase tracking-[0.2em] bg-amber-500/10 px-3 py-1 rounded border border-amber-500/20">Final Result</label>
              {outputWordCount > 0 && (
                <span className="text-[10px] font-mono text-gray-500">
                  {wordCount}w → <span className="text-gray-300 font-semibold">{outputWordCount}w</span>
                  <span className={`ml-1 ${Math.abs(wordDrift) / Math.max(wordCount, 1) < 0.10 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    ({wordDrift > 0 ? '+' : ''}{wordDrift})
                  </span>
                </span>
              )}
              <div className="flex gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-500/40" /><div className="w-2.5 h-2.5 rounded-full bg-amber-500/40" /><div className="w-2.5 h-2.5 rounded-full bg-emerald-500/40" /></div>
            </div>

            <AnimatePresence>
              {score && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mb-6 p-4 rounded-2xl bg-white/5 border border-white/10 shadow-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black uppercase text-gray-400 tracking-widest">Human Score</span>
                    <span className="text-2xl font-black" style={{ color: scoreColor(score.total) }}>{score.total}<span className="text-sm text-gray-400 ml-1">/100</span></span>
                  </div>
                  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mb-3">
                    <motion.div className="h-full" animate={{ width: `${score.total}%` }} style={{ background: scoreColor(score.total) }} />
                  </div>
                  <div className="flex gap-4 text-xs font-mono font-semibold text-gray-300">
                    <span>Burst: <span style={{ color: scoreColor(score.burstiness) }}>{score.burstiness}</span></span>
                    <span>Clichés: <span className={score.clicheCount === 0 ? 'text-emerald-400' : 'text-amber-400'}>{score.clicheCount}</span></span>
                  </div>
                  {score.failures && score.failures.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {score.failures.map(f => (
                        <span key={f} className="text-[8px] bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded font-black uppercase tracking-wider">⚠ {f}</span>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex-1 relative">
              {isProcessing && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-zinc-950/80 backdrop-blur-sm rounded-xl border border-white/10 mt-1">
                  <div className="spin mb-3" style={{ width: 32, height: 32 }} />
                  <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest animate-pulse">{statusMsg || 'Synthesizing...'}</p>
                  {!modeIsGroq && statusLog.length > 0 && <div className="mt-4 w-4/5 max-h-20 overflow-y-auto cs bg-black/50 p-3 rounded-lg border border-white/5 text-[9px] font-mono text-white/30">{statusLog.map((l, idx) => <div key={idx} className="truncate">{l}</div>)}</div>}
                </div>
              )}

              {!isProcessing && !resultText && (
                <div className="absolute inset-0 flex items-center justify-center opacity-30 flex-col gap-3">
                  <svg className="w-14 h-14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                  <span className="text-sm uppercase tracking-widest font-black text-gray-300">Waiting for Input</span>
                </div>
              )}

              <div className={`absolute inset-0 overflow-y-auto cs pb-10 ${isProcessing ? 'opacity-30 grayscale' : ''}`}>
                <ReactMarkdown components={mdC}>{resultText}</ReactMarkdown>
              </div>
            </div>

            <div className="mt-6">
              <motion.button onClick={handleCopy} whileTap={{ scale: 0.98 }} disabled={!resultText || isProcessing}
                className={`w-full py-4 rounded-2xl flex items-center justify-center gap-3 font-black uppercase tracking-widest text-[11px] transition-all border shadow-lg ${copyText === 'COPIED!' ? 'bg-emerald-500 border-emerald-400 text-black' : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white disabled:opacity-20'}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                {copyText}
              </motion.button>
            </div>
          </div>
        </section>
      </main>

      {/* DEVICE OVERRIDE POPUP */}
      <AnimatePresence>
        {showDeviceOverride && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-sm bg-zinc-900 border border-white/10 rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent" />
              <div className="text-4xl mb-4">📱</div>
              <h2 className="text-xl font-black text-white uppercase tracking-widest mb-3">Device Conflict</h2>
              <p className="text-gray-400 text-sm leading-relaxed mb-8">
                Your account is currently active on <span className="text-amber-500 font-bold">another device</span>. To protect your credits, only one device is allowed at a time.
              </p>

              <div className="flex flex-col gap-3">
                <button
                  onClick={handleDeviceOverride}
                  className="w-full py-4 bg-amber-500 text-black font-black uppercase tracking-widest rounded-2xl hover:bg-amber-400 transition-all shadow-lg active:scale-95"
                >
                  Use here instead
                </button>
                <button
                  onClick={() => setShowDeviceOverride(false)}
                  className="w-full py-3 bg-white/5 text-gray-400 font-bold uppercase tracking-widest rounded-2xl hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
              </div>

              <p className="mt-6 text-[9px] text-white/20 uppercase tracking-[0.2em]">BongBari V12 Security Protocol</p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
