import { Router } from "express";

export function registerDebugRoutes() {
  const router = Router();
  // POST /api/debug/log
  // Receives layout issues from the frontend and prints them to the server console
  // So the AI Agent in VS Code can read them without needing screenshots.
  router.post("/log", (req, res) => {
    const { issues, url, viewport, context } = req.body;

    console.log("\n");
    console.log("🔍 FRONTEND LAYOUT AUDIT RECEIVED");
    console.log(`📡 URL: ${url}`);
    if (context) {
        console.log(`📱 Device: ${context.deviceType} (${context.orientation})`);
        console.log(`🖥️  Platform: ${context.platform}`);
    }
    console.log(`📏 Viewport: ${viewport.width}x${viewport.height}`);

    if (!issues || !Array.isArray(issues) || issues.length === 0) {
      console.log("✅ RESULT: PASS (No Issues Found)");
      console.log("----------------------------------------\n");
      return res.json({ ok: true });
    }

    console.log("🚨 RESULT: FAIL (Issues Found)");
    console.log("----------------------------------------");
    
    issues.forEach((issue: any, index: number) => {
      console.log(`#${index + 1} [${issue.type.toUpperCase()}]`);
      console.log(`   Element: ${issue.element}`);
      console.log(`   Details: ${issue.details}`);
      if (issue.rect) {
        console.log(`   Rect: X=${issue.rect.x}, Y=${issue.rect.y}, W=${issue.rect.width}, H=${issue.rect.height}`);
      }
      console.log("----------------------------------------");
    });
    console.log("🚨🚨🚨 END REPORT 🚨🚨🚨\n");

    res.json({ ok: true, received: issues.length });
  });

  // POST /api/debug/screenshot
  // Receives base64 image (data:image/png;base64,...) and saves it
  router.post("/screenshot", async (req, res) => {
    try {
      const { image, context } = req.body;
      if (!image || !image.startsWith('data:image')) {
        return res.status(400).json({ error: "Invalid image data" });
      }

      // Strip metadata header
      const base64Data = image.replace(/^data:image\/png;base64,/, "");
      
      // We'll verify directory presence (usually screen-recordings/ exists)
      const fs = await import('fs/promises');
      const path = await import('path');
      const targetDir = path.resolve(process.cwd(), 'screen-recordings');
      
      // Ensure dir exists
      try { await fs.access(targetDir); } 
      catch { await fs.mkdir(targetDir, { recursive: true }); }
      
      const filename = `mobile_ss_${Date.now()}.png`;
      const filePath = path.join(targetDir, filename);
      
      await fs.writeFile(filePath, base64Data, 'base64');
      
      console.log(`\n📸 SCREENSHOT SAVED: ${filename}`);
      if (context) {
        console.log(`   Device: ${context.deviceType || 'Unknown'} (${context.orientation || '?'})`);
        console.log(`   Dimensions: ${context.width}x${context.height}`);
      }
      console.log(`   Path: ${filePath}\n`);
      
      res.json({ ok: true, filename });
    } catch (e) {
      console.error("Screenshot save failed:", e);
      res.status(500).json({ error: String(e) });
    }
  });

  return router;
}
