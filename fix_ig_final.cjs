@"
const fs = require("fs");
let code = fs.readFileSync("server/routes/downloader.ts", "utf8");

code = code.replace(
  /const premuxed = rawFormats\.filter\(\(f: any\)\s*=>\s*f\.ext === .mp4. && f\.acodec && f\.acodec !== .none. && f\.vcodec && f\.vcodec !== .none. && f\.url && f\.url\.startsWith\(.http.\) && !f\.url\.includes\(..m3u8.\)\s*\);/g,
  `const premuxed = rawFormats.filter((f: any) => {
    if (f.format_id === "2" || f.format_id === "0") return true;
    return f.ext === "mp4" && f.acodec && f.acodec !== "none" && f.vcodec && f.vcodec !== "none" && f.url && f.url.startsWith("http") && !f.url.includes(".m3u8");
  });`
);

let count = (code.match(/format_id === "2"/g) || []).length;
console.log("Found replacements: ", count);
fs.writeFileSync("server/routes/downloader.ts", code);
"@
