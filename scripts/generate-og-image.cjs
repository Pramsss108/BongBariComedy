const sharp = require('sharp');

const svg = `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#09090b"/>
      <stop offset="100%" stop-color="#0f0f13"/>
    </linearGradient>
    <radialGradient id="glow1" cx="25%" cy="40%" r="55%">
      <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#09090b" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glow2" cx="85%" cy="70%" r="40%">
      <stop offset="0%" stop-color="#7c3aed" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#09090b" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="logoBox" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#d97706"/>
    </linearGradient>
    <linearGradient id="border" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.9"/>
      <stop offset="50%" stop-color="#7c3aed" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="#f59e0b" stop-opacity="0.1"/>
    </linearGradient>
    <linearGradient id="cta" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#fbbf24"/>
    </linearGradient>
    <linearGradient id="ctaText" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#fcd34d"/>
      <stop offset="100%" stop-color="#f59e0b"/>
    </linearGradient>
  </defs>

  <!-- Base background -->
  <rect width="1200" height="630" fill="url(#bg)"/>

  <!-- Glow overlays -->
  <ellipse cx="300" cy="252" rx="420" ry="340" fill="url(#glow1)"/>
  <ellipse cx="1020" cy="441" rx="340" ry="260" fill="url(#glow2)"/>

  <!-- Subtle grid lines -->
  <g stroke="rgba(255,255,255,0.03)" stroke-width="1">
    <line x1="0" y1="105" x2="1200" y2="105"/>
    <line x1="0" y1="210" x2="1200" y2="210"/>
    <line x1="0" y1="315" x2="1200" y2="315"/>
    <line x1="0" y1="420" x2="1200" y2="420"/>
    <line x1="0" y1="525" x2="1200" y2="525"/>
    <line x1="200" y1="0" x2="200" y2="630"/>
    <line x1="400" y1="0" x2="400" y2="630"/>
    <line x1="600" y1="0" x2="600" y2="630"/>
    <line x1="800" y1="0" x2="800" y2="630"/>
    <line x1="1000" y1="0" x2="1000" y2="630"/>
  </g>

  <!-- Top amber accent bar -->
  <rect x="0" y="0" width="1200" height="4" fill="url(#border)"/>

  <!-- ─── Logo icon box ─── -->
  <rect x="72" y="148" width="104" height="104" rx="26" fill="url(#logoBox)" opacity="0.95"/>
  <!-- Lightning bolt vector path (bold) -->
  <text x="124" y="220" font-family="Arial,sans-serif" font-size="60" font-weight="900"
        text-anchor="middle" fill="#09090b">&#9889;</text>
  <!-- Subtle glow ring around logo -->
  <rect x="68" y="144" width="112" height="112" rx="30" fill="none" stroke="#f59e0b" stroke-width="1.5" opacity="0.4"/>

  <!-- ─── FREE TOOL badge ─── -->
  <rect x="72" y="96" width="100" height="30" rx="15" fill="rgba(245,158,11,0.15)"
        stroke="rgba(245,158,11,0.5)" stroke-width="1"/>
  <text x="122" y="116" font-family="Arial Black,Arial,sans-serif" font-size="11" font-weight="900"
        text-anchor="middle" fill="#f59e0b" letter-spacing="2">FREE TOOL</text>

  <!-- ─── Main headline line 1 ─── -->
  <text x="72" y="320" font-family="Arial Black,Arial,sans-serif" font-size="72" font-weight="900"
        fill="#ffffff" letter-spacing="-2">AI Text</text>

  <!-- ─── Main headline line 2 — amber gradient ─── -->
  <text x="72" y="406" font-family="Arial Black,Arial,sans-serif" font-size="72" font-weight="900"
        fill="url(#ctaText)" letter-spacing="-2">Humanizer</text>

  <!-- ─── Sub headline ─── -->
  <text x="72" y="452" font-family="Arial,sans-serif" font-size="21" font-weight="400"
        fill="rgba(255,255,255,0.5)">Beats ZeroGPT &#183; TurnItIn &#183; GPTZero &#8212; instantly</text>

  <!-- ─── Feature pills ─── -->
  <rect x="72" y="484" width="153" height="38" rx="19" fill="rgba(245,158,11,0.1)"
        stroke="rgba(245,158,11,0.4)" stroke-width="1"/>
  <text x="148" y="508" font-family="Arial,sans-serif" font-size="13" font-weight="700"
        text-anchor="middle" fill="#fcd34d">&#10003; 100% Human</text>

  <rect x="238" y="484" width="140" height="38" rx="19" fill="rgba(124,58,237,0.1)"
        stroke="rgba(124,58,237,0.4)" stroke-width="1"/>
  <text x="308" y="508" font-family="Arial,sans-serif" font-size="13" font-weight="700"
        text-anchor="middle" fill="#c4b5fd">&#10003; No Sign-up</text>

  <rect x="392" y="484" width="153" height="38" rx="19" fill="rgba(16,185,129,0.1)"
        stroke="rgba(16,185,129,0.4)" stroke-width="1"/>
  <text x="468" y="508" font-family="Arial,sans-serif" font-size="13" font-weight="700"
        text-anchor="middle" fill="#6ee7b7">&#10003; Free Forever</text>

  <!-- ─── Right decorative orb ─── -->
  <!-- Outer rings -->
  <circle cx="950" cy="315" r="228" fill="none" stroke="rgba(245,158,11,0.06)" stroke-width="1"/>
  <circle cx="950" cy="315" r="183" fill="none" stroke="rgba(245,158,11,0.10)" stroke-width="1"/>
  <circle cx="950" cy="315" r="138" fill="rgba(245,158,11,0.04)"
          stroke="rgba(245,158,11,0.20)" stroke-width="1.5"/>
  <!-- Center lightning bolt -->
  <text x="950" y="360" font-family="Arial,sans-serif" font-size="100"
        text-anchor="middle" fill="url(#cta)" opacity="0.85">&#9889;</text>

  <!-- Orbiting dots -->
  <circle cx="950" cy="87" r="6" fill="#f59e0b" opacity="0.75"/>
  <circle cx="1178" cy="315" r="5" fill="#7c3aed" opacity="0.65"/>
  <circle cx="950" cy="543" r="6" fill="#f59e0b" opacity="0.55"/>
  <circle cx="722" cy="315" r="4" fill="#7c3aed" opacity="0.45"/>
  <!-- accent dots -->
  <circle cx="1100" cy="160" r="3.5" fill="#fbbf24" opacity="0.55"/>
  <circle cx="800"  cy="163" r="2.5" fill="#a78bfa" opacity="0.55"/>
  <circle cx="800"  cy="467" r="3.5" fill="#fbbf24" opacity="0.45"/>
  <circle cx="1100" cy="470" r="2.5" fill="#a78bfa" opacity="0.45"/>

  <!-- Divider line between left and right content -->
  <line x1="620" y1="60" x2="620" y2="570" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>

  <!-- ─── CTA arrow button hint ─── -->
  <rect x="72" y="554" width="200" height="46" rx="23" fill="url(#cta)" opacity="0.92"/>
  <text x="172" y="582" font-family="Arial Black,Arial,sans-serif" font-size="15" font-weight="900"
        text-anchor="middle" fill="#09090b" letter-spacing="0.5">Try It Free &#10142;</text>

  <!-- ─── Brand ─── -->
  <text x="1128" y="599" font-family="Arial,sans-serif" font-size="15" font-weight="600"
        text-anchor="end" fill="rgba(255,255,255,0.18)" letter-spacing="1">bongbari.com</text>

  <!-- Bottom accent bar -->
  <rect x="0" y="626" width="1200" height="4" fill="url(#border)"/>
</svg>`;

sharp(Buffer.from(svg))
  .png({ quality: 95, compressionLevel: 7 })
  .toFile('client/public/humanizer-og.png')
  .then(info => console.log('✅ Generated humanizer-og.png: ' + info.width + 'x' + info.height))
  .catch(err => { console.error('❌ Error:', err.message); process.exit(1); });
