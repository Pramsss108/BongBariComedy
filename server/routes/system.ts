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
            // Phase 14: Tier counts
            const platinumCount = proxies.filter(p => p.platforms.tier === 'platinum').length;
            const goldCount     = proxies.filter(p => p.platforms.tier === 'gold').length;
            const bronzeCount   = proxies.filter(p => !p.platforms.tier || p.platforms.tier === 'bronze' || p.platforms.tier === 'silver').length;
            // Phase 11: Average latency
            const withLatency = proxies.filter(p => typeof p.platforms.latencyMs === 'number');
            const avgLatency  = withLatency.length ? Math.round(withLatency.reduce((s, p) => s + (p.platforms.latencyMs || 0), 0) / withLatency.length) : 0;
            // Country distribution
            const countryMap: Record<string, number> = {};
            proxies.forEach(p => { const c = p.platforms?.country || 'XX'; countryMap[c] = (countryMap[c] || 0) + 1; });
            const countryCount = Object.keys(countryMap).filter(c => c !== 'XX').length;
            // Dead / near-dead counts (for UI health display)
            const deadProxyCount  = proxies.filter(p => (p.platforms.failCount || 0) >= 2).length;
            const nearDeadCount   = proxies.filter(p => (p.platforms.failCount || 0) === 1).length;
            res.json({
                activeNodes: proxies.length,
                proxies: proxies.slice(0, 200),
                platformCounts: { yt: ytCount, fb: fbCount, ig: igCount, allThree },
                tierCounts: { platinum: platinumCount, gold: goldCount, bronze: bronzeCount },
                avgLatency,
                countryCount,
                countryMap,
                isHunting: ProxyScraper.isHunting,
                isRevalidating: ProxyScraper.isRevalidating,
                isForceRevalidating: ProxyScraper.isForceRevalidating,
                huntDetails: ProxyScraper.huntDetails,
                lastRevalidatedAt: ProxyScraper.lastRevalidatedAt?.toISOString() ?? null,
                nextHuntAt: ProxyScraper.nextHuntAt?.toISOString() ?? null,
                nextRevalAt: ProxyScraper.nextRevalAt?.toISOString() ?? null,
                powerMode: ProxyScraper.powerMode,
                deadProxyCount,
                nearDeadCount,
                logs: ProxyScraper.logBuffer.slice(0, 50),
                localSyncLogs: ProxyScraper.localSyncBuffer.slice(0, 30),
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

    // ── Manual Revalidation Trigger ──
    app.post('/api/admin/proxy-revalidate', async (_req, res) => {
        try {
            if (ProxyScraper.isRevalidating) {
                return res.status(400).json({ message: "Revalidation already in progress." });
            }
            ProxyScraper.runRevalidation();
            res.json({ message: "Revalidation started.", status: 'started' });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    // ── Power Mode Toggle (future: GPU/VPS turbo) ──
    app.post('/api/admin/proxy-power-mode', async (req, res) => {
        try {
            const { enabled } = req.body as { enabled?: boolean };
            ProxyScraper.powerMode = !!enabled;
            console.log(`[PowerMode] ${ProxyScraper.powerMode ? 'ENABLED' : 'DISABLED'}`);
            res.json({ powerMode: ProxyScraper.powerMode });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    // ── Real Backend Logs ──
    app.get('/api/admin/proxy-logs', (_req, res) => {
        res.json({ logs: ProxyScraper.logBuffer });
    });

    // ── VPS Health Check ──
    app.get('/api/admin/proxy-vps-health', async (_req, res) => {
        const hetznerUrl = process.env.HETZNER_VERIFIER_URL || 'http://78.47.104.43:6000';
        let hetznerOk = false;
        let localRustOk = false;
        try {
            const h = await fetch(`${hetznerUrl}/health`, { signal: AbortSignal.timeout(5000) });
            hetznerOk = h.ok;
        } catch { /* unreachable */ }
        try {
            const l = await fetch('http://127.0.0.1:6000/health', { signal: AbortSignal.timeout(3000) });
            localRustOk = l.ok;
        } catch { /* not running */ }
        res.json({
            hetzner: { url: hetznerUrl, online: hetznerOk },
            localRust: { port: 6000, online: localRustOk },
            powerMode: ProxyScraper.powerMode,
        });
    });

    // ── Force Geo Re-Enrichment ──
    app.post('/api/admin/proxy-geo-enrich', async (_req, res) => {
        try {
            await ProxyScraper.enrichExistingProxies();
            const proxies = await (await import('../proxyService')).ProxyKitchen.getLiveProxies();
            const enriched = proxies.filter(p => p.platforms.country && p.platforms.country !== 'XX').length;
            res.json({ success: true, enriched, message: 'Geo enrichment complete' });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    // ── Force Revalidate ALL proxies (ignores tier intervals) ──
    app.post('/api/admin/proxy-force-revalidate-all', async (_req, res) => {
        try {
            if (ProxyScraper.isForceRevalidating || ProxyScraper.isRevalidating || ProxyScraper.isHunting) {
                return res.status(400).json({ message: 'Another operation already in progress.' });
            }
            ProxyScraper.forceRevalidateAll();
            res.json({ message: 'Force-revalidation of ALL proxies started. This may take several minutes.', status: 'started' });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    // ── Purge Dead Proxies ──
    app.post('/api/admin/proxy-purge-dead', async (_req, res) => {
        try {
            const result = await ProxyScraper.purgeDeadProxies();
            res.json({ ok: true, purged: result.purged });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    // ── Beast Mode Sync: Local machine harvests → bulk-uploads to server pool ──
    app.post('/api/admin/proxy-bulk-import', async (req, res) => {
        try {
            const { entries, secret } = req.body as {
                entries: Array<{ url: string; platforms: { yt: boolean; fb: boolean; ig: boolean } }>;
                secret?: string;
            };

            // Simple shared-secret guard (set BEAST_MODE_SECRET in server .env)
            const expectedSecret = process.env.BEAST_MODE_SECRET;
            if (expectedSecret && secret !== expectedSecret) {
                return res.status(401).json({ error: 'Unauthorized: invalid secret' });
            }

            if (!Array.isArray(entries) || entries.length === 0) {
                return res.status(400).json({ error: 'entries must be a non-empty array' });
            }
            if (entries.length > 50_000) {
                return res.status(413).json({ error: 'Max 50 000 entries per batch' });
            }

            const result = await ProxyKitchen.bulkImport(entries);
            console.log(`[BeastMode] Bulk import complete — +${result.added} added, ${result.skipped} dupes`);
            // Log to local sync buffer so UI can show local activity separately
            ProxyScraper.pushLocalSyncLog('success', `LOCAL SYNC: +${result.added} VERIFIED | ${result.skipped} DUPES | TOTAL: ${entries.length}`);
            ProxyScraper.pushLocalSyncLog('init', `LOCAL MACHINE UPLOAD FROM ${req.ip || 'UNKNOWN IP'}`);
            res.json({ ok: true, added: result.added, skipped: result.skipped, total: entries.length });
        } catch (error: any) {
            console.error('[BeastMode] Bulk import error:', error);
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
