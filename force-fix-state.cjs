const fs = require('fs');

let content = fs.readFileSync('client/src/pages/VoiceHub.tsx', 'utf8');

const targetStr = 'const audioRef = React.useRef<HTMLAudioElement | null>(null);';

const newStr = `const audioRef = React.useRef<HTMLAudioElement | null>(null);

    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);

    const togglePlay = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play().catch(e => console.error("Playback failed:", e));
        }
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            const current = audioRef.current.currentTime;
            const dur = audioRef.current.duration;
            if (dur > 0) {
                setProgress((current / dur) * 100);
            }
        }
    };`;

content = content.replace(targetStr, newStr);
fs.writeFileSync('client/src/pages/VoiceHub.tsx', content, 'utf8');
console.log('States fixed forcefully');
