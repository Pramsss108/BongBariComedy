import { useEffect, useRef } from 'react';

/* ─── BONG BOT HERO — Phase 1 + Phase 2 ──────────────────────────────────────
   PHASE 1 ✅
   STAGE 1: 3D shading on body
   STAGE 2: Gold glow rings around eyes (pulse)
   STAGE 3: Blush pulses gently
   STAGE 4: Steam wisps visible + wavy
   STAGE 5: 6 orbital sparkle particles

   PHASE 2 ✅
   STAGE 6: Left arm has pointing pose + extended finger geometry
   STAGE 7: Left arm cycles between wave, idle, point at random angles
   STAGE 8: Smooth lerp to random point target every 8s
   STAGE 9: Eyes gaze-bias toward pointing direction
   STAGE 10: Speech bubble with cycling phrases fades in/out
─────────────────────────────────────────────────────────────────────────── */

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/* STAGE 10: cycling phrases */
const PHRASES = [
  'Share files!', 'Try BongShare!', 'আমি তৈরি! 🤖',
  'Upload anything!', 'সহজ শেয়ার!', 'No signup needed!',
  'সব কিছু শেয়ার করো!', 'Fast & free!', 'বন্ধুকে পাঠাও!'
];

export default function BongBotHero() {
  const svgRef = useRef<SVGSVGElement>(null);
  const rafRef = useRef<number>(0);
  const cursor = useRef({ x: 150, y: 210 });

  const getEl = (id: string) => svgRef.current?.getElementById(id) as SVGElement | null;

  useEffect(() => {
    // ── Cursor tracking ─────────────────────────────────────────────────────
    const onMouse = (e: MouseEvent) => {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      cursor.current.x = ((e.clientX - rect.left) / rect.width)  * 300;
      cursor.current.y = ((e.clientY - rect.top)  / rect.height) * 420;
    };
    const onTouch = (e: TouchEvent) => {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect || !e.touches[0]) return;
      cursor.current.x = ((e.touches[0].clientX - rect.left) / rect.width)  * 300;
      cursor.current.y = ((e.touches[0].clientY - rect.top)  / rect.height) * 420;
    };
    window.addEventListener('mousemove', onMouse, { passive: true });
    window.addEventListener('touchmove', onTouch,  { passive: true });

    // ── Animation state ──────────────────────────────────────────────────────
    let t = 0;
    let blinkTimer  = 3 + Math.random() * 2;
    let isBlinking  = false;
    let blinkProg   = 0;
    let drinkPhase  = 'idle';
    let drinkTimer  = 10 + Math.random() * 5;
    let drinkAngle  = 0;
    let leftAngle   = 0;
    const WAVE_DUR  = 4;

    const EL = { x: 118, y: 118 };
    const ER = { x: 182, y: 118 };
    const MAX_SHIFT = 7;

    /* STAGE 5: sparkles */
    const SPARKS = Array.from({ length: 6 }, (_, i) => ({
      angle: (i / 6) * Math.PI * 2,
      rx: 95 + (i % 2) * 12,
      ry: 35 + (i % 3) * 8,
      speed: 0.4 + i * 0.07,
      r: 2.5 + (i % 3) * 1.2,
    }));

    /* STAGE 6–8: left arm mode state machine */
    type LeftMode = 'wave' | 'idle' | 'point';
    let leftMode: LeftMode = 'wave';   // start with wave on load
    let leftModeTimer = WAVE_DUR + 1;  // switch mode after wave
    let pointTargetAngle = -70;        // pointing angle: -90=up, 0=right, 90=down
    let currentPointAngle = 0;

    /* STAGE 9: eye gaze bias toward pointing direction */
    let gazeBiasX = 0; // extra X push on pupils when pointing

    /* STAGE 10: speech bubble state */
    let bubbleTimer   = 18;           // show bubble after 18s
    let bubbleVisible = false;
    let bubbleOpacity = 0;
    let phraseIndex   = 0;
    let bubbleFadeDir = 1;            // 1=fadein, -1=fadeout
    let bubbleHoldTimer = 0;

    let prevTime = performance.now();

    const tick = (now: number) => {
      const dt = Math.min((now - prevTime) / 1000, 0.05);
      prevTime = now;
      t += dt;

      const svg = svgRef.current;
      if (!svg) { rafRef.current = requestAnimationFrame(tick); return; }

      // ── FLOAT ───────────────────────────────────────────────────────────────
      const floatY = Math.sin(t * 1.4) * 8;
      getEl('bot-root')?.setAttribute('transform', `translate(0, ${floatY})`);

      // ── STAGE 9: compute gaze bias (used in eye tracking below) ────────────
      // When pointing, bias cursor toward the direction being pointed
      const gazeTarget = leftMode === 'point'
        ? lerp(gazeBiasX, (pointTargetAngle < 0 ? -60 : 60), dt * 2)
        : lerp(gazeBiasX, 0, dt * 3);
      gazeBiasX = gazeTarget;

      // ── EYE TRACKING (with gaze bias) ───────────────────────────────────────
      for (const [eye, cx, cy] of [
        ['left-pupil',  EL.x, EL.y],
        ['right-pupil', ER.x, ER.y],
      ] as [string, number, number][]) {
        // bias cursor x when bot is pointing
        const biasedCursorX = cursor.current.x + gazeBiasX;
        const dx = biasedCursorX - cx;
        const dy = cursor.current.y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const ratio = Math.min(dist / 150, 1);
        const px = cx + (dx / dist) * MAX_SHIFT * ratio;
        const py = cy + (dy / dist) * MAX_SHIFT * ratio;
        getEl(eye)?.setAttribute('cx', String(px));
        getEl(eye)?.setAttribute('cy', String(py));
      }

      // ── BLINK ────────────────────────────────────────────────────────────────
      blinkTimer -= dt;
      if (blinkTimer <= 0 && !isBlinking) { isBlinking = true; blinkTimer = 0.14; }
      if (isBlinking) {
        blinkProg = Math.min(blinkProg + dt / 0.07, 1);
        if (blinkProg >= 1 && blinkTimer <= 0) {
          blinkProg = 0; isBlinking = false; blinkTimer = 3 + Math.random() * 3;
        }
        blinkTimer -= dt;
      }
      const eyeScaleY = isBlinking
        ? (blinkProg < 0.5 ? 1 - blinkProg * 2 : (blinkProg - 0.5) * 2) : 0;
      for (const [id, cx, cy] of [
        ['left-eye-g',  EL.x, EL.y],
        ['right-eye-g', ER.x, ER.y],
      ] as [string, number, number][]) {
        getEl(id)?.setAttribute(
          'transform',
          `translate(${cx},${cy}) scale(1,${1 - eyeScaleY * 0.95}) translate(${-cx},${-cy})`
        );
      }

      // ── Eye glow ring pulse ──────────────────────────────────────────────────
      const glowPulse = 0.55 + Math.sin(t * 2.2) * 0.2;
      getEl('left-eye-ring')?.setAttribute('opacity',  String(glowPulse));
      getEl('right-eye-ring')?.setAttribute('opacity', String(glowPulse));

      // ── Blush pulse ──────────────────────────────────────────────────────────
      const blushOp = 0.22 + Math.sin(t * 0.55) * 0.1;
      getEl('blush-left')?.setAttribute('opacity',  String(blushOp));
      getEl('blush-right')?.setAttribute('opacity', String(blushOp));

      // ── STAGE 6–8: LEFT ARM mode state machine ───────────────────────────────
      leftModeTimer -= dt;
      if (leftModeTimer <= 0) {
        // Cycle through modes: wave → idle → point → idle → wave → …
        const modes: LeftMode[] = ['idle', 'point', 'idle', 'wave'];
        const idx = modes.indexOf(leftMode);
        leftMode = modes[(idx + 1) % modes.length];
        leftModeTimer = leftMode === 'wave' ? 3.5
                      : leftMode === 'point' ? 6 + Math.random() * 4
                      : 3 + Math.random() * 2;
        if (leftMode === 'point') {
          // pick a random pointing direction
          const options = [-80, -65, -50, -100, -40];
          pointTargetAngle = options[Math.floor(Math.random() * options.length)];
        }
      }

      // compute left arm angle based on mode
      let leftTarget = 0;
      if (leftMode === 'wave') {
        const bigWave = t < WAVE_DUR ? Math.sin(t * 5) * 28 : Math.sin(t * 4) * 22;
        leftTarget = bigWave;
      } else if (leftMode === 'idle') {
        leftTarget = Math.sin(t * 0.9) * 5;
      } else if (leftMode === 'point') {
        // STAGE 8: smooth lerp to random point target
        currentPointAngle = lerp(currentPointAngle, pointTargetAngle, dt * 3);
        leftTarget = currentPointAngle;
      }
      leftAngle = lerp(leftAngle, leftTarget, dt * 6);
      getEl('left-arm')?.setAttribute('transform', `rotate(${leftAngle}, 88, 195)`);

      // Show/hide point finger based on mode
      const isPointing = leftMode === 'point';
      getEl('point-finger')?.setAttribute('opacity', isPointing ? '1' : '0');
      getEl('left-knuckles')?.setAttribute('opacity', isPointing ? '0' : '1');

      // ── RIGHT ARM — drink ────────────────────────────────────────────────────
      drinkTimer -= dt;
      let targetAngle = 15;
      if (drinkPhase === 'idle' && drinkTimer <= 0) drinkPhase = 'up';
      if (drinkPhase === 'up') {
        targetAngle = -65;
        if (Math.abs(drinkAngle - targetAngle) < 3) { drinkPhase = 'hold'; drinkTimer = 1.8; }
      }
      if (drinkPhase === 'hold') {
        targetAngle = -65;
        if (drinkTimer <= 0) drinkPhase = 'down';
      }
      if (drinkPhase === 'down') {
        if (Math.abs(drinkAngle - targetAngle) < 3) {
          drinkPhase = 'idle'; drinkTimer = 12 + Math.random() * 6;
        }
      }
      drinkAngle = lerp(drinkAngle, targetAngle, dt * 5);
      getEl('right-arm')?.setAttribute('transform', `rotate(${drinkAngle}, 212, 195)`);

      // ── STAGE 4: Steam ───────────────────────────────────────────────────────
      for (let i = 0; i < 3; i++) {
        const st = (t * 0.65 + i * 0.38) % 1;
        const steamEl = getEl(`steam-${i}`);
        if (steamEl) {
          const wx = 228 + Math.sin(st * 8 + i * 1.3) * 5;
          const wy = 300 - st * 28;
          const op = st < 0.35 ? (st / 0.35) * 0.65 : (1 - st) / 0.65 * 0.65;
          const sc = 0.5 + st * 1.0;
          steamEl.setAttribute('cx', String(wx));
          steamEl.setAttribute('cy', String(wy));
          steamEl.setAttribute('r',  String(4 * sc));
          steamEl.setAttribute('opacity', String(Math.max(0, op)));
        }
      }

      // ── Antenna glow ─────────────────────────────────────────────────────────
      const pulse = 0.5 + Math.sin(t * 2.8) * 0.5;
      getEl('antenna-glow')?.setAttribute('opacity', String(0.25 + pulse * 0.5));

      // ── STAGE 5: Sparkle particles ───────────────────────────────────────────
      SPARKS.forEach((s, i) => {
        s.angle += s.speed * dt;
        const px = 150 + Math.cos(s.angle) * s.rx;
        const py = 240 + Math.sin(s.angle) * s.ry + floatY;
        const sparkOp = 0.3 + Math.sin(s.angle * 2 + i) * 0.3;
        const el = getEl(`spark-${i}`);
        if (el) {
          el.setAttribute('cx', String(px));
          el.setAttribute('cy', String(py));
          el.setAttribute('r',  String(s.r * (0.7 + Math.sin(t * 3 + i) * 0.3)));
          el.setAttribute('opacity', String(Math.max(0.05, sparkOp)));
        }
      });

      // ── STAGE 10: Speech bubble ──────────────────────────────────────────────
      bubbleTimer -= dt;
      if (!bubbleVisible && bubbleTimer <= 0) {
        bubbleVisible = true;
        bubbleFadeDir = 1;
        bubbleOpacity = 0;
        bubbleHoldTimer = 2.8;
        phraseIndex = (phraseIndex + 1) % PHRASES.length;
        // update text
        const txt = getEl('bubble-text');
        if (txt) txt.textContent = PHRASES[phraseIndex];
      }
      if (bubbleVisible) {
        if (bubbleFadeDir === 1) {
          bubbleOpacity = Math.min(bubbleOpacity + dt * 2.5, 1);
          if (bubbleOpacity >= 1) { bubbleFadeDir = 0; }
        } else if (bubbleFadeDir === 0) {
          bubbleHoldTimer -= dt;
          if (bubbleHoldTimer <= 0) bubbleFadeDir = -1;
        } else {
          bubbleOpacity = Math.max(bubbleOpacity - dt * 2, 0);
          if (bubbleOpacity <= 0) {
            bubbleVisible = false;
            bubbleTimer = 8 + Math.random() * 5;
          }
        }
        getEl('speech-bubble')?.setAttribute('opacity', String(bubbleOpacity));
      } else {
        getEl('speech-bubble')?.setAttribute('opacity', '0');
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('mousemove', onMouse);
      window.removeEventListener('touchmove', onTouch);
    };
  }, []);

  return (
    <div className="w-64 h-80 sm:w-80 sm:h-[420px] mx-auto select-none">
      <svg
        ref={svgRef}
        viewBox="0 0 300 420"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <radialGradient id="goldGrad" cx="38%" cy="32%">
            <stop offset="0%"   stopColor="#ffe070" />
            <stop offset="60%"  stopColor="#f0c12c" />
            <stop offset="100%" stopColor="#a07010" />
          </radialGradient>
          <radialGradient id="bodyGrad" cx="28%" cy="22%" r="75%">
            <stop offset="0%"   stopColor="#35385a" />
            <stop offset="45%"  stopColor="#1c1e30" />
            <stop offset="100%" stopColor="#0a0b12" />
          </radialGradient>
          <radialGradient id="bodyMidGrad" cx="32%" cy="25%" r="70%">
            <stop offset="0%"   stopColor="#2a2d48" />
            <stop offset="100%" stopColor="#0e0f1a" />
          </radialGradient>
          <radialGradient id="irisGrad" cx="36%" cy="32%">
            <stop offset="0%"   stopColor="#fff0a0" />
            <stop offset="55%"  stopColor="#f0c12c" />
            <stop offset="100%" stopColor="#8a6008" />
          </radialGradient>
          {/* Gold for bubble */}
          <linearGradient id="bubbleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="#1a1c2e" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#0d0e18" stopOpacity="0.95" />
          </linearGradient>
          <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3.5" result="b" />
            <feComposite in="SourceGraphic" in2="b" operator="over" />
          </filter>
          <filter id="softGlow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="7" result="b" />
            <feComposite in="SourceGraphic" in2="b" operator="over" />
          </filter>
          <filter id="bubbleGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feComposite in="SourceGraphic" in2="b" operator="over" />
          </filter>
          <clipPath id="lcl"><circle cx="118" cy="118" r="20" /></clipPath>
          <clipPath id="rcl"><circle cx="182" cy="118" r="20" /></clipPath>
        </defs>

        {/* ══ STAGE 5: Sparkles ══ */}
        {Array.from({ length: 6 }, (_, i) => (
          <circle key={i} id={`spark-${i}`} cx="150" cy="240"
            r="3" fill="#f0c12c" opacity="0.4" filter="url(#glow)" />
        ))}

        {/* ══ STAGE 10: Speech bubble — starts invisible, JS fades it ══ */}
        <g id="speech-bubble" opacity="0">
          {/* Bubble background */}
          <rect x="148" y="0" width="148" height="38" rx="12"
            fill="url(#bubbleGrad)"
            stroke="#f0c12c" strokeWidth="1.5" filter="url(#bubbleGlow)" />
          {/* Tail pointing down-left toward bot head */}
          <polygon points="162,38 172,38 164,50"
            fill="#1a1c2e" stroke="#f0c12c" strokeWidth="1.2" />
          {/* Phrase text */}
          <text id="bubble-text"
            x="222" y="24"
            textAnchor="middle"
            fontFamily="'Inter', system-ui, sans-serif"
            fontSize="13" fontWeight="600"
            fill="#f0c12c">
            Share files!
          </text>
          {/* Gold left accent dot */}
          <circle cx="162" cy="19" r="3.5" fill="#f0c12c" />
        </g>

        {/* ══ WHOLE BOT ══ */}
        <g id="bot-root">

          {/* Ground */}
          <ellipse cx="150" cy="402" rx="58" ry="10" fill="#000" opacity="0.3" />
          <ellipse cx="150" cy="402" rx="30" ry="5"
            fill="#f0c12c" opacity="0.18" filter="url(#softGlow)" />

          {/* ══ LEGS ══ */}
          <rect x="110" y="298" width="22" height="52" rx="11" fill="url(#bodyGrad)" />
          <ellipse cx="121" cy="354" rx="16" ry="9" fill="#12131a" />
          <rect x="113" y="300" width="7" height="34" rx="3.5" fill="white" opacity="0.07" />

          <rect x="168" y="298" width="22" height="52" rx="11" fill="url(#bodyGrad)" />
          <ellipse cx="179" cy="354" rx="16" ry="9" fill="#12131a" />
          <rect x="171" y="300" width="7" height="34" rx="3.5" fill="white" opacity="0.07" />

          {/* ══ BODY ══ */}
          <rect x="72" y="185" width="156" height="130" rx="50" fill="url(#bodyGrad)" />
          <path d="M 100 200 Q 85 215 85 250 Q 85 270 100 285"
            fill="none" stroke="white" strokeWidth="18" strokeLinecap="round" opacity="0.055" />
          <path d="M 200 200 Q 220 225 220 255 Q 220 275 205 290"
            fill="none" stroke="#000" strokeWidth="22" strokeLinecap="round" opacity="0.15" />
          <rect x="100" y="252" width="100" height="8" rx="4" fill="url(#goldGrad)" filter="url(#glow)" />
          <rect x="108" y="266" width="84"  height="8" rx="4" fill="url(#goldGrad)" filter="url(#glow)" />
          <rect x="118" y="280" width="64"  height="8" rx="4" fill="url(#goldGrad)" filter="url(#glow)" />

          {/* ══ LEFT ARM — pivot (88, 195) — wave + point ══ */}
          <g id="left-arm">
            {/* Upper arm */}
            <rect x="62" y="195" width="26" height="72" rx="13" fill="url(#bodyMidGrad)" />
            <rect x="65" y="198" width="8"  height="42" rx="4" fill="white" opacity="0.06" />
            {/* Forearm */}
            <rect x="55" y="260" width="24" height="56" rx="12" fill="url(#bodyGrad)" />
            {/* Hand */}
            <circle cx="67" cy="322" r="16" fill="url(#bodyMidGrad)" />

            {/* STAGE 6: Normal knuckles (hidden when pointing) */}
            <g id="left-knuckles">
              <circle cx="55" cy="332" r="7" fill="#1a1b2e" />
              <circle cx="67" cy="338" r="7" fill="#1a1b2e" />
              <circle cx="79" cy="332" r="7" fill="#1a1b2e" />
            </g>

            {/* STAGE 6: Extended index finger (hidden when NOT pointing) */}
            <g id="point-finger" opacity="0">
              {/* Curled fingers base */}
              <circle cx="55" cy="328" r="6" fill="#1a1b2e" />
              <circle cx="79" cy="328" r="6" fill="#1a1b2e" />
              {/* Extended index finger */}
              <rect x="60" y="292" width="14" height="34" rx="7" fill="url(#bodyMidGrad)" />
              {/* Fingertip highlight */}
              <circle cx="67" cy="292" r="7" fill="#2a2d48" />
              {/* Gold fingertip glow — the "pointer" */}
              <circle cx="67" cy="286" r="5" fill="#f0c12c" opacity="0.8" filter="url(#glow)" />
            </g>
          </g>

          {/* ══ RIGHT ARM — drink pivot (212, 195) ══ */}
          <g id="right-arm">
            <rect x="212" y="195" width="26" height="72" rx="13" fill="url(#bodyMidGrad)" />
            <rect x="215" y="198" width="8"  height="42" rx="4" fill="white" opacity="0.06" />
            <rect x="213" y="260" width="24" height="56" rx="12" fill="url(#bodyGrad)" />
            <circle cx="225" cy="322" r="16" fill="url(#bodyMidGrad)" />
            <circle cx="213" cy="332" r="7" fill="#1a1b2e" />
            <circle cx="225" cy="338" r="7" fill="#1a1b2e" />
            <circle cx="237" cy="332" r="7" fill="#1a1b2e" />
            {/* CHAI CUP */}
            <path d="M 212 306 L 216 332 L 244 332 L 248 306 Z" fill="url(#goldGrad)" />
            <ellipse cx="230" cy="306" rx="18" ry="5.5" fill="#ffe580" />
            <path d="M 248 312 Q 264 312 264 322 Q 264 332 248 332"
              fill="none" stroke="#d4a020" strokeWidth="5.5" strokeLinecap="round" />
            <ellipse cx="230" cy="308" rx="16" ry="4" fill="#3d1a06" opacity="0.95" />
            <line x1="220" y1="310" x2="218" y2="328"
              stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.22" />
            {/* Steam */}
            <circle id="steam-0" cx="222" cy="298" r="4"   fill="white" opacity="0" />
            <circle id="steam-1" cx="230" cy="295" r="3.5"  fill="white" opacity="0" />
            <circle id="steam-2" cx="238" cy="298" r="3"   fill="white" opacity="0" />
          </g>

          {/* ══ HEAD ══ */}
          <path d="M 82 132 C 82 42 218 42 218 132 L 218 178 Q 150 202 82 178 Z"
            fill="url(#bodyGrad)" />
          <path d="M 100 75 Q 88 100 88 130"
            fill="none" stroke="white" strokeWidth="16" strokeLinecap="round" opacity="0.06" />
          <rect x="118" y="172" width="64" height="24" rx="8" fill="url(#bodyGrad)" />
          {/* Visor */}
          <rect x="90" y="85" width="120" height="82" rx="34" fill="#060610" />
          <rect x="90" y="85" width="120" height="82" rx="34"
            fill="none" stroke="url(#goldGrad)" strokeWidth="3.5" />
          <path d="M 100 96 Q 95 110 96 124"
            fill="none" stroke="white" strokeWidth="8" strokeLinecap="round" opacity="0.09" />

          {/* LEFT EYE */}
          <g id="left-eye-g">
            <circle cx="118" cy="118" r="21" fill="#04040c" />
            <circle id="left-eye-ring" cx="118" cy="118" r="21"
              fill="none" stroke="#f0c12c" strokeWidth="2.5" filter="url(#glow)" opacity="0.55" />
            <circle cx="118" cy="118" r="16" fill="url(#irisGrad)" filter="url(#glow)" clipPath="url(#lcl)" />
            <circle id="left-pupil"  cx="118" cy="118" r="8" fill="#010103" clipPath="url(#lcl)" />
            <circle cx="124" cy="112" r="4.5" fill="white" opacity="0.92" clipPath="url(#lcl)" />
            <circle cx="128" cy="116" r="2"   fill="white" opacity="0.65" clipPath="url(#lcl)" />
          </g>

          {/* RIGHT EYE */}
          <g id="right-eye-g">
            <circle cx="182" cy="118" r="21" fill="#04040c" />
            <circle id="right-eye-ring" cx="182" cy="118" r="21"
              fill="none" stroke="#f0c12c" strokeWidth="2.5" filter="url(#glow)" opacity="0.55" />
            <circle cx="182" cy="118" r="16" fill="url(#irisGrad)" filter="url(#glow)" clipPath="url(#rcl)" />
            <circle id="right-pupil" cx="182" cy="118" r="8" fill="#010103" clipPath="url(#rcl)" />
            <circle cx="188" cy="112" r="4.5" fill="white" opacity="0.92" clipPath="url(#rcl)" />
            <circle cx="192" cy="116" r="2"   fill="white" opacity="0.65" clipPath="url(#rcl)" />
          </g>

          {/* SMILE */}
          <path d="M 126 150 Q 150 167 174 150"
            fill="none" stroke="url(#goldGrad)" strokeWidth="4.5" strokeLinecap="round" />

          {/* BLUSH */}
          <circle id="blush-left"  cx="95"  cy="142" r="14" fill="#e04028" opacity="0.25" />
          <circle id="blush-right" cx="205" cy="142" r="14" fill="#e04028" opacity="0.25" />

          {/* ANTENNA */}
          <line x1="150" y1="42" x2="150" y2="14"
            stroke="#252640" strokeWidth="6" strokeLinecap="round" />
          <circle cx="150" cy="12" r="9" fill="url(#goldGrad)" filter="url(#glow)" />
          <circle id="antenna-glow" cx="150" cy="12" r="18"
            fill="#f0c12c" opacity="0.5" filter="url(#softGlow)" />

        </g>
      </svg>
    </div>
  );
}
