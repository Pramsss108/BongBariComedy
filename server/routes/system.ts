import { Express } from "express";
import { youtubeService } from "../youtubeService";
import { trendsService } from "../trendsService";
import { ProxyKitchen } from "../proxyService";
import { ProxyScraper } from "../proxyScraperService";
import { getLocalPcUrl, setLocalPcUrl } from "../rustVerifier";
import { getStealthStatus } from "../stealthEngine";
import { spawn, ChildProcess } from 'child_process';
import { join } from 'path';

// ── Beast Process Manager ────────────────────────────────────
let beastProcess: ChildProcess | null = null;
let beastRunning = false;

function startBeastProcess(apiBase: string): { ok: boolean; msg: string } {
    if (beastProcess && beastRunning) return { ok: false, msg: 'Beast already running' };
    const scriptPath = join(process.cwd(), 'beast_harvest.mjs');
    const child = spawn('node', [scriptPath, '--mode=server', `--api=${apiBase}`], {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false,
        env: { ...process.env, BEAST_API_BASE: apiBase },
    });
    beastProcess = child;
    beastRunning = true;
    child.stdout?.on('data', (d: Buffer) => {
        const line = d.toString().trim();
        if (line) console.log(`[BEAST] ${line}`);
    });
    child.stderr?.on('data', (d: Buffer) => {
        const line = d.toString().trim();
        if (line) console.error(`[BEAST-ERR] ${line}`);
    });
    child.on('exit', (code) => {
        console.log(`[BEAST] Process exited (code ${code})`);
        beastProcess = null;
        beastRunning = false;
        setLocalPcUrl('');
        ProxyScraper.pushLocalSyncLog('error', `🛑 BEAST PROCESS EXITED (code ${code})`);
    });
    ProxyScraper.pushLocalSyncLog('init', `🚀 BEAST PROCESS SPAWNED — PID ${child.pid}`);
    return { ok: true, msg: `Beast started (PID ${child.pid})` };
}

function stopBeastProcess(): { ok: boolean; msg: string } {
    if (!beastProcess || !beastRunning) return { ok: false, msg: 'Beast not running' };
    const pid = beastProcess.pid;
    beastProcess.kill('SIGINT');
    beastProcess = null;
    beastRunning = false;
    setLocalPcUrl('');
    ProxyScraper.pushLocalSyncLog('error', `🛑 BEAST STOPPED FROM UI (PID ${pid})`);
    return { ok: true, msg: `Beast stopped (PID ${pid})` };
}

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
            const queueSize = await ProxyKitchen.getRawQueueSize();
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
                isVerifyingQueue: ProxyScraper.isVerifyingQueue,
                huntDetails: ProxyScraper.huntDetails,
                lastRevalidatedAt: ProxyScraper.lastRevalidatedAt?.toISOString() ?? null,
                nextHuntAt: ProxyScraper.nextHuntAt?.toISOString() ?? null,
                nextRevalAt: ProxyScraper.nextRevalAt?.toISOString() ?? null,
                powerMode: ProxyScraper.powerMode,
                cloudVerifyPaused: ProxyScraper.cloudVerifyPaused,
                beastRunning,
                localPcUrl: getLocalPcUrl(),
                deadProxyCount,
                nearDeadCount,
                // Phase 20: raw unverified queue size — decrements as proxies are verified
                // Also includes in-memory pendingBuffer (fallback when Redis push fails)
                queueSize: queueSize + ProxyScraper.pendingBuffer.length,
                queueRedis: queueSize,
                queueMemory: ProxyScraper.pendingBuffer.length,
                logs: ProxyScraper.logBuffer.slice(0, 50),
                localSyncLogs: ProxyScraper.localSyncBuffer.slice(0, 30),
                sourceHealth: ProxyScraper.getSourceHealth(),
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
            // ── Route to local beast first (residential IP = better scrape rate) ──
            const localUrl = getLocalPcUrl();
            if (localUrl) {
                try {
                    const localRes = await fetch(`${localUrl}/hunt`, {
                        method: 'POST',
                        signal: AbortSignal.timeout(5000),
                    });
                    const json = await localRes.json() as { ok: boolean; msg?: string };
                    if (json.ok) {
                        ProxyScraper.pushLocalSyncLog('init', `🔥 LOCAL HUNT TRIGGERED via ${localUrl} (residential IP)`);
                        return res.json({ message: 'Local Beast Hunt Started — using residential IP. Deduped against cloud pool.', source: 'local', status: 'started' });
                    }
                } catch {
                    ProxyScraper.pushLocalSyncLog('error', '⚠️ Local beast unreachable — falling back to cloud hunt (datacenter IP)');
                }
            }
            // ── Cloud fallback (Render datacenter IP) ──
            ProxyScraper.runHunt();
            res.json({ message: 'Proxy Hunt Initiated (cloud mode). This may take 2-4 minutes.', status: 'started', source: 'cloud' });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    // ── Phase 21: Manual Verify-Queue Trigger (drain pending SET) ──
    app.post('/api/admin/proxy-verify-queue', async (_req, res) => {
        try {
            if (ProxyScraper.isVerifyingQueue) {
                return res.status(400).json({ message: "Queue verification already running." });
            }
            if (ProxyScraper.cloudVerifyPaused) {
                return res.status(200).json({ message: "Cloud verify is PAUSED — raw queue reserved for local beast. Unpause to verify from cloud.", cloudVerifyPaused: true });
            }
            const queueSize = await ProxyKitchen.getRawQueueSize();
            const memSize = ProxyScraper.pendingBuffer.length;
            const total = queueSize + memSize;
            if (total === 0) {
                return res.status(200).json({ message: "Pending queue is empty — nothing to verify.", queueSize: 0 });
            }
            ProxyScraper.runVerifyQueue();
            res.json({ message: `Verify Queue started — ${total.toLocaleString()} candidates pending (redis:${queueSize}, memory:${memSize}).`, queueSize: total, status: 'started' });
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
        const rustPort = parseInt(process.env.RUST_VERIFIER_PORT ?? '6100', 10);
        let hetznerOk = false;
        let localRustOk = false;
        // Use node:http to avoid undici port restrictions (port 6000 = X11 restricted)
        const http = await import('http');
        const probe = (url: string, timeoutMs: number): Promise<boolean> =>
            new Promise((resolve) => {
                const parsed = new URL(url);
                const req = http.request(
                    { hostname: parsed.hostname, port: parsed.port || 80, path: '/health', method: 'GET', timeout: timeoutMs },
                    (r) => { r.resume(); resolve((r.statusCode ?? 0) >= 200 && (r.statusCode ?? 0) < 300); }
                );
                req.on('timeout', () => { req.destroy(); resolve(false); });
                req.on('error', () => resolve(false));
                req.end();
            });
        hetznerOk = await probe(hetznerUrl, 5000);
        localRustOk = await probe(`http://127.0.0.1:${rustPort}`, 3000);
        res.json({
            hetzner: { url: hetznerUrl, online: hetznerOk },
            localRust: { port: rustPort, online: localRustOk },
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

    // ── Phase 22: Download Live Pool as JSON ──
    app.get('/api/admin/proxy-download-live', async (req, res) => {
        const secret = (req.query.secret as string) || req.headers['x-beast-secret'] as string;
        const expected = process.env.BEAST_MODE_SECRET || 'beastmode';
        if (secret !== expected) return res.status(403).json({ error: 'Unauthorized' });
        try {
            const proxies = await ProxyKitchen.getLiveProxies();
            res.setHeader('Content-Disposition', 'attachment; filename="live-proxies.json"');
            res.json(proxies);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    // ── Phase 21: Download Raw Candidate Queue (paginated) ──
    app.get('/api/admin/proxy-download-queue', async (_req, res) => {
        try {
            const queueSize = await ProxyKitchen.getRawQueueSize();
            res.json({ queueSize, message: `Raw candidate queue has ${queueSize.toLocaleString()} untested proxies` });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    // ── Phase 29: BIN Management Endpoints ──
    // Get all binned (soft-deleted) proxies
    app.get('/api/admin/proxy-bin', async (_req, res) => {
        try {
            const binned = await ProxyKitchen.getBinnedProxies();
            res.json({ count: binned.length, proxies: binned });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    // Restore a specific proxy from BIN back to live pool
    app.post('/api/admin/proxy-restore-bin', async (req, res) => {
        try {
            const { url } = req.body as { url?: string };
            if (!url) return res.status(400).json({ error: 'url is required' });
            const restored = await ProxyKitchen.restoreFromBin(url);
            if (restored) {
                res.json({ ok: true, message: `Restored ${url} from BIN to live pool` });
            } else {
                res.status(404).json({ error: 'Proxy not found in BIN' });
            }
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    // Purge expired BIN entries (older than 24h by default)
    app.post('/api/admin/proxy-purge-bin', async (req, res) => {
        try {
            const { maxAgeHours } = req.body as { maxAgeHours?: number };
            const result = await ProxyKitchen.purgeBinExpired(maxAgeHours || 24);
            res.json({ ok: true, purged: result.purged });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    // Bulk-add failed proxies to BIN (used by beast BOOST mode)
    app.post('/api/admin/proxy-bulk-bin', async (req, res) => {
        try {
            const { proxies, secret } = req.body as { proxies?: string[]; secret?: string };
            const expected = process.env.BEAST_MODE_SECRET || 'beastmode';
            if (secret !== expected) return res.status(403).json({ error: 'Invalid secret' });
            if (!proxies || !Array.isArray(proxies) || proxies.length === 0) {
                return res.status(400).json({ error: 'proxies array is required' });
            }
            const binned = await ProxyKitchen.bulkAddToBin(proxies);
            res.json({ ok: true, binned });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    // RESCUE: Move all BIN entries back to raw queue so they can be re-verified
    // Use this when proxies were accidentally binned (e.g. Rust was offline during boost)
    app.post('/api/admin/proxy-rescue-bin', async (req, res) => {
        try {
            const { secret } = req.body as { secret?: string };
            const expected = process.env.BEAST_MODE_SECRET || 'beastmode';
            if (secret !== expected) return res.status(403).json({ error: 'Invalid secret' });

            const result = await ProxyKitchen.rescueBinToRawQueue();
            ProxyScraper.pushLocalSyncLog('success', `🚑 RESCUED ${result.rescued.toLocaleString()} proxies from BIN → Raw Queue (ready to re-verify)`);
            res.json({ ok: true, ...result });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    // ── Phase 23-26: Beast Harvest Queue Endpoints ──
    // Push raw proxy candidates to queue (Mode H uses this)
    app.post('/api/admin/proxy-bulk-raw-queue', async (req, res) => {
        try {
            const { proxies, secret } = req.body as { proxies?: string[]; secret?: string };
            const expected = process.env.BEAST_MODE_SECRET || 'beastmode';
            if (secret !== expected) return res.status(403).json({ error: 'Invalid secret' });
            if (!proxies || !Array.isArray(proxies) || proxies.length === 0) {
                return res.status(400).json({ error: 'proxies array is required' });
            }
            const pushed = await ProxyKitchen.pushToRawQueue(proxies);
            // If Redis is down, pushed===0 but proxies are lost — return 503 so beast can retry
            if (pushed === 0) return res.status(503).json({ ok: false, error: 'Redis unavailable — retry', pushed: 0, total: proxies.length });
            res.json({ ok: true, pushed, total: proxies.length });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    // Pop raw proxy candidates from queue (Mode A uses this)
    app.post('/api/admin/proxy-pop-queue', async (req, res) => {
        try {
            const { count, secret } = req.body as { count?: number; secret?: string };
            const expected = process.env.BEAST_MODE_SECRET || 'beastmode';
            if (secret !== expected) return res.status(403).json({ error: 'Invalid secret' });
            const proxies = await ProxyKitchen.popFromRawQueue(count || 5000);
            res.json({ ok: true, proxies, count: proxies.length });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    // ── P27: Local PC Verifier URL Config ──
    app.get('/api/admin/proxy-local-pc', (_req, res) => {
        res.json({ url: getLocalPcUrl() });
    });
    app.post('/api/admin/proxy-local-pc', (req, res) => {
        const { url } = req.body as { url?: string };
        const prev = getLocalPcUrl();
        setLocalPcUrl(url || '');
        // Only log on actual state change — not on every 25s heartbeat ping
        if (url && url !== prev) {
            ProxyScraper.pushLocalSyncLog('init', `🏠 LOCAL BEAST REGISTERED: ${url}`);
        } else if (!url && prev) {
            ProxyScraper.pushLocalSyncLog('error', '🛑 LOCAL BEAST DEREGISTERED — cloud reverted to standard mode');
        }
        res.json({ ok: true, url: getLocalPcUrl() });
    });

    // ── beast_harvest.mjs server mode pushes sync log entries here ──
    app.post('/api/admin/proxy-local-sync-log', (req, res) => {
        const { msg, type } = req.body as { msg?: string; type?: string };
        if (msg) ProxyScraper.pushLocalSyncLog(type || 'info', String(msg).slice(0, 300));
        res.json({ ok: true });
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

    // ── Stealth Engine Status ──
    app.get('/api/admin/proxy-stealth-status', (_req, res) => {
        res.json(getStealthStatus());
    });

    // ── Source Health Audit (manual trigger + results) ──
    app.post('/api/admin/proxy-audit-sources', async (_req, res) => {
        try {
            const result = await ProxyScraper.auditSourceHealth();
            res.json({ ok: true, ...result });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    // ── Beast Start/Stop (spawn/kill beast_harvest.mjs from backend) ──
    app.post('/api/admin/beast-start', (_req, res) => {
        const protocol = _req.protocol;
        const host = _req.get('host') || 'localhost:5000';
        const apiBase = `${protocol}://${host}`;
        const result = startBeastProcess(apiBase);
        res.json(result);
    });
    app.post('/api/admin/beast-stop', (_req, res) => {
        const result = stopBeastProcess();
        res.json(result);
    });

    // ── Cloud Verify Pause Toggle ──
    // When paused, cloud auto-verify skips — raw queue is reserved for local beast
    app.post('/api/admin/proxy-cloud-verify-toggle', (req, res) => {
        const { paused } = req.body as { paused?: boolean };
        ProxyScraper.cloudVerifyPaused = !!paused;
        const state = ProxyScraper.cloudVerifyPaused ? 'PAUSED' : 'ACTIVE';
        ProxyScraper.pushLocalSyncLog('init', `☁️ CLOUD VERIFY ${state} — ${ProxyScraper.cloudVerifyPaused ? 'raw queue reserved for local' : 'cloud will auto-verify'}`);
        console.log(`[CloudVerify] ${state}`);
        res.json({ ok: true, cloudVerifyPaused: ProxyScraper.cloudVerifyPaused });
    });

    // ── Pull raw candidates from cloud (local beast Mode A uses this) ──
    // Pulls from pendingBuffer first, then Redis. Returns candidates for local verification.
    app.post('/api/admin/proxy-pull-raw', async (req, res) => {
        try {
            const { count, secret } = req.body as { count?: number; secret?: string };
            const expected = process.env.BEAST_MODE_SECRET || 'beastmode';
            if (secret !== expected) return res.status(403).json({ error: 'Invalid secret' });
            const want = Math.min(count || 5000, 10000);
            const pulled: string[] = [];

            // Phase 1: drain memory buffer first (faster, no Redis calls)
            if (ProxyScraper.pendingBuffer.length > 0) {
                const memPull = ProxyScraper.pendingBuffer.splice(0, want);
                pulled.push(...memPull);
            }

            // Phase 2: if still need more, pull from Redis
            if (pulled.length < want) {
                const remaining = want - pulled.length;
                const redisPull = await ProxyKitchen.popFromRawQueue(remaining);
                pulled.push(...redisPull);
            }

            if (pulled.length > 0) {
                ProxyScraper.pushLocalSyncLog('init', `📦 LOCAL PULLED ${pulled.length.toLocaleString()} RAW CANDIDATES (${ProxyScraper.pendingBuffer.length} remaining in memory)`);
            }
            const rawRemaining = ProxyScraper.pendingBuffer.length + await ProxyKitchen.getRawQueueSize();
            res.json({ ok: true, proxies: pulled, count: pulled.length, rawRemaining });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });
}
