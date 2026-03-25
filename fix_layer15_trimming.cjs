const fs = require('fs');
let code = fs.readFileSync('server/routes/downloader.ts', 'utf8');

const target = `                  if (json.url) {
                      console.log(\`[Layer 1.5 SUCCESS] Hetzner successfully extracted Meta link! Redirecting...\`);
                      res.redirect(302, json.url);
                      return;
                  }`;

const replacement = `                  if (json.url) {
                      const sourceStreamUrl = json.url;
                      const isTrimmingReq = startSec !== null && endSec !== null && endSec > startSec;
                      
                      if (isTrimmingReq || chosen.ext === "mp3") {
                           console.log(\`[Layer 1.5] Trimming or audio-only Meta stream. Acquired CDN URL from Hetzner for FFmpeg processing.\`);
                           const ffmpegArgs = [];
                           if (isTrimmingReq) {
                               ffmpegArgs.push("-ss", startSec.toString());
                           }
                           ffmpegArgs.push("-i", sourceStreamUrl);
                           if (isTrimmingReq) {
                               ffmpegArgs.push("-to", endSec.toString());
                           }

                           if (chosen.ext === "mp3") {
                               ffmpegArgs.push("-vn", "-c:a", "libmp3lame", "-q:a", "2");
                           } else if (chosen.isAudio) {
                               ffmpegArgs.push("-vn", "-c:a", "copy");
                           } else {
                               ffmpegArgs.push("-c:v", "copy", "-c:a", "copy");
                           }

                           ffmpegArgs.push("-f", chosen.ext === "mp3" ? "mp3" : "mp4");
                           ffmpegArgs.push("pipe:1");

                           console.log(\`⚙️ EXEC: ffmpeg \${ffmpegArgs.join(" ")}\`);
                           
                           res.setHeader("Content-Disposition", \`attachment; filename="bongbari_meta_\${Date.now()}.\${chosen.ext}"\`);
                           res.setHeader("Content-Type", chosen.ext === "mp3" ? "audio/mpeg" : "video/mp4");
                           
                           const subprocess = spawn(ffmpegPath || "ffmpeg", ffmpegArgs, {
                               stdio: ["ignore", "pipe", "pipe"],
                           });

                           subprocess.stderr?.on("data", (chunk: Buffer) => {
                               const msg = chunk.toString();
                               Object.assign({}, {msg});
                           });

                           subprocess.on("error", (err: any) => {
                               console.error(\`[CRASH ALERT] spawn error:\`, err?.message);
                               if (!res.headersSent) res.status(500).json({ error: "Processing failed." });
                           });

                           subprocess.stdout?.pipe(res);

                           req.on("close", () => {
                               subprocess.kill?.("SIGTERM");
                           });
                           return;
                      } else {
                          console.log(\`[Layer 1.5 SUCCESS] Hetzner successfully extracted Meta link! Redirecting...\`);
                          res.redirect(302, json.url);
                          return;
                      }
                  }`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('server/routes/downloader.ts', code);
    console.log("Successfully added FFMPEG trimming support to Layer 1.5!");
} else if (code.includes('Trimming or audio-only Meta stream. Acquired CDN URL from Hetzner')) {
    console.log("Already added ffmpeg trimming logic for Layer 1.5.");
} else {
    console.log("Could not find the target text to replace in Layer 1.5.");
}
