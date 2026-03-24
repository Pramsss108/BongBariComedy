const fs = require('fs');
let code = fs.readFileSync('client/src/pages/SocialDownloaderPage.tsx', 'utf8');

const comp = "" +
"const DebuggerConsole = ({ data }: { data: any }) => {\n" +
"  if (!data) return null;\n" +
"  return (\n" +
"    <div className=\"mt-8 mb-4 border border-red-500/30 bg-black/60 backdrop-blur-xl p-4 rounded-xl text-left overflow-hidden\">\n" +
"      <div className=\"flex justify-between items-center mb-2\">\n" +
"        <h3 className=\"text-red-400 font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2\">\n" +
"          <span className=\"w-2 h-2 rounded-full bg-red-500 animate-pulse\"></span>\n" +
"          Sentinel Debug Output [Network/Formats]\n" +
"        </h3>\n" +
"      </div>\n" +
"      <div className=\"h-64 overflow-y-auto overflow-x-auto bg-black/80 rounded border border-gray-800 p-2 custom-scrollbar\">\n" +
"        <pre className=\"text-green-400 text-[10px] font-mono whitespace-pre text-left\">\n" +
"          {JSON.stringify(data, null, 2)}\n" +
"        </pre>\n" +
"      </div>\n" +
"    </div>\n" +
"  );\n" +
"};\n";

if (!code.includes('DebuggerConsole')) {
  code = code.replace('export default function SocialDownloaderPage() {', comp + '\nexport default function SocialDownloaderPage() {');
}

const renderLoc = '<div className="mt-2 text-xs text-gray-500 flex items-center justify-center gap-2">';
if (code.includes(renderLoc) && !code.includes('<DebuggerConsole')) {
  code = code.replace(renderLoc, '<DebuggerConsole data={videoInfo} />\n' + renderLoc);
}

fs.writeFileSync('client/src/pages/SocialDownloaderPage.tsx', code);
console.log('Debugger added successfully!');
