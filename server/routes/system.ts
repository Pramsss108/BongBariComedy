import { Express } from "express";
import { youtubeService } from "../youtubeService";
import { trendsService } from "../trendsService";

export function registerSystemRoutes(app: Express) {
    app.get('/api/health', (_req, res) => {
        res.json({ ok: true, timestamp: new Date().toISOString() });
    });

    app.get('/api/version', (_req, res) => {
        res.json({ version: '1.0.1', status: 'healthy', env: process.env.NODE_ENV });
    });

    app.get('/api/ready', (_req, res) => {
        try {
            const yt = youtubeService.getInfo();
            const tr = trendsService.getInfo();
            res.json({ ok: true, ready: (yt.latest + yt.popular) > 0, yt, trends: tr });
        } catch {
            res.json({ ok: true, ready: false });
        }
    });
}
