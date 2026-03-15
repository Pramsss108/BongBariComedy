const ffmpeg = require('ffmpeg-static');
const { spawnSync } = require('child_process');

console.log("FFMPEG PATH:", ffmpeg);

const args = [
  'https://www.youtube.com/watch?v=jNQXAC9IVRw',
  '--ffmpeg-location', ffmpeg,
  '--download-sections', '*00:05-00:10',
  '--format', 'best[height<=720][ext=mp4]/best',
  '-o', 'test_out.mp4'
];

console.log("Running yt-dlp", args.join(" "));

spawnSync('yt-dlp', args, { stdio: 'inherit' });