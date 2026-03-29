import { Express } from "express";
import { youtubeService } from "../youtubeService";
import { trendsService } from "../trendsService";

// Proxy scraper REMOVED — runs on Hetzner VPS, not on Oracle 1GB VM

export function registerSystemRoutes(app: Express) {
    app.get('/api/health', (_req, res) => {
        res.json({ ok: true, aiReady: true, timestamp: new Date().toISOString() });
    });

    app.get('/api/version', (_req, res) => {
        res.json({ version: '2.0.0-ORACLE', status: 'healthy', env: process.env.NODE_ENV, uptime: process.uptime(), nodeVersion: process.version });
    });

    app.get('/api/ready', (_req, res) => {
        try {
            const yt = youtubeService.getInfo();
            const tr = trendsService.getInfo();
            res.json({ ok: true, ready: (yt.latest + yt.popular) > 0, yt, trends: tr });
        } catch (error: any) {
            console.error("API Ready check failed:", error);
            res.status(500).json({ ok: false, ready: false, message: "Failed to get service info", details: error?.message || String(error) });
        }
    });

    app.get('/api/trends', (_req, res) => {
        res.json({ items: trendsService.getTop(10) });
    });

    // Proxy admin routes removed — Hetzner handles all proxy scraping/verification
    app.get('/api/admin/proxy-status', (_req, res) => {
        res.json({ message: 'Proxy scraper disabled on Oracle VM — use Hetzner', activeNodes: 0, proxies: [] });
    });
}
