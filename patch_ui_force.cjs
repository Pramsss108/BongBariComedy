const fs = require('fs');
const file = 'client/src/pages/SocialDownloaderPage.tsx';
let code = fs.readFileSync(file, 'utf8');

if (!code.includes('const [forceEngine,')) {
    code = code.replace(
        /const \[url, setUrl\] = useState\(""\);/,
        `const [url, setUrl] = useState("");\n  const [forceEngine, setForceEngine] = useState<string>("auto");`
    );
}

// Modify the API request URL:
code = code.replace(
    /const res = await apiRequest\(`\/api\/downloader\/info\?url=\$\{encodeURIComponent\(url\)\}`\);/,
    `const forceParam = forceEngine !== "auto" ? \`&forceEngine=\${forceEngine}\` : "";\n      const res = await apiRequest(\`/api/downloader/info?url=\${encodeURIComponent(url)}\${forceParam}\`);`
);

// Add the UI
if (!code.includes('Developer Override')) {
    code = code.replace(
        /<\/div>\s*\{\/\* Error Message \*\/\}/,
        `</div>\n              {/* Developer Engine Override */}\n              <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground mt-2 pr-1 opacity-60 hover:opacity-100 transition-opacity">\n                <span>⚙️ Developer Override:</span>\n                <select\n                  value={forceEngine}\n                  onChange={(e) => setForceEngine(e.target.value)}\n                  className="bg-background/50 border border-border/50 text-foreground py-1 px-2 rounded-md outline-none cursor-pointer"\n                  title="Force a specific engine phase to test fallbacks isolated"\n                >\n                  <option value="auto">Smart Auto-Fallback (Production Default)</option>\n                  <option value="layer1">Force Layer 1 (Hetzner)</option>\n                  <option value="layer2">Force Layer 2 (Ghost Mirror)</option>\n                  <option value="layer3">Force Layer 3 (ASocks Proxy)</option>\n                </select>\n              </div>\n\n              {/* Error Message */}`
    );
}

fs.writeFileSync(file, code);
console.log("Patched SocialDownloaderPage.tsx!");