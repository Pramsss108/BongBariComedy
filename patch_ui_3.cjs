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


// Add the UI right after the Fetch button wrapper div closes
const target = `</button>\n                    </div>\n                  </div>`;
const replacement = `</button>\n                    </div>\n                  </div>\n\n                  {/* Developer Engine Override */}\n                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2 opacity-50 hover:opacity-100 transition-opacity">\n                    <span>⚙️ Developer Engine Override:</span>\n                    <select\n                      value={forceEngine}\n                      onChange={(e) => setForceEngine(e.target.value)}\n                      className="bg-background border border-border text-foreground py-1 px-2 rounded outline-none cursor-pointer"\n                    >\n                      <option value="auto">Smart Auto-Fallback (Production Default)</option>\n                      <option value="layer1">Force Layer 1 (Hetzner)</option>\n                      <option value="layer2">Force Layer 2 (Ghost Mirror)</option>\n                      <option value="layer3">Force Layer 3 (ASocks Proxy)</option>\n                    </select>\n                  </div>`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync(file, code);
    console.log("Patched UI successfully!");
} else {
    console.log("Could not find Target HTML. Let me do a flexible regex search.");
    const altTarget = `</button>\n                    </div>\n                  </div>`;
    code = code.replace(/<\/button>\s*<\/div>\s*<\/div>/, replacement);
    fs.writeFileSync(file, code);
    console.log("Patched UI via flexible regex!");
}

