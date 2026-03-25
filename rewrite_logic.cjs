const fs = require('fs');

let code = fs.readFileSync('server/routes/downloader.ts', 'utf8');

// 1. First standardize the function names back to correct semantic numbers
code = code.replace(/async function executePhase6_ASocks/g, 'async function executePhase6_ASocks_Ultimate');
code = code.replace(/async function executePhase4_YTDL/g, 'async function executePhase4_YTDLCore');

// 2. Fix the manual forced engine routes
code = code.replace(/if \(forceEngine === "layer4"\) {\s*const result = await execute[^\(]+\(url\);\s*metaCache\.set[^}]+return result;\s*}/g,
`if (forceEngine === "layer4") {
          const result = await executePhase4_YTDLCore(url);
          metaCache.set(url, { data: result, expires: Date.now() + 60000 });
          return result;
      }`);

code = code.replace(/if \(forceEngine === "layer6"\) {\s*const result = await execute[^\(]+\(url\);\s*metaCache\.set[^}]+return result;\s*}/g,
`if (forceEngine === "layer6") {
          const result = await executePhase6_ASocks_Ultimate(url);
          metaCache.set(url, { data: result, expires: Date.now() + 60000 });
          return result;
      }`);

// 3. Completely rewrite the Auto-Fallback cascade block cleanly!
const cascadeRegex = /\/\/ ==========================================\n\s*\/\/ SMART AUTO-FALLBACK CASCADE\n\s*\/\/ ==========================================\n\s*if \(\!forceEngine \|\| forceEngine === "auto"\) \{[\s\S]*?throw new Error\(\`Total engine failure after 6 layers:[^\`]+\`\);\n\s*\}\n\s*\}\n\s*\}\n\s*\}\n\s*\}\n\s*\}\n\s*\}/;

const newCascade = `// ==========================================
      // SMART AUTO-FALLBACK CASCADE
      // ==========================================
      if (!forceEngine || forceEngine === "auto") {
          try {
              const res1 = await executePhase1_HetznerCobalt(url);
              metaCache.set(url, { data: res1, expires: Date.now() + CACHE_TTL_MS });
              return res1;
          } catch (e1: any) {
              console.log(\`[Smart Fallback] Phase 1 failed (\${e1.message}), cascading to Phase 2...\`);
              try {
                  const res2 = await executePhase2_CFSwarm(url);
                  metaCache.set(url, { data: res2, expires: Date.now() + 60000 });
                  return res2;
              } catch (e2: any) {
                  console.log(\`[Smart Fallback] Phase 2 failed (\${e2.message}), cascading to Phase 3...\`);
                  try {
                      const res3 = await executePhase3_HetznerIPv6(url);
                      metaCache.set(url, { data: res3, expires: Date.now() + 60000 });
                      return res3;
                  } catch (e3: any) {
                      console.log(\`[Smart Fallback] Phase 3 failed (\${e3.message}), cascading to Phase 4 (YTDL-Core Free)...\`);
                      try {
                          const res4 = await executePhase4_YTDLCore(url);
                          metaCache.set(url, { data: res4, expires: Date.now() + 60000 });
                          return res4;
                      } catch (e4: any) {
                          console.log(\`[Smart Fallback] Phase 4 failed (\${e4.message}), skipping Phase 5, natively cascading to Phase 6 (ASocks Paid)...\`);
                          try {
                              const res6 = await executePhase6_ASocks_Ultimate(url);
                              metaCache.set(url, { data: res6, expires: Date.now() + 60000 });
                              return res6;
                          } catch (e6: any) {
                              throw new Error(\`Total engine failure after all layers (including Paid ASocks): \${e6.message}\`);
                          }
                      }
                  }
              }
          }
      }`;

code = code.replace(cascadeRegex, newCascade);

fs.writeFileSync('server/routes/downloader.ts', code);
console.log("Rewrote TS file cleanly so Phase 4 is Free YTDL and Phase 6 is Paid ASocks waterfall.");