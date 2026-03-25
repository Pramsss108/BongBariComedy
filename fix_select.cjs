
const fs = require("fs");

let code = fs.readFileSync("client/src/pages/SocialDownloaderPage.tsx", "utf-8");

const regex = /<select\s+value=\{forceEngine\}[\s\S]*?<\/select>/;

const newSelect = `<select
                      value={forceEngine}
                      onChange={(e) => setForceEngine(e.target.value)}
                      className="bg-[#0f0f11] border border-white/10 text-white/90 py-1 px-2 rounded outline-none cursor-pointer hover:bg-black transition-colors"
                    >
                      <option className="bg-[#0f0f11] text-white font-semibold" value="auto">?? Smart Auto-Fallback (Production Default)</option>
                      
                      <optgroup label="?? Meta (Instagram / Facebook)" className="text-pink-400 bg-black/90 italic font-semibold">
                        <option className="bg-[#0f0f11] text-yellow-500 not-italic" value="layer1_meta">? FREE [VARIABLE]: Layer 1 - Hetzner Cobalt</option>
                        <option className="bg-[#0f0f11] text-slate-600 not-italic" value="layer2_meta" disabled>?? SKIPPED: Layer 2 - CF Swarm (Datacenter Blocked)</option>
                        <option className="bg-[#0f0f11] text-slate-600 not-italic" value="layer3_meta" disabled>?? SKIPPED: Layer 3 - Native IPv6 (YT Only)</option>
                        <option className="bg-[#0f0f11] text-slate-600 not-italic" value="layer4_meta" disabled>?? SKIPPED: Layer 4 - YTDL-Core Spoofer (YT Only)</option>
                        <option className="bg-[#0f0f11] text-slate-600 not-italic" value="layer5_meta" disabled>?? SKIPPED: Layer 5 - Future Expansion</option>
                        <option className="bg-[#0f0f11] text-red-500 font-bold not-italic" value="layer6">?? PAID [WORKING]: Layer 6 - ASocks Residential ($0.003)</option>
                      </optgroup>

                      <optgroup label="?? YouTube" className="text-red-500 bg-black/90 italic font-semibold">
                        <option className="bg-[#0f0f11] text-yellow-500 not-italic" value="layer1">? FREE [WORKING]: Layer 1 - Hetzner Cobalt (Fast)</option>
                        <option className="bg-[#0f0f11] text-green-400 not-italic" value="layer2">?? FREE [WORKING]: Layer 2 - CF Swarm Edge</option>
                        <option className="bg-[#0f0f11] text-orange-400 not-italic" value="layer3">?? FREE [BUILDING]: Layer 3 - Native IPv6 Direct</option>
                        <option className="bg-[#0f0f11] text-green-400 not-italic" value="layer4">?? FREE [WORKING]: Layer 4 - YTDL-Core Spoofer</option>
                        <option className="bg-[#0f0f11] text-slate-600 not-italic" value="layer5_yt" disabled>?? SKIPPED: Layer 5 - Future Expansion</option>
                        <option className="bg-[#0f0f11] text-slate-600 not-italic" value="layer6_yt" disabled>?? SKIPPED: Layer 6 - ASocks (Unnecessary)</option>
                      </optgroup>
                    </select>`;

code = code.replace(regex, newSelect);
fs.writeFileSync("client/src/pages/SocialDownloaderPage.tsx", code);
console.log("Updated Dev Dropdown!");

