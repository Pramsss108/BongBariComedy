const fs = require("fs");
let code = fs.readFileSync("server/routes/downloader.ts", "utf8");
const handleStreamStart = code.indexOf("async function handleStream");
const handleStreamEnd = code.indexOf("async function handleProxyStream");
if (handleStreamStart !== -1 && handleStreamEnd !== -1) {
    let handleStreamCode = code.substring(handleStreamStart, handleStreamEnd);
    let beforeTry = handleStreamCode.substring(0, handleStreamCode.indexOf("try {"));
    const newTryCatch = `try {
        const isTrimming = startSec !== null && endSec !== null && endSec > startSec;
        if (isTrimming) {
            res.status(501).json({ error: "Trimming is currently being upgraded. Please download the full video for now." });
            return;
        }

        console.log("[Phase 3 and 5] Requesting RAW CDN / Download proxy from Hetzner/Cobalt...");
        const fetch = (await import("node-fetch")).default;
        
        let vQuality = "720";
        if (chosen.ytFormat.includes("1080")) vQuality = "1080";
        if (chosen.ytFormat.includes("480")) vQuality = "480";
        if (chosen.ytFormat.includes("360")) vQuality = "360";

        const requestBody = {
            url: validated.url,
            isAudioOnly: chosen.isAudio,
            aFormat: chosen.isAudio ? chosen.ext : "mp3",
            vQuality: vQuality,
        };

        const response = await fetch("https://api.cobalt.tools/api/json", {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json"
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error("Failed to fetch raw stream link");
        }

        const data = await response.json();
        
        if (data && data.status === "error") {
             throw new Error(data.text || "Upstream API Error");
        }

        const directUrl = data.url;

        if (directUrl) {
            console.log("[VIBE CODER] RAW CDN Link Acquired! Redirecting user browser directly...");
            res.redirect(302, directUrl);
        } else {
             throw new Error("No direct URL returned from primary engine.");
        }

    } catch (err: any) {
        console.error("[downloader/stream] Fatal Streaming Error:", err?.message);
        if (!res.headersSent) {
            res.status(500).json({ error: "Failed to acquire direct stream." });
        }
    }
}
`;
    handleStreamCode = beforeTry + newTryCatch;
    code = code.substring(0, handleStreamStart) + handleStreamCode + code.substring(handleStreamEnd);
    fs.writeFileSync("server/routes/downloader.ts", code);
    console.log("Offloaded FFmpeg and applied Phase 3 CDN redirect!");
}

