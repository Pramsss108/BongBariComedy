const fs = require('fs');
let tsCode = fs.readFileSync('server/routes/downloader.ts', 'utf8');

// 1. Swap the names of functions so ASOCKS is Phase 6 and YTDL is Phase 4
tsCode = tsCode.replace(/async function executePhase4_UpstreamASocks/g, 'async function TEMP_PHASE_6');
tsCode = tsCode.replace(/async function executePhase6_ExpansionB/g, 'async function executePhase4_YTDL');
tsCode = tsCode.replace(/async function TEMP_PHASE_6/g, 'async function executePhase6_ASocks');

// 2. Adjust logs inside them
tsCode = tsCode.replace(/\[Phase 4\] Executing ASocks/g, '[Phase 6] Executing ASocks');
tsCode = tsCode.replace(/\[Phase 6\] Executing YTDL-Core/g, '[Phase 4] Executing YTDL-Core');
tsCode = tsCode.replace(/Force Layer 4: ASocks \+ Mobile/g, 'Force Layer 6: ASocks + Mobile');
tsCode = tsCode.replace(/Force Layer 6: YTDL-Core Native/g, 'Force Layer 4: YTDL-Core Native');

// 3. Remove Phase 5 entirely and replace with placeholder
const p5Match = tsCode.match(/async function executePhase5_ExpansionA[\s\S]*?throw new Error\('Phase 5.*?'\);\n\}/);
if (p5Match) {
    tsCode = tsCode.replace(p5Match[0], `async function executePhase5_ExpansionA(url: string): Promise<any> {
    throw new Error('Phase 5 is empty (Public Cobalt removed as requested).');
}`);
}

// 4. Update the routing execution string replacements inside `fetchSmartMetadata`
tsCode = tsCode.replace(/executePhase4_UpstreamASocks/g, 'executePhase6_ASocks');
tsCode = tsCode.replace(/executePhase6_ExpansionB/g, 'executePhase4_YTDL');

fs.writeFileSync('server/routes/downloader.ts', tsCode);
console.log('Restructured layers: 4 is now YTDL, 6 is now ASocks Ultimate Fallback, 5 is Deleted.');
