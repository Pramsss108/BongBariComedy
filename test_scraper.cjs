
const { execFile } = require('child_process');
const path = require('path');
const ytDlpPath = path.join(__dirname, 'node_modules', 'youtube-dl-exec', 'bin', 'yt-dlp.exe');
const generateProxy = () => {
    const baseProxy = 'http://q0b2vvoyfp-res-country-IN-hold-session-session-69badf0c52b0a:MsuSXbhmwtpdr81t@93.190.141.57:443';
    return baseProxy;
};

const args = [
    '--dump-json',
    '--no-warnings',
    '--geo-bypass',
    '--extractor-args', 'instagram:api=api',
    '--proxy', generateProxy(),
    'https://www.instagram.com/reel/C-U4yXvoGZp/'
];

execFile(ytDlpPath, args, { maxBuffer: 1024 * 1024 * 20 }, (error, stdout, stderr) => {
    if (error) {
        console.log(stderr);
    } else {
        const data = JSON.parse(stdout);
        console.log('Title:', data.title);
    }
});

