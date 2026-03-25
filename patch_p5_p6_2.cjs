const fs = require('fs');
let tsCode = fs.readFileSync('server/routes/downloader.ts', 'utf8');

// Inject Strict force logic
const strictForce56 = `
    if (forceEngine === "layer5") {
        const result = await executePhase5_ExpansionA(url);
        metaCache.set(url, { data: result, expires: Date.now() + 60000 });
        return result; 
    }

    if (forceEngine === "layer6") {
        const result = await executePhase6_ExpansionB(url);
        metaCache.set(url, { data: result, expires: Date.now() + 60000 });
        return result; 
    }
`;

if (!tsCode.includes('forceEngine === "layer5"')) {
    tsCode = tsCode.replace(/if \(forceEngine === "layer4"\) \{[\s\S]+?return result; \/\/ Crashes if fails, NO fallback\s+?\}/m, match => match + '\n' + strictForce56);
}

// Inject fallback cascade
const fallback56 = `
                    try {
                        const res4 = await executePhase4_UpstreamASocks(url);
                        metaCache.set(url, { data: res4, expires: Date.now() + 60000 });
                        return res4;
                    } catch (e4: any) {
                        console.log(\`[Smart Fallback] Phase 4 failed (\${e4.message}), cascading to Phase 5...\`);
                        try {
                            const res5 = await executePhase5_ExpansionA(url);
                            metaCache.set(url, { data: res5, expires: Date.now() + 60000 });
                            return res5;
                        } catch (e5: any) {
                            console.log(\`[Smart Fallback] Phase 5 failed (\${e5.message}), cascading to Phase 6...\`);
                            try {
                                const res6 = await executePhase6_ExpansionB(url);
                                metaCache.set(url, { data: res6, expires: Date.now() + 60000 });
                                return res6;
                            } catch (e6: any) {
                                throw new Error(\`Total engine failure after 6 layers: \${e6.message}\`);
                            }
                        }
                    }`;

if (!tsCode.includes('e5.message')) {
    const oldFallback4 = `
                    try {
                        const res4 = await executePhase4_UpstreamASocks(url);
                        metaCache.set(url, { data: res4, expires: Date.now() + 60000 });
                        return res4;
                    } catch (e4: any) {
                         throw new Error(\`Total engine failure: \${e4.message}\`);
                    }`;
    tsCode = tsCode.replace(oldFallback4.trim(), fallback56.trim());
}

fs.writeFileSync('server/routes/downloader.ts', tsCode);
console.log('Patched fallback/force logic for 5 and 6.');
