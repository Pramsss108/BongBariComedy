/* ── Fun Bong Bari device names for Local Transfer ── */
const NAMES = [
  'Cute Pangolin 🦔',
  'Jigri Dost 🤝',
  'Golden Macaw 🦜',
  'Mishti Chhana 🍰',
  'Rocket Rosho 🚀',
  'Neon Butterfly 🦋',
  'Stellar Fox 🦊',
  'Crystal Dolphin 🐬',
  'Thunder Panda 🐼',
  'Cozy Koala 🐨',
  'Turbo Parrot 🦜',
  'Pixel Phoenix 🔥',
  'Happy Hamster 🐹',
  'Velvet Owl 🦉',
  'Cosmic Tiger 🐯',
  'Lemon Penguin 🐧',
  'Solar Bunny 🐰',
  'Brave Otter 🦦',
  'Dreamy Pufferfish 🐡',
  'Electric Chameleon 🦎',
  'Glow Jellyfish 🪼',
  'Chai Master ☕',
  'Mango Monsoon 🥭',
  'Rasgulla Rally 🍥',
  'Biriyani Boss 🍚',
  'Sandesh Star ⭐',
  'Kite Runner 🪁',
  'Durga Dancer 💃',
  'Diwali Spark ✨',
  'Bengal Tiger 🐅',
];

let _cached: string | null = null;

/** Get a persistent fun device name for this session */
export function getDeviceName(): string {
  if (_cached) return _cached;
  _cached = NAMES[Math.floor(Math.random() * NAMES.length)];
  return _cached;
}

/** Detect if current device is mobile */
export function isMobileDevice(): boolean {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

/** Get device type label */
export function getDeviceType(): string {
  return isMobileDevice() ? '📱 Phone' : '💻 Desktop';
}
