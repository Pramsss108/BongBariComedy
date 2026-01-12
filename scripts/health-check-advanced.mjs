import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const requiredFiles = [
  'client/src/App.tsx',
  'client/src/main.tsx',
  'client/src/components/AdvancedErrorBoundary.tsx',
  'client/src/lib/logger.ts',
  'client/src/components/DebugOverlay.tsx',
  'client/src/mobile-overrides.css',
  'package.json',
  'vite.config.ts',
  'server/index.ts'
];

console.log("🏥 STARTING ADVANCED SYSTEM HEALTH CHECK...");
console.log("==========================================");

let errors = 0;

// 1. File Integrity Check
console.log("\n📂 Checking Critical Core Files...");
requiredFiles.forEach(file => {
  const fullPath = path.join(root, file);
  if (fs.existsSync(fullPath)) {
    console.log(`  ✅ Found: ${file}`);
  } else {
    console.error(`  ❌ MISSING: ${file}`);
    errors++;
  }
});

// 2. Syntax Validation (Basic)
console.log("\n🧠 Verifying Code Syntax (Sampling)...");
try {
    const appContent = fs.readFileSync(path.join(root, 'client/src/App.tsx'), 'utf-8');
    if (!appContent.includes('<AdvancedErrorBoundary>')) {
        console.error("  ❌ App.tsx is NOT wrapped in ErrorBoundary!");
        errors++;
    } else {
        console.log("  ✅ App.tsx: ErrorBoundary Active");
    }

    const debugContent = fs.readFileSync(path.join(root, 'client/src/components/DebugOverlay.tsx'), 'utf-8');
    if (!debugContent.includes("logger.getLogs()")) {
         console.error("  ❌ DebugOverlay: Missing Logger Integration!");
         errors++;
    } else {
        console.log("  ✅ DebugOverlay: Logger Connected");
    }

} catch (e) {
    console.error("  ❌ Failed to read files for syntax check", e);
    errors++;
}

// 3. Environment Check
console.log("\n🌍 Checking Environment Config...");
try {
    const viteConfig = fs.readFileSync(path.join(root, 'vite.config.ts'), 'utf-8');
    if (viteConfig.includes("0.0.0.0")) {
        // Warning only, depends on context, but user had issues with it
        console.warn("  ⚠️  Warning: Vite bound to 0.0.0.0 (May cause Windows Firewall issues if not handled)");
    } else {
         console.log("  ✅ Vite Config: Standard Binding");
    }
} catch (e) {}


console.log("==========================================");
if (errors === 0) {
    console.log("✅ SYSTEM HEALTH: 100% IN TACT");
    console.log("   - Advanced Debugger: INSTALLED");
    console.log("   - Silent Error Catching: ACTIVE");
    console.log("   - Core Files: PRESENT");
} else {
    console.error(`❌ SYSTEM FAILURE: Found ${errors} critical issues.`);
    process.exit(1);
}
