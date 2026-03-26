const fs = require('fs');
const filepath = 'client/src/pages/SocialDownloaderPage.tsx';
let source = fs.readFileSync(filepath, 'utf8');

// Add variables near url state
if (!source.includes('const isYouTubeUrl = url.includes')) {
  source = source.replace('const [url, setUrl] = useState("");', 'const [url, setUrl] = useState("");\n  const isYouTubeUrl = url.includes("youtube.com") || url.includes("youtu.be");\n  const isMetaUrl = url.includes("instagram.com") || url.includes("facebook.com") || url.includes("fb.watch");');
}

const oldSelect = source.substring(source.indexOf('{/* Developer Engine'), source.indexOf('</div>\n\n\n\n\n') + 6);

const newSelect = \{/* Developer Engine Override */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2 opacity-50 hover:opacity-100 transition-opacity">
                      <span>?? Developer Engine Override:</span>
                      <select
                        value={forceEngine}
                        onChange={(e) => setForceEngine(e.target.value)}
                        className="bg-[#0f0f11] border border-white/10 text-white/90 py-1 px-2 rounded outline-none cursor-pointer hover:bg-black transition-colors"
                      >
                        <option className="bg-[#0f0f11] text-white font-semibold" value="auto">?? Smart Auto-Fallback (Production Default)</option>
                        
                        <option className={\g-[#0f0f11] text-yellow-500\} value="layer1">
                          ?? Layer 1: Hetzner Cobalt \
                        </option>
                        
                        <option className={\g-[#0f0f11] \\} value="layer2" disabled={isMetaUrl}>
                          ??? Layer 2: CF Swarm \
                        </option>
                        
                        <option className={\g-[#0f0f11] \\} value="layer3" disabled={isMetaUrl}>
                          ?? Layer 3: Native IPv6 \
                        </option>

                        <option className={\g-[#0f0f11] \\} value="layer4" disabled={isMetaUrl}>
                          ?? Layer 4: YTDL-Core Spoofer \
                        </option>

                        <option className="bg-[#0f0f11] text-slate-600/50" value="layer5" disabled>
                          ?? Layer 5: Future Expansion (Skipped)
                        </option>

                        <option className={\g-[#0f0f11] \\} value="layer6" disabled={isYouTubeUrl}>
                          ?? Layer 6: ASocks Residential \
                        </option>
                      </select>
                    </div>\;

source = source.replace(oldSelect, newSelect);
fs.writeFileSync(filepath, source);
console.log("Patched");
