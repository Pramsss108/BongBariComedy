import React, { useState } from 'react';
import {
    Mic,
    Settings,
    Volume2,
    Play,
    Zap,
    Waves,
    Menu,
    X,
    Loader2,
    LogOut,
    UploadCloud
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateEnglishSpeech } from '@/lib/kokoro-engine';
import { generateBengaliSpeechOffline } from '@/lib/bengali-tts-webgpu';
import { whisperClient } from '@/lib/whisper-engine';
import { isDeviceAIElligible } from '@/lib/device-check';
import { BENGALI_ENGINES, getEngine } from '@/lib/bengali-tts-engine';
import { useAuth } from '@/hooks/useAuth';

// --- Components ---

const GlassCard = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
    <div className={`bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-6 ${className}`}>
        {children}
    </div>
);

const GlowButton = ({
    children,
    onClick,
    className = "",
    disabled = false,
    primary = true
}: {
    children: React.ReactNode,
    onClick?: () => void,
    className?: string,
    disabled?: boolean,
    primary?: boolean
}) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`
      relative group flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-bold transition-all duration-300 min-h-[48px]
      ${primary
                ? 'bg-[#F59E0B] text-black hover:shadow-[0_0_20px_rgba(245,158,11,0.4)]'
                : 'bg-white/5 text-white border border-white/10 hover:bg-white/10'}
      ${disabled ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}
      ${className}
    `}
    >
        {children}
    </button>
);

// --- REAL API Engines (No Fakes) ---

/** Create silence as Float32Array PCM */
function createSilencePCM(sampleRate: number, durationMs: number): Float32Array {
    return new Float32Array(Math.floor(sampleRate * durationMs / 1000));
}

/** Encode raw mono PCM to WAV blob */
function pcmToWavBlob(pcm: Float32Array, sampleRate: number): Blob {
    const buffer = new ArrayBuffer(44 + pcm.length * 2);
    const view = new DataView(buffer);
    const write = (o: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)); };
    write(0, 'RIFF'); view.setUint32(4, 36 + pcm.length * 2, true);
    write(8, 'WAVE'); write(12, 'fmt '); view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true); view.setUint16(34, 16, true);
    write(36, 'data'); view.setUint32(40, pcm.length * 2, true);
    let off = 44;
    for (let i = 0; i < pcm.length; i++, off += 2) {
        const s = Math.max(-1, Math.min(1, pcm[i]));
        view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return new Blob([view], { type: 'audio/wav' });
}

/**
 * Bengali TTS — Meta MMS (locked production architecture)
 * Splits on ।,!?,. — stitches with 300ms silence between sentences.
 * MMS Space is always-on CPU, no cold-start needed.
 */
const handleBengaliTTS = async (
    text: string,
    engineId: string,
    onProgress?: (msg: string, pct?: number) => void,
    onFallback?: (warning: string) => void
): Promise<string> => {
    if (engineId === 'mms_offline') {
        try {
            console.log(`[Bengali TTS Offline] WebGPU | Text: "${text}"`);
            return await generateBengaliSpeechOffline(text, onProgress);
        } catch (e: any) {
            console.warn("Bengali offline engine failed, falling back to MMS API:", e);
            if (onFallback) onFallback("Local WebGPU engine failed. Falling back to Meta MMS Cloud API...");
            // fallback to 'mms' naturally below
        }
    }

    const engine = getEngine('mms');
    if (!engine) throw new Error('MMS engine not found');

    console.log(`[Bengali TTS] Meta MMS | Text: "${text}"`);
    const rawChunks = text.split(/(?<=[।,!?.।])\s*/).filter(c => c.trim().length > 1);
    const chunks = rawChunks.length > 0 ? rawChunks : [text.trim()];

    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const decodedBuffers: AudioBuffer[] = [];

    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i].trim();
        if (!chunk) continue;
        if (onProgress) onProgress(`[Meta MMS] Sentence ${i + 1}/${chunks.length}...`);
        let ab: ArrayBuffer | null = null;

        // Simple retry: 2 attempts with 3s wait
        for (let attempt = 0; attempt < 2; attempt++) {
            try {
                ab = await engine.generate(chunk);
                break;
            } catch (err) {
                console.warn(`[MMS] Sentence ${i + 1} attempt ${attempt + 1} failed:`, err);
                if (attempt === 0) {
                    if (onProgress) onProgress(`[Meta MMS] Retrying sentence ${i + 1}/${chunks.length}...`);
                    await new Promise(r => setTimeout(r, 3000));
                }
            }
        }

        if (ab) {
            try {
                const decoded = await audioCtx.decodeAudioData(ab);
                decodedBuffers.push(decoded);
            } catch (decErr) {
                console.warn(`[Bengali TTS] Decode failed chunk ${i + 1}:`, decErr);
            }
        }
    }

    if (decodedBuffers.length === 0) {
        throw new Error('Bengali TTS failed. MMS Space may be temporarily overloaded. Please retry.');
    }

    const sampleRate = decodedBuffers[0].sampleRate;
    const silencePCM = createSilencePCM(sampleRate, 300);
    const parts: Float32Array[] = [];
    for (let i = 0; i < decodedBuffers.length; i++) {
        parts.push(decodedBuffers[i].getChannelData(0).slice());
        if (i < decodedBuffers.length - 1) parts.push(silencePCM);
    }

    const total = parts.reduce((s, a) => s + a.length, 0);
    const merged = new Float32Array(total);
    let off = 0;
    for (const p of parts) { merged.set(p, off); off += p.length; }

    audioCtx.close();
    return URL.createObjectURL(pcmToWavBlob(merged, sampleRate));
};

// Voice Cloning — NOT YET CONNECTED (requires a dedicated HuggingFace Space with OpenVoice V2)
// This function is HONEST: it will tell the user it's not ready yet instead of faking it.
const handleHuggingFaceClone = async (_audioData: any): Promise<{ status: string }> => {
    console.warn("[Voice Clone] This feature requires a dedicated OpenVoice V2 Space. Not yet set up.");
    return { status: "not_ready" };
};

// Speech-to-Speech Conversion — NOT YET CONNECTED (requires voice cloning backend)
// Same honesty policy: no fake loading bars.
const handleEmotionConversion = async (_sourceAudio: any, _targetProfile: string): Promise<string | null> => {
    console.warn("[Speech-to-Speech] This feature requires a voice cloning backend. Not yet set up.");
    return null;
};

// --- Tabs ---

const StudioTab = () => {
    const [text, setText] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [showPlayer, setShowPlayer] = useState(false);
    const [voice, setVoice] = useState('mms-bn-default');
    const [language, setLanguage] = useState<'ENG' | 'BNG'>('BNG');
    const [speed, setSpeed] = useState(1.0);
    const [retryCount, setRetryCount] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [progressMsg, setProgressMsg] = useState<string | null>(null);
    const [downloadProgress, setDownloadProgress] = useState<number>(0);
    // Bengali engine selection — defaults to our new WebGPU Phase 20 Engine!
    const [bngEngine, setBngEngine] = useState('mms_offline');
    // Shown when primary fails and fallback is used
    const [fallbackWarning, setFallbackWarning] = useState<string | null>(null);

    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const audioRef = React.useRef<HTMLAudioElement | null>(null);

    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);

    // Detect if a string is Bengali script (Unicode range \u0980-\u09FF)
    // or Banglish (Latin chars) and route accordingly
    const autoDetectBengaliInput = (input: string): 'bengali' | 'banglish' => {
        const bengaliChars = (input.match(/[\u0980-\u09FF]/g) || []).length;
        return bengaliChars > input.length * 0.1 ? 'bengali' : 'banglish';
    };

    const togglePlay = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play().catch(e => console.error("Playback failed:", e));
        }
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            const current = audioRef.current.currentTime;
            const dur = audioRef.current.duration;
            if (dur > 0) {
                setProgress((current / dur) * 100);
            }
        }
    };

    const handleGenerate = async (retryOverride?: boolean) => {
        if (!text.trim()) return;

        if (text.length > 800) {
            setError("Text is too long! (Max 800 characters). Split into smaller chunks.");
            return;
        }

        // Free previous blob URL to avoid memory leaks
        if (audioUrl && audioUrl.startsWith('blob:')) {
            URL.revokeObjectURL(audioUrl);
        }

        setIsGenerating(true);
        setShowPlayer(false);
        setError(null);
        setProgressMsg(null);
        setFallbackWarning(null);
        if (retryOverride) setRetryCount(c => c + 1);

        try {
            let url = null;
            if (language === 'ENG') {
                if (!isDeviceAIElligible()) {
                    throw new Error("DEVICE_NOT_ELLIGIBLE");
                }
                const englishVoice = voice.startsWith('mms-') ? 'af_sky' : voice;
                url = await generateEnglishSpeech(text, englishVoice, (msg) => setProgressMsg(msg));
            } else {
                // Auto-detect Bengali script vs Banglish
                const inputMode = autoDetectBengaliInput(text);
                const inputLabel = inputMode === 'banglish' ? 'Banglish → Bengali' : 'Bengali script';
                setProgressMsg(`Detected ${inputLabel}. Starting synthesis...`);
                url = await handleBengaliTTS(
                    text,
                    bngEngine,
                    (msg, pct) => {
                        setProgressMsg(msg);
                        if (pct !== undefined) setDownloadProgress(pct);
                    },
                    (warning) => setFallbackWarning(warning)
                );
            }

            setIsGenerating(false);
            setProgressMsg(null);
            setDownloadProgress(0);
            if (url) {
                setAudioUrl(url);
                setShowPlayer(true);
                // Apply speed once audio loads
                if (audioRef.current) {
                    audioRef.current.playbackRate = speed;
                }
            }
        } catch (e: any) {
            setIsGenerating(false);
            setProgressMsg(null);
            setDownloadProgress(0);

            if (e.message === "DEVICE_NOT_ELLIGIBLE") {
                setError("আপনার ফোনটি AI চালাতে পারছে না। This feature needs 4GB+ RAM. Try on a PC/laptop.");
            } else if (e.message?.includes('already loading')) {
                setError("Engine is still warming up. Please wait 10 seconds and try again.");
            } else {
                setError(e.message || "Unknown error during synthesis.");
            }
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-0.5">
                <h2 className="text-2xl font-bold tracking-tight text-white uppercase">Voice <span className="text-[#F59E0B]">Studio</span></h2>
                <p className="text-white/30 text-[10px] uppercase tracking-widest font-mono">Ready to generate voice</p>
            </div>

            <GlassCard className="flex flex-col gap-3 border-[#F59E0B]/10 relative overflow-hidden p-4">
                <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-white/80 tracking-widest uppercase">Text Control</label>
                    <div className="flex gap-2">
                        <button
                            onClick={() => { setLanguage('ENG'); setVoice('af_sky'); }}
                            className={`px-2 py-0.5 rounded text-[10px] border uppercase transition-all duration-200 ${language === 'ENG' ? 'bg-white/10 text-white border-white/20 shadow-[0_0_10px_rgba(255,255,255,0.05)]' : 'bg-white/5 text-white/40 border-white/10 hover:text-white'}`}
                        >
                            ENG
                        </button>
                        <button
                            onClick={() => { setLanguage('BNG'); setVoice('mms-bn-default'); }}
                            className={`px-2 py-0.5 rounded text-[10px] border uppercase transition-all duration-200 ${language === 'BNG' ? 'bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/30 shadow-[0_0_10px_rgba(245,158,11,0.1)]' : 'bg-white/5 text-white/40 border-white/10 hover:text-[#F59E0B]'}`}
                        >
                            BNG
                        </button>
                    </div>
                </div>

                <div className="relative">
                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Type something here..."
                        className="w-full h-[100px] min-h-[100px] bg-black/40 border border-white/10 rounded-xl p-3 text-white placeholder:text-white/10 focus:outline-none focus:border-[#F59E0B]/50 transition-colors resize-none text-sm mb-1"
                    />
                    <div className="flex justify-end gap-3 text-[9px] text-white/20 uppercase tracking-widest px-2">
                        <span>Characters: {text.length}</span>
                        <span>Tokens: {Math.ceil(text.length / 4)}</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-white/40 uppercase tracking-[2px]">Select Voice</label>
                        <select
                            value={voice}
                            onChange={(e) => setVoice(e.target.value)}
                            className="bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-[#F59E0B]/50 appearance-none font-medium text-sm min-h-[44px]"
                        >
                            {language === 'ENG' ? (
                                <>
                                    <optgroup label="🇺🇸 American Female">
                                        <option value="af_sky">Sky (Default ⭐)</option>
                                        <option value="af_bella">Bella</option>
                                        <option value="af_sarah">Sarah</option>
                                        <option value="af_nova">Nova</option>
                                        <option value="af_river">River</option>
                                        <option value="af_heart">Heart</option>
                                        <option value="af_jessica">Jessica</option>
                                        <option value="af_kore">Kore</option>
                                        <option value="af_nicole">Nicole</option>
                                        <option value="af_aoede">Aoede</option>
                                    </optgroup>
                                    <optgroup label="🇺🇸 American Male">
                                        <option value="am_adam">Adam ⭐</option>
                                        <option value="am_michael">Michael</option>
                                        <option value="am_echo">Echo</option>
                                        <option value="am_eric">Eric</option>
                                        <option value="am_fenrir">Fenrir</option>
                                        <option value="am_liam">Liam</option>
                                        <option value="am_onyx">Onyx</option>
                                        <option value="am_orion">Orion</option>
                                        <option value="am_puck">Puck</option>
                                        <option value="am_santa">Santa 🎅</option>
                                    </optgroup>
                                    <optgroup label="🇬🇧 British Female">
                                        <option value="bf_emma">Emma ⭐</option>
                                        <option value="bf_alice">Alice</option>
                                        <option value="bf_isabella">Isabella</option>
                                        <option value="bf_lily">Lily</option>
                                    </optgroup>
                                    <optgroup label="🇬🇧 British Male">
                                        <option value="bm_george">George ⭐</option>
                                        <option value="bm_daniel">Daniel</option>
                                        <option value="bm_fable">Fable</option>
                                        <option value="bm_lewis">Lewis</option>
                                    </optgroup>
                                </>
                            ) : (
                                <option value="mms-bn-default">Auto-Selected Voice</option>
                            )}
                        </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-white/40 uppercase tracking-[2px]">Engine Status</label>
                        {language === 'BNG' ? (
                            <select
                                value={bngEngine}
                                onChange={(e) => setBngEngine(e.target.value)}
                                className={`bg-black/40 border ${bngEngine === 'mms_offline' ? 'border-[#F59E0B]/50 text-[#F59E0B]' : 'border-white/10 text-white'} rounded-xl px-3 py-2 focus:outline-none focus:border-[#F59E0B]/50 appearance-none text-xs font-bold min-h-[44px] tracking-wide uppercase cursor-pointer`}
                            >
                                {BENGALI_ENGINES.map(eng => (
                                    <option key={eng.id} value={eng.id} className="text-white bg-[#0A0A0A]">
                                        {'⭐'.repeat(Math.min(eng.quality, 5))} {eng.name} ({eng.status === 'online' ? '🟢 Online' : eng.status === 'cold-start' ? '🟡 Cold-start' : '🔵 Offline'})
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <div className="flex flex-col p-1 bg-black/40 rounded-xl border border-white/10 h-[44px] items-start justify-center px-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full animate-pulse bg-[#F59E0B]" />
                                    <span className="text-xs font-bold uppercase tracking-wider text-[#F59E0B]">Kokoro 82M (Offline)</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Speed control — only for ENG Kokoro (BNG is server-side) */}
                {language === 'ENG' && (
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-white/40 uppercase tracking-[2px] flex justify-between">
                            <span>Speed</span>
                            <span className="text-[#F59E0B]">{speed.toFixed(1)}x</span>
                        </label>
                        <input
                            type="range" min="0.5" max="2.0" step="0.1"
                            value={speed}
                            onChange={(e) => {
                                const s = parseFloat(e.target.value);
                                setSpeed(s);
                                if (audioRef.current) audioRef.current.playbackRate = s;
                            }}
                            className="w-full h-1.5 accent-[#F59E0B] bg-white/10 rounded-full outline-none cursor-pointer"
                        />
                        <div className="flex justify-between text-[9px] text-white/20 uppercase tracking-widest px-1">
                            <span>0.5x Slow</span><span>1.0x Normal</span><span>2.0x Fast</span>
                        </div>
                    </div>
                )}

                <AnimatePresence>
                    {progressMsg && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="text-xs text-[#F59E0B] font-mono tracking-widest uppercase flex items-center gap-2"
                        >
                            <Loader2 className="w-3 h-3 animate-spin" />
                            {progressMsg}
                        </motion.div>
                    )}
                </AnimatePresence>

                <GlowButton
                    onClick={() => handleGenerate()}
                    disabled={!text || isGenerating}
                    className="w-full mt-1 py-3 min-h-[44px]"
                >
                    {isGenerating ? (
                        <div className="flex flex-col w-full items-center justify-center px-4 space-y-1">
                            <div className="flex items-center gap-2">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span className="tracking-widest uppercase text-xs">{progressMsg || "INITIALIZING CORE..."}</span>
                            </div>
                            {downloadProgress > 0 && (
                                <div className="w-full max-w-[200px] bg-black/40 rounded-full h-1.5 overflow-hidden border border-white/10 mt-1">
                                    <div className="bg-gradient-to-r from-yellow-500 to-[#F59E0B] h-full transition-all duration-300" style={{ width: `${downloadProgress}%` }} />
                                </div>
                            )}
                        </div>
                    ) : (
                        <>
                            <Zap className="w-5 h-5 fill-current" />
                            GENERATE AUDIO
                        </>
                    )}
                </GlowButton>
            </GlassCard>

            {/* Fallback warning — shown when Indic Parler fails and MMS takes over */}
            {fallbackWarning && (
                <div className="bg-[#F59E0B]/10 border border-[#F59E0B]/30 rounded-xl p-3 text-[#F59E0B] text-xs flex items-start justify-between gap-2 animate-in fade-in slide-in-from-top-2">
                    <span>{fallbackWarning}</span>
                    <button onClick={() => setFallbackWarning(null)} className="shrink-0 text-white/30 hover:text-white text-lg leading-none">×</button>
                </div>
            )}

            {/* Error message display with Retry */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-xs flex items-start justify-between gap-2">
                    <span>{error}</span>
                    <button
                        onClick={() => handleGenerate(true)}
                        className="shrink-0 px-3 py-1 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 rounded-lg text-red-300 text-[10px] font-bold uppercase tracking-widest transition-all"
                    >
                        Retry
                    </button>
                </div>
            )}

            <AnimatePresence>
                {showPlayer && audioUrl && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-5 shadow-2xl flex flex-col gap-4 relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-2 opacity-10 pointer-events-none">
                            <Zap className="w-24 h-24" />
                        </div>
                        <audio
                            ref={audioRef}
                            src={audioUrl}
                            onPlay={() => setIsPlaying(true)}
                            onPause={() => setIsPlaying(false)}
                            onEnded={() => { setIsPlaying(false); setProgress(0); }}
                            onTimeUpdate={handleTimeUpdate}
                            onLoadedMetadata={(e) => { setDuration(e.currentTarget.duration); e.currentTarget.playbackRate = speed; }}
                            hidden
                        />

                        <div className="flex items-center gap-4 relative z-10 w-full">
                            <button
                                onClick={togglePlay}
                                className="w-14 h-14 flex-shrink-0 rounded-full bg-[#F59E0B] flex items-center justify-center text-black hover:bg-[#F59E0B]/90 active:scale-95 transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] shrink-0"
                            >
                                {isPlaying ? (
                                    <div className="flex gap-1.5 items-center justify-center ml-0.5">
                                        <div className="w-1.5 h-5 bg-black rounded-sm"></div>
                                        <div className="w-1.5 h-5 bg-black rounded-sm"></div>
                                    </div>
                                ) : (
                                    <Play className="w-6 h-6 fill-black ml-1" />
                                )}
                            </button>

                            <div className="flex-1 w-full flex flex-col justify-center">
                                <div className="flex justify-between items-end mb-2 px-1">
                                    <div className="flex flex-col">
                                        <span className="text-[12px] font-bold text-[#F59E0B] uppercase tracking-wider">SYNTH_RESULT.WAV</span>
                                        <span className="text-[9px] font-medium text-white/40 uppercase tracking-widest hidden md:block">Neural Output Stream</span>
                                    </div>
                                    <div className="flex gap-3 items-center">
                                        <a href={audioUrl} download="bongbari_ai_voice.wav" className="text-[10px] bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-md font-bold text-white transition-all uppercase flex items-center gap-2">
                                            <span>Download</span>
                                        </a>
                                    </div>
                                </div>

                                <div
                                    className="h-2.5 w-full bg-[#1A1A1A] rounded-full overflow-hidden relative cursor-pointer group shadow-inner"
                                    onClick={(e) => {
                                        if (audioRef.current && duration > 0) {
                                            const bounds = e.currentTarget.getBoundingClientRect();
                                            const percent = (e.clientX - bounds.left) / bounds.width;
                                            audioRef.current.currentTime = percent * duration;
                                            setProgress(percent * 100);
                                        }
                                    }}
                                >
                                    <div
                                        style={{ width: `${progress}%` }}
                                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-orange-600 to-[#F59E0B] rounded-full transition-all duration-75 relative"
                                    >
                                        <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/50 blur-[2px] rounded-full"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const VoiceFactoryTab = () => {
    const { isAuthenticated } = useAuth();
    const [language, setLanguage] = useState<'ENG' | 'BNG'>('ENG');

    // === MULTILINGUAL CLONING STATE (XTTS-v2) ===
    const [cloneScript, setCloneScript] = useState('');
    const [isCloning, setIsCloning] = useState(false);
    const [cloneAudioUrl, setCloneAudioUrl] = useState<string | null>(null);
    const [cloneError, setCloneError] = useState<string | null>(null);
    const [xttsLanguage, setXttsLanguage] = useState('en');

    // Recording State (Shared between ENG ref and BNG source)
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
    const audioChunksRef = React.useRef<BlobPart[]>([]);
    const timerRef = React.useRef<NodeJS.Timeout | null>(null);

    // Raw Blob (For English API upload)
    const [rawAudioBlob, setRawAudioBlob] = useState<Blob | null>(null);

    // === BENGALI PITCH SHIFTING STATE (Web Audio) ===
    const [audioContext] = useState(new (window.AudioContext || (window as any).webkitAudioContext)());
    const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
    const [PitchMode, setPitchMode] = useState<'normal' | 'chipmunk' | 'uncle' | 'robot'>('normal');

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setRawAudioBlob(file);
        }
    };

    const handleBengaliFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const arrayBuffer = event.target?.result as ArrayBuffer;
            try {
                const buffer = await audioContext.decodeAudioData(arrayBuffer);
                setAudioBuffer(buffer);
                setRawAudioBlob(file);
            } catch (err) {
                console.error("Error decoding audio file", err);
                alert("Could not read this audio file. Please try a valid audio format.");
            }
        };
        reader.readAsArrayBuffer(file);
    };

    // Playback State
    const [isPlaying, setIsPlaying] = useState(false);
    const sourceNodeRef = React.useRef<AudioBufferSourceNode | null>(null);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                stream.getTracks().forEach(track => track.stop());

                setRawAudioBlob(audioBlob);

                // Decode to AudioBuffer for instant web-audio manipulation (if BNG)
                if (language === 'BNG') {
                    const arrayBuffer = await audioBlob.arrayBuffer();
                    const decodedBuffer = await audioContext.decodeAudioData(arrayBuffer);
                    setAudioBuffer(decodedBuffer);
                }
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);

            timerRef.current = setInterval(() => {
                setRecordingTime((prev) => {
                    if (prev >= 14) {
                        stopRecording();
                        return 15;
                    }
                    return prev + 1;
                });
            }, 1000);
        } catch (err) {
            console.error("Microphone access denied:", err);
            alert("Could not access microphone. Please allow permissions.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
            mediaRecorderRef.current.stop();
        }
        setIsRecording(false);
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }
    };

    const toggleRecording = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    // === XTTS-V2 API CALL (English) ===
    const handleEnglishClone = async () => {
        if (!isAuthenticated) {
            setCloneError("Voice Cloning via HuggingFace GPUs is restricted to Logged-In users to prevent spam.");
            return;
        }

        if (!rawAudioBlob || !cloneScript.trim()) {
            setCloneError("Please record a 10s voice reference and type a script to clone.");
            return;
        }

        setIsCloning(true);
        setCloneError(null);
        setCloneAudioUrl(null);

        try {
            const formData = new FormData();
            formData.append('audio', rawAudioBlob, 'reference.webm');
            formData.append('text', cloneScript);
            formData.append('language', xttsLanguage); // Dynamic multilinugal XTTS support

            const res = await fetch('https://bongbari-voice-clone.pramsss.workers.dev/api/xtts/clone', {
                method: 'POST',
                body: formData
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || "Failed to clone voice.");
            }

            const data = await res.json();
            if (data.success && data.audioUrl) {
                setCloneAudioUrl(data.audioUrl);
            } else {
                throw new Error("Invalid output received from cloning engine.");
            }

        } catch (e: any) {
            setCloneError("Cloning Engine Error: " + e.message);
        } finally {
            setIsCloning(false);
        }
    };

    const playWarpedAudio = () => {
        if (!audioBuffer) return;

        // Stop current playing
        if (sourceNodeRef.current) {
            sourceNodeRef.current.stop();
            sourceNodeRef.current.disconnect();
        }

        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;

        // Apply Pitch/Speed shifts
        if (PitchMode === 'chipmunk') {
            source.playbackRate.value = 1.6; // Faster and higher
        } else if (PitchMode === 'uncle') {
            source.playbackRate.value = 0.8; // Slower and deeper
        } else if (PitchMode === 'robot') {
            // Very basic robot effect (usually requires a BiquadFilter, but tight budget)
            source.playbackRate.value = 0.9;
            const biquadFilter = audioContext.createBiquadFilter();
            biquadFilter.type = "peaking";
            biquadFilter.frequency.value = 1000;
            biquadFilter.gain.value = 25;
            source.connect(biquadFilter);
            biquadFilter.connect(audioContext.destination);

            sourceNodeRef.current = source;
            source.start();
            setIsPlaying(true);
            source.onended = () => setIsPlaying(false);
            return;
        }

        source.connect(audioContext.destination);
        sourceNodeRef.current = source;
        source.start();
        setIsPlaying(true);
        source.onended = () => setIsPlaying(false);
    };

    const generateWavUrl = async () => {
        // Quick dummy function for UI - real rendering requires OfflineAudioContext
        alert("Downloading warped audio will be added in the next R2 sync update.");
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-1">
                <h2 className="text-3xl font-bold tracking-tight text-white uppercase mt-2">VOICE <span className="text-[#F59E0B]">FACTORY</span></h2>
                <div className="px-3 py-1.5 bg-[#F59E0B]/10 rounded-lg text-[10px] font-mono text-[#F59E0B]/80 mt-1 border border-[#F59E0B]/20 leading-tight block xl:hidden xl:text-xs">
                    INFO: For <b>English</b>, we use true GPU-based zero-shot voice cloning (XTTS-v2). For <b>Bengali</b>, we use native 0ms offline pitch-shifting (Comedy Presets) to bypass lack of open AI data.
                </div>
            </div>

            <GlassCard className="flex flex-col gap-4 border-[#F59E0B]/10 relative overflow-hidden p-4 md:p-6">
                {/* Language Toggle */}
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <label className="text-xs font-bold text-white/80 tracking-widest uppercase">Engine Pipeline Route</label>
                    <div className="flex gap-2">
                        <button
                            onClick={() => { setLanguage('ENG'); setAudioBuffer(null); setRawAudioBlob(null); setCloneAudioUrl(null); }}
                            className={`px-3 py-1.5 rounded-lg text-[10px] border uppercase font-bold transition-all duration-200 ${language === 'ENG' ? 'bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/30 shadow-[0_0_10px_rgba(245,158,11,0.1)]' : 'bg-white/5 text-white/40 border-white/10 hover:text-white'}`}
                        >
                            🌍 AI CLONE (MULTILINGUAL)
                        </button>
                        <button
                            onClick={() => { setLanguage('BNG'); setAudioBuffer(null); setRawAudioBlob(null); }}
                            className={`px-3 py-1.5 rounded-lg text-[10px] border uppercase font-bold transition-all duration-200 ${language === 'BNG' ? 'bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/30 shadow-[0_0_10px_rgba(245,158,11,0.1)]' : 'bg-white/5 text-white/40 border-white/10 hover:text-[#F59E0B]'}`}
                        >
                            🇧🇩 BNG (Comedy Warp)
                        </button>
                    </div>
                </div>

                {language === 'ENG' ? (
                    // === MULTILINGUAL XTTS CLONING UI ===
                    <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">

                        <div className="space-y-1.5 relative">
                            <label className="text-[10px] font-bold text-white/80 tracking-widest uppercase flex justify-between">
                                <span>1. RECORD VOICE REFERENCE (10s)</span>
                                <span className="text-[#F59E0B]">{isAuthenticated ? 'PREMIUM ACCESS' : ''}</span>
                            </label>

                            {!isAuthenticated ? (
                                <div className="mt-1 w-full h-[90px] bg-red-500/5 border border-red-500/20 rounded-xl flex flex-col items-center justify-center text-center p-2">
                                    <span className="text-xl mb-1">🔒</span>
                                    <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Auth Required</span>
                                    <span className="text-[9px] text-white/40 mt-0.5 max-w-[280px]">Sign in to use (max 3/day).</span>
                                </div>
                            ) : (
                                <div
                                    className={`mt-1 w-full h-[90px] bg-[#0A0A0A] border ${rawAudioBlob && !isRecording ? 'border-solid border-[#F59E0B] shadow-[0_0_15px_rgba(245,158,11,0.2)]' : isRecording ? 'border-solid border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'border-dashed border-white/20'} rounded-xl flex flex-col items-center justify-center text-center hover:border-[#F59E0B]/50 transition-all group relative`}
                                >
                                    {isRecording ? (
                                        <div className="flex flex-col items-center justify-center h-full w-full cursor-pointer" onClick={toggleRecording}>
                                            <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-500 animate-pulse border border-red-500/50 mb-1">
                                                <Mic className="w-5 h-5 fill-current" />
                                            </div>
                                            <span className="text-[10px] font-bold text-red-500 tracking-widest uppercase mb-1">Rec: 00:{recordingTime.toString().padStart(2, '0')}</span>
                                        </div>
                                    ) : rawAudioBlob ? (
                                        <div className="flex flex-col items-center justify-center h-full w-full min-h-[90px]">
                                            <div className="w-10 h-10 rounded-full bg-[#F59E0B] flex items-center justify-center text-black shadow-lg mb-1">
                                                <Waves className="w-5 h-5 fill-current" />
                                            </div>
                                            <button onClick={() => setRawAudioBlob(null)} className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[9px] uppercase font-bold text-white/40 hover:text-white transition-colors">Record Again</button>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 w-full h-full text-center divide-x divide-white/10">
                                            <div className="flex flex-col items-center justify-center h-full cursor-pointer hover:bg-white/5 transition-colors group" onClick={toggleRecording}>
                                                <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 group-hover:bg-red-500/20 group-hover:border-red-500/50 group-hover:text-red-500 transition-colors flex items-center justify-center text-white/40 mb-1">
                                                    <Mic className="w-5 h-5" />
                                                </div>
                                                <span className="text-[9px] font-bold text-white/40 tracking-widest uppercase">TAP TO RECORD</span>
                                            </div>
                                            <label className="flex flex-col items-center justify-center h-full cursor-pointer hover:bg-white/5 transition-colors group">
                                                <input type="file" accept="audio/*" className="hidden" onChange={handleFileUpload} />
                                                <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 group-hover:bg-[#F59E0B]/20 group-hover:border-[#F59E0B]/50 group-hover:text-[#F59E0B] transition-colors flex items-center justify-center text-white/40 mb-1">
                                                    <UploadCloud className="w-5 h-5" />
                                                </div>
                                                <span className="text-[9px] font-bold text-white/40 tracking-widest uppercase">UPLOAD AUDIO</span>
                                            </label>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="space-y-1.5 relative">
                            <label className="text-[10px] font-bold text-white/80 tracking-widest uppercase flex justify-between items-center mb-0.5">
                                <span>2. WHAT SHOULD THE CLONE SAY?</span>
                                <select
                                    className="bg-transparent text-[#F59E0B] outline-none border-b border-[#F59E0B]/50 hover:border-[#F59E0B] font-bold text-[10px] uppercase cursor-pointer"
                                    value={xttsLanguage}
                                    onChange={(e) => setXttsLanguage(e.target.value)}
                                    disabled={!isAuthenticated}
                                >
                                    <option value="en" className="bg-[#050505]">🇺🇸 English</option>
                                    <option value="hi" className="bg-[#050505]">🇮🇳 Hindi</option>
                                    <option value="es" className="bg-[#050505]">🇪🇸 Spanish</option>
                                    <option value="fr" className="bg-[#050505]">🇫🇷 French</option>
                                    <option value="de" className="bg-[#050505]">🇩🇪 German</option>
                                    <option value="pt" className="bg-[#050505]">🇵🇹 Portuguese</option>
                                    <option value="it" className="bg-[#050505]">🇮🇹 Italian</option>
                                    <option value="pl" className="bg-[#050505]">🇵🇱 Polish</option>
                                    <option value="tr" className="bg-[#050505]">🇹🇷 Turkish</option>
                                    <option value="ru" className="bg-[#050505]">🇷🇺 Russian</option>
                                    <option value="nl" className="bg-[#050505]">🇳🇱 Dutch</option>
                                    <option value="ar" className="bg-[#050505]">🇸🇦 Arabic</option>
                                    <option value="zh-cn" className="bg-[#050505]">🇨🇳 Chinese</option>
                                    <option value="ja" className="bg-[#050505]">🇯🇵 Japanese</option>
                                    <option value="ko" className="bg-[#050505]">🇰🇷 Korean</option>
                                </select>
                            </label>
                            <div className="relative">
                                <textarea
                                    disabled={!isAuthenticated}
                                    value={cloneScript}
                                    onChange={(e) => setCloneScript(e.target.value)}
                                    placeholder="Type the script here in the selected language..."
                                    className="w-full h-[60px] min-h-[60px] bg-[#0A0A0A] border border-white/10 rounded-xl p-2.5 text-white placeholder:text-white/20 focus:outline-none focus:border-[#F59E0B]/50 transition-colors resize-none text-xs disabled:opacity-50"
                                />
                            </div>
                        </div>

                        {cloneError && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs p-3 rounded-lg font-bold">
                                {cloneError}
                            </div>
                        )}

                        <button
                            disabled={!isAuthenticated || !rawAudioBlob || !cloneScript || isCloning}
                            onClick={handleEnglishClone}
                            className={`
                                w-full flex items-center justify-center gap-2 py-3 mt-1 rounded-xl font-bold transition-all duration-300 min-h-[48px] text-black text-xs tracking-wide
                                ${(!isAuthenticated || !rawAudioBlob || !cloneScript || isCloning) ? 'bg-[#F59E0B]/20 cursor-not-allowed text-[#F59E0B]/50' : 'bg-[#F59E0B] hover:bg-[#F59E0B]/90 hover:shadow-[0_0_20px_rgba(245,158,11,0.3)] active:scale-[0.98]'}
                            `}
                        >
                            {isCloning ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    CONNECTING TO ZEROGPU XTTS...
                                </>
                            ) : (
                                <>
                                    <Zap className="w-5 h-5 fill-current" />
                                    CLONE VOICE ({xttsLanguage.toUpperCase()})
                                </>
                            )}
                        </button>

                        {/* XTTS Output Player */}
                        {cloneAudioUrl && !isCloning && (
                            <div className="mt-2 p-3 bg-[#0A0A0A] border border-[#F59E0B]/30 rounded-xl flex flex-col gap-2 relative animate-in fade-in slide-in-from-bottom-2">
                                <span className="text-[9px] text-[#F59E0B] font-mono absolute -top-2 left-4 bg-[#050505] px-2 shadow-[0_0_10px_#050505]">HF XTTS-v2 OUTPUT</span>
                                <audio controls className="w-full h-8 custom-audio-player" src={cloneAudioUrl} autoPlay>
                                    Your browser does not support the audio element.
                                </audio>
                            </div>
                        )}

                    </div>
                ) : (
                    // === BENGALI PITCH SHIFTING UI (Existing) ===
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in zoom-in-95 duration-300">
                        {/* BENGALI RECORDING */}
                        <div className="space-y-2 relative">
                            <label className="text-[11px] font-bold text-white/80 tracking-widest uppercase">1. DICTATE BENGALI LINE (MAX 15s)</label>
                            <div
                                className={`mt-2 w-full h-[220px] bg-[#0A0A0A] border ${audioBuffer && !isRecording ? 'border-solid border-[#F59E0B] shadow-[0_0_15px_rgba(245,158,11,0.2)]' : isRecording ? 'border-solid border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'border-dashed border-white/20'} rounded-xl flex flex-col items-center justify-center text-center hover:border-[#F59E0B]/50 transition-all group relative`}
                            >
                                {isRecording ? (
                                    <div className="flex flex-col items-center justify-center h-full w-full cursor-pointer" onClick={toggleRecording}>
                                        <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center text-red-500 mb-2 animate-pulse border border-red-500/50">
                                            <Mic className="w-8 h-8 fill-current" />
                                        </div>
                                        <span className="text-sm font-bold text-red-500 tracking-widest uppercase">Recording... 00:{recordingTime.toString().padStart(2, '0')}</span>
                                        <span className="text-[10px] text-white/40 font-mono mt-2">Tap anywhere to stop</span>
                                    </div>
                                ) : audioBuffer ? (
                                    <div className="flex flex-col items-center justify-center h-full w-full">
                                        <div className="w-16 h-16 rounded-full bg-[#F59E0B] flex items-center justify-center text-black mb-3 shadow-lg">
                                            <Waves className="w-8 h-8 fill-current" />
                                        </div>
                                        <span className="text-[11px] font-bold text-white uppercase tracking-widest px-4">Audio Captured!</span>
                                        <button onClick={() => { setAudioBuffer(null); setRawAudioBlob(null); }} className="mt-4 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] uppercase font-bold text-white/40 hover:text-white transition-colors">Record Again</button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 w-full h-full text-center divide-x divide-white/10">
                                        <div className="flex flex-col items-center justify-center h-full cursor-pointer hover:bg-white/5 transition-colors group" onClick={toggleRecording}>
                                            <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 group-hover:bg-red-500/20 group-hover:border-red-500/50 group-hover:text-red-500 transition-colors flex items-center justify-center text-white/40 mb-2">
                                                <Mic className="w-6 h-6" />
                                            </div>
                                            <span className="text-[10px] font-bold text-white/40 tracking-widest uppercase mb-1">TAP TO RECORD</span>
                                        </div>
                                        <label className="flex flex-col items-center justify-center h-full cursor-pointer hover:bg-white/5 transition-colors group">
                                            <input type="file" accept="audio/*" className="hidden" onChange={handleBengaliFileUpload} />
                                            <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 group-hover:bg-[#F59E0B]/20 group-hover:border-[#F59E0B]/50 group-hover:text-[#F59E0B] transition-colors flex items-center justify-center text-white/40 mb-2">
                                                <UploadCloud className="w-6 h-6" />
                                            </div>
                                            <span className="text-[10px] font-bold text-white/40 tracking-widest uppercase mb-1">UPLOAD AUDIO</span>
                                        </label>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* COMEDY PRESETS */}
                        <div className="space-y-4 relative flex flex-col justify-center">
                            <label className="text-[11px] font-bold text-white/80 tracking-widest uppercase block mb-1">2. SELECT COMEDY WARP</label>

                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setPitchMode('normal')}
                                    className={`p-4 rounded-xl border flex flex-col items-center justify-center text-center gap-2 transition-all ${PitchMode === 'normal' ? 'bg-[#F59E0B]/20 border-[#F59E0B] text-[#F59E0B]' : 'bg-[#0A0A0A] border-white/10 text-white/40 hover:text-white/80'}`}
                                >
                                    <span className="text-xl">👤</span>
                                    <span className="text-[10px] font-bold uppercase tracking-wider">Normal</span>
                                </button>

                                <button
                                    onClick={() => setPitchMode('chipmunk')}
                                    className={`p-4 rounded-xl border flex flex-col items-center justify-center text-center gap-2 transition-all ${PitchMode === 'chipmunk' ? 'bg-[#F59E0B]/20 border-[#F59E0B] text-[#F59E0B]' : 'bg-[#0A0A0A] border-white/10 text-white/40 hover:text-white/80'}`}
                                >
                                    <span className="text-xl">🐿️</span>
                                    <span className="text-[10px] font-bold uppercase tracking-wider">Kid / Fast</span>
                                </button>

                                <button
                                    onClick={() => setPitchMode('uncle')}
                                    className={`p-4 rounded-xl border flex flex-col items-center justify-center text-center gap-2 transition-all ${PitchMode === 'uncle' ? 'bg-[#F59E0B]/20 border-[#F59E0B] text-[#F59E0B]' : 'bg-[#0A0A0A] border-white/10 text-white/40 hover:text-white/80'}`}
                                >
                                    <span className="text-xl">👴</span>
                                    <span className="text-[10px] font-bold uppercase tracking-wider">Angry Uncle</span>
                                </button>

                                <button
                                    onClick={() => setPitchMode('robot')}
                                    className={`p-4 rounded-xl border flex flex-col items-center justify-center text-center gap-2 transition-all ${PitchMode === 'robot' ? 'bg-[#F59E0B]/20 border-[#F59E0B] text-[#F59E0B]' : 'bg-[#0A0A0A] border-white/10 text-white/40 hover:text-white/80'}`}
                                >
                                    <span className="text-xl">🤖</span>
                                    <span className="text-[10px] font-bold uppercase tracking-wider">Cyberpunk</span>
                                </button>
                            </div>

                            {/* BENGALI PLAY BUTTON */}
                            <button
                                onClick={playWarpedAudio}
                                disabled={!audioBuffer || isRecording}
                                className={`
                                    w-full flex items-center justify-center gap-3 py-4 rounded-xl font-bold transition-all duration-300 min-h-[56px] text-black mt-2 text-sm tracking-wide
                                    ${(!audioBuffer || isRecording) ? 'bg-[#F59E0B]/20 cursor-not-allowed text-[#F59E0B]/50' : 'bg-[#F59E0B] hover:bg-[#F59E0B]/90 hover:shadow-[0_0_20px_rgba(245,158,11,0.3)] active:scale-[0.98]'}
                                `}
                            >
                                {isPlaying ? (
                                    <>
                                        <div className="flex gap-1.5 items-center justify-center">
                                            <div className="w-1.5 h-4 bg-black rounded-sm animate-[bounce_1s_infinite]"></div>
                                            <div className="w-1.5 h-5 bg-black rounded-sm animate-[bounce_1s_0.2s_infinite]"></div>
                                            <div className="w-1.5 h-3 bg-black rounded-sm animate-[bounce_1s_0.4s_infinite]"></div>
                                        </div>
                                        PLAYING WARPED AUDIO...
                                    </>
                                ) : (
                                    <>
                                        <Play className="w-5 h-5 fill-current" />
                                        PLAY CHARACTER VOICE
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </GlassCard>
        </div>
    );
};

const SpeechToSpeechTab = () => {
    // Recording State
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
    const audioChunksRef = React.useRef<BlobPart[]>([]);
    const timerRef = React.useRef<NodeJS.Timeout | null>(null);

    // Audio / Conversion State
    const [sourceAudio, setSourceAudio] = useState<Blob | File | null>(null);
    const [isConverting, setIsConverting] = useState(false);
    const [statusText, setStatusText] = useState('');
    const [transcription, setTranscription] = useState<string | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunksRef.current.push(event.data);
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                setSourceAudio(audioBlob);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);

            timerRef.current = setInterval(() => {
                setRecordingTime(prev => {
                    if (prev >= 14) {
                        stopRecording();
                        return 15;
                    }
                    return prev + 1;
                });
            }, 1000);
        } catch (err) {
            console.error("Microphone access denied:", err);
            alert("Could not access microphone.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
            mediaRecorderRef.current.stop();
        }
        setIsRecording(false);
        if (timerRef.current) clearInterval(timerRef.current);
    };

    const toggleRecording = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isRecording) stopRecording(); else startRecording();
    };

    const handleGenerate = async () => {
        if (!sourceAudio) return;

        if (!isDeviceAIElligible()) {
            alert("This heavy dual-AI feature requires a 4GB+ RAM device. Your device might freeze.");
            // We'll still allow it to continue, just warning them
        }

        setIsConverting(true);
        setTranscription(null);
        setAudioUrl(null);

        try {
            setStatusText("Loading Local Whisper (STT)...");

            // 1. Transcribe the audio
            const text = await whisperClient.transcribeAudio(sourceAudio, 'en', (msg) => {
                if (msg.status === 'progress') {
                    setStatusText(`Downloading Whisper AI: ${Math.round(msg.progress.progress || 0)}%`);
                } else if (msg.status === 'processing') {
                    setStatusText("Transcribing your speech...");
                }
            });

            console.log("Whisper Output:", text);
            setTranscription(text);

            if (!text || text.trim() === '') {
                throw new Error("Whisper didn't detect any words.");
            }

            // 2. Synthesize with Kokoro
            setStatusText("Synthesizing Perfect English (Kokoro TTS)...");
            const ttsUrl = await generateEnglishSpeech(text);
            setAudioUrl(ttsUrl);

        } catch (e: any) {
            console.error(e);
            alert("Speech-to-Speech Error: " + e.message);
        } finally {
            setIsConverting(false);
            setStatusText("");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-1">
                <h2 className="text-3xl font-bold tracking-tight text-white uppercase mt-4">SPEECH-TO-<span className="text-[#F59E0B]">SPEECH</span></h2>
                <p className="text-white/30 text-[10px] uppercase tracking-widest font-mono mt-2">NATIVE 100% OFFLINE ZERO-COST PIPELINE (WHISPER + KOKORO)</p>
                <div className="px-3 py-2 bg-[#F59E0B]/10 rounded-lg text-[10px] font-mono text-[#F59E0B]/80 mt-2 border border-[#F59E0B]/20">
                    INFO: Broken English In ➡️ Perfect Fluent AI English Out. Everything runs securely on your CPU.
                </div>
            </div>

            <div className="bg-[#050505] border border-white/10 rounded-2xl p-6 relative overflow-hidden flex flex-col gap-6">

                <div className="space-y-2 relative">
                    <label className="text-[11px] font-bold text-white/80 tracking-widest uppercase">YOUR RAW SPEECH (MAX 15s)</label>

                    <div
                        className={`mt-2 w-full h-[140px] bg-[#0A0A0A] border ${sourceAudio && !isRecording ? 'border-solid border-[#F59E0B] shadow-[0_0_15px_rgba(245,158,11,0.2)]' : isRecording ? 'border-solid border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'border-dashed border-white/20'} rounded-xl flex flex-col items-center justify-center text-center cursor-pointer hover:border-[#F59E0B]/50 transition-all group`}
                    >
                        {isRecording ? (
                            <div className="flex flex-col items-center justify-center h-full w-full" onClick={toggleRecording}>
                                <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center text-red-500 mb-2 animate-pulse border border-red-500/50">
                                    <Mic className="w-6 h-6 fill-current" />
                                </div>
                                <span className="text-xs font-bold text-red-500 tracking-widest uppercase">Recording... 00:{recordingTime.toString().padStart(2, '0')}</span>
                                <span className="text-[9px] text-white/40 font-mono mt-1">Tap anywhere to stop</span>
                            </div>
                        ) : sourceAudio ? (
                            <div className="flex flex-col items-center justify-center h-full w-full">
                                <div className="w-12 h-12 rounded-full bg-[#F59E0B] flex items-center justify-center text-black mb-2 shadow-lg">
                                    <Waves className="w-6 h-6 fill-current" />
                                </div>
                                <span className="text-[11px] font-bold text-white uppercase tracking-widest">AUDIO CAPTURED</span>
                                <button onClick={(e) => { e.stopPropagation(); setSourceAudio(null); }} className="mt-4 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] uppercase font-bold text-white/40 hover:text-white transition-colors">Record Again</button>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full w-full" onClick={toggleRecording}>
                                <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 group-hover:bg-red-500/20 group-hover:border-red-500/50 group-hover:text-red-500 transition-colors flex items-center justify-center text-white/40 mb-3 z-10 pointer-events-none">
                                    <Mic className="w-5 h-5" />
                                </div>
                                <span className="text-[11px] font-bold text-white/40 tracking-widest uppercase">TAP TO RECORD</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-bold text-white/40 uppercase tracking-[2px]">TARGET PROFILE</label>
                        <select className="bg-[#0A0A0A] border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#F59E0B]/30 appearance-none font-bold text-[11px] uppercase tracking-wider min-h-[48px] outline-none cursor-pointer">
                            <option value="profile-1">🇺🇸 Kokoro English (Fluent)</option>
                        </select>
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-bold text-white/40 uppercase tracking-[2px]">ENGINE STATUS</label>
                        <div className="flex bg-[#0A0A0A] rounded-xl border border-white/5 h-[48px] items-center px-4">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                                <span className="text-xs font-bold text-white uppercase tracking-wider">OFFLINE EDGE CPU (READY)</span>
                            </div>
                        </div>
                    </div>
                </div>

                {statusText && (
                    <div className="text-[#F59E0B] text-xs font-bold uppercase tracking-wide bg-[#F59E0B]/10 p-3 rounded-lg border border-[#F59E0B]/20 text-center animate-pulse">
                        {statusText}
                    </div>
                )}

                {/* GENERATE */}
                <button
                    disabled={isConverting || !sourceAudio || isRecording}
                    onClick={handleGenerate}
                    className={`
                        w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold transition-all duration-300 min-h-[56px] text-black mt-2 text-sm tracking-wide
                        ${(isConverting || !sourceAudio || isRecording) ? 'bg-[#F59E0B]/50 cursor-not-allowed' : 'bg-[#F59E0B] hover:bg-[#F59E0B]/90 hover:shadow-[0_0_20px_rgba(245,158,11,0.3)] active:scale-[0.98]'}
                    `}
                >
                    {isConverting ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            CONVERTING AUDIO...
                        </>
                    ) : (
                        <>
                            <Zap className="w-4 h-4 fill-current" />
                            CONVERT SPEECH
                        </>
                    )}
                </button>

                {transcription && audioUrl && (
                    <div className="mt-4 p-4 bg-[#0A0A0A] border border-[#F59E0B]/30 rounded-xl flex flex-col gap-4 relative">
                        <span className="text-[10px] text-[#F59E0B] font-mono absolute -top-2 left-4 bg-[#050505] px-2 shadow-[0_0_10px_#050505]">V13 PIPELINE OUTPUT</span>

                        <div className="bg-white/5 rounded-lg p-3 text-xs text-white/70 italic border-l-2 border-[#F59E0B]">
                            " {transcription} "
                        </div>

                        <div>
                            <audio controls className="w-full h-10 custom-audio-player" src={audioUrl}>
                                Your browser does not support the audio element.
                            </audio>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const SettingsTab = () => {
    const { logout } = useAuth();

    const handleLogout = async () => {
        await logout();
        // The App routing will automatically kick us out.
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h2 className="text-3xl font-bold tracking-tight text-white">System <span className="text-[#F59E0B]">Settings</span></h2>
                <p className="text-white/60">Manage your account and engine preferences.</p>
            </div>

            <GlassCard className="p-8 border-white/5 bg-white/[0.01]">
                <div className="flex flex-col md:flex-row items-center gap-8">
                    <div className="relative">
                        <div className="w-24 h-24 rounded-full border-2 border-[#F59E0B]/20 ring-4 ring-[#F59E0B]/5 overflow-hidden shadow-[0_0_30px_rgba(245,158,11,0.15)]">
                            <img
                                src="https://github.com/Pramsss108.png"
                                alt="User Profile"
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#F59E0B] rounded-full flex items-center justify-center text-black border-2 border-[#050505]">
                            <Zap className="w-3 h-3 fill-current" />
                        </div>
                    </div>
                    <div className="flex-1 text-center md:text-left space-y-2">
                        <h3 className="text-2xl font-bold text-white">Abhijit Pramanik</h3>
                        <div className="inline-flex items-center px-3 py-1 rounded-full bg-[#F59E0B]/10 border border-[#F59E0B]/20">
                            <span className="text-xs font-bold text-[#F59E0B] uppercase tracking-widest font-mono">Member Account</span>
                        </div>
                        <p className="text-white/30 text-sm max-w-md">
                            Your account is active and verified. You have full access to the AI Voice & Cloning Hub tools.
                        </p>
                    </div>
                </div>

                <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-1">
                        <span className="text-[10px] text-white/20 uppercase font-mono tracking-widest">Interface Status</span>
                        <div className="text-sm font-bold text-white/80">Ultra-Clean Mode Active</div>
                    </div>
                    <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-1">
                        <span className="text-[10px] text-white/20 uppercase font-mono tracking-widest">Session Identity</span>
                        <div className="text-sm font-bold text-white/80">PRZM_STRM_v2.9</div>
                    </div>
                </div>

                <div className="mt-8 pt-8 border-t border-white/10 flex justify-end">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-6 py-3 bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-400 rounded-xl font-bold uppercase tracking-widest text-xs transition-colors border border-red-500/20"
                    >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                    </button>
                </div>
            </GlassCard>
        </div>
    );
};

// --- Main Page ---

const VoiceHub = () => {
    const [activeTab, setActiveTab] = useState<'studio' | 'factory' | 'speech' | 'settings'>('studio');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const navItems = [
        { id: 'studio', label: 'Studio', icon: Volume2, description: 'Text-to-Speech' },
        { id: 'factory', label: 'Voice Factory', icon: Mic, description: 'Cloning' },
        { id: 'speech', label: 'Speech-to-Speech', icon: Waves, description: 'Conversion' },
    ];

    return (
        <div className="h-screen bg-[#050505] text-white flex relative overflow-hidden">
            {/* Cybersecurity Grid Backdrop */}
            <div
                className="absolute inset-0 pointer-events-none opacity-[0.03]"
                style={{
                    backgroundImage: `radial-gradient(#F59E0B 0.5px, transparent 0.5px), linear-gradient(to right, #F59E0B 0.5px, transparent 0.5px), linear-gradient(to bottom, #F59E0B 0.5px, transparent 0.5px)`,
                    backgroundSize: '24px 24px, 120px 120px, 120px 120px'
                }}
            />

            {/* Sidebar - Desktop */}
            <aside className="hidden lg:flex w-72 flex-col bg-black border-r border-white/5 p-6 space-y-8 z-50 h-full overflow-y-auto no-scrollbar">
                <div className="flex items-center gap-3 px-2">
                    <div className="w-10 h-10 rounded-xl bg-[#F59E0B] flex items-center justify-center text-black">
                        <Zap className="w-6 h-6 fill-current" />
                    </div>
                    <div>
                        <h1 className="font-bold text-lg leading-tight tracking-tight">VOICE HUB</h1>
                        <span className="text-[10px] font-bold text-[#F59E0B] font-mono">BETA_v1.0</span>
                    </div>
                </div>

                <nav className="flex-1 space-y-2">
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id as any)}
                            className={`
                w-full flex items-center gap-4 px-4 py-4 rounded-xl transition-all duration-300 group min-h-[48px] relative
                ${activeTab === item.id
                                    ? 'bg-[#F59E0B] text-black'
                                    : 'text-white/40 hover:text-white hover:bg-white/5'}
              `}
                        >
                            <item.icon className="w-5 h-5" />
                            <div className="text-left">
                                <div className="font-bold text-sm">{item.label}</div>
                                <div className={`text-[10px] ${activeTab === item.id ? 'text-black/60' : 'text-white/20 uppercase font-mono'}`}>{item.description}</div>
                            </div>
                            {activeTab === item.id && (
                                <motion.div layoutId="nav-bg" className="absolute left-0 w-1 h-8 bg-[#F59E0B] rounded-r-full" />
                            )}
                        </button>
                    ))}
                </nav>

                <div className="pt-6 border-t border-white/5">
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`flex items-center gap-3 px-4 py-3 transition-all duration-300 w-full rounded-xl ${activeTab === 'settings' ? 'bg-white/10 text-[#F59E0B]' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                    >
                        <Settings className={`w-5 h-5 ${activeTab === 'settings' ? 'animate-spin-slow' : ''}`} />
                        <span className="font-bold text-sm">Settings</span>
                    </button>
                </div>
            </aside>

            {/* Mobile Header */}
            <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-black/80 backdrop-blur-lg border-b border-white/5 flex items-center justify-between px-6 z-[60]">
                <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-[#F59E0B] fill-current" />
                    <span className="font-bold tracking-tight">VOICE HUB</span>
                </div>
                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                    {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
            </div>

            {/* Mobile Sidebar Overlay */}
            <AnimatePresence>
                {isSidebarOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsSidebarOpen(false)}
                            className="lg:hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-[70]"
                        />
                        <motion.aside
                            initial={{ x: "-100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "-100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="lg:hidden fixed left-0 top-0 bottom-0 w-[80%] max-w-xs bg-black z-[80] p-6 flex flex-col border-r border-white/10"
                        >
                            <div className="flex items-center gap-3 mb-12">
                                <div className="w-10 h-10 rounded-xl bg-[#F59E0B] flex items-center justify-center text-black">
                                    <Zap className="w-6 h-6 fill-current" />
                                </div>
                                <div>
                                    <h1 className="font-bold text-lg">VOICE HUB</h1>
                                    <span className="text-[10px] text-[#F59E0B] font-mono">BETA_v1.0</span>
                                </div>
                            </div>
                            <nav className="space-y-2">
                                {navItems.map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => {
                                            setActiveTab(item.id as any);
                                            setIsSidebarOpen(false);
                                        }}
                                        className={`
                      w-full flex items-center gap-4 px-4 py-4 rounded-xl
                      ${activeTab === item.id ? 'bg-[#F59E0B] text-black' : 'text-white/40'}
                    `}
                                    >
                                        <item.icon className="w-6 h-6" />
                                        <span className="font-bold">{item.label}</span>
                                    </button>
                                ))}
                            </nav>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* Main Content */}
            <main className="flex-1 relative h-full overflow-y-auto no-scrollbar pt-20 lg:pt-0">

                <div className="max-w-5xl mx-auto p-4 md:p-8 min-h-full pb-32 flex flex-col">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.2 }}
                            className="flex-1"
                        >
                            {activeTab === 'studio' && <StudioTab />}
                            {activeTab === 'factory' && <VoiceFactoryTab />}
                            {activeTab === 'speech' && <SpeechToSpeechTab />}
                            {activeTab === 'settings' && <SettingsTab />}
                        </motion.div>
                    </AnimatePresence>

                    {/* No technical footer */}
                </div>
            </main>
        </div>
    );
};

export default VoiceHub;
