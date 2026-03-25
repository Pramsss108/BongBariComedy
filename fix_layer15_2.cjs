const fs = require('fs');
let code = fs.readFileSync('server/routes/downloader.ts', 'utf8');

const layer2Marker = `      // =========================================================================\n      // LAYER 2 GHOST BYPASS (META/INSTAGRAM)\n      // =========================================================================\n      if ((isMeta && !forceEngine) || forceEngine === "layer2") {`;

const layer15 = `      // =========================================================================
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
                  res.status(422).json({ error: "Layer 1 forced, but Hetzner failed for Meta: " + e.message });
                  return;
              }
          }
      }

` + layer2Marker;

if(code.includes('V14.5 LAYER 1.5')) {
    console.log("Already patched Layer 1.5");
} else if (code.includes('// LAYER 2 GHOST BYPASS (META/INSTAGRAM)')) {
    code = code.replace(layer2Marker, layer15);
    console.log("Added Layer 1.5");
} else {
    console.log("Could not find layer 2 marker");
}

fs.writeFileSync('server/routes/downloader.ts', code);
