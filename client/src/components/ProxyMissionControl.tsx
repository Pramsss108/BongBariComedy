/**
 * ============================================================
 * TACTICAL COMMAND — Proxy Mission Control v4.0
 * ============================================================
 * Design: "Obsidian Lens" — Premium HUD, High Readability
 * Layout: 5 Tabs (HOME | HUNT | VALIDATE | DATA | SYSTEM)
 *   HOME:     Globe + Overview + Health + Tiers + Timers
 *   HUNT:     OSINT Mining + Beast Sync + Cloud Log
 *   VALIDATE: Revalidation + BIN + Purge + Data Control
 *   DATA:     Proxy table + Geo map + Tier donut
 *   SYSTEM:   Config grid + VPS + Stealth + Integrations
 * ============================================================
 */
import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// ─── Types ───────────────────────────────────────────────────────────
interface PlatformData {
  yt: boolean; fb: boolean; ig: boolean;
  latencyMs?: number; country?: string;
  failCount?: number; lastCheckedAt?: string;
  tier?: "platinum" | "gold" | "silver" | "bronze";
}
interface ProxyEntry { url: string; platforms: PlatformData; }
interface HuntDetails {
  status: string; progress: number; total: number;
  found: number; mined: number; skipped: number;
  huntCount: number; totalEverFound: number;
  lastHuntAt: string | null; nextHuntAt: string | null;
  lastMined?: number; // persisted mine count from last hunt (doesn't reset to 0)
}
interface ProxyStatusData {
  activeNodes: number; proxies: ProxyEntry[];
  platformCounts: { yt: number; fb: number; ig: number; allThree: number };
  tierCounts: { platinum: number; gold: number; bronze: number };
  avgLatency: number; isHunting: boolean; isRevalidating: boolean;
  isForceRevalidating: boolean; isVerifyingQueue: boolean;
  huntDetails: HuntDetails; lastRevalidatedAt: string | null;
  nextHuntAt: string | null; nextRevalAt: string | null;
  powerMode: boolean; cloudVerifyPaused: boolean; beastRunning: boolean; localPcUrl: string;
  countryCount: number; countryMap: Record<string, number>;
  deadProxyCount: number; nearDeadCount: number;
  // Phase 20: persistent raw unverified queue (decrements as verified)
  queueSize: number;
  queueRedis?: number;  // how many are in Redis SET
  queueMemory?: number; // how many are in pendingBuffer (RAM fallback when Redis fails)
  sourceHealth?: Record<string, { active: string; failCount: number; degraded: boolean }>;
  logs: Array<{ time: string; type: string; msg: string }>;
  localSyncLogs: Array<{ time: string; type: string; msg: string }>;
}

// ─── Design Tokens (Obsidian Lens) ───────────────────────────────────
const C = {
  bg: "#0a0a0f", panel: "rgba(255,255,255,0.03)", panelBorder: "rgba(255,255,255,0.06)",
  primary: "#4cd7f6", secondary: "#4edea3", tertiary: "#ffb3ad",
  gold: "#FFD700", bronze: "#FF8C00", powerGreen: "#00ff88",
  textPrimary: "rgba(228,225,233,0.9)", textSecondary: "rgba(228,225,233,0.4)",
  textTertiary: "rgba(228,225,233,0.2)",
};
const TIER_COLORS: Record<string, string> = { platinum: C.primary, gold: C.gold, bronze: C.bronze };
const COUNTRY_FLAGS: Record<string, string> = {
  US: "🇺🇸", DE: "🇩🇪", FR: "🇫🇷", BR: "🇧🇷", IN: "🇮🇳", RU: "🇷🇺",
  CN: "🇨🇳", JP: "🇯🇵", GB: "🇬🇧", KR: "🇰🇷", AU: "🇦🇺", CA: "🇨🇦",
  NL: "🇳🇱", SG: "🇸🇬", UA: "🇺🇦", PL: "🇵🇱", TR: "🇹🇷", ID: "🇮🇩",
  VN: "🇻🇳", HK: "🇭🇰", TH: "🇹🇭", MX: "🇲🇽", AR: "🇦🇷", CL: "🇨🇱",
  CO: "🇨🇴", EG: "🇪🇬", ZA: "🇿🇦", NG: "🇳🇬", KE: "🇰🇪", XX: "🌐",
};
const COUNTRY_NAMES: Record<string, string> = {
  US: "United States", DE: "Germany", FR: "France", BR: "Brazil", IN: "India",
  RU: "Russia", CN: "China", JP: "Japan", GB: "United Kingdom", KR: "South Korea",
  AU: "Australia", CA: "Canada", NL: "Netherlands", SG: "Singapore", UA: "Ukraine",
  PL: "Poland", TR: "Turkey", ID: "Indonesia", VN: "Vietnam", HK: "Hong Kong",
  TH: "Thailand", MX: "Mexico", AR: "Argentina", CL: "Chile", CO: "Colombia",
  EG: "Egypt", ZA: "South Africa", NG: "Nigeria", KE: "Kenya", XX: "Unknown",
};
const COUNTRY_COORDS: Record<string, [number, number]> = {
  US: [250, 160], DE: [510, 130], FR: [490, 145], BR: [330, 290],
  IN: [660, 210], RU: [620, 100], CN: [700, 165], JP: [770, 155],
  GB: [485, 120], KR: [745, 155], AU: [770, 330], CA: [240, 120],
  NL: [500, 120], SG: [720, 255], UA: [560, 130], PL: [530, 125],
  TR: [565, 160], ID: [730, 270], VN: [720, 220], HK: [730, 200],
  TH: [710, 225], MX: [215, 210], AR: [310, 340], CL: [290, 330],
  CO: [280, 250], EG: [555, 195], ZA: [545, 330], NG: [505, 240],
  KE: [570, 260], XX: [450, 200],
};

function countryFlag(c?: string) { return COUNTRY_FLAGS[c ?? "XX"] ?? "🌐"; }
function formatCountdown(diffMs: number): string {
  if (diffMs <= 0) return "00:00:00";
  const h = Math.floor(diffMs / 3600000);
  const m = Math.floor((diffMs % 3600000) / 60000);
  const s = Math.floor((diffMs % 60000) / 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
function timeAgo(iso?: string | null) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return `${Math.floor(diff / 1000)}s`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(h / 24);
  return d > 0 ? `${d}D ${h % 24}H` : `${h}h`;
}

// ─── Glass Panel wrapper ─────────────────────────────────────────────
function Glass({ children, className = "", glow, style }: { children: React.ReactNode; className?: string; glow?: string; style?: React.CSSProperties }) {
  return (
    <div className={className} style={{
      background: C.panel, backdropFilter: "blur(24px)",
      outline: `1px solid ${C.panelBorder}`,
      boxShadow: glow ? `0 0 24px ${glow}` : undefined,
      ...style,
    }}>
      {children}
    </div>
  );
}
function Label({ children }: { children: React.ReactNode }) {
  return <span style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.06em", opacity: 0.5, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>{children}</span>;
}

// ─── SVG Donut Chart ─────────────────────────────────────────────────
function DonutChart({ tiers, total }: { tiers: { label: string; value: number; color: string }[]; total: number }) {
  const r = 15.915; const strokeWidth = 3;
  if (total === 0) return (
    <svg viewBox="0 0 36 36" className="w-full h-full" style={{ transform: "rotate(-90deg)" }}>
      <circle cx="18" cy="18" r={r} fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth={strokeWidth} />
    </svg>
  );
  let offset = 0;
  return (
    <svg viewBox="0 0 36 36" className="w-full h-full" style={{ transform: "rotate(-90deg)" }}>
      <circle cx="18" cy="18" r={r} fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth={strokeWidth} />
      {tiers.filter(t => t.value > 0).map((t, i) => {
        const pct = (t.value / total) * 100;
        const seg = <circle key={i} cx="18" cy="18" r={r} fill="transparent"
          stroke={t.color} strokeWidth={strokeWidth}
          strokeDasharray={`${pct} ${100 - pct}`}
          strokeDashoffset={`${-offset}`} />;
        offset += pct;
        return seg;
      })}
    </svg>
  );
}

// ─── SVG World Map with Live Geo Dots ────────────────────────────────
function WorldMap({ proxies }: { proxies: ProxyEntry[] }) {
  const [tooltip, setTooltip] = useState<{ cc: string; count: number; x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const geoCount = useMemo(() => {
    const m: Record<string, number> = {};
    proxies.forEach(p => { const c = p.platforms?.country || "XX"; m[c] = (m[c] || 0) + 1; });
    return m;
  }, [proxies]);
  const maxCount = Math.max(...Object.values(geoCount), 1);
  return (
    <div className="relative w-full h-full">
      <svg viewBox="0 0 900 450" className="w-full h-full" style={{ opacity: 0.35 }}>
        <g fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5">
          <path d="M120,80 L280,80 L310,110 L320,160 L300,200 L260,220 L210,240 L180,220 L160,180 L140,150 L120,120 Z" />
          <path d="M250,240 L310,250 L340,280 L350,320 L340,360 L320,390 L290,400 L270,380 L260,340 L250,300 Z" />
          <path d="M460,80 L550,80 L560,100 L570,130 L540,150 L520,140 L500,150 L480,140 L470,120 L460,100 Z" />
          <path d="M470,170 L550,170 L570,200 L580,250 L570,310 L550,350 L520,360 L490,340 L480,300 L470,250 L460,200 Z" />
          <path d="M560,70 L780,70 L800,100 L790,150 L770,180 L740,200 L700,210 L660,220 L620,200 L590,170 L570,140 L560,100 Z" />
          <path d="M720,280 L800,280 L810,310 L800,350 L770,360 L740,340 L720,310 Z" />
        </g>
      </svg>
      <svg ref={svgRef} viewBox="0 0 900 450" className="absolute inset-0 w-full h-full" style={{ overflow: "visible" }}>
        {Object.entries(geoCount).map(([cc, count]) => {
          const coords = COUNTRY_COORDS[cc]; if (!coords) return null;
          const intensity = Math.min(count / maxCount, 1);
          const dotR = 2 + intensity * 4;
          const flag = COUNTRY_FLAGS[cc] ?? "🌐";
          const name = COUNTRY_NAMES[cc] ?? cc;
          return (
            <g key={cc} style={{ cursor: "pointer" }}
              onMouseEnter={(e) => {
                const svg = svgRef.current;
                if (!svg) return;
                const rect = svg.getBoundingClientRect();
                const scaleX = rect.width / 900;
                const scaleY = rect.height / 450;
                setTooltip({ cc, count, x: coords[0] * scaleX, y: coords[1] * scaleY - 16 });
              }}
              onMouseLeave={() => setTooltip(null)}
            >
              <circle cx={coords[0]} cy={coords[1]} r={dotR + 8} fill="transparent" />
              <circle cx={coords[0]} cy={coords[1]} r={dotR + 6} fill={`rgba(76,215,246,${0.08 + intensity * 0.12})`} />
              <circle cx={coords[0]} cy={coords[1]} r={dotR} fill={`rgba(76,215,246,${0.6 + intensity * 0.4})`}
                style={{ filter: `drop-shadow(0 0 ${4 + intensity * 8}px rgba(76,215,246,0.9))` }}>
                {count >= 3 && <animate attributeName="r" values={`${dotR};${dotR + 1};${dotR}`} dur="2s" repeatCount="indefinite" />}
              </circle>
              <title>{`${flag} ${name}: ${count} ${count === 1 ? "proxy" : "proxies"}`}</title>
            </g>
          );
        })}
      </svg>
      {tooltip && (
        <div style={{
          position: "absolute",
          left: tooltip.x, top: tooltip.y,
          transform: "translate(-50%, -100%)",
          background: "rgba(10,10,15,0.95)",
          border: "1px solid rgba(76,215,246,0.4)",
          borderRadius: 8,
          padding: "6px 12px",
          pointerEvents: "none",
          whiteSpace: "nowrap",
          zIndex: 10,
          boxShadow: "0 0 16px rgba(76,215,246,0.2)",
        }}>
          <span style={{ fontSize: 13, fontFamily: "monospace", color: "#4cd7f6", fontWeight: 700 }}>
            {COUNTRY_FLAGS[tooltip.cc] ?? "🌐"} {COUNTRY_NAMES[tooltip.cc] ?? tooltip.cc}
          </span>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginLeft: 8 }}>
            {tooltip.count} {tooltip.count === 1 ? "proxy" : "proxies"}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Geo Distribution ────────────────────────────────────────────────
function GeoDistribution({ proxies, limit = 8 }: { proxies: ProxyEntry[]; limit?: number }) {
  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    proxies.forEach(p => { const c = p.platforms?.country || "XX"; m[c] = (m[c] || 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, limit);
  }, [proxies, limit]);
  const max = counts[0]?.[1] || 1;
  if (counts.length === 0) return <p style={{ opacity: 0.2, fontSize: 12, textAlign: "center", padding: 16 }}>No geo data yet</p>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {counts.map(([cc, count]) => (
        <div key={cc} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14, width: 22, flexShrink: 0 }}>{countryFlag(cc)}</span>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "rgba(255,255,255,0.5)", width: 24, flexShrink: 0 }}>{cc}</span>
          <div style={{ flex: 1, height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${(count / max) * 100}%`, background: `linear-gradient(90deg, ${C.secondary}, ${C.primary})`, borderRadius: 2 }} />
          </div>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: C.primary, width: 28, textAlign: "right", fontWeight: 700 }}>{count}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Live Log Feed ───────────────────────────────────────────────────
interface LogEntry { id: number; time: string; type: "success" | "init" | "strike" | "banned" | "log"; msg: string; }
const LOG_COLORS: Record<string, string> = { success: C.secondary, init: C.primary, strike: C.tertiary, banned: "#ef4444", log: "rgba(255,255,255,0.4)" };

function useLiveLogs(data?: ProxyStatusData) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const entryId = useRef(0);
  useEffect(() => {
    if (!data?.logs) return;
    const backendLogs = data.logs.map(l => {
      const logType = (['success', 'init', 'strike', 'banned', 'log'].includes(l.type) ? l.type : 'log') as LogEntry['type'];
      return { id: entryId.current++, time: l.time, type: logType, msg: l.msg };
    });
    if (backendLogs.length > 0) setLogs(backendLogs.slice(0, 50));
  }, [data?.logs]);
  return logs;
}

// ─── Proxy Table Row ─────────────────────────────────────────────────
function ProxyRow({ proxy, idx }: { proxy: ProxyEntry; idx: number }) {
  const proto = proxy.url?.startsWith("socks") ? "SOCKS5" : "HTTP/S";
  const tier = proxy.platforms?.tier ?? "bronze";
  const fails = proxy.platforms?.failCount ?? 0;
  const ms = proxy.platforms?.latencyMs;
  const msColor = !ms ? "rgba(255,255,255,0.2)" : ms < 500 ? C.secondary : ms < 2000 ? C.primary : ms < 5000 ? C.gold : C.tertiary;
  const ip = proxy.url?.replace(/^(socks5?|https?):\/\//, "") ?? "";
  return (
    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", transition: "background 0.2s" }}
      onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
      <td style={{ padding: "6px 10px", fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "rgba(255,255,255,0.25)" }}>#{String(idx + 1).padStart(3, "0")}</td>
      <td style={{ padding: "6px 10px", fontFamily: "'JetBrains Mono',monospace", fontSize: 11, display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 14 }}>{countryFlag(proxy.platforms?.country)}</span>
        <span style={{ opacity: 0.8 }}>{ip}</span>
      </td>
      <td style={{ padding: "6px 10px" }}>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, fontWeight: 700, padding: "2px 6px",
          border: `1px solid ${proto === "SOCKS5" ? "rgba(76,215,246,0.2)" : "rgba(255,255,255,0.1)"}`,
          color: proto === "SOCKS5" ? C.primary : "rgba(255,255,255,0.6)", borderRadius: 3 }}>{proto}</span>
      </td>
      <td style={{ padding: "6px 10px", fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: msColor, textAlign: "right" }}>{ms ? `${ms}ms` : "—"}</td>
      <td style={{ padding: "6px 10px", fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 700, color: TIER_COLORS[tier] ?? C.bronze }}>{tier.toUpperCase()}</td>
      <td style={{ padding: "6px 10px", textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 4 }}>
          {[proxy.platforms?.yt, proxy.platforms?.fb, proxy.platforms?.ig].map((ok, i) => (
            <div key={i} style={{ width: 6, height: 6, borderRadius: "50%",
              background: ok ? C.secondary : "rgba(255,255,255,0.06)",
              boxShadow: ok ? `0 0 4px ${C.secondary}` : "none" }} />
          ))}
        </div>
      </td>
      <td style={{ padding: "6px 10px", textAlign: "center", fontSize: 12 }}>
        {[0, 1, 2].map(i => (
          <span key={i} style={{ color: i < (3 - fails) ? (fails === 0 ? C.secondary : fails === 1 ? C.gold : C.tertiary) : "rgba(255,255,255,0.06)", marginRight: 2 }}>♥</span>
        ))}
      </td>
      <td style={{ padding: "6px 10px", fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "rgba(255,255,255,0.25)", textAlign: "right" }}>{timeAgo(proxy.platforms?.lastCheckedAt)}</td>
    </tr>
  );
}

// ─── BIN Panel (Compact) ─────────────────────────────────────────────
function BinPanel() {
  const { toast } = useToast();
  const [binData, setBinData] = useState<{ count: number; proxies: { url: string; reason: string; deletedAt: string; platforms?: PlatformData }[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [purging, setPurging] = useState(false);
  const fetchBin = async () => { setLoading(true); try { const res = await apiRequest("/api/admin/proxy-bin"); setBinData(res as typeof binData); } catch { /* */ } setLoading(false); };
  useEffect(() => { fetchBin(); }, []);
  const purgeBin = async () => {
    setPurging(true);
    try { const res = await apiRequest("/api/admin/proxy-purge-bin", { method: "POST", body: JSON.stringify({ maxAgeHours: 24 }), headers: { "Content-Type": "application/json" } });
      toast({ title: "🗑️ BIN Purged", description: `${(res as { purged: number }).purged} expired proxies removed.` }); fetchBin();
    } catch (e: unknown) { toast({ title: "Purge Error", description: e instanceof Error ? e.message : "Unknown", variant: "destructive" }); }
    setPurging(false);
  };
  const restoreProxy = async (url: string) => {
    try { await apiRequest("/api/admin/proxy-restore-bin", { method: "POST", body: JSON.stringify({ url }), headers: { "Content-Type": "application/json" } });
      toast({ title: "♻️ Restored", description: `${url} moved back to live pool.` }); fetchBin();
    } catch (e: unknown) { toast({ title: "Restore Error", description: e instanceof Error ? e.message : "Unknown", variant: "destructive" }); }
  };
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 24, fontWeight: 800, color: "#ef4444" }}>{binData?.count ?? 0}</span>
        <span style={{ fontSize: 11, color: C.textSecondary, fontWeight: 600 }}>IN BIN</span>
        <div style={{ flex: 1 }} />
        <button onClick={fetchBin} disabled={loading} style={{ padding: "5px 12px", border: `1px solid rgba(76,215,246,0.2)`, background: "rgba(76,215,246,0.04)", color: C.primary, fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 10, cursor: loading ? "not-allowed" : "pointer", borderRadius: 3 }}>
          {loading ? "..." : "REFRESH"}
        </button>
        <button onClick={purgeBin} disabled={purging} style={{ padding: "5px 12px", border: `1px solid rgba(239,68,68,0.3)`, background: "rgba(239,68,68,0.06)", color: "#ef4444", fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 10, cursor: purging ? "not-allowed" : "pointer", borderRadius: 3 }}>
          🗑️ {purging ? "..." : "PURGE >24H"}
        </button>
      </div>
      {(binData?.proxies ?? []).length === 0 ? (
        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "rgba(255,255,255,0.2)", padding: "8px 0" }}>BIN empty — no banned proxies</div>
      ) : (
        <div style={{ maxHeight: 200, overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <tbody>
              {(binData?.proxies ?? []).slice(0, 30).map((p, i) => (
                <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <td style={{ padding: "4px 8px", fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "rgba(255,255,255,0.5)" }}>{p.url}</td>
                  <td style={{ padding: "4px 8px", fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: "#ef4444" }}>{p.reason || "3-strike"}</td>
                  <td style={{ padding: "4px 8px", textAlign: "right" }}>
                    <button onClick={() => restoreProxy(p.url)} style={{ padding: "2px 8px", border: `1px solid rgba(78,222,163,0.2)`, background: "rgba(78,222,163,0.04)", color: C.secondary, fontFamily: "'JetBrains Mono',monospace", fontSize: 9, cursor: "pointer", borderRadius: 3 }}>♻️ RESTORE</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── VPS Health Row (Compact) ────────────────────────────────────────
function VpsHealthRow() {
  const { toast } = useToast();
  const [health, setHealth] = useState<{ hetzner: { url: string; online: boolean }; localRust: { port: number; online: boolean }; powerMode: boolean } | null>(null);
  const [enriching, setEnriching] = useState(false);
  useEffect(() => {
    const f = async () => { try { const r = await apiRequest("/api/admin/proxy-vps-health"); setHealth(r as typeof health); } catch { /* */ } };
    f(); const id = setInterval(f, 15000); return () => clearInterval(id);
  }, []);
  const triggerEnrich = async () => {
    setEnriching(true);
    try { const r = await apiRequest("/api/admin/proxy-geo-enrich", { method: "POST", body: "{}", headers: { "Content-Type": "application/json" } });
      toast({ title: "🌍 Geo Done", description: `${(r as { enriched: number }).enriched} updated.` });
    } catch (e: unknown) { toast({ title: "Error", description: e instanceof Error ? e.message : "Unknown", variant: "destructive" }); }
    setEnriching(false);
  };
  const dot = (online?: boolean) => (
    <div style={{ width: 10, height: 10, borderRadius: "50%", background: online ? C.secondary : "#ef4444", boxShadow: `0 0 8px ${online ? C.secondary : "#ef4444"}` }} />
  );
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
      <Glass className="p-3" style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {dot(health?.hetzner?.online)}
        <div>
          <div style={{ fontSize: 10, color: C.textSecondary, fontWeight: 600 }}>HETZNER VPS</div>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 14, fontWeight: 700, color: health?.hetzner?.online ? C.secondary : "#ef4444" }}>{health?.hetzner?.online ? "ONLINE" : "OFFLINE"}</div>
        </div>
      </Glass>
      <Glass className="p-3" style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {dot(health?.localRust?.online)}
        <div>
          <div style={{ fontSize: 10, color: C.textSecondary, fontWeight: 600 }}>LOCAL RUST</div>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 14, fontWeight: 700, color: health?.localRust?.online ? C.secondary : "#ef4444" }}>{health?.localRust?.online ? "ONLINE" : "OFFLINE"}</div>
        </div>
      </Glass>
      <button onClick={triggerEnrich} disabled={enriching} style={{
        padding: "8px 10px", border: `1px solid rgba(78,222,163,0.2)`, background: "rgba(78,222,163,0.04)",
        color: C.secondary, fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 12,
        cursor: enriching ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 4,
      }}>
        🌍 {enriching ? "ENRICHING..." : "GEO ENRICH"}
      </button>
    </div>
  );
}

// ─── Compact Action Button ───────────────────────────────────────────
function ActionBtn({ onClick, disabled, label, sub, color, icon }: {
  onClick: () => void; disabled?: boolean; label: string; sub: string; color: string; icon: string;
}) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: "12px 8px", border: `1px solid ${color}33`, background: disabled ? `${color}12` : `${color}08`,
      color, fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 12,
      letterSpacing: "0.06em", textTransform: "uppercase", cursor: disabled ? "not-allowed" : "pointer",
      display: "flex", flexDirection: "column", alignItems: "center", gap: 4, opacity: disabled ? 0.6 : 1,
      transition: "all 0.2s", borderRadius: 4,
    }}>
      <span style={{ fontSize: 20 }}>{icon}</span>
      <span>{label}</span>
      <span style={{ fontSize: 9, opacity: 0.5, fontWeight: 400 }}>{sub}</span>
    </button>
  );
}

// ─── Stat Cell ───────────────────────────────────────────────────────
function StatCell({ label, value, color, sub }: { label: string; value: string | number; color?: string; sub?: string }) {
  return (
    <div style={{ textAlign: "center", padding: "6px 4px" }}>
      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", opacity: 0.45, fontFamily: "'Space Grotesk',sans-serif", fontWeight: 500 }}>{label}</div>
      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 20, fontWeight: 700, color: color || C.textPrimary, lineHeight: 1.2 }}>{value}</div>
      {sub && <div style={{ fontSize: 9, color: C.textSecondary }}>{sub}</div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════
type Section = "home" | "hunt" | "validate" | "data" | "system";
const NAV_ITEMS: { id: Section; label: string; icon: string }[] = [
  { id: "home", label: "HOME", icon: "globe" },
  { id: "hunt", label: "HUNT", icon: "search" },
  { id: "validate", label: "VALIDATE", icon: "verified" },
  { id: "data", label: "DATA", icon: "hub" },
  { id: "system", label: "SYSTEM", icon: "terminal" },
];

interface Props { onClose: () => void; }

export function ProxyMissionControl({ onClose }: Readonly<Props>) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [section, setSection] = useState<Section>("home");
  const [huntCountdown, setHuntCountdown] = useState("—");
  const [revalCountdown, setRevalCountdown] = useState("—");
  const [powerMode, setPowerMode] = useState(false);

  const { data } = useQuery<ProxyStatusData>({
    queryKey: ["/api/admin/proxy-status"],
    refetchInterval: 3000,
  });

  const logs = useLiveLogs(data);

  // ── Countdowns ──────────────────────────────────────────────────────
  useEffect(() => {
    const tick = () => {
      const nextHunt = data?.nextHuntAt || data?.huntDetails?.nextHuntAt;
      if (nextHunt) { const d = new Date(nextHunt).getTime() - Date.now(); setHuntCountdown(d <= 0 ? "IMMINENT" : formatCountdown(d)); }
      else setHuntCountdown("—");
      const nextReval = data?.nextRevalAt;
      if (nextReval) { const d = new Date(nextReval).getTime() - Date.now(); setRevalCountdown(d <= 0 ? "DUE" : formatCountdown(d)); }
      else { const lr = data?.lastRevalidatedAt; if (lr) { const d = new Date(lr).getTime() + 30 * 60_000 - Date.now(); setRevalCountdown(d <= 0 ? "DUE" : formatCountdown(d)); } else setRevalCountdown("—"); }
    };
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id);
  }, [data?.nextHuntAt, data?.huntDetails?.nextHuntAt, data?.nextRevalAt, data?.lastRevalidatedAt]);

  useEffect(() => { if (data?.powerMode !== undefined) setPowerMode(data.powerMode); }, [data?.powerMode]);

  // ── Actions ─────────────────────────────────────────────────────────
  const triggerRevalidation = async () => {
    try { await apiRequest("/api/admin/proxy-revalidate", { method: "POST", body: "{}", headers: { "Content-Type": "application/json" } });
      toast({ title: "🔄 Revalidation Started" }); qc.invalidateQueries({ queryKey: ["/api/admin/proxy-status"] });
    } catch (e: unknown) { toast({ title: "Reval Error", description: e instanceof Error ? e.message : "Unknown", variant: "destructive" }); }
  };
  const triggerForceRevalidateAll = async () => {
    try { await apiRequest("/api/admin/proxy-force-revalidate-all", { method: "POST", body: "{}", headers: { "Content-Type": "application/json" } });
      toast({ title: "⚡ Force-Revalidating ALL" }); qc.invalidateQueries({ queryKey: ["/api/admin/proxy-status"] });
    } catch (e: unknown) { toast({ title: "Error", description: e instanceof Error ? e.message : "Unknown", variant: "destructive" }); }
  };
  const triggerPurgeDead = async () => {
    try { const res = await apiRequest("/api/admin/proxy-purge-dead", { method: "POST", body: "{}", headers: { "Content-Type": "application/json" } });
      toast({ title: `☠️ Purged ${(res as { purged: number }).purged} Dead` }); qc.invalidateQueries({ queryKey: ["/api/admin/proxy-status"] });
    } catch (e: unknown) { toast({ title: "Error", description: e instanceof Error ? e.message : "Unknown", variant: "destructive" }); }
  };
  const togglePowerMode = async () => {
    try { const res = await apiRequest("/api/admin/proxy-power-mode", { method: "POST", body: JSON.stringify({ enabled: !powerMode }), headers: { "Content-Type": "application/json" } });
      const pm = (res as { powerMode: boolean }).powerMode; setPowerMode(pm);
      toast({ title: pm ? "⚡ POWER MODE ON" : "Power Mode Off" });
    } catch (e: unknown) { toast({ title: "Error", description: e instanceof Error ? e.message : "Unknown", variant: "destructive" }); }
  };
  const triggerAuditSources = async () => {
    try { await apiRequest("/api/admin/proxy-audit-sources", { method: "POST", body: "{}", headers: { "Content-Type": "application/json" } });
      toast({ title: "🔬 Source Audit Started", description: "Probing all OSINT sources..." }); qc.invalidateQueries({ queryKey: ["/api/admin/proxy-status"] });
    } catch (e: unknown) { toast({ title: "Audit Error", description: e instanceof Error ? e.message : "Unknown", variant: "destructive" }); }
  };

  // ── LOCAL BEAST lifecycle (start/stop from UI) ──
  const startBeast = async () => {
    try {
      const r = await apiRequest("/api/admin/beast-start", { method: "POST" }) as { ok: boolean; msg: string };
      toast({ title: r.ok ? "🚀 Beast Starting..." : "⚠️ Already Running", description: r.msg });
      // Poll status until beast registers (up to 10s)
      for (let i = 0; i < 10; i++) {
        await new Promise(r => setTimeout(r, 1000));
        qc.invalidateQueries({ queryKey: ["/api/admin/proxy-status"] });
      }
    } catch (e: unknown) { toast({ title: "Error", description: e instanceof Error ? e.message : "Failed to start beast", variant: "destructive" }); }
  };
  const stopBeast = async () => {
    try {
      const r = await apiRequest("/api/admin/beast-stop", { method: "POST" }) as { ok: boolean; msg: string };
      toast({ title: r.ok ? "🛑 Beast Stopped" : "Not Running", description: r.msg });
      qc.invalidateQueries({ queryKey: ["/api/admin/proxy-status"] });
    } catch (e: unknown) { toast({ title: "Error", description: e instanceof Error ? e.message : "Failed to stop beast", variant: "destructive" }); }
  };

  // ── LOCAL BEAST actions (talk directly to local beast HTTP server) ──
  const triggerLocalHunt = async () => {
    const localUrl = data?.localPcUrl;
    if (!localUrl) { toast({ title: "❌ Local Beast Offline", description: "Start beast_harvest.mjs --mode=server first", variant: "destructive" }); return; }
    try {
      const res = await fetch(`${localUrl}/hunt`, { method: "POST" });
      const json = await res.json() as { ok: boolean; msg?: string };
      if (json.ok) { toast({ title: "🏠 Local Hunt Started", description: "Scraping 30 OSINT sources from your residential IP" }); }
      else { toast({ title: "Local Hunt Busy", description: json.msg || "Already running", variant: "destructive" }); }
      qc.invalidateQueries({ queryKey: ["/api/admin/proxy-status"] });
    } catch { toast({ title: "❌ Local Beast Unreachable", description: `Cannot reach ${localUrl}`, variant: "destructive" }); }
  };
  const triggerLocalVerify = async () => {
    const localUrl = data?.localPcUrl;
    if (!localUrl) { toast({ title: "❌ Local Beast Offline", description: "Start beast_harvest.mjs --mode=server first", variant: "destructive" }); return; }
    try {
      const res = await fetch(`${localUrl}/attack`, { method: "POST" });
      const json = await res.json() as { ok: boolean; msg?: string };
      if (json.ok) { toast({ title: "⚡ Local Verify Started", description: "Draining raw queue via Rust 500+ concurrent (residential IP)" }); }
      else { toast({ title: "Local Verify Busy", description: json.msg || "Already running", variant: "destructive" }); }
      qc.invalidateQueries({ queryKey: ["/api/admin/proxy-status"] });
    } catch { toast({ title: "❌ Local Beast Unreachable", description: `Cannot reach ${localUrl}`, variant: "destructive" }); }
  };
  const triggerCloudBoost = async () => {
    const localUrl = data?.localPcUrl;
    if (!localUrl) { toast({ title: "❌ Local Beast Offline", description: "Start beast first to use Cloud Boost", variant: "destructive" }); return; }
    try {
      const res = await fetch(`${localUrl}/boost`, { method: "POST" });
      const json = await res.json() as { ok: boolean; msg?: string };
      if (json.ok) { toast({ title: "🚀 Cloud Boost Started", description: "Pulling ALL cloud raw → local verify → pool/bin" }); }
      else { toast({ title: "Boost Busy", description: json.msg || "Already running", variant: "destructive" }); }
      qc.invalidateQueries({ queryKey: ["/api/admin/proxy-status"] });
    } catch { toast({ title: "❌ Local Beast Unreachable", description: `Cannot reach ${localUrl}`, variant: "destructive" }); }
  };
  const triggerRescueBin = async () => {
    const localUrl = data?.localPcUrl;
    if (!localUrl) { toast({ title: "❌ Local Beast Offline", description: "Start beast first to rescue bin", variant: "destructive" }); return; }
    try {
      const res = await fetch(`${localUrl}/rescue`, { method: "POST" });
      const json = await res.json() as { ok: boolean; msg?: string };
      if (json.ok) { toast({ title: "🚑 Rescue Started", description: "Moving bin → raw queue → ready for re-verify" }); }
      else { toast({ title: "Rescue Failed", description: json.msg || "Unknown error", variant: "destructive" }); }
      qc.invalidateQueries({ queryKey: ["/api/admin/proxy-status"] });
    } catch { toast({ title: "❌ Local Beast Unreachable", description: `Cannot reach ${localUrl}`, variant: "destructive" }); }
  };
  const toggleCloudVerify = async () => {
    const newPaused = !(data?.cloudVerifyPaused ?? false);
    try { await apiRequest("/api/admin/proxy-cloud-verify-toggle", { method: "POST", body: JSON.stringify({ paused: newPaused }), headers: { "Content-Type": "application/json" } });
      toast({ title: newPaused ? "☁️ Cloud Verify PAUSED" : "☁️ Cloud Verify RESUMED", description: newPaused ? "Raw queue reserved for local beast" : "Cloud will auto-verify after hunts" });
      qc.invalidateQueries({ queryKey: ["/api/admin/proxy-status"] });
    } catch (e: unknown) { toast({ title: "Error", description: e instanceof Error ? e.message : "Unknown", variant: "destructive" }); }
  };

  // ── Derived data ────────────────────────────────────────────────────
  const tc = data?.tierCounts ?? { platinum: 0, gold: 0, bronze: 0 };
  const pc = data?.platformCounts ?? { yt: 0, fb: 0, ig: 0, allThree: 0 };
  const proxies = data?.proxies ?? [];
  const total = data?.activeNodes ?? 0;
  const hd = data?.huntDetails;
  const tierData = [
    { label: "PLATINUM", value: tc.platinum, color: C.primary },
    { label: "GOLD", value: tc.gold, color: C.gold },
    { label: "BRONZE", value: tc.bronze, color: C.bronze },
  ];
  const isHunting = data?.isHunting ?? false;
  const isRevalidating = data?.isRevalidating ?? false;
  const isForceReval = data?.isForceRevalidating ?? false;
  const isVerifyingQueue = data?.isVerifyingQueue ?? false;
  const statusText = isHunting ? "HUNTING" : isRevalidating ? "REVALIDATING" : isForceReval ? "FORCE REVAL" : "STANDBY";
  const statusColor = isHunting ? C.tertiary : isRevalidating || isForceReval ? C.primary : C.secondary;

  // Source health derived
  const sourceHealthEntries = useMemo(() => {
    const sh = data?.sourceHealth ?? {};
    return Object.entries(sh).map(([key, val]) => ({
      name: key.split('/').pop() || key,
      ...val,
    }));
  }, [data?.sourceHealth]);
  const srcAlive = sourceHealthEntries.filter(s => !s.degraded && s.failCount === 0).length;
  const srcDegraded = sourceHealthEntries.filter(s => s.degraded && s.failCount < (sourceHealthEntries.length || 1)).length;
  const srcDead = sourceHealthEntries.filter(s => s.failCount >= 3 && s.degraded).length;

  const Icon = ({ name, size = 20, color }: { name: string; size?: number; color?: string }) => (
    <span className="material-symbols-outlined" style={{ fontSize: size, color, fontVariationSettings: "'wght' 200, 'FILL' 0" }}>{name}</span>
  );

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", flexDirection: "column", background: C.bg, fontFamily: "'Inter', sans-serif", color: C.textPrimary, overflow: "hidden" }}>
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Inter:wght@300;400;500;600&family=Space+Grotesk:wght@400;600;700&display=swap" rel="stylesheet" />

      {/* ══ TOP BAR ═══════════════════════════════════════════════════ */}
      <header style={{
        flexShrink: 0, height: 48, display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 16px", background: "rgba(15,15,22,0.7)", backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)", overflow: "visible", minWidth: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
          <nav style={{ display: "flex", gap: 12, fontFamily: "'Space Grotesk',sans-serif", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.03em", whiteSpace: "nowrap" }}>
            <span style={{ color: C.primary, fontWeight: 600 }}>NODES: {total.toLocaleString()}</span>
            <span style={{ color: "rgba(255,255,255,0.35)" }}>ALL-3: {pc.allThree}</span>
            <span style={{ color: statusColor, fontWeight: 600 }}>{statusText}{isHunting ? ` +${hd?.found ?? 0}` : ""}</span>
          </nav>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {NAV_ITEMS.map(item => (
            <button key={item.id} onClick={() => setSection(item.id)} style={{
              padding: "6px 14px", fontFamily: "'Space Grotesk',sans-serif", fontSize: 11, fontWeight: 600,
              textTransform: "uppercase", letterSpacing: "0.05em", border: "none", cursor: "pointer",
              background: section === item.id ? "rgba(76,215,246,0.12)" : "transparent",
              color: section === item.id ? C.primary : "rgba(255,255,255,0.3)",
              borderBottom: section === item.id ? `2px solid ${C.primary}` : "2px solid transparent",
              transition: "all 0.2s", borderRadius: "4px 4px 0 0",
            }}>
              {item.label}
            </button>
          ))}
          <div style={{ width: 1, height: 24, background: "rgba(255,255,255,0.08)", margin: "0 6px" }} />
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: "50%", border: `1px solid rgba(76,215,246,0.2)`,
            background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="close" size={16} color={C.primary} />
          </button>
        </div>
      </header>

      {/* ══ MAIN CONTENT (fills viewport) ═════════════════════════════ */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* ═══ HOME VIEW — Globe + Overview Dashboard ════════════════ */}
        {section === "home" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", padding: "10px 14px", gap: 8 }}>

            {/* ── Top Stats Bar ──────────────────────────────────── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 4, flexShrink: 0 }}>
              <Glass className="p-2" style={{ textAlign: "center" }}>
                <StatCell label="POOL" value={total} color={C.primary} />
              </Glass>
              <Glass className="p-2" style={{ textAlign: "center" }}>
                <StatCell label="ALL-3" value={pc.allThree} color={C.secondary} />
              </Glass>
              <Glass className="p-2" style={{ textAlign: "center" }}>
                <StatCell label="YT" value={pc.yt} color="#FF0000" />
              </Glass>
              <Glass className="p-2" style={{ textAlign: "center" }}>
                <StatCell label="FB" value={pc.fb} color="#1877F2" />
              </Glass>
              <Glass className="p-2" style={{ textAlign: "center" }}>
                <StatCell label="IG" value={pc.ig} color="#E1306C" />
              </Glass>
              <Glass className="p-2" style={{ textAlign: "center" }}>
                <StatCell label="COUNTRIES" value={data?.countryCount ?? 0} color={C.gold} />
              </Glass>
              <Glass className="p-2" style={{ textAlign: "center" }}>
                <StatCell label="AVG LATENCY" value={`${data?.avgLatency ?? 0}ms`} />
              </Glass>
              <Glass className="p-2" glow={isHunting ? "rgba(255,179,173,0.08)" : undefined} style={{ textAlign: "center" }}>
                <StatCell label="STATUS" value={isHunting ? `${hd?.progress ?? 0}/${hd?.total ?? 0}` : statusText} color={statusColor} />
              </Glass>
            </div>

            {/* ── Globe Map + Side Panels ────────────────────────── */}
            <div style={{ flex: 1, display: "grid", gridTemplateColumns: "2fr 1fr", gap: 8, minHeight: 0, overflow: "hidden" }}>

              {/* LEFT: WORLD MAP (large, prominent) */}
              <Glass className="p-4" style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 22 }}>🌍</span>
                  <Label>GLOBAL PROXY DISTRIBUTION</Label>
                  <div style={{ flex: 1 }} />
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 14, fontWeight: 700, color: C.primary }}>{data?.countryCount ?? 0} COUNTRIES</span>
                </div>
                <div style={{ flex: 1, borderRadius: 6, overflow: "hidden", position: "relative", background: "rgba(0,0,0,0.2)" }}>
                  <WorldMap proxies={proxies} />
                </div>
              </Glass>

              {/* RIGHT: Overview Panels */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, overflow: "auto" }}>

                {/* Tier Breakdown */}
                <Glass className="p-4" style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ width: 100, height: 100, position: "relative", flexShrink: 0 }}>
                    <DonutChart tiers={tierData} total={total} />
                    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 20, fontWeight: 700, color: C.textPrimary }}>{total}</span>
                      <span style={{ fontSize: 9, color: C.textSecondary }}>TOTAL</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {tierData.map(t => (
                      <div key={t.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 10, height: 10, borderRadius: "50%", background: t.color, boxShadow: `0 0 6px ${t.color}50` }} />
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 700, color: t.color }}>{t.label}</span>
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 16, fontWeight: 700, color: C.textPrimary }}>{t.value}</span>
                      </div>
                    ))}
                  </div>
                </Glass>

                {/* Health Monitor */}
                <Glass className="p-4">
                  <Label>HEALTH MONITOR</Label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 10 }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 22, fontWeight: 700, color: C.secondary }}>{total - (data?.deadProxyCount ?? 0) - (data?.nearDeadCount ?? 0)}</div>
                      <div style={{ fontSize: 10, color: C.secondary, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>♥ HEALTHY</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 22, fontWeight: 700, color: C.gold }}>{data?.nearDeadCount ?? 0}</div>
                      <div style={{ fontSize: 10, color: C.gold, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>⚠ WARNING</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 22, fontWeight: 700, color: "#ef4444" }}>{data?.deadProxyCount ?? 0}</div>
                      <div style={{ fontSize: 10, color: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>☠ DEAD</div>
                    </div>
                  </div>
                </Glass>

                {/* Country Bars (top 8) */}
                <Glass className="p-4" style={{ flex: 1, overflow: "auto" }}>
                  <Label>TOP COUNTRIES</Label>
                  <div style={{ marginTop: 8 }}>
                    <GeoDistribution proxies={proxies} limit={8} />
                  </div>
                </Glass>

                {/* Timers */}
                <Glass className="p-4">
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 10, color: C.textSecondary, marginBottom: 4 }}>NEXT HUNT</div>
                      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 16, fontWeight: 700, color: isHunting ? C.tertiary : C.primary }}>{isHunting ? "ACTIVE" : huntCountdown}</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 10, color: C.textSecondary, marginBottom: 4 }}>NEXT REVAL</div>
                      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 16, fontWeight: 700, color: isRevalidating ? C.tertiary : C.secondary }}>{isRevalidating ? "ACTIVE" : revalCountdown}</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 10, color: C.textSecondary, marginBottom: 4 }}>POWER</div>
                      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 16, fontWeight: 700, color: powerMode ? C.powerGreen : "rgba(255,255,255,0.3)" }}>{powerMode ? "⚡ ON" : "OFF"}</div>
                    </div>
                  </div>
                </Glass>
              </div>
            </div>
          </div>
        )}

        {/* ═══ HUNT VIEW — Local Controls + Cloud Monitor ══════════════ */}
        {section === "hunt" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", padding: "10px 14px", gap: 8 }}>

            {/* ── Source Health Bar ─────────────────────────────── */}
            <Glass className="p-3" style={{ flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 14 }}>📡</span>
                <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 12, fontWeight: 700, color: C.textPrimary, textTransform: "uppercase" }}>
                  SOURCES ({srcAlive + srcDegraded + srcDead || 30}): <span style={{ color: C.secondary }}>{srcAlive + srcDegraded} WORKING</span>
                  {srcDead > 0 && <span style={{ color: "#ef4444" }}> · {srcDead} DEAD</span>}
                </span>
                <div style={{ flex: 1 }} />
                <button onClick={() => qc.invalidateQueries({ queryKey: ["/api/admin/proxy-status"] })} style={{
                  padding: "3px 10px", border: "1px solid rgba(255,255,255,0.08)", background: "transparent",
                  color: "rgba(255,255,255,0.5)", fontFamily: "'JetBrains Mono',monospace", fontSize: 10, cursor: "pointer", borderRadius: 3,
                }}>↻ SYNC</button>
              </div>
              <div style={{ display: "flex", gap: 2, height: 6, borderRadius: 3, overflow: "hidden" }}>
                {sourceHealthEntries.length > 0 ? sourceHealthEntries.map((s, i) => (
                  <div key={i} title={`${s.name}: ${s.degraded ? (s.failCount >= 3 ? 'DEAD' : 'Using backup URL') : 'Primary OK'}`} style={{
                    flex: 1, height: "100%",
                    background: !s.degraded ? C.secondary : s.failCount >= 3 ? "#ef4444" : C.gold,
                    opacity: 0.8, transition: "all 0.3s",
                  }} />
                )) : Array.from({ length: 30 }).map((_, i) => (
                  <div key={i} style={{ flex: 1, height: "100%", background: "rgba(255,255,255,0.1)", opacity: 0.5 }} />
                ))}
              </div>
            </Glass>

            {/* ── Hunt Progress (if active) ──────────────────────── */}
            {isHunting && hd && (
              <Glass className="p-4" glow="rgba(255,179,173,0.08)" style={{ flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                  <span style={{ fontSize: 22, animation: "pulse 1s infinite" }}>🔥</span>
                  <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 16, fontWeight: 700, color: C.tertiary }}>HUNT IN PROGRESS</span>
                  <div style={{ flex: 1 }} />
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 18, fontWeight: 700, color: C.secondary }}>+{hd.found} NEW</span>
                </div>
                <div style={{ height: 6, background: "rgba(255,255,255,0.05)", borderRadius: 3, overflow: "hidden", marginBottom: 8 }}>
                  <div style={{ height: "100%", width: `${hd.total > 0 ? (hd.progress / hd.total) * 100 : 0}%`, background: `linear-gradient(90deg, ${C.tertiary}, ${C.secondary})`, transition: "width 0.5s", borderRadius: 3 }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: C.textSecondary }}>
                  <span>Sources: {hd.progress}/{hd.total}</span>
                  <span>Mined: {hd.mined.toLocaleString()}</span>
                  <span>Skipped: {hd.skipped}</span>
                  <span style={{ color: C.secondary }}>Found: +{hd.found}</span>
                </div>
              </Glass>
            )}

            {/* ── Split: LOCAL CONTROLS (left) + CLOUD MONITOR (right) ── */}
            <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, minHeight: 0, overflow: "hidden" }}>

              {/* ══ LEFT: LOCAL BEAST CONTROLS ══ */}
              <Glass className="p-4" style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <span style={{ fontSize: 20 }}>{data?.localPcUrl ? "🏠" : "💻"}</span>
                  <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 14, fontWeight: 700, color: data?.localPcUrl ? C.powerGreen : C.secondary, textTransform: "uppercase" }}>LOCAL BEAST</span>
                  <div style={{ flex: 1 }} />
                  {data?.localPcUrl ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.powerGreen, boxShadow: `0 0 8px ${C.powerGreen}`, animation: "pulse 2s infinite" }} />
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: C.powerGreen, fontWeight: 700 }}>ONLINE</span>
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(255,255,255,0.15)" }} />
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "rgba(255,255,255,0.3)", fontWeight: 700 }}>OFFLINE</span>
                    </div>
                  )}
                </div>

                {/* OFFLINE → START button | ONLINE → HUNT + VERIFY + BOOST + STOP */}
                {!data?.localPcUrl ? (
                  <div style={{ marginBottom: 10 }}>
                    <button onClick={startBeast} disabled={data?.beastRunning} style={{ width: "100%", padding: "14px", background: data?.beastRunning ? "rgba(255,255,255,0.03)" : "rgba(0,255,136,0.08)", border: `1px solid ${data?.beastRunning ? "rgba(255,255,255,0.1)" : "rgba(0,255,136,0.3)"}`, borderRadius: 8, cursor: data?.beastRunning ? "wait" : "pointer", textAlign: "center" }}>
                      <div style={{ fontSize: 24, marginBottom: 4 }}>{data?.beastRunning ? "⏳" : "🚀"}</div>
                      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 700, color: data?.beastRunning ? C.gold : C.powerGreen }}>
                        {data?.beastRunning ? "STARTING..." : "START BEAST"}
                      </div>
                      <div style={{ fontSize: 10, color: C.textTertiary, marginTop: 2 }}>Launch local hunting engine (residential IP)</div>
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", gap: 6, marginBottom: 10 }}>
                    <button onClick={triggerLocalHunt} style={{ padding: "10px", background: "rgba(0,255,136,0.06)", border: `1px solid rgba(0,255,136,0.2)`, borderRadius: 6, cursor: "pointer", textAlign: "center" }}>
                      <div style={{ fontSize: 18 }}>🏠</div>
                      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 700, color: C.powerGreen }}>HUNT</div>
                      <div style={{ fontSize: 8, color: C.textTertiary }}>OSINT → Queue</div>
                    </button>
                    <button onClick={triggerLocalVerify} style={{ padding: "10px", background: "rgba(167,139,250,0.06)", border: `1px solid rgba(167,139,250,0.2)`, borderRadius: 6, cursor: "pointer", textAlign: "center" }}>
                      <div style={{ fontSize: 18 }}>⚡</div>
                      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 700, color: "#a78bfa" }}>VERIFY</div>
                      <div style={{ fontSize: 8, color: C.textTertiary }}>Queue → Pool</div>
                    </button>
                    <button onClick={triggerCloudBoost} style={{ padding: "10px", background: "rgba(255,179,173,0.06)", border: `1px solid rgba(255,179,173,0.3)`, borderRadius: 6, cursor: "pointer", textAlign: "center" }}>
                      <div style={{ fontSize: 18 }}>🚀</div>
                      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 700, color: C.tertiary }}>BOOST</div>
                      <div style={{ fontSize: 8, color: C.textTertiary }}>Cloud Raw → Pool</div>
                    </button>
                    <button onClick={triggerRescueBin} style={{ padding: "10px", background: "rgba(251,191,36,0.06)", border: `1px solid rgba(251,191,36,0.3)`, borderRadius: 6, cursor: "pointer", textAlign: "center" }}>
                      <div style={{ fontSize: 18 }}>🚑</div>
                      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 700, color: C.gold }}>RESCUE</div>
                      <div style={{ fontSize: 8, color: C.textTertiary }}>Bin → Re-verify</div>
                    </button>
                    <button onClick={stopBeast} style={{ padding: "10px", background: "rgba(239,68,68,0.06)", border: `1px solid rgba(239,68,68,0.2)`, borderRadius: 6, cursor: "pointer", textAlign: "center" }}>
                      <div style={{ fontSize: 18 }}>⛔</div>
                      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 700, color: "#ef4444" }}>STOP</div>
                      <div style={{ fontSize: 8, color: C.textTertiary }}>Kill process</div>
                    </button>
                  </div>
                )}

                {/* RAW QUEUE stats — combined local+cloud */}
                <div style={{ padding: "10px 12px", background: "rgba(255,255,255,0.02)", borderLeft: `3px solid ${C.gold}`, borderRadius: 4, marginBottom: 10 }}>
                  <div style={{ fontSize: 10, color: C.textSecondary, textTransform: "uppercase", marginBottom: 6 }}>RAW UNVERIFIED QUEUE</div>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 28, fontWeight: 700, color: (data?.queueSize ?? 0) > 0 ? C.gold : C.textTertiary }}>{(data?.queueSize ?? 0).toLocaleString()}</div>
                  <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                    <span style={{ fontSize: 10, color: C.textTertiary }}>Local (mem): <span style={{ color: (data?.queueMemory ?? 0) > 0 ? C.gold : C.textTertiary, fontWeight: 700 }}>{(data?.queueMemory ?? 0).toLocaleString()}</span></span>
                    <span style={{ fontSize: 10, color: C.textTertiary }}>Cloud (redis): <span style={{ color: (data?.queueRedis ?? 0) > 0 ? C.primary : C.textTertiary, fontWeight: 700 }}>{(data?.queueRedis ?? 0).toLocaleString()}</span></span>
                  </div>
                </div>

                {/* Local beast log */}
                <div style={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: data?.localPcUrl ? C.powerGreen : "rgba(255,255,255,0.1)" }} />
                    <span style={{ fontSize: 11, color: C.textSecondary, textTransform: "uppercase", fontWeight: 600 }}>LOCAL LOG</span>
                  </div>
                  <div style={{ flex: 1, overflow: "auto", fontFamily: "'JetBrains Mono',monospace", fontSize: 11, lineHeight: 1.7, background: "rgba(0,0,0,0.25)", borderRadius: 4, padding: 8 }}>
                    {(data?.localSyncLogs ?? []).length === 0 ? (
                      <div style={{ color: "rgba(255,255,255,0.15)", padding: 8, fontSize: 10 }}>Start beast to see local activity logs</div>
                    ) : (data?.localSyncLogs ?? []).slice(0, 100).map((log, i) => (
                      <div key={i} style={{ display: "flex", gap: 6 }}>
                        <span style={{ color: "rgba(255,255,255,0.2)", flexShrink: 0 }}>{log.time}</span>
                        <span style={{ color: log.type === "success" ? C.secondary : log.type === "error" ? "#ef4444" : C.gold, fontWeight: 700 }}>[{log.type.toUpperCase()}]</span>
                        <span style={{ color: "rgba(255,255,255,0.55)" }}>{log.msg}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Glass>

              {/* ══ RIGHT: CLOUD MONITOR (read-only) ══ */}
              <Glass className="p-4" style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <span style={{ fontSize: 20 }}>☁️</span>
                  <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 14, fontWeight: 700, color: C.primary, textTransform: "uppercase" }}>CLOUD MONITOR</span>
                  <div style={{ flex: 1 }} />
                  {isVerifyingQueue ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "3px 8px", border: `1px solid rgba(167,139,250,0.4)`, borderRadius: 4, background: "rgba(167,139,250,0.08)" }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#a78bfa", boxShadow: "0 0 6px #a78bfa", animation: "pulse 0.8s infinite" }} />
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, fontWeight: 700, color: "#a78bfa" }}>VERIFYING</span>
                    </div>
                  ) : isHunting ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "3px 8px", border: `1px solid rgba(255,179,173,0.4)`, borderRadius: 4, background: "rgba(255,179,173,0.06)" }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.tertiary, boxShadow: `0 0 6px ${C.tertiary}`, animation: "pulse 1s infinite" }} />
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, fontWeight: 700, color: C.tertiary }}>HUNTING</span>
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.primary, boxShadow: `0 0 8px ${C.primary}`, animation: "pulse 2s infinite" }} />
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: C.textSecondary }}>AUTO</span>
                    </div>
                  )}
                </div>

                {/* Cloud timers */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 10 }}>
                  <div style={{ textAlign: "center", padding: "10px", background: "rgba(76,215,246,0.04)", borderRadius: 4, border: "1px solid rgba(76,215,246,0.1)" }}>
                    <div style={{ fontSize: 10, color: C.textSecondary, marginBottom: 4 }}>NEXT HUNT</div>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 18, fontWeight: 700, color: isHunting ? C.tertiary : C.primary }}>{isHunting ? "🔥 NOW" : huntCountdown}</div>
                  </div>
                  <div style={{ textAlign: "center", padding: "10px", background: "rgba(78,222,163,0.04)", borderRadius: 4, border: "1px solid rgba(78,222,163,0.1)" }}>
                    <div style={{ fontSize: 10, color: C.textSecondary, marginBottom: 4 }}>NEXT REVAL</div>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 18, fontWeight: 700, color: isRevalidating ? C.tertiary : C.secondary }}>{isRevalidating ? "⚡ NOW" : revalCountdown}</div>
                  </div>
                </div>

                {/* Cloud pool stats */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 10 }}>
                  <div style={{ textAlign: "center", padding: "8px", background: "rgba(76,215,246,0.04)", borderRadius: 4 }}>
                    <div style={{ fontSize: 9, color: C.textSecondary }}>POOL</div>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 18, fontWeight: 700, color: C.primary }}>{total}</div>
                  </div>
                  <div style={{ textAlign: "center", padding: "8px", background: "rgba(255,179,173,0.04)", borderRadius: 4 }}>
                    <div style={{ fontSize: 9, color: C.textSecondary }}>HUNTS</div>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 18, fontWeight: 700, color: C.tertiary }}>{hd?.huntCount ?? 0}</div>
                  </div>
                  <div style={{ textAlign: "center", padding: "8px", background: "rgba(78,222,163,0.04)", borderRadius: 4 }}>
                    <div style={{ fontSize: 9, color: C.textSecondary }}>ALL-TIME</div>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 18, fontWeight: 700, color: C.secondary }}>{hd?.totalEverFound ?? 0}</div>
                  </div>
                </div>

                {/* Cloud log (read-only) */}
                <div style={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.primary, animation: "pulse 2s infinite" }} />
                    <span style={{ fontSize: 11, color: C.textSecondary, textTransform: "uppercase", fontWeight: 600 }}>CLOUD LOG</span>
                  </div>
                  <div style={{ flex: 1, overflow: "auto", fontFamily: "'JetBrains Mono',monospace", fontSize: 11, lineHeight: 1.7, background: "rgba(0,0,0,0.25)", borderRadius: 4, padding: 8 }}>
                    {logs.length === 0 ? (
                      <div style={{ color: "rgba(255,255,255,0.2)", padding: 8 }}>Cloud auto-hunts every 2h. Logs appear here.</div>
                    ) : logs.slice(0, 100).map(log => (
                      <div key={log.id} style={{ display: "flex", gap: 6 }}>
                        <span style={{ color: "rgba(255,255,255,0.2)", flexShrink: 0 }}>{log.time}</span>
                        <span style={{ color: LOG_COLORS[log.type], fontWeight: 700, flexShrink: 0 }}>[{log.type.toUpperCase()}]</span>
                        <span style={{ color: "rgba(255,255,255,0.55)" }}>{log.msg}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Glass>
            </div>
          </div>
        )}

        {/* ═══ VALIDATE VIEW — Data Control Center ═════════════════════ */}
        {section === "validate" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", padding: "10px 14px", gap: 8 }}>

            {/* ── Validation Action Grid (8 buttons) ────────────── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 6, flexShrink: 0 }}>
              <ActionBtn onClick={triggerRevalidation} disabled={isRevalidating} label={isRevalidating ? "RUNNING..." : "REVALIDATE"} sub="Tier-based (due only)" color={C.primary} icon="✅" />
              <ActionBtn onClick={triggerForceRevalidateAll} disabled={!!(isForceReval || isRevalidating || isHunting)} label={isForceReval ? "RUNNING..." : "FORCE ALL"} sub="Re-check every proxy" color={C.gold} icon="⚡" />
              <ActionBtn onClick={togglePowerMode} disabled={false} label={powerMode ? "POWER ON" : "POWER OFF"} sub="Hetzner VPS turbo" color={powerMode ? C.powerGreen : "rgba(255,255,255,0.4)"} icon="🚀" />
              <ActionBtn onClick={async () => {
                const newUrl = (data?.localPcUrl) ? "" : "http://localhost:6100";
                try { await apiRequest("/api/admin/proxy-local-pc", { method: "POST", body: JSON.stringify({ url: newUrl }), headers: { "Content-Type": "application/json" } });
                  toast({ title: newUrl ? "🏠 Local PC ON" : "🏠 Local PC OFF", description: newUrl || "Disabled" }); qc.invalidateQueries({ queryKey: ["/api/admin/proxy-status"] });
                } catch (e: unknown) { toast({ title: "Error", description: e instanceof Error ? e.message : "Unknown", variant: "destructive" }); }
              }} disabled={false} label={data?.localPcUrl ? "LOCAL ON" : "LOCAL OFF"} sub={data?.localPcUrl ? "Residential IP" : "Not connected"} color={data?.localPcUrl ? C.powerGreen : "rgba(255,255,255,0.25)"} icon="🏠" />
              <ActionBtn onClick={triggerPurgeDead} disabled={!(data?.deadProxyCount ?? 0)} label={`PURGE (${data?.deadProxyCount ?? 0})`} sub="Remove failCount ≥ 2" color="#ef4444" icon="☠️" />
              <ActionBtn onClick={async () => {
                try { const r = await apiRequest("/api/admin/proxy-geo-enrich", { method: "POST", body: "{}", headers: { "Content-Type": "application/json" } });
                  toast({ title: "🌍 Geo Enrichment Complete", description: `${(r as { enriched: number }).enriched} proxies updated.` }); qc.invalidateQueries({ queryKey: ["/api/admin/proxy-status"] });
                } catch (e: unknown) { toast({ title: "Error", description: e instanceof Error ? e.message : "Unknown", variant: "destructive" }); }
              }} disabled={false} label="GEO ENRICH" sub="Add country data" color={C.secondary} icon="🌍" />
              <ActionBtn onClick={async () => {
                try { const res = await apiRequest("/api/admin/proxy-download-live"); const blob = new Blob([JSON.stringify(res, null, 2)], { type: "application/json" });
                  const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "live-proxies.json"; a.click(); URL.revokeObjectURL(url);
                  toast({ title: "📥 Downloaded", description: "Live proxy pool exported." });
                } catch (e: unknown) { toast({ title: "Error", description: e instanceof Error ? e.message : "Unknown", variant: "destructive" }); }
              }} disabled={false} label="DOWNLOAD" sub="Export live pool" color={C.primary} icon="📥" />
              <ActionBtn onClick={() => qc.invalidateQueries({ queryKey: ["/api/admin/proxy-status"] })} disabled={false} label="REFRESH" sub="Fetch latest data" color="rgba(255,255,255,0.5)" icon="🔄" />
            </div>

            {/* ── Health Overview Bar (7 cells) ──────────────────── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 1fr 1fr", gap: 6, flexShrink: 0 }}>
              <Glass className="p-3" style={{ textAlign: "center" }}>
                <div style={{ fontSize: 10, color: C.textSecondary, marginBottom: 4 }}>HEALTHY</div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 22, fontWeight: 700, color: C.secondary }}>{total - (data?.deadProxyCount ?? 0) - (data?.nearDeadCount ?? 0)}</div>
                <div style={{ fontSize: 9, color: C.textTertiary }}>♥ failCount = 0</div>
              </Glass>
              <Glass className="p-3" style={{ textAlign: "center" }}>
                <div style={{ fontSize: 10, color: C.textSecondary, marginBottom: 4 }}>WARNING</div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 22, fontWeight: 700, color: C.gold }}>{data?.nearDeadCount ?? 0}</div>
                <div style={{ fontSize: 9, color: C.textTertiary }}>⚠ failCount = 1</div>
              </Glass>
              <Glass className="p-3" style={{ textAlign: "center" }}>
                <div style={{ fontSize: 10, color: C.textSecondary, marginBottom: 4 }}>DEAD</div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 22, fontWeight: 700, color: "#ef4444" }}>{data?.deadProxyCount ?? 0}</div>
                <div style={{ fontSize: 9, color: C.textTertiary }}>☠ failCount ≥ 2</div>
              </Glass>
              <Glass className="p-3" style={{ textAlign: "center" }}>
                <div style={{ fontSize: 10, color: C.textSecondary, marginBottom: 4 }}>REVAL STATUS</div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 18, fontWeight: 700, color: isRevalidating ? C.tertiary : C.secondary }}>{isRevalidating ? "⚡ ACTIVE" : revalCountdown}</div>
                <div style={{ fontSize: 9, color: C.textTertiary }}>{isRevalidating ? "checking now" : "countdown"}</div>
              </Glass>
              <Glass className="p-3" style={{ textAlign: "center" }}>
                <div style={{ fontSize: 10, color: C.textSecondary, marginBottom: 4 }}>FORCE REVAL</div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 18, fontWeight: 700, color: isForceReval ? C.gold : "rgba(255,255,255,0.2)" }}>{isForceReval ? "RUNNING" : "IDLE"}</div>
                <div style={{ fontSize: 9, color: C.textTertiary }}>{isForceReval ? "checking all" : "ready"}</div>
              </Glass>
              <Glass className="p-3" style={{ textAlign: "center" }}>
                <div style={{ fontSize: 10, color: C.textSecondary, marginBottom: 4 }}>POWER MODE</div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 18, fontWeight: 700, color: powerMode ? C.powerGreen : "rgba(255,255,255,0.2)" }}>{powerMode ? "🚀 ON" : "OFF"}</div>
                <div style={{ fontSize: 9, color: C.textTertiary }}>{powerMode ? "Hetzner VPS" : "standard"}</div>
              </Glass>
              <Glass className="p-3" style={{ textAlign: "center" }}>
                <div style={{ fontSize: 10, color: C.textSecondary, marginBottom: 4 }}>LOCAL PC</div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 18, fontWeight: 700, color: data?.localPcUrl ? C.powerGreen : "rgba(255,255,255,0.2)" }}>{data?.localPcUrl ? "🏠 ON" : "OFF"}</div>
                <div style={{ fontSize: 9, color: C.textTertiary }}>{data?.localPcUrl ? "residential IP" : "disabled"}</div>
              </Glass>
            </div>

            {/* ── Split: Manual Validate + Cloud Validator Live ──── */}
            <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, minHeight: 0, overflow: "hidden" }}>

              {/* LEFT: BIN (Soft-Deleted Proxies) + Manual Controls */}
              <Glass className="p-4" style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <span style={{ fontSize: 22 }}>🗑️</span>
                  <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 14, fontWeight: 700, color: "#ef4444", textTransform: "uppercase" }}>PROXY BIN — 3-STRIKE ZONE</span>
                </div>
                <BinPanel />
              </Glass>

              {/* RIGHT: Cloud Validator Live Feed */}
              <Glass className="p-4" style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 22 }}>☁️</span>
                  <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 14, fontWeight: 700, color: C.primary, textTransform: "uppercase" }}>CLOUD VALIDATOR LIVE</span>
                  <div style={{ flex: 1 }} />
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: isRevalidating || isForceReval ? C.tertiary : C.secondary, boxShadow: `0 0 8px ${isRevalidating || isForceReval ? C.tertiary : C.secondary}`, animation: isRevalidating || isForceReval ? "pulse 1s infinite" : "none" }} />
                    <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace", color: isRevalidating || isForceReval ? C.tertiary : C.textSecondary }}>{isRevalidating ? "VALIDATING" : isForceReval ? "FORCE-REVAL" : "IDLE"}</span>
                  </div>
                  <button onClick={() => qc.invalidateQueries({ queryKey: ["/api/admin/proxy-status"] })} style={{
                    padding: "4px 12px", border: "1px solid rgba(255,255,255,0.08)", background: "transparent",
                    color: "rgba(255,255,255,0.5)", fontFamily: "'JetBrains Mono',monospace", fontSize: 10, cursor: "pointer", borderRadius: 3,
                  }}>↻ REFRESH</button>
                </div>

                {/* Validator engine status bar */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 8 }}>
                  <div style={{ padding: "6px 8px", background: "rgba(78,222,163,0.04)", borderRadius: 4, textAlign: "center" }}>
                    <div style={{ fontSize: 9, color: C.textSecondary }}>ENGINE</div>
                    <div style={{ fontSize: 12, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: powerMode ? C.powerGreen : C.primary }}>{powerMode ? (data?.localPcUrl ? "LOCAL→VPS" : "HETZNER VPS") : "STANDARD"}</div>
                  </div>
                  <div style={{ padding: "6px 8px", background: "rgba(76,215,246,0.04)", borderRadius: 4, textAlign: "center" }}>
                    <div style={{ fontSize: 9, color: C.textSecondary }}>NEXT REVAL</div>
                    <div style={{ fontSize: 12, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: isRevalidating ? C.tertiary : C.primary }}>{isRevalidating ? "⚡ NOW" : revalCountdown}</div>
                  </div>
                  <div style={{ padding: "6px 8px", background: "rgba(255,215,0,0.04)", borderRadius: 4, textAlign: "center" }}>
                    <div style={{ fontSize: 9, color: C.textSecondary }}>LAST REVAL</div>
                    <div style={{ fontSize: 12, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: C.gold }}>{timeAgo(data?.lastRevalidatedAt)}</div>
                  </div>
                </div>

                {/* Live log feed */}
                <div style={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.primary, animation: "pulse 2s infinite" }} />
                    <span style={{ fontSize: 11, color: C.textSecondary, textTransform: "uppercase", fontWeight: 600 }}>VALIDATION ACTIVITY LOG</span>
                  </div>
                  <div style={{ flex: 1, overflow: "auto", fontFamily: "'JetBrains Mono',monospace", fontSize: 11, lineHeight: 1.7, background: "rgba(0,0,0,0.25)", borderRadius: 4, padding: 8 }}>
                    {logs.length === 0 ? (
                      <div style={{ color: "rgba(255,255,255,0.2)", padding: 8 }}>No validation activity yet. Trigger a revalidation or wait for auto-scheduler.</div>
                    ) : null}
                    {logs.slice(0, 50).map(log => (
                      <div key={log.id} style={{ display: "flex", gap: 6 }}>
                        <span style={{ color: "rgba(255,255,255,0.2)", flexShrink: 0 }}>{log.time}</span>
                        <span style={{ color: LOG_COLORS[log.type], fontWeight: 700, flexShrink: 0 }}>[{log.type.toUpperCase()}]</span>
                        <span style={{ color: "rgba(255,255,255,0.55)" }}>{log.msg}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Glass>
            </div>
          </div>
        )}

        {/* ═══ DATA VIEW — Table + Geo + Tiers ═════════════════════════ */}
        {section === "data" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", padding: "10px 14px" }}>
            {/* Top: Geo + Tier (compact row) */}
            <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr 1fr", gap: 8, flexShrink: 0, marginBottom: 8 }}>
              {/* World Map */}
              <Glass className="p-4" style={{ height: 200, overflow: "hidden", position: "relative" }}>
                <Label>GEO DISTRIBUTION</Label>
                <div style={{ marginTop: 6, height: "calc(100% - 20px)", borderRadius: 4, overflow: "hidden" }}>
                  <WorldMap proxies={proxies} />
                </div>
              </Glass>
              {/* Country bars */}
              <Glass className="p-4" style={{ height: 200, overflow: "auto" }}>
                <Label>COUNTRIES ({data?.countryCount ?? 0})</Label>
                <div style={{ marginTop: 8 }}>
                  <GeoDistribution proxies={proxies} limit={10} />
                </div>
              </Glass>
              {/* Donut */}
              <Glass className="p-4" style={{ height: 200, display: "flex", flexDirection: "column", alignItems: "center" }}>
                <Label>TIERS</Label>
                <div style={{ width: 90, height: 90, position: "relative", marginTop: 8 }}>
                  <DonutChart tiers={tierData} total={total} />
                  <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 18, fontWeight: 700, color: C.textPrimary }}>{total}</span>
                  </div>
                </div>
                <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                  {tierData.map(t => (
                    <div key={t.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: t.color }} />
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", color: t.color, fontWeight: 600 }}>{t.label}: {t.value}</span>
                    </div>
                  ))}
                </div>
              </Glass>
            </div>

            {/* Bottom: Full Proxy Table */}
            <Glass className="flex-1 flex flex-col overflow-hidden">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <Label>NODE REGISTRY — {total.toLocaleString()} PROXIES</Label>
                <div style={{ display: "flex", gap: 12 }}>
                  {tierData.map(t => (
                    <span key={t.label} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontFamily: "'JetBrains Mono',monospace" }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: t.color }} />
                      <span style={{ color: t.color, fontWeight: 600 }}>{t.label}: {t.value}</span>
                    </span>
                  ))}
                </div>
              </div>
              <div style={{ flex: 1, overflow: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                  <thead>
                    <tr style={{ position: "sticky", top: 0, zIndex: 10, background: "#131318", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                      {["IDX", "GEO / IP", "PROTO", "LATENCY", "TIER", "PLATFORMS", "HEALTH", "TENURE"].map(h => (
                        <th key={h} style={{ padding: "8px 10px", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", opacity: 0.5, fontWeight: 600, fontFamily: "'Space Grotesk',sans-serif" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {proxies.map((p, i) => <ProxyRow key={i} proxy={p} idx={i} />)}
                    {proxies.length === 0 && (
                      <tr><td colSpan={8} style={{ textAlign: "center", padding: 32, opacity: 0.3, fontSize: 13, fontFamily: "'JetBrains Mono',monospace" }}>
                        NO ACTIVE NODES — INITIATE HUNT TO BEGIN
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Glass>
          </div>
        )}

        {/* ═══ SYSTEM VIEW — Config + Tools ════════════════════════════ */}
        {section === "system" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "auto", padding: "10px 14px", gap: 10 }}>
            {/* Config grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6, flexShrink: 0 }}>
              {[
                { label: "SOURCES", value: "30", sub: "26 GH + 4 TG" },
                { label: "SAMPLE", value: "5K", sub: "Per hunt" },
                { label: "TIMEOUT", value: "10s", sub: "Per proxy" },
                { label: "HUNT", value: "3H", sub: "Auto cycle" },
                { label: "REVAL", value: "30M", sub: "Auto cycle" },
                { label: "PLATINUM", value: "30m", sub: "<500ms + 3plat" },
                { label: "GOLD", value: "2h", sub: "2+ platforms" },
                { label: "BRONZE", value: "24h", sub: "1 platform" },
                { label: "AUTO-BAN", value: "3-STRIKE", sub: "→ BIN" },
                { label: "POWER", value: powerMode ? "ON" : "OFF", sub: "Hetzner VPS" },
              ].map((cfg, i) => (
                <Glass key={i} className="p-3" style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 10, color: C.textSecondary, textTransform: "uppercase", fontWeight: 600 }}>{cfg.label}</div>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 18, fontWeight: 700, color: C.primary, marginTop: 4 }}>{cfg.value}</div>
                  <div style={{ fontSize: 9, color: C.textTertiary, marginTop: 2 }}>{cfg.sub}</div>
                </Glass>
              ))}
            </div>

            {/* VPS Health + Geo Tools */}
            <VpsHealthRow />

            {/* Stealth Engine Status */}
            <Glass className="p-4">
              <Label>🛡️ STEALTH ENGINE</Label>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: C.textSecondary, lineHeight: 2, marginTop: 8, display: "flex", flexWrap: "wrap", gap: 12 }}>
                <span><span style={{ color: C.secondary }}>✅</span> UA Rotation (6 profiles)</span>
                <span><span style={{ color: C.secondary }}>✅</span> Delay+Jitter (400-2500ms)</span>
                <span><span style={{ color: C.secondary }}>✅</span> Ban Detection (10 patterns)</span>
                <span><span style={{ color: C.secondary }}>✅</span> Proxy Scoring</span>
                <span><span style={{ color: C.secondary }}>✅</span> Adaptive Concurrency</span>
              </div>
            </Glass>

            {/* Downloader integration */}
            <Glass className="p-4">
              <Label>DOWNLOADER INTEGRATION</Label>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: C.textSecondary, lineHeight: 2, marginTop: 8, display: "flex", flexWrap: "wrap", gap: 12 }}>
                <span><span style={{ color: C.secondary }}>✅</span> L7 Free Pool → proxy rotation</span>
                <span><span style={{ color: C.secondary }}>✅</span> 3-Strike ban on failure</span>
                <span><span style={{ color: C.secondary }}>✅</span> Platinum-first rotation</span>
              </div>
            </Glass>

            {/* BIN Panel */}
            <Glass className="p-4">
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 16 }}>🗑️</span>
                <Label>PROXY BIN — SOFT-DELETED (3-STRIKE)</Label>
              </div>
              <BinPanel />
            </Glass>
          </div>
        )}
      </main>

      {/* ══ FOOTER ════════════════════════════════════════════════════ */}
      <footer style={{
        flexShrink: 0, height: 30, display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "0 16px", background: "rgba(10,10,20,0.8)", backdropFilter: "blur(10px)",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase",
      }}>
        <span style={{ color: "rgba(255,255,255,0.15)" }}>© 2025 OBSIDIAN LENS — BONG BARI</span>
        <div style={{ display: "flex", gap: 20 }}>
          <span style={{ color: powerMode ? C.powerGreen : C.secondary, fontWeight: 600 }}>{powerMode ? "⚡ POWER" : "STEALTH"}</span>
          <span style={{ color: "rgba(255,255,255,0.2)" }}>LATENCY: {data?.avgLatency ?? 0}MS</span>
          <span style={{ color: "rgba(255,255,255,0.15)" }}>HUNT: {huntCountdown}</span>
          <span style={{ color: "rgba(255,255,255,0.15)" }}>REVAL: {revalCountdown}</span>
        </div>
      </footer>

      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </div>
  );
}
