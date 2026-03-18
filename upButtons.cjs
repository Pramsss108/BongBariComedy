const fs = require('fs');
let code = fs.readFileSync('client/src/pages/SocialDownloaderPage.tsx', 'utf8');

const regex = /<button onClick=\{\(\) => setTrimMode\(false\)\} className="text-white\/60 hover:text-white flex items-center gap-2 text-xs font-bold bg-white\/5 hover:bg-white\/10 px-4 py-2 rounded-lg transition-colors">\s*<ArrowLeft size=\{16\} \/> Back to Dashboard\s*<\/button>/m;

const newBtns = `<div className="flex items-center gap-2">
                     <Link href="/tools">
                         <button className="text-white/60 hover:text-white flex items-center gap-2 text-xs font-bold bg-white/5 hover:bg-white/10 px-4 py-2 rounded-lg transition-colors">
                            <ArrowLeft size={16} /> Tools
                         </button>
                     </Link>
                     <button onClick={() => setTrimMode(false)} className="text-white/60 hover:text-white flex items-center gap-2 text-xs font-bold bg-white/5 hover:bg-white/10 px-4 py-2 rounded-lg transition-colors hidden sm:flex">
                        Dashboard
                     </button>
                   </div>`;

console.log("Found?", regex.test(code));
code = code.replace(regex, newBtns);
fs.writeFileSync('client/src/pages/SocialDownloaderPage.tsx', code);
