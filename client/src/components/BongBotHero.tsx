import { useEffect, useRef } from 'react';

const lerp  = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

type Personality = 'happy' | 'excited' | 'thinking' | 'sleepy' | 'sipping';
interface PersonalityConfig {
  label: string; emoji: string;
  phraseBengali: string; phraseEnglish: string;
  eyeScale: number; blushIntensity: number;
  headTilt: number; antennaPulse: number;
}
const PERSONALITIES: Record<Personality, PersonalityConfig> = {
  happy:    { label:'Happy',        emoji:'😊', phraseBengali:'সবাই কে ভালোবাসি!', phraseEnglish:'Share files freely!',  eyeScale:1.15, blushIntensity:0.38, headTilt:3,  antennaPulse:1.2 },
  excited:  { label:'Excited',      emoji:'🤩', phraseBengali:'ইয়ে! নতুন ফাইল!',  phraseEnglish:"Let's gooo! 🚀",       eyeScale:1.35, blushIntensity:0.55, headTilt:-5, antennaPulse:2.0 },
  thinking: { label:'Thinking',     emoji:'🤔', phraseBengali:'হুম... ভাবছি...',    phraseEnglish:'Calculating...',       eyeScale:0.70, blushIntensity:0.10, headTilt:8,  antennaPulse:0.5 },
  sleepy:   { label:'Sleepy',       emoji:'😴', phraseBengali:'একটু ঘুমাই...zzz',  phraseEnglish:'Need chai asap...',    eyeScale:0.35, blushIntensity:0.15, headTilt:12, antennaPulse:0.3 },
  sipping:  { label:'Sipping Chai', emoji:'☕', phraseBengali:'আহা চা! দারুণ!',    phraseEnglish:'Nothing like chai!',  eyeScale:0.85, blushIntensity:0.45, headTilt:-8, antennaPulse:0.8 },
};
const PERSONALITY_ORDER: Personality[] = ['happy','excited','thinking','happy','sleepy','happy','sipping'];

export default function BongBotHero({ onPersonalityChange }: { onPersonalityChange?: (p: Personality, cfg: PersonalityConfig) => void }) {
  const svgRef  = useRef<SVGSVGElement>(null);
  const rafRef  = useRef<number>(0);
  const cursor  = useRef({ x:150, y:180 });
  const onPCRef = useRef(onPersonalityChange);
  onPCRef.current = onPersonalityChange;

  useEffect(() => {
    const onMouse = (e: MouseEvent) => {
      const r = svgRef.current?.getBoundingClientRect(); if (!r) return;
      cursor.current = { x:((e.clientX-r.left)/r.width)*300, y:((e.clientY-r.top)/r.height)*420 };
    };
    window.addEventListener('mousemove', onMouse, { passive:true });
    const el = (id: string) => svgRef.current?.getElementById(id) as SVGElement | null;

    // ── core state
    let t = 0;
    let blinkT = 2.5+Math.random(), isBlinking = false, blinkP = 0;
    let eyeSL = 1, headTL = 0, blushL = 0.25, antL = 1;
    let persIdx = 0, persT = 8+Math.random()*4, curPers: Personality = 'happy';
    let bubOp = 0, bubVis = false, bubDir = 1, bubHold = 2.5, bubT = 0.5;
    let dotPhase = 0, bounceY = 0, bounceV = 0, gazeX = 0;
    const SPARKS = Array.from({length:6},(_,i)=>({ a:(i/6)*Math.PI*2, rx:85+(i%2)*18, ry:28+(i%3)*10, spd:0.38+i*0.06, r:2+(i%3)*1.4 }));

    /* ═══════════════════════════════════════════════════════════════════
       PHYSICIST'S ARM — single pivot at shoulder (56, 222)

       10 physics rules:
       1. ONE pivot, NO nested-transform bugs. Simplicity is physics.
       2. Arm natural rest: shoulder +8° forward lean (gravity droop)
       3. Raise target: +108° → arm at ~10 o'clock, hand clearly visible
       4. Float inertia: arm sways ±4° linked to bounce velocity
       5. Wave: smooth sine ±18° around 108°, no spring (sine IS physics)
       6. Wave speed: personality-linked. Excited=4.5Hz, Happy=3.2Hz, Sleepy=1.5Hz
       7. Raise: fast lerp (8×) — snappy, deliberate mechanical raise
       8. Lower: slow lerp (3×) — graceful drop, like a tired arm
       9. Wrist echo: hand group adds ±12° extra rotation at wave peaks (subtle)
      10. Palm face: hand drawn with open palm geometry, welcoming not fist-like
    ═══════════════════════════════════════════════════════════════════ */
    type ArmMode = 'rest' | 'raising' | 'waving' | 'lowering';
    let armMode: ArmMode = 'rest';
    let armT = 1.8;       // first raise in 1.8s
    let armAng = 8;       // current shoulder angle
    let armTgt = 8;       // shoulder target

    // Rule 9: wrist echo
    let wristEcho = 0;

    // Rule 6: wave frequency per personality
    const waveHz: Record<Personality, number> = {
      happy:3.2, excited:4.5, thinking:2.0, sleepy:1.5, sipping:2.8
    };

    // ── RIGHT ARM drink / sip
    // Pure single-pivot pendulum swing (matching the beloved left arm)
    let drinkAng = 0;
    let cupCounterRot = 0;   // keeps cup upright
    let cupSipTilt = 0;      // extra tilt when sipping (+22° toward face)
    type DrinkPhase = 'idle'|'up'|'hold'|'down';
    let drinkPhase: DrinkPhase = 'idle', drinkT = 14 + Math.random()*6;

    const showBubble = (phrase: string) => {
      const tx = el('bubble-text'); if (tx) tx.textContent = phrase;
      bubVis = true; bubDir = 1; bubOp = 0; bubHold = 2.8;
    };
    const setPers = (p: Personality) => {
      curPers = p; const cfg = PERSONALITIES[p]; onPCRef.current?.(p, cfg);
      showBubble(`${cfg.emoji} ${Math.random()>.5 ? cfg.phraseBengali : cfg.phraseEnglish}`);
      if (p==='excited') bounceV = -14;
    };

    let prev = performance.now();
    const tick = (now: number) => {
      const dt = Math.min((now-prev)/1000, 0.05); prev = now; t += dt;
      if (!svgRef.current) { rafRef.current = requestAnimationFrame(tick); return; }

      // personality cycle
      persT -= dt;
      if (persT <= 0) {
        persIdx = (persIdx+1) % PERSONALITY_ORDER.length;
        persT = 7 + Math.random()*5;
        setPers(PERSONALITY_ORDER[persIdx]);
      }
      const cfg = PERSONALITIES[curPers];
      eyeSL  = lerp(eyeSL,  cfg.eyeScale,       dt*2);
      headTL = lerp(headTL, cfg.headTilt,        dt*1.5);
      blushL = lerp(blushL, cfg.blushIntensity,  dt*1.2);
      antL   = lerp(antL,   cfg.antennaPulse,    dt);

      // float + bounce
      const floatY = Math.sin(t*1.3)*7;
      bounceV += 28*dt; bounceY = Math.min(0, bounceY + bounceV*dt);
      if (bounceY >= 0) { bounceY = 0; bounceV = 0; }
      el('bot-root')?.setAttribute('transform',
        `translate(0,${floatY+bounceY}) rotate(${headTL*.2},150,240)`);

      // gaze bias (eyes shift toward wave direction)
      gazeX = lerp(gazeX, armMode==='waving' ? -22 : 0, dt*2.5);

      // eye tracking
      for (const [id,cx,cy] of [['left-pupil',118,116],['right-pupil',182,116]] as [string,number,number][]) {
        const bx = cursor.current.x+gazeX, dx = bx-cx, dy = cursor.current.y-cy;
        const dist = Math.sqrt(dx*dx+dy*dy)||1, rr = clamp(dist/140,0,1)*7;
        el(id)?.setAttribute('cx', String(cx+(dx/dist)*rr));
        el(id)?.setAttribute('cy', String(cy+(dy/dist)*rr));
      }

      // blink
      blinkT -= dt;
      if (blinkT<=0 && !isBlinking) { isBlinking=true; blinkT=0.13; }
      if (isBlinking) {
        blinkP = Math.min(blinkP+dt/0.065, 1);
        if (blinkP>=1 && blinkT<=0) { blinkP=0; isBlinking=false; blinkT=(curPers==='sleepy'?1.5:3)+Math.random()*2; }
        blinkT -= dt;
      }
      const sleepyD = curPers==='sleepy' ? 0.5+Math.sin(t*.6)*.15 : 0;
      const blinkV  = isBlinking ? (blinkP<.5 ? 1-blinkP*2 : (blinkP-.5)*2) : 0;
      const eyeSY   = Math.max(0.05, (1-sleepyD-blinkV*.95)) * eyeSL;
      for (const [id,cx,cy] of [['left-eye-g',118,116],['right-eye-g',182,116]] as [string,number,number][]) {
        el(id)?.setAttribute('transform', `translate(${cx},${cy}) scale(${eyeSL},${eyeSY}) translate(${-cx},${-cy})`);
      }
      const glow = 0.5+Math.sin(t*2.2)*.22;
      el('left-eye-ring')?.setAttribute('opacity',  String(glow));
      el('right-eye-ring')?.setAttribute('opacity', String(glow));
      const blush = clamp(blushL+Math.sin(t*.5)*.06, 0, 1);
      el('blush-left')?.setAttribute('opacity',  String(blush));
      el('blush-right')?.setAttribute('opacity', String(blush));

      // thinking dots
      dotPhase += dt*3; const think = curPers==='thinking';
      for (let d=0; d<3; d++)
        el(`think-dot-${d}`)?.setAttribute('opacity',
          think ? String(clamp(.3+Math.sin(dotPhase-d*1.2)*.5,0,1)) : '0');

      /* ── ARM STATE MACHINE ─────────────────────────────────────────── */
      armT -= dt;
      if (armT <= 0) {
        if      (armMode==='rest')    { armMode='raising'; armTgt=108; armT=0.8; }
        else if (armMode==='raising') { armMode='waving';  armT=3.5+Math.random()*2; }
        else if (armMode==='waving')  { armMode='lowering'; armTgt=8; armT=1.2; }
        else if (armMode==='lowering'){ armMode='rest'; armT=2.5+Math.random()*3; }
      }

      // Rule 5+6: wave target with personality-linked frequency
      const hz = waveHz[curPers] ?? 3.2;
      if (armMode==='waving') armTgt = 108 + Math.sin(t * hz * Math.PI) * 18;

      // Rule 4: float inertia sway at rest
      if (armMode==='rest') armTgt = 8 + bounceV * 0.12;

      // Rule 7+8: snappy raise, slow lower
      const lerpSpd = armMode==='raising' ? 8 : armMode==='lowering' ? 2.8 : 6;
      armAng = lerp(armAng, armTgt, dt*lerpSpd);

      // Rule 9: wrist echo — hand adds gentle extra rotation at wave peaks
      const wristTarget = armMode==='waving' ? Math.sin(t*hz*Math.PI + 0.6)*12 : 0;
      wristEcho = lerp(wristEcho, wristTarget, dt*5);

      // Apply shoulder rotation
      el('left-arm')?.setAttribute('transform', `rotate(${armAng},56,222)`);
      // Wrist group rotates within arm (pivot at wrist position in arm-local space = (56,318))
      el('left-wrist-group')?.setAttribute('transform', `rotate(${wristEcho},56,318)`);

      /* ── RIGHT ARM sip ───────────────────────────────────────────────
         Pure single pivot: Arm stiffly rotates to face (robot style)
         Pivot: 224, 218.
         +125° CW swings the arm up to the mouth.
      ── */
      drinkT -= dt;
      let drinkTgt = 0;
      if (drinkPhase==='idle' && drinkT<=0) drinkPhase = 'up';
      if (drinkPhase==='up')   { drinkTgt=125; if(Math.abs(drinkAng-125)<5){drinkPhase='hold';drinkT=2.2;} }
      if (drinkPhase==='hold') { drinkTgt=125; drinkT-=dt; if(drinkT<=0)drinkPhase='down'; }
      if (drinkPhase==='down') { if(Math.abs(drinkAng)<5){drinkPhase='idle';drinkT=14+Math.random()*6;} }
      
      const dSpd = drinkPhase==='up'?4:2.6;
      drinkAng = lerp(drinkAng, drinkTgt, dt*dSpd);
      
      el('right-arm')?.setAttribute('transform', `rotate(${drinkAng},224,218)`);

      // Counter-rotate hand+cup so they stay upright + tilt toward face during sip
      cupCounterRot = lerp(cupCounterRot, -drinkAng * 0.85, dt*7);
      cupSipTilt    = lerp(cupSipTilt, drinkPhase==='hold'?22:0, dt*4);
      el('cup-group')?.setAttribute('transform',
        `rotate(${cupCounterRot+cupSipTilt},224,320)`);

      // steam
      for (let i=0; i<3; i++) {
        const ph = (t*.65+i*.38)%1, se = el(`steam-${i}`);
        if (se) {
          se.setAttribute('cx', String(204+Math.sin(ph*9+i*1.4)*6));
          se.setAttribute('cy', String(292-ph*32));
          se.setAttribute('r',  String(4*(.5+ph*1.1)));
          se.setAttribute('opacity', String(Math.max(0,ph<.35?(ph/.35)*.7:(1-ph)*.7)));
        }
      }

      // antenna
      const ant = .3+Math.sin(t*2.8)*.4*antL;
      el('antenna-glow')?.setAttribute('opacity', String(clamp(ant*.7,.1,.9)));
      el('antenna-ball')?.setAttribute('r',        String(9+Math.sin(t*2.8)*1.5*antL));

      // sparkles
      SPARKS.forEach((s,i) => {
        s.a += s.spd*dt; const sp = el(`spark-${i}`);
        if (sp) {
          sp.setAttribute('cx', String(150+Math.cos(s.a)*s.rx));
          sp.setAttribute('cy', String(240+Math.sin(s.a)*s.ry+bounceY));
          sp.setAttribute('r',  String(s.r*(.65+Math.sin(t*3+i)*.35)));
          sp.setAttribute('opacity', String(clamp(.2+Math.sin(s.a*2+i)*.3,.02,.6)));
        }
      });

      // bubble
      bubT -= dt;
      if (!bubVis && bubT<=0) {
        bubT = 12+Math.random()*6;
        const c = PERSONALITIES[curPers];
        showBubble(`${c.emoji} ${Math.random()>.5 ? c.phraseBengali : c.phraseEnglish}`);
      }
      if (bubVis) {
        if (bubDir===1)      { bubOp=Math.min(bubOp+dt*3,1); if(bubOp>=1)bubDir=0; }
        else if (bubDir===0) { bubHold-=dt; if(bubHold<=0)bubDir=-1; }
        else                 { bubOp=Math.max(bubOp-dt*2,0); if(bubOp<=0){bubVis=false;bubT=8+Math.random()*5;} }
        el('speech-bubble')?.setAttribute('opacity', String(bubOp));
      } else { el('speech-bubble')?.setAttribute('opacity','0'); }

      el('bot-head')?.setAttribute('transform', `rotate(${headTL*.55},150,130)`);
      rafRef.current = requestAnimationFrame(tick);
    };

    setTimeout(() => setPers('happy'), 400);
    rafRef.current = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(rafRef.current); window.removeEventListener('mousemove', onMouse); };
  }, []);

  /* ── SVG ───────────────────────────────────────────────────────────── */
  return (
    <div style={{ width:320, height:440, overflow:'visible', flexShrink:0, margin:'0 auto' }}>
      <svg ref={svgRef} viewBox="0 0 300 420" xmlns="http://www.w3.org/2000/svg"
        style={{ width:'100%', height:'100%', overflow:'visible' }}>
        <defs>
          <radialGradient id="goldGrad" cx="35%" cy="30%">
            <stop offset="0%"   stopColor="#ffe07a"/><stop offset="55%"  stopColor="#f0c12c"/><stop offset="100%" stopColor="#9a7010"/>
          </radialGradient>
          <radialGradient id="bodyGrad" cx="26%" cy="20%" r="78%">
            <stop offset="0%"   stopColor="#32354e"/><stop offset="50%"  stopColor="#1b1d2c"/><stop offset="100%" stopColor="#090a10"/>
          </radialGradient>
          <radialGradient id="bodyMidGrad" cx="30%" cy="22%">
            <stop offset="0%"   stopColor="#282940c0"/><stop offset="100%" stopColor="#0d0e1a"/>
          </radialGradient>
          <radialGradient id="irisGrad" cx="34%" cy="30%">
            <stop offset="0%"   stopColor="#fff4b0"/><stop offset="52%"  stopColor="#f2c42e"/><stop offset="100%" stopColor="#7e5a08"/>
          </radialGradient>
          <radialGradient id="palmGrad" cx="40%" cy="35%">
            <stop offset="0%"   stopColor="#3a3d58"/><stop offset="100%" stopColor="#16182a"/>
          </radialGradient>
          <linearGradient id="bodyShine" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="white" stopOpacity="0.07"/><stop offset="100%" stopColor="white" stopOpacity="0"/>
          </linearGradient>
          <linearGradient id="bubGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="#181a2a" stopOpacity="0.97"/><stop offset="100%" stopColor="#0d0e18" stopOpacity="0.97"/>
          </linearGradient>
          <filter id="glow"     x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3.5" result="b"/><feComposite in="SourceGraphic" in2="b" operator="over"/></filter>
          <filter id="softGlow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="8"   result="b"/><feComposite in="SourceGraphic" in2="b" operator="over"/></filter>
          <filter id="subtle"   x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2"   result="b"/><feComposite in="SourceGraphic" in2="b" operator="over"/></filter>
          <filter id="bGlow"    x="-15%" y="-15%" width="130%" height="130%"><feGaussianBlur stdDeviation="5"   result="b"/><feComposite in="SourceGraphic" in2="b" operator="over"/></filter>
          <clipPath id="lcl"><ellipse cx="118" cy="116" rx="20" ry="20"/></clipPath>
          <clipPath id="rcl"><ellipse cx="182" cy="116" rx="20" ry="20"/></clipPath>
        </defs>

        {Array.from({length:6},(_,i) => (
          <circle key={i} id={`spark-${i}`} cx="150" cy="240" r="2.5" fill="#f0c12c" opacity="0.3" filter="url(#glow)"/>
        ))}

        {/* Speech bubble */}
        <g id="speech-bubble" opacity="0">
          <rect x="155" y="6" width="140" height="40" rx="13"
            fill="url(#bubGrad)" stroke="#f0c12c" strokeWidth="1.5" filter="url(#bGlow)"/>
          <polygon points="168,46 180,46 172,58" fill="#181a2a" stroke="#f0c12c" strokeWidth="1.2"/>
          <text id="bubble-text" x="225" y="30" textAnchor="middle"
            fontFamily="'Inter',system-ui,sans-serif" fontSize="12" fontWeight="700" fill="#f0c12c">
            Share files!
          </text>
        </g>

        {/* Thinking dots */}
        {[0,1,2].map(d => (
          <circle key={d} id={`think-dot-${d}`} cx={102+d*16} cy={62}
            r="5" fill="#f0c12c" opacity="0" filter="url(#subtle)"/>
        ))}

        <g id="bot-root">

          {/* Floor */}
          <ellipse cx="150" cy="408" rx="60" ry="10" fill="#000" opacity="0.28"/>
          <ellipse cx="150" cy="408" rx="32" ry="5.5" fill="#f0c12c" opacity="0.14" filter="url(#softGlow)"/>

          {/* Legs */}
          <rect x="109" y="300" width="24" height="56" rx="12" fill="url(#bodyGrad)"/>
          <ellipse cx="121" cy="358" rx="18" ry="10" fill="#0d0e18"/>
          <rect x="169" y="300" width="24" height="56" rx="12" fill="url(#bodyGrad)"/>
          <ellipse cx="181" cy="358" rx="18" ry="10" fill="#0d0e18"/>

          {/* Body */}
          <rect x="72" y="192" width="156" height="124" rx="52" fill="url(#bodyGrad)"/>
          <path d="M 100 204 Q 84 228 84 254 Q 84 274 100 288"
            fill="none" stroke="white" strokeWidth="20" strokeLinecap="round" opacity="0.05"/>
          <rect x="100" y="256" width="100" height="9" rx="4.5" fill="url(#goldGrad)" filter="url(#subtle)"/>
          <rect x="108" y="270" width="84"  height="9" rx="4.5" fill="url(#goldGrad)" filter="url(#subtle)"/>
          <rect x="118" y="284" width="64"  height="9" rx="4.5" fill="url(#goldGrad)" filter="url(#subtle)"/>
          <rect x="82" y="196" width="150" height="116" rx="50" fill="url(#bodyShine)"/>

          {/* Left shoulder socket */}
          <circle cx="76" cy="224" r="11" fill="url(#bodyGrad)" stroke="url(#goldGrad)" strokeWidth="2.5"/>
          <circle cx="76" cy="224" r="5"  fill="url(#goldGrad)" opacity="0.6"/>

          {/* ════════════════════════════════════════════════════════════
               LEFT ARM — single pivot at (56, 222)
          ════════════════════════════════════════════════════════════ */}
          <g id="left-arm" style={{ filter: 'drop-shadow(4px 4px 6px rgba(0,0,0,0.5))' }}>
            {/* ── Upper arm tube ── */}
            <rect x="43" y="222" width="26" height="52" rx="13" fill="url(#bodyGrad)"/>
            <rect x="48" y="226" width="8"  height="30" rx="4"  fill="white" opacity="0.07"/>

            {/* ── Elbow joint ── (visual hinge, slightly gold) */}
            <circle cx="56" cy="274" r="14" fill="url(#bodyMidGrad)"/>
            <circle cx="56" cy="274" r="14" fill="none" stroke="url(#goldGrad)" strokeWidth="1.8" opacity="0.55"/>
            <circle cx="56" cy="274" r="6"  fill="url(#bodyGrad)" opacity="0.8"/>

            {/* ── Forearm tube ── */}
            <rect x="43" y="272" width="26" height="50" rx="13" fill="url(#bodyMidGrad)"/>
            <rect x="48" y="276" width="8"  height="28" rx="4"  fill="white" opacity="0.05"/>

            {/* ── WRIST + HAND ── (Restored classic cute robot hand)
                 left-wrist-group rotates ±12° at wrist point (56, 320) */}
            <g id="left-wrist-group">
              {/* Palm */}
              <circle cx="56" cy="320" r="15" fill="url(#bodyGrad)"/>
              <circle cx="56" cy="320" r="15" fill="none" stroke="url(#goldGrad)" strokeWidth="1.5" opacity="0.45"/>
              {/* Cute round fingers */}
              <circle cx="45" cy="327" r="6" fill="#131421"/>
              <circle cx="56" cy="332" r="6" fill="#131421"/>
              <circle cx="67" cy="327" r="6" fill="#131421"/>
              
              {/* Knuckle dots */}
              <circle cx="45" cy="327" r="1.5" fill="url(#goldGrad)" opacity="0.6"/>
              <circle cx="56" cy="332" r="1.5" fill="url(#goldGrad)" opacity="0.6"/>
              <circle cx="67" cy="327" r="1.5" fill="url(#goldGrad)" opacity="0.6"/>
            </g>
          </g>

          {/* Right shoulder socket */}
          <circle cx="224" cy="220" r="11" fill="url(#bodyGrad)" stroke="url(#goldGrad)" strokeWidth="2.5"/>
          <circle cx="224" cy="220" r="5"  fill="url(#goldGrad)" opacity="0.6"/>

          {/* ════ RIGHT ARM — chai sip (Single Pivot Stiff Arm) ════ */}
          <g id="right-arm" style={{ filter: 'drop-shadow(-4px 4px 6px rgba(0,0,0,0.5))' }}>
            {/* Upper arm tube */}
            <rect x="211" y="218" width="26" height="52" rx="13" fill="url(#bodyGrad)"/>
            <rect x="216" y="222" width="8"  height="30" rx="4"  fill="white" opacity="0.07"/>
            {/* Elbow joint */}
            <circle cx="224" cy="272" r="14" fill="url(#bodyMidGrad)"/>
            <circle cx="224" cy="272" r="14" fill="none" stroke="url(#goldGrad)" strokeWidth="1.8" opacity="0.55"/>
            <circle cx="224" cy="272" r="6"  fill="url(#bodyGrad)" opacity="0.75"/>
            
            {/* Forearm tube */}
            <rect x="211" y="270" width="26" height="48" rx="13" fill="url(#bodyMidGrad)"/>
            <rect x="216" y="274" width="8"  height="26" rx="4"  fill="white" opacity="0.05"/>
            
            {/* Wrist Joint base */}
            <circle cx="224" cy="320" r="12" fill="url(#bodyGrad)"/>
            <circle cx="224" cy="320" r="12" fill="none" stroke="url(#goldGrad)" strokeWidth="1.2" opacity="0.4"/>

            {/* ── HAND & CUP GROUP (Counter-rotates as one unit) ── */}
            <g id="cup-group">
              {/* 1. CUP (shifted left so handle aligns with hand) */}
              <path d="M 190 298 L 194 330 L 214 330 L 218 298 Z" fill="url(#goldGrad)"/>
              <ellipse cx="204" cy="298" rx="14" ry="4.5" fill="#ffe07a"/>
              {/* Tea */}
              <ellipse cx="204" cy="300" rx="12" ry="3.5" fill="#3a1a05" opacity="0.95"/>
              {/* Shine */}
              <path d="M 193 300 L 195 328" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.15"/>
              
              {/* Handle (extends right into the hand grip at x=224) */}
              <path d="M 218 306 Q 234 306 234 316 Q 234 326 216 326" 
                fill="none" stroke="#e0a810" strokeWidth="5.5" strokeLinecap="round"/>

              {/* Steam dots */}
              <circle id="steam-0" cx="200" cy="288" r="4"   fill="white" opacity="0"/>
              <circle id="steam-1" cx="206" cy="284" r="3.5" fill="white" opacity="0"/>
              <circle id="steam-2" cx="212" cy="288" r="3"   fill="white" opacity="0"/>

              {/* 2. HAND (Drawn OVER the handle, implying a grip) */}
              <circle cx="224" cy="320" r="15" fill="url(#bodyGrad)"/>
              <circle cx="224" cy="320" r="15" fill="none" stroke="url(#goldGrad)" strokeWidth="1.5" opacity="0.45"/>
              
              {/* Fingers wrapping the handle */}
              <circle cx="213" cy="327" r="5" fill="#131421"/>
              <circle cx="224" cy="332" r="5" fill="#131421"/>
              <circle cx="235" cy="327" r="5" fill="#131421"/>
              
              {/* Knuckles */}
              <circle cx="213" cy="327" r="1.5" fill="url(#goldGrad)" opacity="0.6"/>
              <circle cx="224" cy="332" r="1.5" fill="url(#goldGrad)" opacity="0.6"/>
              <circle cx="235" cy="327" r="1.5" fill="url(#goldGrad)" opacity="0.6"/>
            </g>
          </g>

          {/* ── HEAD ── */}
          <g id="bot-head">
            <path d="M 80 132 C 80 40 220 40 220 132 L 220 178 Q 150 204 80 178 Z" fill="url(#bodyGrad)"/>
            <path d="M 98 74 Q 84 100 84 128" fill="none" stroke="white" strokeWidth="16" strokeLinecap="round" opacity="0.055"/>
            <rect x="118" y="174" width="64" height="26" rx="9" fill="url(#bodyGrad)"/>
            <rect x="88" y="84" width="124" height="82" rx="36" fill="#04040e"/>
            <rect x="88" y="84" width="124" height="82" rx="36" fill="none" stroke="url(#goldGrad)" strokeWidth="3.5"/>
            <path d="M 96 94 Q 91 112 92 127" fill="none" stroke="white" strokeWidth="8" strokeLinecap="round" opacity="0.08"/>
            <g id="left-eye-g">
              <circle cx="118" cy="116" r="22" fill="#020209"/>
              <circle id="left-eye-ring" cx="118" cy="116" r="22" fill="none" stroke="#f0c12c" strokeWidth="2.5" filter="url(#glow)" opacity="0.55"/>
              <circle cx="118" cy="116" r="17" fill="url(#irisGrad)" filter="url(#subtle)" clipPath="url(#lcl)"/>
              <circle id="left-pupil" cx="118" cy="116" r="9" fill="#010105" clipPath="url(#lcl)"/>
              <circle cx="125" cy="110" r="5"   fill="white" opacity="0.92" clipPath="url(#lcl)"/>
              <circle cx="129" cy="114" r="2.2" fill="white" opacity="0.6"  clipPath="url(#lcl)"/>
            </g>
            <g id="right-eye-g">
              <circle cx="182" cy="116" r="22" fill="#020209"/>
              <circle id="right-eye-ring" cx="182" cy="116" r="22" fill="none" stroke="#f0c12c" strokeWidth="2.5" filter="url(#glow)" opacity="0.55"/>
              <circle cx="182" cy="116" r="17" fill="url(#irisGrad)" filter="url(#subtle)" clipPath="url(#rcl)"/>
              <circle id="right-pupil" cx="182" cy="116" r="9" fill="#010105" clipPath="url(#rcl)"/>
              <circle cx="189" cy="110" r="5"   fill="white" opacity="0.92" clipPath="url(#rcl)"/>
              <circle cx="193" cy="114" r="2.2" fill="white" opacity="0.6"  clipPath="url(#rcl)"/>
            </g>
            <path d="M 125 152 Q 150 170 175 152" fill="none" stroke="url(#goldGrad)" strokeWidth="5" strokeLinecap="round"/>
            <circle id="blush-left"  cx="93"  cy="144" r="15" fill="#e04040" opacity="0.25"/>
            <circle id="blush-right" cx="207" cy="144" r="15" fill="#e04040" opacity="0.25"/>
          </g>

          {/* Antenna */}
          <line x1="150" y1="42" x2="150" y2="14" stroke="#1e2035" strokeWidth="6.5" strokeLinecap="round"/>
          <circle id="antenna-ball" cx="150" cy="12" r="9" fill="url(#goldGrad)" filter="url(#glow)"/>
          <circle id="antenna-glow" cx="150" cy="12" r="20" fill="#f0c12c" opacity="0.4" filter="url(#softGlow)"/>

        </g>
      </svg>
    </div>
  );
}
