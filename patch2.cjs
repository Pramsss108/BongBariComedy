const fs = require('fs');
let code = fs.readFileSync('server/routes/downloader.ts', 'utf8');

const regex = /if \(data\.status === "redirect" \|\| data\.status === "tunnel" \|\| data\.status === "stream"\) \{[\s\S]*?\/\/\s*Proxy stream natively so it avoids CORS and IP exposure, with Range support for seeking![\s\S]*?try \{[\s\S]*?const isPreview = req\.query\.mode === "preview";[\s\S]*?const fetchHeaders:\s*any\s*=\s*\{[\s\S]*?"User-Agent": "Mozilla\/5\.0 \(Windows NT 10\.0; Win64; x64\) AppleWebKit\/537\.36"[\s\S]*?\};/m;

const newString = `      if (data.status === "redirect" || data.status === "tunnel" || data.status === "stream") {
            // Proxy stream natively so it avoids CORS and IP exposure, with Range support for seeking!
            try {
                const isPreview = req.query.mode === "preview";
                const fallbackTitle = (req.query.title as string) || "bongbari_stream";

                // --- TRIMMING LOGIC IF START/END PROVIDED ---
                if (req.query.start && req.query.end && ffmpegPath) {
                    const start = parseFloat(req.query.start as string);
                    const end = parseFloat(req.query.end as string);
                    
                    if (!isNaN(start) && !isNaN(end) && start < end) {
                        const duration = end - start;
                        
                        console.log(\`[FFMPEG] Slicing from \${start}s for \${duration}s...\`);

                        res.set("Content-Type", "video/mp4");
                        res.set("Content-Disposition", \`attachment; filename="\${fallbackTitle}_clip.mp4"\`);

                        const ffmpegArgs = [
                            '-user_agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                            '-headers', 'Accept: */*\\r\\nReferer: https://www.youtube.com/\\r\\n',
                            '-ss', start.toString(),
                            '-i', data.url,
                            '-t', duration.toString(),
                            '-c', 'copy',
                            '-movflags', 'frag_keyframe+empty_moov',
                            '-f', 'mp4',
                            'pipe:1'
                        ];

                        const ffmpegProcess = spawn(ffmpegPath as string, ffmpegArgs, { windowsHide: true });

                        ffmpegProcess.stdout.pipe(res);

                        ffmpegProcess.stderr.on('data', (stderrData) => {
                            // Suppress verbose FFMPEG logs unless debugging
                        });

                        ffmpegProcess.on('error', (err) => {
                            console.error("[FFMPEG Process Error]:", err);
                            if (!res.headersSent) {
                                return formatNotAvailable(res, "Video trimming engine crashed.", 500);
                            }
                        });

                        return await new Promise((resolve) => {
                            ffmpegProcess.on('close', (code) => {
                                console.log(\`[FFMPEG] Trim finished with code \${code}\`);
                                if (!res.headersSent) res.end();
                                resolve(undefined);
                            });
                        });
                    }
                }
                // ---------------------------------------------

                const fetchHeaders: any = {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                };`;

code = code.replace(regex, newString);
const fallbackRegex = /const fallbackTitle = \(req\.query\.title as string\) \|\| "bongbari_stream";\s*\/\/\s*Only force 'attachment' \(Save As UI\) if they aren't just previewing it\s*res\.set\("Content-Disposition", isPreview \? `inline; filename="\$\{fallbackTitle\}\.mp4"` : `attachment; filename="\$\{fallbackTitle\}\.mp4"`\);/m;

const newFallback = `// Only force 'attachment' (Save As UI) if they aren't just previewing it
                res.set("Content-Disposition", isPreview ? \`inline; filename="\${fallbackTitle}.mp4"\` : \`attachment; filename="\${fallbackTitle}.mp4"\`);`;
code = code.replace(fallbackRegex, newFallback);

fs.writeFileSync('server/routes/downloader.ts', code);
console.log("Replaced:", code.includes("ffmpegProcess"));