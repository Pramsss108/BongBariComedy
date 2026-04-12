import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useSearch } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { SEOHead } from '@/components/SEOHead';
import { buildApiUrl } from '@/lib/queryClient';
import { useNglLang, LangToggle, FloatingHelp } from '@/components/NglLang';

export default function NglCreate() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const { t } = useNglLang();
  const [mode, setMode] = useState<'create' | 'login'>(search.includes('login=1') ? 'login' : 'create');
  const [username, setUsername] = useState('');
  const [status, setStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'error'>('idle');
  const [statusMsg, setStatusMsg] = useState('');
  const [creating, setCreating] = useState(false);
  const [createPin, setCreatePin] = useState('');
  const [createPhone, setCreatePhone] = useState('');
  // Photo upload step
  const [step, setStep] = useState<'form' | 'otp' | 'photo'>('form');
  const [createdUsername, setCreatedUsername] = useState('');
  const [createdKey, setCreatedKey] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  // OTP state
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [otpStatus, setOtpStatus] = useState<'idle' | 'sending' | 'sent' | 'verifying' | 'verified' | 'error'>('idle');
  const [otpError, setOtpError] = useState('');
  const [otpMaskedPhone, setOtpMaskedPhone] = useState('');
  const [otpCooldown, setOtpCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval>>();
  // Login state
  const [loginUser, setLoginUser] = useState('');
  const [loginKey, setLoginKey] = useState('');
  const [loginPin, setLoginPin] = useState('');
  const [loginMode, setLoginMode] = useState<'pin' | 'key'>('pin');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Check if already logged in
  useEffect(() => {
    const saved = localStorage.getItem('bong_ngl');
    if (saved) {
      try {
        const { username: u } = JSON.parse(saved);
        if (u) navigate(`/ngl/at/${u}`, { replace: true });
      } catch { /* ignore */ }
    }
  }, [navigate]);

  const checkAvailability = useCallback(async (name: string) => {
    if (name.length < 3) {
      setStatus('invalid');
      setStatusMsg(t('create.min3'));
      return;
    }
    setStatus('checking');
    setStatusMsg(t('create.checking'));
    try {
      const res = await fetch(buildApiUrl(`/api/ngl/check/${encodeURIComponent(name)}`));
      const data = await res.json();
      if (data.available) {
        setStatus('available');
        setStatusMsg(t('create.available'));
      } else {
        setStatus('taken');
        setStatusMsg(data.reason || 'username taken');
      }
    } catch {
      setStatus('error');
      setStatusMsg(t('create.error'));
    }
  }, [t]);

  const handleChange = (val: string) => {
    const clean = val.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20);
    setUsername(clean);
    if (!clean) { setStatus('idle'); setStatusMsg(''); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => checkAvailability(clean), 400);
  };

  const handleCreate = async () => {
    if (status !== 'available' || creating) return;
    setCreating(true);
    try {
      const body: any = { username };
      if (createPin.trim().length === 6) body.pin = createPin.trim();
      const phoneClean = createPhone.trim();
      if (phoneClean.length === 10 && /^[6-9]/.test(phoneClean)) body.phone = phoneClean;
      const res = await fetch(buildApiUrl('/api/ngl/create'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok && data.secretKey) {
        localStorage.setItem('bong_ngl', JSON.stringify({
          username: data.username,
          secretKey: data.secretKey,
        }));
        setCreatedUsername(data.username);
        setCreatedKey(data.secretKey);
        // If phone was provided, send OTP first
        if (body.phone) {
          setStep('otp');
          sendOtp(data.username, createPhone.trim(), data.secretKey);
        } else {
          setStep('photo');
        }
      } else {
        setStatus('error');
        setStatusMsg(data.error || t('create.error'));
        setCreating(false);
      }
    } catch {
      setStatus('error');
      setStatusMsg(t('create.error'));
      setCreating(false);
    }
  };

  const handleLogin = async () => {
    const hasCredential = loginMode === 'pin' ? loginPin.trim().length === 6 : loginKey.trim().length > 0;
    if (!loginUser.trim() || !hasCredential || loggingIn) return;
    setLoggingIn(true);
    setLoginError('');
    try {
      const body: any = { username: loginUser.trim().toLowerCase() };
      if (loginMode === 'pin') {
        body.pin = loginPin.trim();
      } else {
        body.secretKey = loginKey.trim();
      }
      const res = await fetch(buildApiUrl('/api/ngl/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        // PIN login returns a new secretKey; secret key login uses the one user provided
        const keyToStore = data.secretKey || loginKey.trim();
        localStorage.setItem('bong_ngl', JSON.stringify({
          username: data.username,
          secretKey: keyToStore,
        }));
        navigate(`/ngl/at/${data.username}`);
      } else {
        setLoginError(data.message || t('login.wrongKey'));
      }
    } catch {
      setLoginError(t('create.error'));
    }
    setLoggingIn(false);
  };

  // Photo upload for creation flow
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => {
      img.src = reader.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = 400;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d')!;
        const min = Math.min(img.width, img.height);
        const sx = (img.width - min) / 2;
        const sy = (img.height - min) / 2;
        ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
        setPhotoPreview(canvas.toDataURL('image/jpeg', 0.92));
      };
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handlePhotoUploadAndContinue = async () => {
    if (!photoPreview || !createdKey || !createdUsername) {
      navigate(`/ngl/at/${createdUsername}`);
      return;
    }
    setUploadingPhoto(true);
    try {
      await fetch(buildApiUrl(`/api/ngl/u/${encodeURIComponent(createdUsername)}/photo`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-NGL-Key': createdKey },
        body: JSON.stringify({ photo: photoPreview }),
      });
    } catch {}
    setUploadingPhoto(false);
    navigate(`/ngl/at/${createdUsername}`);
  };

  const handleSkipPhoto = () => {
    navigate(`/ngl/at/${createdUsername}`);
  };

  // ── OTP helpers ──
  const startCooldown = (seconds: number) => {
    setOtpCooldown(seconds);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setOtpCooldown(prev => {
        if (prev <= 1) { clearInterval(cooldownRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const sendOtp = async (user: string, phone: string, key: string) => {
    setOtpStatus('sending');
    setOtpError('');
    try {
      const res = await fetch(buildApiUrl('/api/ngl/otp/send'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user, phone, key }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setOtpStatus('sent');
        setOtpMaskedPhone(data.phone || `+91 ${phone.slice(0, 5)}•••••`);
        startCooldown(60);
      } else if (res.status === 429) {
        // Rate limited — extract wait time
        setOtpStatus('sent'); // already sent previously
        const waitMatch = (data.message || '').match(/(\d+)s/);
        const wait = waitMatch ? parseInt(waitMatch[1]) : 30;
        startCooldown(wait);
        setOtpMaskedPhone(`+91 ${phone.slice(0, 5)}•••••`);
      } else {
        setOtpStatus('error');
        setOtpError(t('otp.sendFailed'));
      }
    } catch {
      setOtpStatus('error');
      setOtpError(t('otp.sendFailed'));
    }
  };

  const handleResendOtp = () => {
    if (otpCooldown > 0) return;
    setOtpDigits(['', '', '', '', '', '']);
    setOtpError('');
    sendOtp(createdUsername, createPhone.trim(), createdKey);
  };

  const handleVerifyOtp = async () => {
    const code = otpDigits.join('');
    if (code.length !== 6) return;
    setOtpStatus('verifying');
    setOtpError('');
    try {
      const res = await fetch(buildApiUrl('/api/ngl/otp/verify'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: createdUsername, otp: code, key: createdKey }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setOtpStatus('verified');
        // Brief success animation then move to photo
        setTimeout(() => setStep('photo'), 1200);
      } else {
        setOtpStatus('sent');
        const msg = data.message || '';
        if (msg.toLowerCase().includes('expire')) {
          setOtpError(t('otp.expired'));
        } else {
          setOtpError(t('otp.wrongCode'));
        }
        // Shake & clear digits
        setOtpDigits(['', '', '', '', '', '']);
        setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
      }
    } catch {
      setOtpStatus('sent');
      setOtpError(t('otp.sendFailed'));
    }
  };

  const handleOtpDigitChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = digit;
    setOtpDigits(newDigits);
    setOtpError('');
    // Auto-advance
    if (digit && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
    // Auto-verify when all 6 digits entered
    if (digit && index === 5 && newDigits.every(d => d)) {
      setTimeout(() => {
        const code = newDigits.join('');
        if (code.length === 6) handleVerifyOtp();
      }, 150);
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'Enter') {
      handleVerifyOtp();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 0) return;
    const newDigits = [...otpDigits];
    for (let i = 0; i < pasted.length && i < 6; i++) {
      newDigits[i] = pasted[i];
    }
    setOtpDigits(newDigits);
    // Focus after last pasted digit or auto-verify
    const focusIdx = Math.min(pasted.length, 5);
    otpInputRefs.current[focusIdx]?.focus();
    if (pasted.length === 6) {
      setTimeout(() => handleVerifyOtp(), 150);
    }
  };

  const handleSkipOtp = () => {
    setStep('photo');
  };

  const statusColor = {
    idle: 'text-white/60',
    checking: 'text-yellow-200',
    available: 'text-emerald-300 font-bold',
    taken: 'text-red-300 font-bold',
    invalid: 'text-orange-300',
    error: 'text-red-300',
  }[status];


  return (
    <>
      <SEOHead
        title={mode === 'login' ? 'Login — Bong NGL' : 'Create Your Link — Bong NGL'}
        description="Pick a username and get your anonymous message link. Share on WhatsApp & Instagram."
        url="https://www.bongbari.com/ngl/create"
      />
      <div className="h-dvh w-full overflow-hidden" style={{ background: '#0a0a14', paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
        <div className="h-full flex flex-col items-center justify-center px-5 relative">
          {/* Top bar */}
          <div className="absolute top-3 left-0 right-0 flex items-center justify-between px-4 z-10">
            <button onClick={() => step === 'photo' ? handleSkipPhoto() : step === 'otp' ? handleSkipOtp() : navigate('/ngl')} className="text-white/70 font-semibold text-xs hover:text-white transition-colors backdrop-blur-md bg-white/10 px-3 py-2 rounded-full border border-white/10">
              ← Back
            </button>
            <LangToggle />
          </div>

          <AnimatePresence mode="wait">
            {step === 'photo' ? (
              <motion.div
                key="photo-step"
                initial={{ y: 30, opacity: 0, scale: 0.95 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: -30, opacity: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="w-full max-w-[400px] flex flex-col items-center"
              >
                {/* Premium glass card for photo step */}
                <div className="w-full bg-white/[0.07] backdrop-blur-2xl rounded-3xl border border-white/[0.12] shadow-2xl shadow-black/40 p-6 flex flex-col items-center">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, delay: 0.1 }} className="text-4xl mb-2">🎉</motion.div>
                  <h1 className="text-xl sm:text-2xl font-black text-white text-center mb-0.5 tracking-tight">{t('create.welcomeTitle') || 'Welcome!'}</h1>
                  <p className="text-white/40 text-xs text-center mb-5">{t('create.photoPrompt') || 'Add a profile photo so friends recognize you'}</p>

                  {/* Large premium upload circle */}
                  <motion.button onClick={() => photoInputRef.current?.click()} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-full mb-5 group">
                    {/* Spinning gradient ring */}
                    <motion.div className="absolute inset-[-4px] rounded-full" style={{ background: 'conic-gradient(#a855f7, #ec4899, #f97316, #facc15, #34d399, #60a5fa, #a855f7)' }} animate={{ rotate: 360 }} transition={{ duration: 6, repeat: Infinity, ease: 'linear' }} />
                    {/* Inner dark circle */}
                    <div className="absolute inset-[3px] rounded-full bg-[#1a1640] z-[1]" />
                    {photoPreview ? (
                      <img src={photoPreview} alt="Preview" className="absolute inset-[3px] w-[calc(100%-6px)] h-[calc(100%-6px)] rounded-full object-cover z-[2]" />
                    ) : (
                      <div className="absolute inset-[3px] rounded-full z-[2] flex flex-col items-center justify-center gap-1 group-hover:bg-white/[0.04] transition-colors">
                        <div className="w-10 h-10 rounded-full bg-white/[0.08] flex items-center justify-center">
                          <svg className="w-5 h-5 text-white/60" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.04l-.821 1.315Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" /></svg>
                        </div>
                        <span className="text-white/50 text-[11px] font-semibold">{t('create.tapToUpload') || 'Tap to upload'}</span>
                      </div>
                    )}
                  </motion.button>

                  {/* Buttons */}
                  <div className="w-full flex flex-col gap-2">
                    {photoPreview ? (
                      <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} whileTap={{ scale: 0.97 }} onClick={handlePhotoUploadAndContinue} disabled={uploadingPhoto} className="w-full py-3.5 rounded-2xl font-bold text-[15px] bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white shadow-lg shadow-pink-500/25 disabled:opacity-50">
                        {uploadingPhoto ? '...' : (t('create.saveAndContinue') || 'Save & Continue →')}
                      </motion.button>
                    ) : (
                      <button onClick={() => photoInputRef.current?.click()} className="w-full py-3.5 rounded-2xl font-bold text-[15px] bg-white/[0.08] text-white border border-white/[0.12] hover:bg-white/[0.12] transition-colors">
                        📷 {t('create.choosePhoto') || 'Choose Photo'}
                      </button>
                    )}
                    <button onClick={handleSkipPhoto} className="text-white/30 text-[11px] font-medium text-center hover:text-white/60 transition-colors py-1">
                      {t('create.skipPhoto') || 'Skip for now →'}
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : step === 'otp' ? (
              <motion.div
                key="otp-step"
                initial={{ y: 30, opacity: 0, scale: 0.95 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: -30, opacity: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="w-full max-w-[400px] flex flex-col items-center"
              >
                <div className="w-full bg-white/[0.07] backdrop-blur-2xl rounded-3xl border border-white/[0.12] shadow-2xl shadow-black/40 p-6 flex flex-col items-center">

                  {/* Title */}
                  {otpStatus === 'verified' ? (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }} className="text-5xl mb-3">✅</motion.div>
                  ) : (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, delay: 0.1 }} className="text-4xl mb-2">📱</motion.div>
                  )}

                  <h1 className="text-xl sm:text-2xl font-black text-white text-center mb-0.5 tracking-tight">
                    {otpStatus === 'verified' ? t('otp.verified') : t('otp.title')}
                  </h1>

                  {otpStatus !== 'verified' && (
                    <>
                      <p className="text-white/40 text-xs text-center mb-1">{t('otp.subtitle')}</p>
                      {otpMaskedPhone && (
                        <p className="text-emerald-400 text-sm font-mono font-semibold mb-4">{otpMaskedPhone}</p>
                      )}

                      {/* Hint about "Reference" message */}
                      <div className="w-full bg-amber-500/10 border border-amber-500/20 rounded-2xl px-3 py-2.5 mb-4">
                        <p className="text-amber-300/90 text-[11px] text-center leading-relaxed">{t('otp.whatsappNote')}</p>
                      </div>

                      {/* 6-digit OTP input boxes */}
                      <div className="flex gap-2 mb-4" onPaste={handleOtpPaste}>
                        {otpDigits.map((digit, i) => (
                          <input
                            key={`otp-${i}`}
                            ref={el => { otpInputRefs.current[i] = el; }}
                            type="tel"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={e => handleOtpDigitChange(i, e.target.value)}
                            onKeyDown={e => handleOtpKeyDown(i, e)}
                            autoFocus={i === 0}
                            className={`w-11 h-14 text-center text-xl font-bold font-mono rounded-xl border-2 outline-none transition-all ${
                              digit
                                ? 'bg-white/[0.12] border-purple-500/60 text-white'
                                : 'bg-white/[0.06] border-white/[0.12] text-white/60'
                            } focus:border-purple-500 focus:bg-white/[0.15]`}
                          />
                        ))}
                      </div>

                      {/* Error message */}
                      <AnimatePresence>
                        {otpError && (
                          <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-red-400 text-xs font-semibold mb-3 text-center">{otpError}</motion.p>
                        )}
                      </AnimatePresence>

                      {/* Verify button */}
                      <motion.button
                        whileHover={{ scale: otpDigits.every(d => d) ? 1.02 : 1 }}
                        whileTap={{ scale: otpDigits.every(d => d) ? 0.97 : 1 }}
                        onClick={handleVerifyOtp}
                        disabled={!otpDigits.every(d => d) || otpStatus === 'verifying' || otpStatus === 'sending'}
                        className={`w-full py-3 rounded-2xl font-bold text-[15px] shadow-xl transition-all mb-3 ${
                          otpDigits.every(d => d) && otpStatus !== 'verifying'
                            ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-emerald-500/25'
                            : 'bg-white/[0.06] text-white/20 cursor-not-allowed'
                        }`}
                      >
                        {otpStatus === 'verifying' ? t('otp.verifying') : otpStatus === 'sending' ? '...' : t('otp.verify')}
                      </motion.button>

                      {/* Resend + Skip */}
                      <div className="flex items-center justify-between w-full">
                        <button
                          onClick={handleResendOtp}
                          disabled={otpCooldown > 0 || otpStatus === 'sending'}
                          className={`text-xs font-medium transition-colors ${
                            otpCooldown > 0 ? 'text-white/20 cursor-not-allowed' : 'text-purple-400 hover:text-purple-300'
                          }`}
                        >
                          {otpCooldown > 0
                            ? t('otp.resendWait').replace('X', String(otpCooldown))
                            : t('otp.resend')}
                        </button>
                        <button onClick={handleSkipOtp} className="text-white/30 text-xs font-medium hover:text-white/60 transition-colors">
                          {t('otp.skip')}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            ) : mode === 'create' ? (
              <motion.div
                key="create"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="w-full max-w-[400px]"
              >
                <div className="text-center mb-5">
                  <h1 className="text-[22px] sm:text-2xl font-black text-white tracking-tight">{t('create.title')}</h1>
                  <p className="text-white/40 text-xs mt-0.5">{t('create.subtitle')}</p>
                </div>

                {/* Unified glass card */}
                <div className="bg-white/[0.07] backdrop-blur-2xl rounded-3xl border border-white/[0.12] shadow-2xl shadow-black/40 overflow-hidden">

                  {/* Row 1: Username */}
                  <div className="px-4 py-3.5 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0">
                      <span className="text-white font-black text-sm">@</span>
                    </div>
                    <input
                      type="text"
                      value={username}
                      onChange={e => handleChange(e.target.value)}
                      placeholder="username"
                      autoFocus
                      autoCapitalize="off"
                      autoComplete="off"
                      spellCheck={false}
                      className="flex-1 text-[15px] font-semibold text-white outline-none bg-transparent placeholder:text-white/25"
                      onKeyDown={e => e.key === 'Enter' && handleCreate()}
                    />
                    {status === 'checking' && <div className="w-4 h-4 border-2 border-white/30 border-t-white/80 rounded-full animate-spin" />}
                    {status === 'available' && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center"><span className="text-emerald-400 text-xs font-bold">✓</span></motion.div>
                    )}
                    {status === 'taken' && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center"><span className="text-red-400 text-xs font-bold">✗</span></motion.div>
                    )}
                  </div>

                  {/* Divider + status */}
                  <div className="px-4">
                    <div className="h-px bg-white/[0.08]" />
                    {statusMsg && (
                      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`text-[11px] pt-1.5 pb-0.5 text-center font-medium ${status === 'available' ? 'text-emerald-400' : status === 'taken' ? 'text-red-400' : status === 'invalid' ? 'text-amber-400' : 'text-white/40'}`}>
                        {statusMsg}
                        {status === 'available' && <span className="text-white/30 ml-2 font-normal">bongbari.com/ngl/q/{username}</span>}
                      </motion.p>
                    )}
                  </div>

                  {/* Row 2: PIN */}
                  <AnimatePresence>
                    {username.length >= 3 && status === 'available' && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                        <div className="px-4 pt-1"><div className="h-px bg-white/[0.08]" /></div>
                        <div className="px-4 py-3 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shrink-0"><span className="text-white text-sm">🛡️</span></div>
                          <div className="flex-1 flex items-center gap-2">
                            <input
                              type="tel"
                              inputMode="numeric"
                              maxLength={6}
                              value={createPin}
                              onChange={e => setCreatePin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                              placeholder="● ● ● ● ● ●"
                              autoComplete="off"
                              className="flex-1 text-[15px] font-semibold text-white outline-none bg-transparent placeholder:text-white/25 tracking-[0.2em] font-mono"
                            />
                            {createPin.length === 6 && (
                              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center"><span className="text-emerald-400 text-xs font-bold">✓</span></motion.div>
                            )}
                          </div>
                        </div>
                        <p className="text-white/30 text-[10px] text-center pb-2 -mt-1">{t('create.pinHint')}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Row 3: WhatsApp (optional) */}
                  <AnimatePresence>
                    {username.length >= 3 && status === 'available' && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, delay: 0.05 }} className="overflow-hidden">
                        <div className="px-4"><div className="h-px bg-white/[0.08]" /></div>
                        <div className="px-4 py-3 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shrink-0"><span className="text-white text-sm">💬</span></div>
                          <div className="flex-1 flex items-center gap-1.5">
                            <span className="text-white/30 text-xs font-mono font-semibold">+91</span>
                            <input
                              type="tel"
                              inputMode="numeric"
                              maxLength={10}
                              value={createPhone}
                              onChange={e => setCreatePhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                              placeholder={t('create.phonePlaceholder')}
                              autoComplete="off"
                              className="flex-1 text-[15px] font-semibold text-white outline-none bg-transparent placeholder:text-white/25 font-mono"
                            />
                            {createPhone.length === 10 && /^[6-9]/.test(createPhone) && (
                              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center"><span className="text-emerald-400 text-xs font-bold">✓</span></motion.div>
                            )}
                            {createPhone.length === 10 && !/^[6-9]/.test(createPhone) && (
                              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center"><span className="text-red-400 text-xs font-bold">✕</span></motion.div>
                            )}
                          </div>
                          <span className="text-[9px] text-white/20 font-medium bg-white/[0.06] px-1.5 py-0.5 rounded-full shrink-0">optional</span>
                        </div>
                        <p className="text-white/30 text-[10px] text-center pb-2 -mt-1">{t('create.phoneHint')}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Create button */}
                <motion.button
                  whileHover={{ scale: status === 'available' ? 1.02 : 1 }}
                  whileTap={{ scale: status === 'available' ? 0.98 : 1 }}
                  onClick={handleCreate}
                  disabled={status !== 'available' || creating}
                  className={`w-full mt-4 py-3.5 rounded-2xl font-bold text-[15px] shadow-xl transition-all ${
                    status === 'available' && !creating
                      ? 'bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white shadow-pink-500/25 hover:shadow-pink-500/40'
                      : 'bg-white/[0.06] text-white/20 cursor-not-allowed'
                  }`}
                >
                  {creating ? t('create.creating') : t('create.continue')}
                </motion.button>

                <button onClick={() => setMode('login')} className="block mx-auto mt-3 text-white/30 font-medium text-xs hover:text-white/60 transition-colors">
                  {t('login.switchToLogin') || 'Already have an account? Login →'}
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="login"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="w-full max-w-[400px]"
              >
                <div className="text-center mb-5">
                  <div className="text-3xl mb-1.5">{loginMode === 'pin' ? '🔢' : '🔑'}</div>
                  <h1 className="text-[22px] sm:text-2xl font-black text-white tracking-tight">{loginMode === 'pin' ? t('login.pinTitle') : t('login.title')}</h1>
                  <p className="text-white/40 text-xs mt-0.5">{loginMode === 'pin' ? t('login.pinSubtitle') : t('login.subtitle')}</p>
                </div>

                <div className="bg-white/[0.07] backdrop-blur-2xl rounded-3xl border border-white/[0.12] shadow-2xl shadow-black/40 overflow-hidden">
                  <div className="px-4 py-3.5 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0"><span className="text-white font-black text-sm">@</span></div>
                    <input
                      type="text"
                      value={loginUser}
                      onChange={e => setLoginUser(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20))}
                      placeholder={t('login.userPlaceholder')}
                      autoFocus
                      autoCapitalize="off"
                      autoComplete="off"
                      className="flex-1 text-[15px] font-semibold text-white outline-none bg-transparent placeholder:text-white/25"
                    />
                  </div>
                  <div className="px-4"><div className="h-px bg-white/[0.08]" /></div>
                  {loginMode === 'pin' ? (
                    <div className="px-4 py-3.5 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shrink-0"><span className="text-white text-sm">🔢</span></div>
                      <input type="tel" inputMode="numeric" maxLength={6} value={loginPin} onChange={e => setLoginPin(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="● ● ● ● ● ●" autoComplete="off" className="flex-1 text-[15px] font-semibold text-white outline-none bg-transparent placeholder:text-white/25 tracking-[0.2em] font-mono" onKeyDown={e => e.key === 'Enter' && handleLogin()} />
                    </div>
                  ) : (
                    <div className="px-4 py-3.5 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0"><span className="text-white text-sm">🔐</span></div>
                      <input type="password" value={loginKey} onChange={e => setLoginKey(e.target.value)} placeholder={t('login.keyPlaceholder')} autoComplete="off" className="flex-1 text-[15px] font-semibold text-white outline-none bg-transparent placeholder:text-white/25 font-mono" onKeyDown={e => e.key === 'Enter' && handleLogin()} />
                    </div>
                  )}
                </div>

                <button onClick={() => { setLoginMode(loginMode === 'pin' ? 'key' : 'pin'); setLoginError(''); }} className="block mx-auto mt-2.5 text-white/30 text-[11px] font-medium hover:text-white/60 transition-colors">
                  {loginMode === 'pin' ? t('login.useKeyInstead') : t('login.usePinInstead')}
                </button>
                <AnimatePresence>
                  {loginError && (
                    <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-red-400 text-xs mt-2 text-center font-semibold">{loginError}</motion.p>
                  )}
                </AnimatePresence>

                <motion.button
                  whileHover={{ scale: (loginUser && (loginMode === 'pin' ? loginPin.length === 6 : loginKey)) ? 1.02 : 1 }}
                  whileTap={{ scale: (loginUser && (loginMode === 'pin' ? loginPin.length === 6 : loginKey)) ? 0.98 : 1 }}
                  onClick={handleLogin}
                  disabled={!loginUser.trim() || (loginMode === 'pin' ? loginPin.trim().length !== 6 : !loginKey.trim()) || loggingIn}
                  className={`w-full mt-4 py-3.5 rounded-2xl font-bold text-[15px] shadow-xl transition-all ${
                    loginUser.trim() && (loginMode === 'pin' ? loginPin.trim().length === 6 : loginKey.trim()) && !loggingIn
                      ? 'bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white shadow-pink-500/25'
                      : 'bg-white/[0.06] text-white/20 cursor-not-allowed'
                  }`}
                >
                  {loggingIn ? t('login.loggingIn') : t('login.btn')}
                </motion.button>

                <button onClick={() => setMode('create')} className="block mx-auto mt-3 text-white/30 font-medium text-xs hover:text-white/60 transition-colors">
                  {t('login.switchToCreate') || '← Create new account'}
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <FloatingHelp />
        </div>
      </div>
    </>
  );
}