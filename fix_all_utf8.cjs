const fs = require('fs');
let text = fs.readFileSync('client/src/pages/SocialDownloaderPage.tsx', 'utf8');

const replacements = [
  ['Ã¢â€â‚¬', '━'],
  ['Ã¢â‚¬â€', '—'],
  ['Ã¢â€ Â', '←'],
  ['Ã°Å¸Å¡â‚¬', '🚀'],
  ['Ã‚Â©', '©'],
  ['Ã¢â‚¬Â¢', '•'],
  ['Ã¢â€ â€™', '→'],
  ['Ã¢Å“â€¦', '✅'],
  ['Ã°Å¸â€Å½', '🔍'],
  ['Ã°Å¸â€œÂ', '📝'],
  ['Ã°Å¸Å½Â¥', '🎬'],
  ['Ã°Å¸â€ºÂ¡Ã¯Â¸Â', '🛡️'],
  ['Ã°Å¸â€ºÂ', '🛠️'],
  ['Ã¢Ëœï¿½', '☁️']
];

for (const [bad, good] of replacements) {
    text = text.split(bad).join(good);
}

fs.writeFileSync('client/src/pages/SocialDownloaderPage.tsx', text, 'utf8');
console.log('Fixed UTF-8 issues!');
