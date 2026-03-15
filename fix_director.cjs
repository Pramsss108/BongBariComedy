const fs = require('fs');

let devCheck = fs.readFileSync('client/src/lib/device-check.ts', 'utf8');
if (!devCheck.includes('export function getHardwareProfile()')) {
    devCheck += "\n\n/**\n * Phase 20: Auto-Director Fallback System\n * Profiles hardware to determine how heavy our audio physics math can be.\n */\n";
    devCheck += "export function getHardwareProfile(): 'potato' | 'standard' | 'beast' {\n";
    devCheck += "    if (typeof window === 'undefined') return 'standard';\n";
    devCheck += "    const ram = (navigator as any).deviceMemory || 4;\n";
    devCheck += "    const cores = navigator.hardwareConcurrency || 4;\n";
    devCheck += "    if (ram <= 4 || cores <= 4) return 'potato';\n";
    devCheck += "    if (ram >= 8 && cores >= 8) return 'beast';\n";
    devCheck += "    return 'standard';\n";
    devCheck += "}\n";
    fs.writeFileSync('client/src/lib/device-check.ts', devCheck);
}

let audioMaster = fs.readFileSync('client/src/lib/audio-mastering.ts', 'utf8');
if (!audioMaster.includes('import { getHardwareProfile }')) {
    audioMaster = "import { getHardwareProfile } from './device-check';\n" + audioMaster;
    
    // Modify mastering to skip heavy filters if potato
    const heavyCabling = "    // 3. Connect the Analog Cabling inside the browser memory:\n" +
                         "    // Source -> Bass Boost -> Sparkle EQ -> Leveler -> Output\n" +
                         "    source.connect(lowShelf);\n" +
                         "    lowShelf.connect(highShelf);\n" +
                         "    highShelf.connect(compressor);\n" +
                         "    compressor.connect(ctx.destination);";
                         
    const dynamicCabling = "    // Phase 20: Auto-Director Bypass Check\n" +
                           "    const profile = getHardwareProfile();\n" +
                           "    if (profile === 'potato') {\n" +
                           "        // Save weak CPU cycles: Biquads use heavy floating point math, bypass them on budget phones\n" +
                           "        source.connect(compressor);\n" +
                           "        compressor.connect(ctx.destination);\n" +
                           "        console.log('[Auto-Director] Activated POTATO Mode: Bypassed heavy studio EQs for performance.');\n" +
                           "    } else {\n" +
                           "        // Standard / Beast Mode gets the full Hollywood treatment\n" +
                           "        source.connect(lowShelf);\n" +
                           "        lowShelf.connect(highShelf);\n" +
                           "        highShelf.connect(compressor);\n" +
                           "        compressor.connect(ctx.destination);\n" +
                           "        console.log('[Auto-Director] Activated STUDIO Mode: Full biquad audio mastering applied.');\n" +
                           "    }";
                           
    audioMaster = audioMaster.replace(heavyCabling, dynamicCabling);
    fs.writeFileSync('client/src/lib/audio-mastering.ts', audioMaster);
}

console.log('Phase 20 Auto-Director Fallback System Applied');
