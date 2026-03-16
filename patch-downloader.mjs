import fs from "fs"; let code = fs.readFileSync("server/routes/downloader.ts", "utf8"); 
if (!code.includes("import ytdl")) {
    code = `import ytdl from "@distube/ytdl-core";\n` + code;
}
const oldFetch = `async function fetchSmartMetadata(url: string): Promise<any> {
    // Strategy: Try Local yt-dlp first for quality (thumbnails etc),
    // fallback to Cobalt if blocked/failed.
    // NOTE: Plan V2 says "Cobalt Primary" but for *Metadata*, local yt-dlp is superior
    // because Cobalt missing thumbnails breaks the UI preview.
    // We will use Local Primary for INFO, but Cobalt Primary for DOWNLOAD (in handleStream logic).

    try {
        // 1. Try Local yt-dlp (High Fidelity)
        const info = await executeYtDlp(url, [
            "--dump-single-json",
            "--no-warnings",
            "--no-call-home",
            "--prefer-free-formats",
            "--youtube-skip-dash-manifest",
              "--extractor-args", "youtube:player_client=android,ios",
             "--format", "bestvideo[height<=1080]+bestaudio/best[height<=1080]/best"
        ]);
        return info;
    } catch (localErr) {
        console.warn(\`[SmartMetadata] Local fetch failed, trying Cobalt...\`, localErr);
        // 2. Fallback to Cobalt (Low Fidelity / Savior)
        try {
            return await fetchMetadataCobalt(url);
        } catch (cobaltErr) {
            throw new Error(\`Both engines failed. Local: \${localErr}. Cobalt: \${cobaltErr}\`);
        }
    }
}`;

const newFetch = `async function fetchSmartMetadata(url: string): Promise<any> {
    try {
        console.log(\`[Red Team API] Trying @distube/ytdl-core native bypass for: \${url}\`);
        const info = await ytdl.getInfo(url);
        const durationSecs = parseInt(info.videoDetails.lengthSeconds || "0", 10);
        const mins = Math.floor(durationSecs / 60);
        const secs = durationSecs % 60;
        
        const thumbnails = info.videoDetails.thumbnails || [];
        const thumbnail = thumbnails.length > 0 ? thumbnails[thumbnails.length - 1].url : null;
        
        const ytFormats = info.formats.map((f: any) => ({
            id: f.itag?.toString(),
            ext: f.container,
            height: f.height || 0,
            isAudio: f.hasAudio && !f.hasVideo
        }));

        return {
            title: info.videoDetails.title,
            duration: durationSecs,
            duration_string: \`\${mins}:\${secs.toString().padStart(2, "0")}\`,
            thumbnail,
            uploader: info.videoDetails.author?.name || "YouTube Creator",
            platform: "YouTube",
            formats: ytFormats
        };
    } catch (distubeErr: any) {
        console.warn(\`[Red Team API] ytdl-core primary failed. Error: \${distubeErr.message}. Cascading to local yt-dlp...\`);
        try {
            return await executeYtDlp(url, [
                "--dump-single-json", "--no-warnings", "--no-call-home",
                "--prefer-free-formats", "--youtube-skip-dash-manifest",
                "--extractor-args", "youtube:player_client=android,ios",
                "--format", "bestvideo[height<=1080]+bestaudio/best[height<=1080]/best"
            ]);
        } catch (localErr) {
            console.warn(\`[Red Team API] Local yt-dlp fallback failed, cascading to community Cobalt...\`, localErr);
            try {
                return await fetchMetadataCobalt(url);
            } catch (cobaltErr) {
                throw new Error(\`Total Extractor Failure. ytdl-core: \${distubeErr.message} | yt-dlp: \${localErr} | Cobalt: \${cobaltErr}\`);
            }
        }
    }
}`;

code = code.replace(oldFetch, newFetch);
fs.writeFileSync("server/routes/downloader.ts", code);
console.log("Patch applied!");

