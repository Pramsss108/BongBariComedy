const fs = require('fs');

const uiPatch = `
                      <option className="bg-[#0f0f11] text-white" value="layer4">🔒 Force Layer 4: ASocks + Mobile (Locked/Paid)</option>
                      <option className="bg-[#0f0f11] opacity-50 text-white" value="layer5">🛠️ Force Layer 5: Future Expansion Slot A</option>
                      <option className="bg-[#0f0f11] opacity-50 text-white" value="layer6">🛠️ Force Layer 6: Future Expansion Slot B</option>`;

let uiCode = fs.readFileSync('client/src/pages/SocialDownloaderPage.tsx', 'utf8');
if (!uiCode.includes('Force Layer 5')) {
    uiCode = uiCode.replace('<option className="bg-[#0f0f11] text-white" value="layer4">🔒 Force Layer 4: ASocks + Mobile (Locked/Paid)</option>', uiPatch.trim());
    fs.writeFileSync('client/src/pages/SocialDownloaderPage.tsx', uiCode);
    console.log('Patched UI Dropdown');
}

const backendPatch = `
// ==========================================
// PHASE 5: Expansion Slot A
// ==========================================
async function executePhase5_ExpansionA(url: string): Promise<any> {
    console.log('[Phase 5] Executing Expansion Slot A for:', url);
    throw new Error('Phase 5 is a placeholder and not fully implemented yet.');
}

// ==========================================
// PHASE 6: Expansion Slot B
// ==========================================
async function executePhase6_ExpansionB(url: string): Promise<any> {
    console.log('[Phase 6] Executing Expansion Slot B for:', url);
    throw new Error('Phase 6 is a placeholder and not fully implemented yet.');
}
`;

let tsCode = fs.readFileSync('server/routes/downloader.ts', 'utf8');

if (!tsCode.includes('executePhase5_ExpansionA')) {
    tsCode = tsCode.replace('async function fetchSmartMetadata', backendPatch.trim() + '\n\nasync function fetchSmartMetadata');
    fs.writeFileSync('server/routes/downloader.ts', tsCode);
    console.log('Patched TS Backend Slot definitions');
}
