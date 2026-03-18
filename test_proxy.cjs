const { execFile } = require("child_process");
const proxy = "http://q0b2vvoyfp-res-country-IN-hold-session-session-69badf0c52b0a:MsuSXbhmwtpdr81t@93.190.141.57:443";
const url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

execFile("node_modules/youtube-dl-exec/bin/yt-dlp.exe", ["--dump-json", "--proxy", proxy, "--no-warnings", "--format", "best[height<=480]", url], { maxBuffer: 1024 * 1024 * 10 }, (err, stdout, stderr) => {
    if (err) return console.error(err.message, stderr);
    const data = JSON.parse(stdout);
    console.log("Got URL:", data.url ? data.url.substring(0, 100) : "no url");
});
