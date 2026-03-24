const fs = require('fs');
const file = 'server/routes/downloader.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
    /async function fetchSmartMetadata\(url: string\): Promise<any> \{/,
    `async function fetchSmartMetadata(url: string, forceEngine?: string): Promise<any> {`
);

code = code.replace(
    /if \(metaCache\.has\(url\)\) \{/,
    `if (!forceEngine && metaCache.has(url)) {`
);

code = code.replace(
    /\/\/ 1\. FAST PATH: Hetzner Node Bypass \(Cobalt\)\r?\n\s*\/\/ Instantly resolves direct URL without timing out\r?\n\s*try \{/,
    `// 1. FAST PATH: Hetzner Node Bypass (Cobalt)\n    // Instantly resolves direct URL without timing out\n    if (!forceEngine || forceEngine === "layer1") {\n    try {`
);

code = code.replace(
    /\s*console\.log\(`\[Phase 0\] Hetzner Node bypass failed: \$\{err\.message\}\. Moving to next layer\.\.\.`\);\r?\n\s*\}/,
    `\n        console.log(\`[Phase 0] Hetzner Node bypass failed: \${err.message}. Moving to next layer...\`);\n        if (forceEngine === "layer1") throw new Error("Layer 1 (Hetzner) forced, but failed: " + err.message);\n    }\n    }`
);

code = code.replace(
    /if \(url\.includes\("instagram\.com"\) \|\| url\.includes\("facebook\.com"\) \|\| url\.includes\("fb\.watch"\)\) \{/,
    `if (!forceEngine || forceEngine === "layer2") {\n    if (forceEngine === "layer2" || url.includes("instagram.com") || url.includes("facebook.com") || url.includes("fb.watch")) {`
);

code = code.replace(
    /\s*console\.log\(`\[Layer 2\] Ghost Layer fully bypassed\. Falling back to yt-dlp\.\.\.`\);\r?\n\s*\}/,
    `\n        console.log(\`[Layer 2] Ghost Layer fully bypassed. Falling back to yt-dlp...\`);\n        if (forceEngine === "layer2") throw new Error("Layer 2 (Ghost Mirror) forced, but all mirrors failed.");\n    }\n    }`
);

code = code.replace(
    /\/\/ 2\. FALLBACK PATH: yt-dlp extract via Proxy \/ Render\r?\n\s*try \{/,
    `// 2. FALLBACK PATH: yt-dlp extract via Proxy / Render\n    if (!forceEngine || forceEngine === "layer3") {\n    try {`
);

code = code.replace(
    /\s*throw new Error\(`Total engine failure: \$\{engineErr\.message\}`\);\r?\n\s*\}/,
    `\n        throw new Error(\`Total engine failure: \${engineErr.message}\`);\n    }\n    } else {\n        throw new Error(\`Forced engine '\${forceEngine}' failed or was not matched.\`);\n    }`
);

code = code.replace(
    /const info = await fetchSmartMetadata\(validated\.url\);/,
    `const forceEngine = (req.query.forceEngine as string) || undefined;\n    const info = await fetchSmartMetadata(validated.url, forceEngine);`
);

fs.writeFileSync(file, code);
console.log("Patched server/routes/downloader.ts!");
