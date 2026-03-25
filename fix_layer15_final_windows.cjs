const fs = require('fs');
let code = fs.readFileSync('server/routes/downloader.ts', 'utf8');

const regex = /\/+\s*={50,}?\r?\n\s*\/\/ LAYER 2 GHOST BYPASS \(META\/INSTAGRAM\)\r?\n\s*\/\/ ={50,}?\r?\n\s*if \(\(isMeta/g;

if (!code.match(regex)) {
    console.log("Regex couldn't match the start of Layer 2");
} else if (code.includes("LAYER 1.5: FAST HETZNER COBALT FOR META")) {
    console.log("Already added Layer 1.5");
} else {
    code = code.replace(regex, (match) => {
        return `// =========================================================================
      // V14.5 LAYER 1.5: FAST HETZNER COBALT FOR META (Experimental / Safe Fallback)
      // =========================================================================
      if (isMeta && (!forceEngine || forceEngine === "layer1")) {
          try {
              console.log(\`[Layer 1.5] Meta detected. Attempting fast internal Hetzner Cobalt resolve (Phase 1) safely...\`);
              const vpsNode = getNextPreviewNode();
              const payload = JSON.stringify({ url: validated.url, vQuality: "720", isAudioOnly: chosen.isAudio });
              
              const vpsRes = await fetch(vpsNode, {
                  method: "POST",
                  headers: { "Content-Type": "application/json", "Accept": "application/json" },
                  body: payload,
                  signal: AbortSignal.timeout(3500) // Fast 3.5s timeout. If it hangs, we instantly fallback!
              });
              
              if (vpsRes.ok) {
                  const json = await vpsRes.json();
                  if (json.url) {
                      console.log(\`[Layer 1.5 SUCCESS] Hetzner successfully extracted Meta link! Redirecting...\`);
                      res.redirect(302, json.url);
                      return;
                  }
              }
              throw new Error("Hetzner returned ok but missing url in payload");
          } catch(e: any) {
              console.log(\`[Layer 1.5] Hetzner Meta bypass failed (\${e.message}), cleanly falling back to Layer 2 Ghost Nodes...\`);
              if (forceEngine === "layer1") { // If explicitly forced to Layer 1, don't fall back, just crash here as requested.
                  if (!res.headersSent) res.status(422).json({ error: "Layer 1 forced, but Hetzner failed for Meta: " + e.message });
                  return;
              }
          }
      }

      ` + match;
    });
    fs.writeFileSync('server/routes/downloader.ts', code);
    console.log("Successfully injected Layer 1.5!");
}