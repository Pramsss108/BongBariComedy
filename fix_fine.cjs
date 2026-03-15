const fs = require('fs');

let code = fs.readFileSync('client/src/pages/VoiceHub.tsx', 'utf8');

// Strip the 1st dropdown column
code = code.replace(/<div className="flex flex-col gap-1\.5">[\s\n]*<label className="text-\[10px\] font-bold text-white\/40 uppercase tracking-\[2px\]">Select Voice<\/label>[\s\S]*?<\/select>[\s\n]*<\/div>/g, '');

// Strip the 2nd dropdown column (Engine Status)
code = code.replace(/<div className="flex flex-col gap-1\.5">[\s\n]*<label className="text-\[10px\] font-bold text-white\/40 uppercase tracking-\[2px\]">Engine Status<\/label>[\s\S]*?<\/div>[\s\n]*<\/div>[\s\n]*<\/div>/g, '');

// Clean up the empty grid container
code = code.replace(/<div className="grid grid-cols-1 md:grid-cols-2 gap-3">[\s\n]*<\/div>/g, '');

fs.writeFileSync('client/src/pages/VoiceHub.tsx', code);
