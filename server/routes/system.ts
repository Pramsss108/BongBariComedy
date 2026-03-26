import { Express } from "express";
import { youtubeService } from "../youtubeService";
import { trendsService } from "../trendsService";
import { ProxyKitchen } from "../proxyService";
import { ProxyScraper } from "../proxyScraperService";

export function registerSystemRoutes(app: Express) {
    app.get('/api/health', (_req, res) => {
        res.json({ ok: true, aiReady: true, timestamp: new Date().toISOString() });
    });

    app.get('/api/admin/proxy-status', async (_req, res) => {
        try {
            const proxies = await ProxyKitchen.getLiveProxies();
            const ytCount = proxies.filter(p => p.platforms.yt).length;
            const fbCount = proxies.filter(p => p.platforms.fb).length;
            const igCount = proxies.filter(p => p.platforms.ig).length;
            const allThree = proxies.filter(p => p.platforms.yt && p.platforms.fb && p.platforms.ig).length;
            res.json({
                activeNodes: proxies.length,
                proxies: proxies.slice(0, 100),
                platformCounts: { yt: ytCount, fb: fbCount, ig: igCount, allThree },
                isHunting: ProxyScraper.isHunting,
                isRevalidating: ProxyScraper.isRevalidating,
                huntDetails: ProxyScraper.huntDetails,
            });
        } catch (error: any) {
            res.status(500).json({ activeNodes: 0, proxies: [], error: error.message, isHunting: false, huntDetails: null });
        }
    });

    app.post('/api/admin/proxy-hunt', async (_req, res) => {
        try {
            if (ProxyScraper.isHunting) {
                return res.status(400).json({ message: "Hunt already in progress." });
            }
            ProxyScraper.runHunt();
            res.json({ message: "Proxy Hunt Initiated. This may take 2-4 minutes.", status: 'started' });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    app.get('/api/version', (_req, res) => {
        res.json({ version: '1.0.5-HETZNER-BYPASS', status: 'healthy', env: process.env.NODE_ENV, uptime: process.uptime(), nodeVersion: process.version });    
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
}
