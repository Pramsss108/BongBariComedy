const fs = require('fs');
let code = fs.readFileSync('server/routes/downloader.ts', 'utf8');

// 1. Fix isYT and isMeta rules for locking
const regex1 = /\/\/ 10 minute timeout.*?try\s*\{.*?(?:const isMeta[^\n]*\n)/s;
const replace1 = `// 10 minute timeout (increased for 4K remuxing)
  req.socket.setTimeout(600_000);

  try {
      const forceEngine = (req.query.forceEngine as string) || undefined;
      const isYT = validated.url.includes("youtube.com") || validated.url.includes("youtu.be");
      const isMeta = validated.url.includes("instagram.com") || validated.url.includes("facebook.com") || validated.url.includes("fb.watch");
`;
code = code.replace(regex1, replace1);

// 2. Fix Layer 2 Bypass logic
const regex2 = /\/\/ LAYER 2 GHOST BYPASS \(META\/INSTAGRAM\)\s*\n\s*\/\/ =========================================================================\s*\n\s*if \(isMeta\)/s;
const replace2 = `// LAYER 2 GHOST BYPASS (META/INSTAGRAM)
      // =========================================================================
      if ((isMeta && !forceEngine) || forceEngine === "layer2")`;
code = code.replace(regex2, replace2);

// 3. Fix Phase 2 YouTube Bypass logic
const regex3 = /\/\/ V14 SERVERLESS YOUTUBE STREAMING BYPASS\s*\n\s*\/\/ Since Render IPs are totally tarpitted by BotGuard scraping, we MUST\s*\n\s*\/\/ resolve the exact CDN link using native node crypto, then 302 redirect\s*\n\s*\/\/ the client so their own residential IP downloads from Google directly\.\s*\n\s*\/\/ =========================================================================\s*\n\s*if \(isYT\)/s;
const replace3 = `// V14 SERVERLESS YOUTUBE STREAMING BYPASS
      // Since Render IPs are totally tarpitted by BotGuard scraping, we MUST
      // resolve the exact CDN link using native node crypto, then 302 redirect
      // the client so their own residential IP downloads from Google directly.
      // =========================================================================
      if ((isYT && !forceEngine) || forceEngine === "layer1")`;
code = code.replace(regex3, replace3);

// 4. Disable fast-path directly for forced engines or missing split tracks
const regex4 = /if \(!requiresTempFile\) \{/s;
const replace4 = `if (!requiresTempFile && !forceEngine) {`;
code = code.replace(regex4, replace4);

// 5. Fix isSplitTrack bug
const regex5 = /const isSplitTrack = data\.acodec === 'none' \|\| data\.vcodec === 'none';/g;
const replace5 = `const isSplitTrack = !data.acodec || data.acodec === 'none' || data.vcodec === 'none';`;
code = code.replace(regex5, replace5);

// 6. Support forceEngine in fetchSmartMetadata
const regex6 = /async function fetchSmartMetadata\(url: string\): Promise<any> \{/s;
const replace6 = `async function fetchSmartMetadata(url: string, forceEngine?: string): Promise<any> {`;
code = code.replace(regex6, replace6);

const regex7 = /if \(!forceEngine && metaCache\.has\(url\)\) \{/s;
// wait, the signature in old code is: `if (metaCache.has(url)) {`
const regex8 = /if \(metaCache\.has\(url\)\) \{/s;
const replace8 = `if (!forceEngine && metaCache.has(url)) {`;
code = code.replace(regex8, replace8);

// Update fetchSmartMetadata internal routing, we'll just allow it to execute normally if forceEngine isn't mapped, but wait, the prompt says "is bypassing to 1".
// If fetchSmartMetadata is bypassing, it doesn't matter for fetching metadata, but maybe it matters if we override `fetchSmartMetadata(validated.url)`. Wait, it's ALREADY `fetchSmartMetadata(validated.url, forceEngine)`. But signature is wrong.
// If Layer 3 is forced, metadata should ideally use Layer 3 proxy? No, metadata can use Layer 1 proxy (Hetzner) freely because metadata isn't IP-locked! Cobalt Node can fetch YouTube metadata. So `fetchSmartMetadata` using whatever engine is fine?
// But user says: "every layer shoudl locak". If `forceEngine === "layer3"`, `fetchSmartMetadata` should use `executeYtDlpExtract(url)` with proxy!
// The current `fetchSmartMetadata` just does `executeYtDlpExtract(url)` globally.
// Oh wait! `fetchSmartMetadata` calls `executeYtDlpExtract(url)` directly! It ALWAYS uses Layer 3 Proxy!
// Let me verify this line: "const data = await executeYtDlpExtract(url);"

fs.writeFileSync('server/routes/downloader.ts', code);
console.log("Patched clean!");
