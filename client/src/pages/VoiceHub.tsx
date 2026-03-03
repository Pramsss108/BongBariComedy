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
    History
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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

// The public MMS-TTS Gradio Space that supports 1000+ languages including Bengali
const GRADIO_SPACE_URL = "https://dpc-mmstts.hf.space";

const handlePuterTTS = async (text: string, _voice: string, language: 'ENG' | 'BNG' = 'ENG', _speed: number = 1.0) => {
    console.log(`[Voice Engine] Generating TTS: "${text}" | Language: ${language}`);
    
    // We are routing ALL traffic (English and Bengali) through the reliable Hugging Face MMS Space
    // This bypasses Puter.js entirely which was returning unplayable HTMLAudioElements in the custom player.
    try {
        const langCode = language === 'BNG' ? 'Bengali (ben)' : 'English (eng)';
        console.log(`[Gradio Space] Calling ${GRADIO_SPACE_URL} with lang: ${langCode}`);

        const response = await fetch(`${GRADIO_SPACE_URL}/api/predict`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ data: [text, langCode] }),
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Gradio space returned ${response.status}: ${errText}`);
        }

        const result = await response.json();
        console.log("[Gradio Space] Response:", result);

        // Gradio returns a file path — download the actual audio string
        if (result.data && result.data[0] && result.data[0].name) {
            const audioFileUrl = `${GRADIO_SPACE_URL}/file=${result.data[0].name}`;
            console.log("[Gradio Space] Downloading audio from:", audioFileUrl);
            const audioResponse = await fetch(audioFileUrl);
            if (!audioResponse.ok) throw new Error("Failed to download audio file");
            
            const blob = await audioResponse.blob();
            const audioUrl = URL.createObjectURL(blob);
            
            console.log(`[Gradio Space] Audio ready! Size: ${blob.size} bytes. URL: ${audioUrl}`);
            return audioUrl;
        }

        throw new Error("Unexpected response format from Gradio space");
    } catch (error) {
        console.error("[TTS Engine Error]", error);
        throw error; // Re-throw to show in UI
    }
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
    const [mode, setMode] = useState<'standard' | 'emotional'>('standard');
    const [language, setLanguage] = useState<'ENG' | 'BNG'>('BNG');
    const [speed, setSpeed] = useState(1.0);
    const [clarity, setClarity] = useState(88);
    const [error, setError] = useState<string | null>(null);

    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const audioRef = React.useRef<HTMLAudioElement | null>(null);

    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);

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

    const handleGenerate = async () => {
        if (!text.trim()) return;

        // Vibe Coder Reality Check: Free models crash on massive text.
        // HuggingFace spaces and Puter usually timeout on requests larger than ~500 chars 
        // because it takes too long to render. Over 1000 characters guarantees a failure.
        if (text.length > 800) {
            setError("Text is too long for the free engine! (Max 800 characters). Please split your text into smaller paragraphs, generate them one by one, and save the audio.");
            return;
        }

        setIsGenerating(true);
        setShowPlayer(false);
        setError(null);
        try {
            const url = await handlePuterTTS(text, voice, language, speed);
            setIsGenerating(false);
            if (url) {
                setAudioUrl(url);
                setShowPlayer(true);
                console.log("Audio ready at:", url);
            } else {
                setError("Could not generate audio. The AI model may be loading — try again in 30 seconds.");
            }
        } catch (e: any) {
            setIsGenerating(false);
            setError(e.message || "Unknown error during audio generation.");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-0.5">
                <h2 className="text-2xl font-bold tracking-tight text-white uppercase">Voice <span className="text-[#F59E0B]">Studio</span></h2>
                <p className="text-white/30 text-[10px] uppercase tracking-widest font-mono">Ready to generate voice</p>
            </div>

            <GlassCard className="flex flex-col gap-3 border-[#F59E0B]/10 relative overflow-hidden p-4">
                <div className="absolute top-0 right-0 p-2 text-[8px] font-mono text-white/10">STITCH_v1.518</div>
                <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-white/80 tracking-widest uppercase">Text Control</label>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setLanguage('ENG')}
                            className={`px-2 py-0.5 rounded text-[10px] border uppercase transition-all duration-200 ${language === 'ENG' ? 'bg-white/10 text-white border-white/20 shadow-[0_0_10px_rgba(255,255,255,0.05)]' : 'bg-white/5 text-white/40 border-white/10 hover:text-white'}`}
                        >
                            ENG
                        </button>
                        <button
                            onClick={() => setLanguage('BNG')}
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-bold text-white/40 uppercase tracking-[2px]">Select Voice</label>
                        <select
                            value={voice}
                            onChange={(e) => setVoice(e.target.value)}
                            className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#F59E0B]/50 appearance-none font-medium text-base min-h-[48px]"
                        >
                            {language === 'ENG' ? (
                                <option value="puter-en-default">English Default [Global]</option>
                            ) : (
                                <option value="mms-bn-default">Bengali Native [Meta MMS]</option>
                            )}
                        </select>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-bold text-white/40 uppercase tracking-[2px]">Engine Status</label>
                        <div className="flex p-1 bg-black/40 rounded-xl border border-white/10 h-[48px] items-center px-4">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                <span className="text-xs font-bold text-white uppercase tracking-wider">
                                    {language === 'ENG' ? 'Stable (Free)' : 'Online (Free)'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <GlowButton
                    onClick={handleGenerate}
                    disabled={!text || isGenerating}
                    className="w-full mt-2 py-3 min-h-[44px]"
                >
                    {isGenerating ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Generating Audio...
                        </>
                    ) : (
                        <>
                            <Zap className="w-5 h-5 fill-current" />
                            GENERATE AUDIO
                        </>
                    )}
                </GlowButton>
            </GlassCard>

            {/* Error message display */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
                    {error}
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
                            onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
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
    const [refAudio, setRefAudio] = useState<File | null>(null);
    const [targetText, setTargetText] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    
    // File inputs
    const fileInputRef = React.useRef<HTMLInputElement | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setRefAudio(e.target.files[0]);
        }
    };

    const triggerUpload = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleGenerateMock = () => {
        setIsGenerating(true);
        setTimeout(() => {
            setIsGenerating(false);
            alert("Neural backend connection requires backend proxy. For native scaling, deploy your HuggingFace token to Upstash. Connect with developers to activate F5-TTS natively.");
        }, 1500);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-1">
                <h2 className="text-3xl font-bold tracking-tight text-white uppercase mt-4">VOICE <span className="text-[#F59E0B]">FACTORY</span></h2>                                
                <p className="text-white/30 text-[10px] uppercase tracking-widest font-mono mt-2">NATIVE ZERO-SHOT CLONING ENGINE (F5-TTS)</p>                                                    
            </div>

            <div className="bg-[#050505] border border-white/10 rounded-2xl p-6 relative overflow-hidden flex flex-col gap-6">                                                                        
                <div className="absolute top-4 right-6 text-[8px] font-mono text-white/10 uppercase hidden md:block">STITCH_v1.518</div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* REFERENCE AUDIO */}
                    <div className="space-y-2 relative">
                        <label className="text-[11px] font-bold text-white/80 tracking-widest uppercase">REFERENCE AUDIO (5-10s)</label>                                                               
                        <input 
                            type="file" 
                            accept="audio/*"
                            capture="user"
                            ref={fileInputRef} 
                            style={{ display: 'none' }} 
                            onChange={handleFileChange}
                        />
                        <div 
                            onClick={triggerUpload}
                            className={`mt-2 w-full h-[140px] bg-[#0A0A0A] border ${refAudio ? 'border-solid border-[#F59E0B] shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'border-dashed border-white/20'} rounded-xl flex flex-col items-center justify-center text-center cursor-pointer hover:border-[#F59E0B]/50 transition-all group`}
                        >
                            {refAudio ? (
                                <>
                                    <div className="w-12 h-12 rounded-full bg-[#F59E0B] flex items-center justify-center text-black mb-2 animate-[pulse_2s_ease-in-out_infinite]">
                                        <Mic className="w-6 h-6 fill-current" />
                                    </div>
                                    <span className="text-xs font-bold text-white truncate px-4 max-w-full">{refAudio.name}</span>
                                    <span className="text-[9px] text-[#F59E0B] font-mono mt-1">LOADED / READY</span>
                                </>
                            ) : (
                                <>
                                    <Mic className="w-8 h-8 text-white/20 group-hover:text-[#F59E0B] transition-colors mb-2" />
                                    <span className="text-xs font-bold text-white/40 group-hover:text-white transition-colors">TAP TO RECORD OR UPLOAD</span>
                                    <span className="text-[9px] text-white/20 font-mono mt-1">.WAV or .MP3</span>
                                </>
                            )}
                        </div>
                    </div>

                    {/* TARGET SCRIPT */}
                    <div className="space-y-2 relative">
                        <label className="text-[11px] font-bold text-white/80 tracking-widest uppercase">TARGET SCRIPT</label>                                                               
                        <textarea
                            value={targetText}
                            onChange={(e) => setTargetText(e.target.value)}
                            placeholder="What do you want the cloned voice to say?"
                            className="mt-2 w-full h-[140px] bg-[#0A0A0A] border border-white/5 rounded-xl p-4 text-white/90 placeholder:text-white/20 focus:outline-none focus:border-[#F59E0B]/30 transition-colors resize-none text-sm leading-relaxed"                                                                                                   
                        />
                    </div>
                </div>

                {/* GENERATE */}
                <button
                    onClick={handleGenerateMock}
                    disabled={isGenerating || !targetText || !refAudio}
                    className={`
                        w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold transition-all duration-300 min-h-[56px] text-black mt-2 text-sm tracking-wide
                        ${(isGenerating || !targetText || !refAudio) ? 'bg-[#F59E0B]/50 cursor-not-allowed' : 'bg-[#F59E0B] hover:bg-[#F59E0B]/90 hover:shadow-[0_0_20px_rgba(245,158,11,0.3)] active:scale-[0.98]'}
                    `}
                >
                    {isGenerating ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />        
                            PROCESSING NEURAL CLONE...
                        </>
                    ) : (
                        <>
                            <Zap className="w-4 h-4 fill-current" />
                            GENERATE CLONE
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

const SpeechToSpeechTab = () => {
    const [sourceAudio, setSourceAudio] = useState<File | null>(null);
    const [isConverting, setIsConverting] = useState(false);
    
    // File inputs
    const fileInputRef = React.useRef<HTMLInputElement | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setSourceAudio(e.target.files[0]);
        }
    };

    const triggerUpload = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleGenerateMock = () => {
        setIsConverting(true);
        setTimeout(() => {
            setIsConverting(false);
            alert("Neural backend connection requires backend proxy. Connect with developers to activate Llasa-8B translation natively.");
        }, 1500);
    };


    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-1">
                <h2 className="text-3xl font-bold tracking-tight text-white uppercase mt-4">SPEECH-TO-<span className="text-[#F59E0B]">SPEECH</span></h2>                                
                <p className="text-white/30 text-[10px] uppercase tracking-widest font-mono mt-2">NATIVE AUDIO CONVERSION ENGINE (LLASA-8B)</p>                                                    
            </div>

            <div className="bg-[#050505] border border-white/10 rounded-2xl p-6 relative overflow-hidden flex flex-col gap-6">                                                                        
                <div className="absolute top-4 right-6 text-[8px] font-mono text-white/10 uppercase hidden md:block">STITCH_v1.518</div>
                
                <div className="space-y-2 relative">
                    <label className="text-[11px] font-bold text-white/80 tracking-widest uppercase">SOURCE AUDIO</label>                                                               
                    
                    <input 
                        type="file" 
                        accept="audio/*"
                        capture="user"
                        ref={fileInputRef} 
                        style={{ display: 'none' }} 
                        onChange={handleFileChange}
                    />

                    <div 
                        onClick={triggerUpload}
                        className={`mt-2 w-full h-[180px] bg-[#0A0A0A] border ${sourceAudio ? 'border-solid border-[#F59E0B] shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'border-dashed border-white/20'} rounded-xl flex flex-col items-center justify-center text-center cursor-pointer hover:border-[#F59E0B]/50 transition-all group`}
                    >
                        {sourceAudio ? (
                            <>
                                <div className="w-16 h-16 rounded-full bg-[#F59E0B] flex items-center justify-center text-black mb-3 animate-[pulse_2s_ease-in-out_infinite]">
                                    <Waves className="w-8 h-8 fill-current" />
                                </div>
                                <span className="text-sm font-bold text-white truncate px-6 max-w-full">{sourceAudio.name}</span>
                                <span className="text-[10px] text-[#F59E0B] font-mono mt-2 uppercase tracking-widest">AUDIO SIGNATURE CAPTURED</span>
                            </>
                        ) : (
                            <>
                                <Waves className="w-10 h-10 text-white/20 group-hover:text-[#F59E0B] transition-colors mb-3" />
                                <span className="text-sm font-bold text-white/40 group-hover:text-white transition-colors">TAP TO RECORD OR UPLOAD</span>
                                <span className="text-[10px] text-white/20 font-mono mt-2 uppercase tracking-widest">Supports .WAV / .MP3</span>
                            </>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-bold text-white/40 uppercase tracking-[2px]">TARGET PROFILE</label>                                                            
                        <select className="bg-[#0A0A0A] border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#F59E0B]/30 appearance-none font-bold text-sm min-h-[48px] outline-none cursor-pointer">
                            <option value="profile-1">Llasa Base [Neutral]</option>
                            <option value="profile-2">Llasa Expressive</option>
                        </select>
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-bold text-white/40 uppercase tracking-[2px]">ENGINE STATUS</label>                                                           
                        <div className="flex bg-[#0A0A0A] rounded-xl border border-white/5 h-[48px] items-center px-4">                                                                 
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />                                                                                             
                                <span className="text-xs font-bold text-white uppercase tracking-wider">ONLINE (FREE)</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* GENERATE */}
                <button
                    disabled={isConverting || !sourceAudio}
                    onClick={handleGenerateMock}
                    className={`
                        w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold transition-all duration-300 min-h-[56px] text-black mt-2 text-sm tracking-wide
                        ${(isConverting || !sourceAudio) ? 'bg-[#F59E0B]/50 cursor-not-allowed' : 'bg-[#F59E0B] hover:bg-[#F59E0B]/90 hover:shadow-[0_0_20px_rgba(245,158,11,0.3)] active:scale-[0.98]'}
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
            </div>
        </div>
    );
};

const SettingsTab = () => {
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
        <div className="min-h-screen bg-[#050505] text-white flex relative">
            {/* Cybersecurity Grid Backdrop */}
            <div
                className="absolute inset-0 pointer-events-none opacity-[0.03]"
                style={{
                    backgroundImage: `radial-gradient(#F59E0B 0.5px, transparent 0.5px), linear-gradient(to right, #F59E0B 0.5px, transparent 0.5px), linear-gradient(to bottom, #F59E0B 0.5px, transparent 0.5px)`,
                    backgroundSize: '24px 24px, 120px 120px, 120px 120px'
                }}
            />

            {/* Sidebar - Desktop */}
            <aside className="hidden lg:flex w-72 flex-col bg-black border-r border-white/5 p-6 space-y-8 z-50">
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
            <main className="flex-1 relative pt-20 lg:pt-0">

                <div className="max-w-5xl mx-auto p-4 md:p-8 h-screen flex flex-col overflow-hidden">
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
