const fs = require('fs');
let content = fs.readFileSync('client/src/components/TrimSlider.tsx', 'utf-8');
content = content.replace(/\r\n/g, '\n');

// replace hover video ref setup
content = content.replace(
  'const [hoverPct, setHoverPct] = useState<number | null>(null);',
  'const [hoverPct, setHoverPct] = useState<number | null>(null);\n\n  // Sync hover thumbnail video realtime\n  useEffect(() => {\n    if (hoverVideoRef.current && hoverPct !== null && duration > 0) {\n      if (hoverVideoRef.current.readyState >= 1) {\n        hoverVideoRef.current.currentTime = (hoverPct / 100) * duration;\n      }\n    }\n  }, [hoverPct, duration]);'
);

content = content.replace(
  'const containerRef = useRef<HTMLDivElement>(null);\n  const playheadRef = useRef<HTMLDivElement>(null);',
  'const containerRef = useRef<HTMLDivElement>(null);\n  const hoverVideoRef = useRef<HTMLVideoElement>(null);\n  const playheadRef = useRef<HTMLDivElement>(null);'
);

// remove frames render in track
content = content.replace(
  /\{frames\.length > 0 && frames\.map\(\(f, i\) => \([\s\S]*?<img key=\{i\} src=\{f\}.*? alt=\"\" \/>[\s\S]*?\)\)\}/g,
  ''
);

content = content.replace(
  /\{frames\.length > 0 && \([\s\S]*?<img[\s\S]*?alt=\"\"[\s\S]*?\/>[\s\S]*?\)\}/g,
  '{videoUrl ? (\n                <video\n                  ref={hoverVideoRef}\n                  src={videoUrl}\n                  muted\n                  playsInline\n                  crossOrigin="anonymous"\n                  className="w-32 h-[72px] object-cover border-b border-white/10"\n                />\n              ) : null}'
);

content = content.replace(
  /className=\"timeline-track bg-white\/10 overflow-hidden flex\"/g,
  'className="timeline-track bg-[#1e1e1e] overflow-hidden flex rounded-md ring-1 ring-white/10"'
);

content = content.replace(
  /\/\/ Phase 11: Frame Extraction state[\s\S]*?extractFrames\(\)\.catch\(console\.error\);\s*return \(\) => \{ isMounted = false; \};\s*\}, \[videoUrl, duration\]\);/g,
  ''
);

fs.writeFileSync('client/src/components/TrimSlider.tsx', content);
