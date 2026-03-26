/**
 * ============================================================
 * TACTICAL COMMAND — Proxy Mission Control v2.0
 * ============================================================
 * Design: "Obsidian Lens" — Single-viewport tactical HUD
 * Features (Phase 1–19 all represented):
 *   P1-P2:  30-source OSINT engine status
 *   P3:     Platform verification (YT/FB/IG dots)
 *   P4:     Dedup stats (mined vs skipped)
 *   P5:     File persistence indicator
 *   P6:     3-hour hunt cron countdown (ticking)
 *   P7:     3AM daily re-validation
 *   P8:     Lifetime stats (huntCount, totalEverFound)
 *   P9:     Cyber Sentinel admin UI (this dashboard)
 *   P10:    Masterplan doc reference
 *   P11:    Latency badge per proxy
 *   P12:    Country flag + SVG world map with live dots
 *   P13:    3-strike health hearts (failCount)
 *   P14:    Tier system (Platinum/Gold/Bronze) + donut
 *   P15:    Telegram source count (4 channels)
 *   P16:    Pool → downloader integration status
 *   P17:    Rust turbo verifier (tokio)
 *   P18:    Power Mode + manual revalidate
 *   P19:    Hetzner VPS cloud verifier + VPS health panel
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
}
interface ProxyStatusData {
  activeNodes: number; proxies: ProxyEntry[];
  platformCounts: { yt: number; fb: number; ig: number; allThree: number };
  tierCounts: { platinum: number; gold: number; bronze: number };
  avgLatency: number; isHunting: boolean; isRevalidating: boolean;
  isForceRevalidating: boolean;
  huntDetails: HuntDetails; lastRevalidatedAt: string | null;
  nextHuntAt: string | null; nextRevalAt: string | null;
  powerMode: boolean;
  countryCount: number; countryMap: Record<string, number>;
  deadProxyCount: number; nearDeadCount: number;
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
const TIER_COLORS: Record<string, string> = {
  platinum: C.primary, gold: C.gold, bronze: C.bronze,
};
const COUNTRY_FLAGS: Record<string, string> = {
  US: "🇺🇸", DE: "🇩🇪", FR: "🇫🇷", BR: "🇧🇷", IN: "🇮🇳", RU: "🇷🇺",
  CN: "🇨🇳", JP: "🇯🇵", GB: "🇬🇧", KR: "🇰🇷", AU: "🇦🇺", CA: "🇨🇦",
  NL: "🇳🇱", SG: "🇸🇬", UA: "🇺🇦", PL: "🇵🇱", TR: "🇹🇷", ID: "🇮🇩",
  VN: "🇻🇳", HK: "🇭🇰", TH: "🇹🇭", MX: "🇲🇽", AR: "🇦🇷", CL: "🇨🇱",
  CO: "🇨🇴", EG: "🇪🇬", ZA: "🇿🇦", NG: "🇳🇬", KE: "🇰🇪", XX: "🌐",
};
// Approximate SVG coords for world map projection
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
  return <span style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em", opacity: 0.4, fontFamily: "Inter, sans-serif" }}>{children}</span>;
}

// ─── SVG Donut Chart (Viewbox 0 0 36 36 style) ──────────────────────
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
        const dashLen = pct;
        const dashGap = 100 - dashLen;
        const seg = <circle key={i} cx="18" cy="18" r={r} fill="transparent"
          stroke={t.color} strokeWidth={strokeWidth}
          strokeDasharray={`${dashLen} ${dashGap}`}
          strokeDashoffset={`${-offset}`} />;
        offset += pct;
        return seg;
      })}
    </svg>
  );
}

// ─── SVG World Map with Live Geo Dots ────────────────────────────────
function WorldMap({ proxies }: { proxies: ProxyEntry[] }) {
  const geoCount = useMemo(() => {
    const m: Record<string, number> = {};
    proxies.forEach(p => {
      const c = p.platforms?.country || "XX";
      m[c] = (m[c] || 0) + 1;
    });
    return m;
  }, [proxies]);

  const maxCount = Math.max(...Object.values(geoCount), 1);
  const topRegion = Object.entries(geoCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

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
      <svg viewBox="0 0 900 450" className="absolute inset-0 w-full h-full">
        {Object.entries(geoCount).map(([cc, count]) => {
          const coords = COUNTRY_COORDS[cc];
          if (!coords) return null;
          const intensity = Math.min(count / maxCount, 1);
          const dotR = 2 + intensity * 4;
          return (
            <g key={cc}>
              <circle cx={coords[0]} cy={coords[1]} r={dotR + 6}
                fill={C.primary} opacity={0.08 + intensity * 0.12} />
              <circle cx={coords[0]} cy={coords[1]} r={dotR}
                fill={C.primary}
                opacity={0.6 + intensity * 0.4}
                style={{ filter: `drop-shadow(0 0 ${4 + intensity * 8}px ${C.primary})` }}>
                {count >= 3 && <animate attributeName="r" values={`${dotR};${dotR + 1};${dotR}`} dur="2s" repeatCount="indefinite" />}
              </circle>
            </g>
          );
        })}
      </svg>
      <div className="absolute bottom-2 right-3 text-right">
        <Label>TOP REGION</Label>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: C.primary }}>{topRegion}</div>
      </div>
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
  if (counts.length === 0) return <p style={{ opacity: 0.2, fontSize: 10, textAlign: "center", padding: 16 }}>No geo data yet</p>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      {counts.map(([cc, count]) => (
        <div key={cc} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, width: 22, flexShrink: 0 }}>{countryFlag(cc)}</span>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: "rgba(255,255,255,0.4)", width: 22, flexShrink: 0 }}>{cc}</span>
          <div style={{ flex: 1, height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${(count / max) * 100}%`, background: `linear-gradient(90deg, ${C.secondary}, ${C.primary})`, borderRadius: 2, transition: "width 0.5s" }} />
          </div>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: C.primary, width: 28, textAlign: "right" }}>{count}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Live Log Feed ────────────────────────────────────────────────────
interface LogEntry { id: number; time: string; type: "success" | "init" | "strike" | "banned" | "log"; msg: string; }
const LOG_STYLES: Record<string, string> = {
  success: C.secondary, init: C.primary, strike: C.tertiary, banned: "#ef4444", log: "rgba(255,255,255,0.4)",
};
const LOG_LABELS: Record<string, string> = {
  success: "[SUCCESS]", init: "[INIT]", strike: "[STRIKE]", banned: "[BANNED]", log: "[LOG]",
};

function useLiveLogs(data?: ProxyStatusData) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const entryId = useRef(0);

  useEffect(() => {
    if (!data?.logs) return;
    // Map backend logs to frontend LogEntry format
    const backendLogs = data.logs.map(l => {
      const logType = (l.type === 'success' || l.type === 'init' || l.type === 'strike' || l.type === 'banned' || l.type === 'log')
        ? l.type as LogEntry['type'] : 'log' as LogEntry['type'];
      return { id: entryId.current++, time: l.time, type: logType, msg: l.msg };
    });
    if (backendLogs.length > 0) {
      setLogs(backendLogs.slice(0, 80));
    }
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
  const tierColor = TIER_COLORS[tier] ?? C.bronze;
  const ip = proxy.url?.replace(/^(socks5?|https?):\/\//, "") ?? "";
  return (
    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.03)", transition: "background 0.2s" }}
      onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
      <td style={{ padding: "5px 10px", fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "rgba(255,255,255,0.2)" }}>#{String(idx + 1).padStart(3, "0")}</td>
      <td style={{ padding: "5px 10px", fontFamily: "'JetBrains Mono',monospace", fontSize: 10, display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 12 }}>{countryFlag(proxy.platforms?.country)}</span>
        <span style={{ opacity: 0.8 }}>{ip}</span>
      </td>
      <td style={{ padding: "5px 10px" }}>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8, fontWeight: 700, padding: "1px 5px",
          border: `1px solid ${proto === "SOCKS5" ? "rgba(76,215,246,0.2)" : "rgba(255,255,255,0.1)"}`,
          color: proto === "SOCKS5" ? C.primary : "rgba(255,255,255,0.6)" }}>{proto}</span>
      </td>
      <td style={{ padding: "5px 10px", fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: msColor, textAlign: "right" }}>
        {ms ? `${ms}ms` : "—"}
      </td>
      <td style={{ padding: "5px 10px", fontFamily: "'JetBrains Mono',monospace", fontSize: 9, fontWeight: 700, color: tierColor }}>{tier.toUpperCase()}</td>
      <td style={{ padding: "5px 10px", textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 4 }}>
          {[proxy.platforms?.yt, proxy.platforms?.fb, proxy.platforms?.ig].map((ok, i) => (
            <div key={i} style={{ width: 4, height: 4, borderRadius: "50%",
              background: ok ? C.secondary : "rgba(255,255,255,0.05)",
              boxShadow: ok ? `0 0 4px ${C.secondary}` : "none" }} />
          ))}
        </div>
      </td>
      <td style={{ padding: "5px 10px", textAlign: "center", fontSize: 11 }}>
        {[0, 1, 2].map(i => (
          <span key={i} style={{
            color: i < (3 - fails) ? (fails === 0 ? C.secondary : fails === 1 ? C.gold : C.tertiary) : "rgba(255,255,255,0.05)",
            marginRight: 1,
          }}>♥</span>
        ))}
      </td>
      <td style={{ padding: "5px 10px", fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: "rgba(255,255,255,0.2)", textAlign: "right" }}>
        {timeAgo(proxy.platforms?.lastCheckedAt)}
      </td>
    </tr>
  );
}

// ─── VPS Health + Geo Enrich Panel ────────────────────────────────────
function VpsHealthPanel() {
  const { toast } = useToast();
  const [health, setHealth] = useState<{ hetzner: { url: string; online: boolean }; localRust: { port: number; online: boolean }; powerMode: boolean } | null>(null);
  const [enriching, setEnriching] = useState(false);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const res = await apiRequest("/api/admin/proxy-vps-health");
        setHealth(res as typeof health);
      } catch { /* non-critical */ }
    };
    fetchHealth();
    const id = setInterval(fetchHealth, 15000);
    return () => clearInterval(id);
  }, []);

  const triggerEnrich = async () => {
    setEnriching(true);
    try {
      const res = await apiRequest("/api/admin/proxy-geo-enrich", { method: "POST", body: "{}", headers: { "Content-Type": "application/json" } });
      const result = res as { success: boolean; enriched: number };
      toast({ title: "🌍 Geo Enrichment Done", description: `${result.enriched} proxies updated with country + tier data.` });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      toast({ title: "Enrichment Error", description: msg, variant: "destructive" });
    } finally {
      setEnriching(false);
    }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 8 }}>
      <Glass className="p-3">
        <Label>HETZNER VPS (CLOUD)</Label>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
          <div style={{
            width: 10, height: 10, borderRadius: "50%",
            background: health?.hetzner?.online ? C.secondary : "#ef4444",
            boxShadow: health?.hetzner?.online ? `0 0 8px ${C.secondary}` : `0 0 8px #ef4444`,
          }} />
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: 700,
            color: health?.hetzner?.online ? C.secondary : "#ef4444" }}>
            {health?.hetzner?.online ? "ONLINE" : "OFFLINE"}
          </span>
        </div>
        <div style={{ fontSize: 8, color: C.textSecondary, marginTop: 4 }}>{health?.hetzner?.url ?? "78.47.104.43:6000"}</div>
      </Glass>
      <Glass className="p-3">
        <Label>LOCAL RUST VERIFIER</Label>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
          <div style={{
            width: 10, height: 10, borderRadius: "50%",
            background: health?.localRust?.online ? C.secondary : "#ef4444",
            boxShadow: health?.localRust?.online ? `0 0 8px ${C.secondary}` : `0 0 8px #ef4444`,
          }} />
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: 700,
            color: health?.localRust?.online ? C.secondary : "#ef4444" }}>
            {health?.localRust?.online ? "ONLINE" : "OFFLINE"}
          </span>
        </div>
        <div style={{ fontSize: 8, color: C.textSecondary, marginTop: 4 }}>Port {health?.localRust?.port ?? 6000}</div>
      </Glass>
      <Glass className="p-3" style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <Label>GEO RE-ENRICH</Label>
        <button onClick={triggerEnrich} disabled={enriching} style={{
          marginTop: 8, padding: "8px 0",
          border: `1px solid rgba(78,222,163,0.2)`,
          background: enriching ? "rgba(78,222,163,0.08)" : "rgba(78,222,163,0.04)",
          color: C.secondary, fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 10,
          letterSpacing: "0.08em", textTransform: "uppercase", cursor: enriching ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "all 0.2s",
        }}>
          🌍 {enriching ? "ENRICHING..." : "ENRICH ALL XX NODES"}
        </button>
        <div style={{ fontSize: 7, color: C.textSecondary, marginTop: 4, textAlign: "center" }}>Fix proxies with missing country/tier</div>
      </Glass>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────
type Section = "command" | "network" | "hunting" | "archive" | "system";
const NAV_ITEMS: { id: Section; label: string; icon: string }[] = [
  { id: "command", label: "COMMAND", icon: "dashboard" },
  { id: "network", label: "NETWORK", icon: "hub" },
  { id: "hunting", label: "HUNTING", icon: "radar" },
  { id: "archive", label: "ARCHIVE", icon: "history" },
  { id: "system", label: "SYSTEM", icon: "terminal" },
];

interface Props { onClose: () => void; }

export function ProxyMissionControl({ onClose }: Readonly<Props>) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [section, setSection] = useState<Section>("command");
  const [huntCountdown, setHuntCountdown] = useState("—");
  const [revalCountdown, setRevalCountdown] = useState("—");
  const [powerMode, setPowerMode] = useState(false);

  const { data } = useQuery<ProxyStatusData>({
    queryKey: ["/api/admin/proxy-status"],
    refetchInterval: 3000,
  });

  const logs = useLiveLogs(data);

  // ── Countdowns (ticking every second) ───────────────────────────────
  useEffect(() => {
    const tick = () => {
      // Hunt countdown: use backend nextHuntAt (persists across refresh)
      const nextHunt = data?.nextHuntAt || data?.huntDetails?.nextHuntAt;
      if (nextHunt) {
        const diff = new Date(nextHunt).getTime() - Date.now();
        setHuntCountdown(diff <= 0 ? "IMMINENT" : formatCountdown(diff));
      } else {
        setHuntCountdown("—");
      }
      // Reval countdown: use backend nextRevalAt (persists across refresh)
      const nextReval = data?.nextRevalAt;
      if (nextReval) {
        const diff = new Date(nextReval).getTime() - Date.now();
        setRevalCountdown(diff <= 0 ? "DUE" : formatCountdown(diff));
      } else {
        const lastReval = data?.lastRevalidatedAt;
        if (lastReval) {
          const nextR = new Date(lastReval).getTime() + 30 * 60_000;
          const diff = nextR - Date.now();
          setRevalCountdown(diff <= 0 ? "DUE" : formatCountdown(diff));
        } else {
          setRevalCountdown("—");
        }
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [data?.nextHuntAt, data?.huntDetails?.nextHuntAt, data?.nextRevalAt, data?.lastRevalidatedAt]);

  // Sync power mode from server
  useEffect(() => {
    if (data?.powerMode !== undefined) setPowerMode(data.powerMode);
  }, [data?.powerMode]);

  const triggerHunt = async () => {
    try {
      await apiRequest("/api/admin/proxy-hunt", { method: "POST", body: "{}", headers: { "Content-Type": "application/json" } });
      toast({ title: "🔥 Hunt Initiated", description: "Red Team OSINT scrape started." });
      qc.invalidateQueries({ queryKey: ["/api/admin/proxy-status"] });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      toast({ title: "Hunt Error", description: msg, variant: "destructive" });
    }
  };

  const triggerRevalidation = async () => {
    try {
      await apiRequest("/api/admin/proxy-revalidate", { method: "POST", body: "{}", headers: { "Content-Type": "application/json" } });
      toast({ title: "🔄 Revalidation Started", description: "Re-checking all due proxy nodes." });
      qc.invalidateQueries({ queryKey: ["/api/admin/proxy-status"] });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      toast({ title: "Reval Error", description: msg, variant: "destructive" });
    }
  };

  const triggerForceRevalidateAll = async () => {
    try {
      await apiRequest("/api/admin/proxy-force-revalidate-all", { method: "POST", body: "{}", headers: { "Content-Type": "application/json" } });
      toast({ title: "⚡ Force-Revalidating ALL", description: "Re-checking every proxy in pool — ignoring tier intervals. May take a few minutes." });
      qc.invalidateQueries({ queryKey: ["/api/admin/proxy-status"] });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      toast({ title: "Force Reval Error", description: msg, variant: "destructive" });
    }
  };

  const triggerPurgeDead = async () => {
    try {
      const res = await apiRequest("/api/admin/proxy-purge-dead", { method: "POST", body: "{}", headers: { "Content-Type": "application/json" } });
      const result = res as { purged: number };
      toast({ title: `☠️ Purged ${result.purged} Dead Nodes`, description: "All proxies with 2+ failures removed from pool." });
      qc.invalidateQueries({ queryKey: ["/api/admin/proxy-status"] });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      toast({ title: "Purge Error", description: msg, variant: "destructive" });
    }
  };

  const togglePowerMode = async () => {
    try {
      const res = await apiRequest("/api/admin/proxy-power-mode", {
        method: "POST", body: JSON.stringify({ enabled: !powerMode }),
        headers: { "Content-Type": "application/json" },
      });
      const result = res as { powerMode: boolean };
      setPowerMode(result.powerMode);
      toast({ title: result.powerMode ? "⚡ POWER MODE ON" : "Power Mode Off", description: result.powerMode ? "Full speed GPU/VPS verification active" : "Standard cloud mode" });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      toast({ title: "Power Mode Error", description: msg, variant: "destructive" });
    }
  };

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
  const statusText = isHunting ? "HUNTING ACTIVE" : data?.isRevalidating ? "REVALIDATING" : "STANDBY";
  const statusColor = isHunting ? C.tertiary : data?.isRevalidating ? C.primary : C.secondary;

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
        padding: "0 20px", background: "rgba(15,15,22,0.6)", backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.05)", boxShadow: "0 0 20px rgba(76,215,246,0.05)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 17, fontWeight: 700, letterSpacing: "-0.02em", color: C.primary, fontStyle: "italic" }}>TACTICAL COMMAND</h1>
          <nav style={{ display: "flex", gap: 20, fontFamily: "'Space Grotesk',sans-serif", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.03em" }}>
            <span style={{ color: C.primary, borderBottom: `1px solid ${C.primary}`, paddingBottom: 2, fontWeight: 600 }}>NODES: {total.toLocaleString()}</span>
            <span style={{ color: "rgba(255,255,255,0.3)" }}>ACTIVE: {pc.allThree}</span>
            <span style={{ color: isHunting ? C.tertiary : "rgba(255,255,255,0.3)" }}>{isHunting ? `HUNTING: ${hd?.found ?? 0}` : "STANDBY"}</span>
          </nav>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Icon name="notifications_active" size={18} color={C.primary} />
          <Icon name="settings" size={18} color={C.primary} />
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: "50%", border: `1px solid rgba(76,215,246,0.2)`,
            background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="close" size={16} color={C.primary} />
          </button>
        </div>
      </header>

      {/* ══ BODY (sidebar + main) ═════════════════════════════════════ */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* ── Sidebar ── */}
        <aside style={{ width: 70, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center",
          padding: "20px 0", background: "rgba(10,10,20,0.7)", backdropFilter: "blur(20px)", borderRight: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ marginBottom: 16, textAlign: "center" }}>
            <div style={{ fontSize: 7, textTransform: "uppercase", letterSpacing: "0.05em", opacity: 0.4 }}>OP-01</div>
            <div style={{ fontSize: 7, color: C.primary, fontWeight: 700 }}>SECTOR-7</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, width: "100%" }}>
            {NAV_ITEMS.map(item => {
              const active = section === item.id;
              return (
                <button key={item.id} onClick={() => setSection(item.id)} style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                  width: "100%", padding: "10px 0", background: active ? "rgba(76,215,246,0.08)" : "transparent",
                  color: active ? C.primary : "rgba(255,255,255,0.15)", border: "none", cursor: "pointer",
                  borderRight: active ? `2px solid ${C.primary}` : "2px solid transparent", transition: "all 0.2s",
                }}>
                  <Icon name={item.icon} size={20} color={active ? C.primary : "rgba(255,255,255,0.15)"} />
                  <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 8, letterSpacing: "0.05em", textTransform: "uppercase" }}>{item.label}</span>
                </button>
              );
            })}
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}><Icon name="lock" size={20} color="rgba(255,255,255,0.15)" /></button>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}><Icon name="power_settings_new" size={20} color="rgba(255,255,255,0.15)" /></button>
          </div>
        </aside>

        {/* ── Main Canvas ── */}
        <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* ═══ COMMAND VIEW ═══════════════════════════════════════════ */}
          {section === "command" && (<>
            {/* Top Stats Strip */}
            <section style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, padding: "12px 12px 0", flexShrink: 0 }}>
              <Glass className="p-3">
                <Label>{pc.allThree} ALL-3 LIVE</Label>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 28, fontWeight: 700, color: C.primary, lineHeight: 1.1 }}>{total.toLocaleString()}</div>
                <div style={{ height: 3, background: "rgba(255,255,255,0.05)", borderRadius: 4, marginTop: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.min((total / 1000) * 100, 100)}%`, background: C.primary, boxShadow: `0 0 8px ${C.primary}` }} />
                </div>
              </Glass>
              {[
                { label: "YT STREAM", value: pc.yt, pct: total > 0 ? (pc.yt / total) * 100 : 0 },
                { label: "FB NODES", value: pc.fb, pct: total > 0 ? (pc.fb / total) * 100 : 0 },
                { label: "IG ACTIVE", value: pc.ig, pct: total > 0 ? (pc.ig / total) * 100 : 0 },
              ].map((card, i) => (
                <Glass key={i} className="p-3">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <Label>{card.label}</Label>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: C.secondary }}>{card.value}</span>
                  </div>
                  <div style={{ height: 3, background: "rgba(255,255,255,0.05)", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${card.pct}%`, background: C.secondary }} />
                  </div>
                </Glass>
              ))}
              <Glass className="p-3">
                <Label>🌍 COUNTRIES</Label>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 20, color: C.secondary, marginTop: 4 }}>
                  {data?.countryCount ?? 0}
                </div>
              </Glass>
              <Glass className="p-3">
                <Label>AVG LATENCY</Label>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 20, color: C.textPrimary, marginTop: 4, display: "flex", alignItems: "baseline", gap: 2 }}>
                  {data?.avgLatency ?? 0}<span style={{ fontSize: 9, opacity: 0.4, textTransform: "uppercase" }}>ms</span>
                </div>
              </Glass>
              <Glass className="p-3 relative overflow-hidden" glow={isHunting ? "rgba(255,179,173,0.08)" : undefined}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Label><span style={{ color: statusColor, opacity: 0.8 }}>HUNT STATUS</span></Label>
                  {isHunting && <div style={{ width: 5, height: 5, borderRadius: "50%", background: C.tertiary, boxShadow: `0 0 8px ${C.tertiary}`, animation: "pulse 1.5s infinite" }} />}
                </div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 16, color: isHunting ? C.tertiary : C.textPrimary, marginTop: 4 }}>
                  {isHunting ? `${hd?.progress ?? 0}/${hd?.total ?? 0}` : `${total} ACTIVE`}
                </div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 7, color: statusColor, opacity: 0.4, textTransform: "uppercase", letterSpacing: "0.02em" }}>{statusText}</div>
              </Glass>
            </section>

            {/* Middle Section (3-col: Donut | Map | Telemetry) */}
            <section style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "5fr 5fr 4fr", gap: 2, padding: "2px 12px", overflow: "hidden" }}>
              {/* Donut */}
              <Glass className="p-4 flex flex-col">
                <Label>NODE TIER DISTRIBUTION</Label>
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-around", minHeight: 0, marginTop: 12 }}>
                  <div style={{ position: "relative", width: 130, height: 130 }}>
                    <DonutChart tiers={tierData} total={total} />
                    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 20, fontWeight: 700, color: C.textPrimary }}>
                        {total >= 1000 ? `${(total / 1000).toFixed(1)}K` : total}
                      </span>
                      <Label>TOTAL</Label>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {tierData.map(t => (
                      <div key={t.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: t.color }} />
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <Label>{t.label}</Label>
                          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: C.textPrimary }}>{t.value}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Glass>

              {/* World Map */}
              <Glass className="p-4 flex flex-col relative overflow-hidden">
                <Label>GEO DISTRIBUTION INDEX</Label>
                <div style={{ flex: 1, minHeight: 0, marginTop: 8, borderRadius: 4, overflow: "hidden", position: "relative" }}>
                  <WorldMap proxies={proxies} />
                </div>
              </Glass>

              {/* Telemetry + Actions */}
              <div style={{ display: "flex", flexDirection: "column", gap: 2, minHeight: 0 }}>
                <Glass className="flex-1 min-h-0 flex flex-col p-3">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <Label>LIVE SYSTEM TELEMETRY</Label>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <div style={{ width: 4, height: 4, borderRadius: "50%", background: C.secondary, animation: "pulse 1.5s infinite" }} />
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 7, color: C.secondary }}>STREAMING</span>
                    </div>
                  </div>
                  <div style={{ flex: 1, overflow: "auto", fontFamily: "'JetBrains Mono',monospace", fontSize: 9, lineHeight: 1.8 }}>
                    {logs.map(log => (
                      <div key={log.id} style={{ display: "flex", gap: 6 }}>
                        <span style={{ color: "rgba(255,255,255,0.15)", flexShrink: 0 }}>{log.time}</span>
                        <span style={{ color: LOG_STYLES[log.type], fontWeight: 700, flexShrink: 0 }}>{LOG_LABELS[log.type]}</span>
                        <span style={{ color: "rgba(255,255,255,0.5)" }}>{log.msg}</span>
                      </div>
                    ))}
                  </div>
                </Glass>
                <Glass className="p-3">
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {/* Power Mode Toggle */}
                    <button onClick={togglePowerMode} style={{
                      padding: "8px 0", border: `1px solid ${powerMode ? "rgba(0,255,136,0.3)" : "rgba(255,255,255,0.08)"}`,
                      background: powerMode ? "rgba(0,255,136,0.08)" : "rgba(255,255,255,0.02)",
                      color: powerMode ? C.powerGreen : "rgba(255,255,255,0.5)", fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 10,
                      letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "all 0.3s",
                    }}>
                      <Icon name="bolt" size={14} color={powerMode ? C.powerGreen : "rgba(255,255,255,0.4)"} />
                      {powerMode ? "⚡ POWER MODE ON" : "POWER MODE OFF"}
                    </button>
                    {/* Hunt + Revalidate row */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                      <button onClick={triggerHunt} disabled={isHunting} style={{
                        padding: "8px 0", border: `1px solid rgba(255,179,173,0.2)`, background: isHunting ? "rgba(255,179,173,0.08)" : "rgba(255,179,173,0.04)",
                        color: C.tertiary, fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 9,
                        letterSpacing: "0.08em", textTransform: "uppercase", cursor: isHunting ? "not-allowed" : "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 4, transition: "all 0.2s",
                      }}>
                        <Icon name="radar" size={12} color={C.tertiary} />
                        {isHunting ? "HUNTING..." : "HUNT"}
                      </button>
                      <button onClick={triggerRevalidation} disabled={!!data?.isRevalidating} style={{
                        padding: "8px 0", border: `1px solid rgba(76,215,246,0.2)`, background: data?.isRevalidating ? "rgba(76,215,246,0.08)" : "rgba(76,215,246,0.04)",
                        color: C.primary, fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 9,
                        letterSpacing: "0.08em", textTransform: "uppercase", cursor: data?.isRevalidating ? "not-allowed" : "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 4, transition: "all 0.2s",
                      }}>
                        <Icon name="verified" size={12} color={C.primary} />
                        {data?.isRevalidating ? "REVALIDATING..." : "REVALIDATE"}
                      </button>
                    </div>
                    {/* Refresh + Countdowns */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                      <button onClick={() => qc.invalidateQueries({ queryKey: ["/api/admin/proxy-status"] })} style={{
                        padding: "6px 0", border: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.03)",
                        color: "rgba(255,255,255,0.6)", fontFamily: "'Space Grotesk',sans-serif", fontSize: 8,
                        letterSpacing: "0.1em", textTransform: "uppercase", display: "flex", alignItems: "center", justifyContent: "center", gap: 4, cursor: "pointer",
                      }}>
                        <Icon name="refresh" size={10} color="rgba(255,255,255,0.6)" /> REFRESH
                      </button>
                      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center",
                        border: "1px solid rgba(255,255,255,0.05)", background: "rgba(10,10,20,0.3)", padding: 4 }}>
                        <Label>HUNT IN</Label>
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10,
                          color: isHunting ? C.tertiary : C.primary, animation: isHunting ? "pulse 1.5s infinite" : "none" }}>
                          {isHunting ? "ACTIVE" : huntCountdown}
                        </span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center",
                        border: "1px solid rgba(255,255,255,0.05)", background: "rgba(10,10,20,0.3)", padding: 4 }}>
                        <Label>REVAL IN</Label>
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10,
                          color: data?.isRevalidating ? C.tertiary : C.secondary }}>
                          {data?.isRevalidating ? "ACTIVE" : revalCountdown}
                        </span>
                      </div>
                    </div>
                  </div>
                </Glass>
              </div>
            </section>

            {/* Bottom: Active Node Registry */}
            <section style={{ height: "33%", padding: "2px 12px 8px", flexShrink: 0 }}>
              <Glass className="h-full flex flex-col overflow-hidden">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <Label>ACTIVE NODE REGISTRY</Label>
                  <Label>{Math.min(proxies.length, 50)} OF {total.toLocaleString()} DISPLAYED</Label>
                </div>
                {isHunting && hd && (
                  <div style={{ padding: "4px 12px", display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ flex: 1, height: 2, background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${hd.total > 0 ? (hd.progress / hd.total) * 100 : 0}%`, background: `linear-gradient(90deg, ${C.primary}, ${C.secondary})`, transition: "width 0.5s" }} />
                    </div>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: C.primary, flexShrink: 0 }}>{hd.progress}/{hd.total} · +{hd.found} NEW</span>
                  </div>
                )}
                <div style={{ flex: 1, overflow: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                    <thead>
                      <tr style={{ position: "sticky", top: 0, zIndex: 10, background: "#131318", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                        {["IDX", "GEO/IP", "PROTO", "LATENCY", "TIER", "PLATFORMS", "HEALTH", "TENURE"].map(h => (
                          <th key={h} style={{ padding: "6px 10px", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em", opacity: 0.4, fontWeight: 400 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {proxies.slice(0, 50).map((p, i) => <ProxyRow key={i} proxy={p} idx={i} />)}
                      {proxies.length === 0 && (
                        <tr><td colSpan={8} style={{ textAlign: "center", padding: 24, opacity: 0.2, fontSize: 11, fontFamily: "'JetBrains Mono',monospace" }}>
                          NO ACTIVE NODES — INITIATE HUNT TO BEGIN
                        </td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Glass>
            </section>
          </>)}

          {/* ═══ NETWORK VIEW ══════════════════════════════════════════ */}
          {section === "network" && (
            <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <Label>ALL {total.toLocaleString()} ACTIVE NODES — FULL REGISTRY</Label>
                <div style={{ display: "flex", gap: 12 }}>
                  {tierData.map(t => (
                    <span key={t.label} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9, fontFamily: "'JetBrains Mono',monospace" }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: t.color }} />
                      <span style={{ color: t.color }}>{t.label}: {t.value}</span>
                    </span>
                  ))}
                </div>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ position: "sticky", top: 0, zIndex: 10, background: C.bg, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    {["IDX", "GEO/IP", "PROTO", "LATENCY", "TIER", "PLATFORMS", "HEALTH", "TENURE"].map(h => (
                      <th key={h} style={{ padding: "6px 10px", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em", opacity: 0.4, fontWeight: 400 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>{proxies.map((p, i) => <ProxyRow key={i} proxy={p} idx={i} />)}</tbody>
              </table>
            </div>
          )}

          {/* ═══ HUNTING VIEW ══════════════════════════════════════════ */}
          {section === "hunting" && (
            <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
              <Label>HUNT INTELLIGENCE — PHASE TRACKER</Label>

              {/* ── Mining Funnel Visualization ─────────────────────── */}
              <Glass className="p-4 mt-3">
                <Label>🔬 MINING FUNNEL — WHY {total} LIVE OUT OF {(hd?.mined ?? 0).toLocaleString()} SCRAPED?</Label>
                <div style={{ display: "flex", alignItems: "center", gap: 0, marginTop: 12, fontSize: 10, fontFamily: "'JetBrains Mono',monospace" }}>
                  {[
                    { label: "OSINT SCRAPED", value: (hd?.mined ?? 0).toLocaleString(), sub: "Raw IP:PORT from 30 sources", color: C.textSecondary, icon: "🌐" },
                    { arrow: true },
                    { label: "SAMPLED & TESTED", value: "5,000", sub: "Random sample tested per hunt", color: C.gold, icon: "🔬" },
                    { arrow: true },
                    { label: "PASSED YT+FB+IG", value: (hd?.found ?? 0).toLocaleString(), sub: "Verified live this hunt", color: C.primary, icon: "✅" },
                    { arrow: true },
                    { label: "TOTAL POOL", value: total.toLocaleString(), sub: "Cumulative verified proxies", color: C.secondary, icon: "🛡️" },
                  ].map((item, i) => {
                    if ('arrow' in item) return (
                      <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "0 12px", flex: 0 }}>
                        <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 18 }}>→</span>
                        <span style={{ fontSize: 7, color: "rgba(255,255,255,0.15)", marginTop: 2 }}>filter</span>
                      </div>
                    );
                    return (
                      <div key={i} style={{ flex: 1, textAlign: "center", padding: "12px 8px",
                        border: `1px solid ${item.color}20`, background: `${item.color}06`, borderRadius: 4 }}>
                        <div style={{ fontSize: 16 }}>{item.icon}</div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: item.color, marginTop: 4 }}>{item.value}</div>
                        <div style={{ fontSize: 9, color: item.color, opacity: 0.7, marginTop: 2 }}>{item.label}</div>
                        <div style={{ fontSize: 7.5, color: "rgba(255,255,255,0.2)", marginTop: 2 }}>{item.sub}</div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ marginTop: 10, padding: "8px 12px", background: "rgba(255,255,255,0.02)", borderLeft: `2px solid ${C.gold}40`, fontSize: 9,
                  fontFamily: "'JetBrains Mono',monospace", color: "rgba(255,255,255,0.3)", lineHeight: 1.8 }}>
                  💡 <span style={{ color: C.gold }}>WHY SO FEW?</span> Public proxy lists are 99.9% dead.
                  We scrape 200K+ raw IPs → verify 5K at a time against real YT/FB/IG → only ~0.1–0.5% pass.
                  This is normal. More hunts = bigger pool. Power Mode (Hetzner VPS) samples faster with less ASN blocking.
                </div>
              </Glass>

              {/* ── 4-Column Stats ──────────────────────────────────── */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginTop: 12 }}>
                {[
                  { label: "TOTAL HUNTS", value: hd?.huntCount ?? 0, color: C.primary, sub: "Scrape cycles run" },
                  { label: "TOTAL EVER FOUND", value: hd?.totalEverFound ?? 0, color: C.secondary, sub: "Cumulative since storage" },
                  { label: "LAST HUNT MINED", value: hd?.mined ?? 0, color: C.gold, sub: "Raw candidates scraped" },
                  { label: "LAST HUNT SKIPPED", value: hd?.skipped ?? 0, color: C.textSecondary, sub: "Dedup (already in pool)" },
                ].map((s, i) => (
                  <Glass key={i} className="p-3">
                    <Label>{s.label}</Label>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 22, fontWeight: 700, color: s.color, marginTop: 4 }}>{s.value.toLocaleString()}</div>
                    <div style={{ fontSize: 8, color: "rgba(255,255,255,0.2)", marginTop: 2 }}>{s.sub}</div>
                  </Glass>
                ))}
              </div>

              {/* ── Dead / Near-Dead Health Row ─────────────────────── */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 8 }}>
                <Glass className="p-3" glow={data?.deadProxyCount ? "rgba(239,68,68,0.06)" : undefined}>
                  <Label>☠️ DEAD NODES (2+ FAILS)</Label>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 22, fontWeight: 700,
                    color: (data?.deadProxyCount ?? 0) > 0 ? "#ef4444" : C.secondary, marginTop: 4 }}>
                    {(data?.deadProxyCount ?? 0).toLocaleString()}
                  </div>
                  <div style={{ fontSize: 8, color: "rgba(255,255,255,0.2)", marginTop: 2 }}>Use PURGE DEAD to remove</div>
                </Glass>
                <Glass className="p-3">
                  <Label>⚠️ NEAR-DEAD (1 FAIL)</Label>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 22, fontWeight: 700,
                    color: (data?.nearDeadCount ?? 0) > 0 ? C.gold : C.secondary, marginTop: 4 }}>
                    {(data?.nearDeadCount ?? 0).toLocaleString()}
                  </div>
                  <div style={{ fontSize: 8, color: "rgba(255,255,255,0.2)", marginTop: 2 }}>1 more fail = auto-purge</div>
                </Glass>
                <Glass className="p-3">
                  <Label>💚 HEALTHY NODES</Label>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 22, fontWeight: 700, color: C.secondary, marginTop: 4 }}>
                    {(total - (data?.deadProxyCount ?? 0) - (data?.nearDeadCount ?? 0)).toLocaleString()}
                  </div>
                  <div style={{ fontSize: 8, color: "rgba(255,255,255,0.2)", marginTop: 2 }}>failCount = 0 (pristine)</div>
                </Glass>
              </div>

              {/* ── Power Mode + Countdowns ─────────────────────────── */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr repeat(3, 1fr)", gap: 8, marginTop: 8 }}>
                <Glass className="p-4" glow={powerMode ? "rgba(0,255,136,0.15)" : undefined}>
                  <Label>⚡ HETZNER VPS MODE</Label>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                    <button onClick={togglePowerMode} style={{
                      width: 44, height: 22, borderRadius: 11, cursor: "pointer", border: "none", position: "relative",
                      background: powerMode ? "rgba(0,255,136,0.3)" : "rgba(255,255,255,0.1)", transition: "all 0.3s",
                    }}>
                      <div style={{
                        width: 16, height: 16, borderRadius: "50%", position: "absolute", top: 3,
                        left: powerMode ? 24 : 4, transition: "left 0.3s",
                        background: powerMode ? C.powerGreen : "rgba(255,255,255,0.3)",
                        boxShadow: powerMode ? `0 0 8px ${C.powerGreen}` : "none",
                      }} />
                    </button>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: powerMode ? C.powerGreen : C.textSecondary, fontWeight: 700 }}>
                      {powerMode ? "HETZNER ON" : "OFF"}
                    </span>
                  </div>
                  <div style={{ fontSize: 7.5, color: C.textSecondary, marginTop: 4, lineHeight: 1.6 }}>
                    Routes verification through<br/>Hetzner VPS (78.47.104.43)<br/><span style={{ color: "#ef4444" }}>≠ local GPU</span> — cloud IP bypass
                  </div>
                </Glass>
                <Glass className="p-4">
                  <Label>NEXT HUNT (3H CYCLE)</Label>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 20, color: isHunting ? C.tertiary : C.primary, marginTop: 4, animation: isHunting ? "pulse 1.5s infinite" : "none" }}>
                    {isHunting ? "RUNNING NOW" : huntCountdown}
                  </div>
                </Glass>
                <Glass className="p-4">
                  <Label>NEXT REVALIDATION (30M)</Label>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 20, color: data?.isRevalidating ? C.tertiary : C.secondary, marginTop: 4 }}>
                    {data?.isRevalidating ? "RUNNING NOW" : revalCountdown}
                  </div>
                </Glass>
                <Glass className="p-4">
                  <Label>LAST HUNT</Label>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 16, color: C.textPrimary, marginTop: 4 }}>
                    {hd?.lastHuntAt ? new Date(hd.lastHuntAt).toLocaleTimeString("en-US", { hour12: false }) : "—"}
                  </div>
                  <div style={{ fontSize: 9, color: C.textSecondary, marginTop: 2 }}>Found: +{hd?.found ?? 0} | Mined: {hd?.mined ?? 0}</div>
                </Glass>
              </div>

              {/* ── 4-Button Action Grid ─────────────────────────────── */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginTop: 14 }}>
                <button onClick={triggerHunt} disabled={isHunting} style={{
                  padding: 12, border: `1px solid rgba(255,179,173,0.2)`,
                  background: isHunting ? "rgba(255,179,173,0.08)" : "rgba(255,179,173,0.04)",
                  color: C.tertiary, fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 11,
                  letterSpacing: "0.08em", textTransform: "uppercase", cursor: isHunting ? "not-allowed" : "pointer",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                }}>
                  <Icon name="radar" size={18} color={C.tertiary} />
                  {isHunting ? `HUNTING...` : "NEW HUNT"}
                  <span style={{ fontSize: 7, opacity: 0.5 }}>Mine + Verify OSINT</span>
                </button>
                <button onClick={triggerRevalidation} disabled={!!data?.isRevalidating} style={{
                  padding: 12, border: `1px solid rgba(76,215,246,0.2)`,
                  background: data?.isRevalidating ? "rgba(76,215,246,0.08)" : "rgba(76,215,246,0.04)",
                  color: C.primary, fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 11,
                  letterSpacing: "0.08em", textTransform: "uppercase", cursor: data?.isRevalidating ? "not-allowed" : "pointer",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                }}>
                  <Icon name="verified" size={18} color={C.primary} />
                  {data?.isRevalidating ? "REVALIDATING..." : "REVALIDATE DUE"}
                  <span style={{ fontSize: 7, opacity: 0.5 }}>Tier-based (due only)</span>
                </button>
                <button onClick={triggerForceRevalidateAll}
                  disabled={!!(data?.isForceRevalidating || data?.isRevalidating || isHunting)} style={{
                  padding: 12, border: `1px solid rgba(255,180,0,0.25)`,
                  background: data?.isForceRevalidating ? "rgba(255,180,0,0.1)" : "rgba(255,180,0,0.04)",
                  color: C.gold, fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 11,
                  letterSpacing: "0.08em", textTransform: "uppercase",
                  cursor: (data?.isForceRevalidating || data?.isRevalidating || isHunting) ? "not-allowed" : "pointer",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 4, opacity: data?.isForceRevalidating ? 0.7 : 1,
                }}>
                  <Icon name="bolt" size={18} color={C.gold} />
                  {data?.isForceRevalidating ? "RUNNING..." : "FORCE ALL"}
                  <span style={{ fontSize: 7, opacity: 0.5 }}>Re-check every proxy</span>
                </button>
                <button onClick={triggerPurgeDead} disabled={!(data?.deadProxyCount ?? 0)} style={{
                  padding: 12, border: `1px solid rgba(239,68,68,0.25)`,
                  background: "rgba(239,68,68,0.04)",
                  color: "#ef4444", fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 11,
                  letterSpacing: "0.08em", textTransform: "uppercase",
                  cursor: !(data?.deadProxyCount ?? 0) ? "not-allowed" : "pointer",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                  opacity: !(data?.deadProxyCount ?? 0) ? 0.4 : 1,
                }}>
                  <Icon name="delete_sweep" size={18} color="#ef4444" />
                  PURGE DEAD ({data?.deadProxyCount ?? 0})
                  <span style={{ fontSize: 7, opacity: 0.5 }}>Remove failCount ≥ 2</span>
                </button>
              </div>

              {/* ── Phase Checklist ──────────────────────────────────── */}
              <div style={{ marginTop: 20 }}>
                <Label>PHASE STATUS (1–19) — ALL OPERATIONAL</Label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 4, marginTop: 8 }}>
                  {[
                    "P1: Basic Hunt Engine", "P2: 26-Source OSINT Matrix",
                    "P3: Platform Verifier (YT+FB+IG)", "P4: Deduplication Engine",
                    "P5: File Persistence (proxies.json)", "P6: 3-Hour Auto-Hunt Cron",
                    "P7: 3AM Daily Re-Validation", "P8: Lifetime Stat Tracking",
                    "P9: Cyber Sentinel Admin UI", "P10: Masterplan Doc Created",
                    "P11: Latency Badge (ms)", "P12: Country Flag (GeoIP-Lite)",
                    "P13: 3-Strike Auto-Prune", "P14: Tiered Revalidation (Plat/Gold/Bronze)",
                    "P15: Telegram Live Mining (4ch)", "P16: Pool → Downloader Wired",
                    "P17: Rust Turbo Verifier (tokio)", "P18: Power Mode + Manual Revalidate",
                    "P19: Hetzner VPS Cloud Verifier",
                  ].filter(Boolean).map((phase, i) => (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", gap: 6, padding: "4px 8px",
                      background: "rgba(78,222,163,0.04)", borderLeft: `2px solid ${C.secondary}`,
                      fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: C.textPrimary,
                    }}>
                      <span style={{ color: C.secondary }}>✅</span> {phase}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═══ ARCHIVE VIEW ══════════════════════════════════════════ */}
          {section === "archive" && (
            <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
              <Label>GEO DISTRIBUTION ARCHIVE — ALL NODES</Label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
                <Glass className="p-4" style={{ height: 340 }}>
                  <Label>WORLD MAP</Label>
                  <div style={{ marginTop: 8, height: "calc(100% - 20px)", borderRadius: 4, overflow: "hidden" }}>
                    <WorldMap proxies={proxies} />
                  </div>
                </Glass>
                <Glass className="p-4">
                  <Label>COUNTRY BREAKDOWN</Label>
                  <div style={{ marginTop: 12, maxHeight: 300, overflow: "auto" }}>
                    <GeoDistribution proxies={proxies} limit={50} />
                  </div>
                </Glass>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginTop: 12 }}>
                <Glass className="p-3 text-center"><Label>COUNTRIES</Label><div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 20, color: C.primary, marginTop: 4 }}>{new Set(proxies.map(p => p.platforms?.country || "XX")).size}</div></Glass>
                <Glass className="p-3 text-center"><Label>SOCKS5</Label><div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 20, color: C.primary, marginTop: 4 }}>{proxies.filter(p => p.url?.startsWith("socks")).length}</div></Glass>
                <Glass className="p-3 text-center"><Label>HTTP</Label><div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 20, color: C.gold, marginTop: 4 }}>{proxies.filter(p => !p.url?.startsWith("socks")).length}</div></Glass>
                <Glass className="p-3 text-center"><Label>AVG LATENCY</Label><div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 20, color: C.secondary, marginTop: 4 }}>{data?.avgLatency ?? 0}ms</div></Glass>
              </div>
            </div>
          )}

          {/* ═══ SYSTEM VIEW ═══════════════════════════════════════════ */}
          {section === "system" && (
            <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
              <Label>SYSTEM CONFIGURATION & ENGINE STATUS</Label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 16 }}>
                {[
                  { label: "OSINT SOURCES", value: "30", sub: "26 GitHub + 4 Telegram" },
                  { label: "SAMPLE SIZE", value: "5,000", sub: "Proxies tested per hunt" },
                  { label: "VERIFY TIMEOUT", value: "10s", sub: "Per proxy connection timeout" },
                  { label: "HUNT SCHEDULE", value: "3H", sub: "Cron: 0 */3 * * *" },
                  { label: "REVAL SCHEDULE", value: "30M", sub: "Cron: */30 * * * *" },
                  { label: "3AM SWEEP", value: "DAILY", sub: "Full pool revalidation" },
                  { label: "PLATINUM", value: "30m", sub: "<500ms + 3 platforms" },
                  { label: "GOLD TIER", value: "2h", sub: "2+ platforms verified" },
                  { label: "BRONZE TIER", value: "24h", sub: "Single platform / slow" },
                  { label: "AUTO-BAN", value: "3-STRIKE", sub: "failCount ≥ 3 → purge" },
                  { label: "RUST VERIFIER", value: "PORT 6000", sub: "Unlimited concurrent tokio tasks" },
                  { label: "POWER MODE (HETZNER VPS)", value: powerMode ? "ON" : "OFF", sub: "78.47.104.43:6000 — NOT local GPU" },
                ].map((cfg, i) => (
                  <Glass key={i} className="p-3">
                    <Label>{cfg.label}</Label>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 16, fontWeight: 700, color: C.primary, marginTop: 4 }}>{cfg.value}</div>
                    <div style={{ fontSize: 8, color: C.textSecondary, marginTop: 2 }}>{cfg.sub}</div>
                  </Glass>
                ))}
              </div>
              <div style={{ marginTop: 16 }}>
                <Label>PHASE 16 — DOWNLOADER INTEGRATION</Label>
                <Glass className="p-4 mt-2">
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: C.textSecondary, lineHeight: 2 }}>
                    <div><span style={{ color: C.secondary }}>✅</span> Layer 7 (Free Pool) → Auto-routes downloads through mined proxies</div>
                    <div><span style={{ color: C.secondary }}>✅</span> 3-Strike ban on download failure → proxy auto-removed</div>
                    <div><span style={{ color: C.secondary }}>✅</span> Fallback chain: L1 Cobalt → L2 CF → L3 IPv6 → L4 YTDL → <span style={{ color: C.primary }}>L7 Free Pool</span> → L6 Paid</div>
                    <div><span style={{ color: C.secondary }}>✅</span> getBestProxyForDownload() selects platinum-first rotation</div>
                  </div>
                </Glass>
              </div>
              {/* ─── VPS HEALTH & GEO TOOLS ────────────────────────── */}
              <div style={{ marginTop: 16 }}>
                <Label>🔧 VERIFICATION INFRASTRUCTURE & GEO TOOLS</Label>
                <VpsHealthPanel />
              </div>

              {/* ─── DUAL TERMINAL ─────────────────────────────────── */}
              <div style={{ marginTop: 16 }}>
                <Label>🖥️ DUAL TERMINAL — CLOUD SERVER ↔ LOCAL MACHINE ACTIVITY</Label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
                  {/* CLOUD SERVER LOG */}
                  <Glass className="p-3" glow="rgba(76,215,246,0.05)">
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.primary,
                        boxShadow: `0 0 6px ${C.primary}`, animation: "pulse 2s infinite" }} />
                      <Label>☁️ CLOUD SERVER — {data?.isHunting ? "HUNTING" : data?.isRevalidating ? "REVALIDATING" : "ACTIVE"}</Label>
                    </div>
                    <div style={{ maxHeight: 280, overflow: "auto", fontFamily: "'JetBrains Mono',monospace", fontSize: 9 }}>
                      {(data?.logs ?? []).length === 0 ? (
                        <div style={{ color: "rgba(255,255,255,0.2)", padding: "8px 0" }}>
                          No cloud activity yet. Trigger a hunt or revalidation.
                        </div>
                      ) : (data?.logs ?? []).map((log: { time: string; type: string; msg: string }, i: number) => (
                        <div key={i} style={{ display: "flex", gap: 6, padding: "2px 0",
                          borderBottom: "1px solid rgba(255,255,255,0.03)", lineHeight: 1.6 }}>
                          <span style={{ color: "rgba(255,255,255,0.2)", flexShrink: 0 }}>{log.time}</span>
                          <span style={{
                            color: log.type === "success" ? C.secondary : log.type === "error" ? "#ef4444" :
                                   log.type === "warn" ? C.gold : C.primary,
                            flexShrink: 0,
                          }}>[{log.type.toUpperCase()}]</span>
                          <span style={{ color: "rgba(255,255,255,0.6)" }}>{log.msg}</span>
                        </div>
                      ))}
                    </div>
                  </Glass>

                  {/* LOCAL MACHINE SYNC LOG */}
                  <Glass className="p-3" glow="rgba(78,222,163,0.05)">
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%",
                        background: (data?.localSyncLogs ?? []).length > 0 ? C.secondary : "rgba(255,255,255,0.1)" }} />
                      <Label>💻 LOCAL MACHINE — BEAST SYNC LOG</Label>
                    </div>
                    {(data?.localSyncLogs ?? []).length === 0 ? (
                      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: "rgba(255,255,255,0.2)",
                        padding: "12px 0", lineHeight: 2 }}>
                        <div style={{ color: C.gold, marginBottom: 4 }}>⚠️ NO LOCAL SYNC EVENTS YET</div>
                        <div>To see events here, run on your local machine:</div>
                        <div style={{ marginTop: 6, padding: "6px 8px", background: "rgba(255,255,255,0.03)",
                          borderLeft: `2px solid ${C.secondary}40`, color: C.secondary }}>
                          node beast_harvest.mjs
                        </div>
                        <div style={{ marginTop: 6 }}>
                          This verifies proxies with your home IP and uploads
                          to the cloud DB via <span style={{ color: C.primary }}>/api/admin/proxy-bulk-import</span>
                        </div>
                        <div style={{ marginTop: 4 }}>
                          Requires <span style={{ color: C.primary }}>BEAST_MODE_SECRET</span> in your local .env
                        </div>
                      </div>
                    ) : (
                      <div style={{ maxHeight: 280, overflow: "auto", fontFamily: "'JetBrains Mono',monospace", fontSize: 9 }}>
                        {(data?.localSyncLogs ?? []).map((log: { time: string; type: string; msg: string }, i: number) => (
                          <div key={i} style={{ display: "flex", gap: 6, padding: "2px 0",
                            borderBottom: "1px solid rgba(255,255,255,0.03)", lineHeight: 1.6 }}>
                            <span style={{ color: "rgba(255,255,255,0.2)", flexShrink: 0 }}>{log.time}</span>
                            <span style={{
                              color: log.type === "success" ? C.secondary : log.type === "error" ? "#ef4444" : C.gold,
                              flexShrink: 0,
                            }}>[{log.type.toUpperCase()}]</span>
                            <span style={{ color: "rgba(255,255,255,0.6)" }}>{log.msg}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </Glass>
                </div>
                <div style={{ marginTop: 8, padding: "8px 12px", background: "rgba(255,255,255,0.02)",
                  borderLeft: `2px solid ${C.gold}40`, fontSize: 8, fontFamily: "'JetBrains Mono',monospace",
                  color: "rgba(255,255,255,0.25)", lineHeight: 1.8 }}>
                  💡 <span style={{ color: C.gold }}>HOW LOCAL SYNC WORKS:</span>
                  {" "}Your machine runs <span style={{ color: C.primary }}>beast_harvest.mjs</span> locally (verification with your residential IP) →
                  uploads verified proxies to cloud via <span style={{ color: C.primary }}>POST /api/admin/proxy-bulk-import</span> →
                  cloud merges into the main pool → Local Machine log shows all sync events here.
                </div>
              </div>

              {/* ─── USER GUIDE ─────────────────────────────────────── */}
              <div style={{ marginTop: 20 }}>
                <Label>📖 USER GUIDE — HOW TO USE PROXY MISSION CONTROL</Label>
                <Glass className="p-4 mt-2">
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: C.textSecondary, lineHeight: 2.2 }}>
                    <div style={{ color: C.primary, fontWeight: 700, fontSize: 11, marginBottom: 4 }}>🎯 QUICK START</div>
                    <div>1. <span style={{ color: C.textPrimary }}>COMMAND</span> tab shows live dashboard — all stats, map, countdowns</div>
                    <div>2. Hit <span style={{ color: C.tertiary }}>HUNT</span> to manually trigger a proxy scrape (normally auto every 3h)</div>
                    <div>3. Hit <span style={{ color: C.primary }}>REVALIDATE</span> to re-check all due proxies (normally auto every 30m)</div>
                    <div>4. The system runs 24/7 on autopilot — you only need to intervene for manual boosts</div>

                    <div style={{ color: C.primary, fontWeight: 700, fontSize: 11, marginTop: 12, marginBottom: 4 }}>📊 STAT DEFINITIONS</div>
                    <div>• <span style={{ color: C.primary }}>Total Hunts</span> = Number of scrape cycles since last server restart</div>
                    <div>• <span style={{ color: C.secondary }}>Total Ever Found</span> = Cumulative verified proxies (loads from storage on restart)</div>
                    <div>• <span style={{ color: C.gold }}>Last Hunt Mined</span> = Raw IP:PORT candidates scraped from all 30 OSINT sources</div>
                    <div>• <span style={{ color: C.textSecondary }}>Last Hunt Skipped</span> = Proxies already in our pool (dedup filter)</div>
                    <div>• <span style={{ color: C.textPrimary }}>NODES</span> = Total proxies currently in the verified pool</div>
                    <div>• <span style={{ color: C.secondary }}>COUNTRIES</span> = Unique country codes detected via MaxMind GeoIP</div>
                    <div>• <span style={{ color: C.gold }}>XX</span> = IP not in GeoIP database — use <span style={{ color: C.secondary }}>Geo Re-Enrich</span> button in System tab to fix</div>

                    <div style={{ color: C.primary, fontWeight: 700, fontSize: 11, marginTop: 12, marginBottom: 4 }}>⚡ POWER MODE — HETZNER VPS (NOT LOCAL GPU)</div>
                    <div>1. Toggle <span style={{ color: C.powerGreen }}>POWER MODE ON</span> in the Hunting tab</div>
                    <div>2. This routes verification through <span style={{ color: C.textPrimary }}>Hetzner VPS CX23</span> at <span style={{ color: C.primary }}>78.47.104.43</span></div>
                    <div>3. <span style={{ color: "#ef4444" }}>NOT your local GPU</span> — it's a separate cloud machine with a clean IP</div>
                    <div>4. Verification speed increases from ~20 concurrent → 500+ concurrent tokio tasks</div>
                    <div>5. Benefits: clean non-datacenter IP, higher speed, no ASN bans on your home network</div>
                    <div>6. Check VPS health in <span style={{ color: C.primary }}>System → Verification Infrastructure</span> panel</div>

                    <div style={{ color: C.primary, fontWeight: 700, fontSize: 11, marginTop: 12, marginBottom: 4 }}>🌍 GEO DETECTION &amp; ENRICHMENT</div>
                    <div>• Country codes use <span style={{ color: C.textPrimary }}>geoip-lite</span> (MaxMind offline DB) — no API calls</div>
                    <div>• If proxies show <span style={{ color: C.gold }}>XX</span>, go to System → click <span style={{ color: C.secondary }}>ENRICH ALL XX NODES</span></div>
                    <div>• New hunts auto-enrich countries on verification — only legacy data needs manual fix</div>
                    <div>• All data is real-time from actual proxy connections — zero fake data</div>

                    <div style={{ color: C.primary, fontWeight: 700, fontSize: 11, marginTop: 12, marginBottom: 4 }}>📊 TIER SYSTEM</div>
                    <div>• <span style={{ color: C.primary }}>PLATINUM</span>: &lt;500ms latency + all 3 platforms (YT+FB+IG) → revalidate every 30m</div>
                    <div>• <span style={{ color: C.gold }}>GOLD</span>: 2+ platforms verified → revalidate every 2h</div>
                    <div>• <span style={{ color: C.bronze }}>BRONZE</span>: Single platform or slow → revalidate every 24h, purge if 3 fails</div>

                    <div style={{ color: C.primary, fontWeight: 700, fontSize: 11, marginTop: 12, marginBottom: 4 }}>🔄 SYNC &amp; PERSISTENCE</div>
                    <div>• All proxy data syncs to cloud storage (Upstash Redis / local JSON)</div>
                    <div>• Counter "Total Ever Found" persists across server restarts via <span style={{ color: C.textPrimary }}>initFromStorage()</span></div>
                    <div>• Dashboard auto-refreshes every 3 seconds — no manual refresh needed</div>
                    <div>• Manual HUNT/REVALIDATE/ENRICH buttons trigger server-side action immediately</div>

                    <div style={{ color: C.primary, fontWeight: 700, fontSize: 11, marginTop: 12, marginBottom: 4 }}>🔧 MANUAL BOOST (LOCAL MACHINE)</div>
                    <div>1. Run <span style={{ color: C.textPrimary }}>beast_harvest.mjs</span> on your local machine to verify proxies with your home IP</div>
                    <div>2. Results auto-upload to cloud via <span style={{ color: C.textPrimary }}>/api/admin/proxy-bulk-import</span></div>
                    <div>3. Set <span style={{ color: C.textPrimary }}>BEAST_MODE_SECRET</span> in server .env for security</div>
                  </div>
                </Glass>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ══ FOOTER ════════════════════════════════════════════════════ */}
      <footer style={{
        flexShrink: 0, height: 28, display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "0 16px", background: "rgba(10,10,20,0.8)", backdropFilter: "blur(10px)",
        borderTop: "1px solid rgba(255,255,255,0.05)",
        fontFamily: "'JetBrains Mono',monospace", fontSize: 7, letterSpacing: "0.1em", textTransform: "uppercase",
      }}>
        <span style={{ color: "rgba(255,255,255,0.15)" }}>© 2025 OBSIDIAN LENS — BONG BARI MEDIA</span>
        <div style={{ display: "flex", gap: 20 }}>
          <span style={{ color: powerMode ? C.powerGreen : C.secondary }}>{powerMode ? "⚡ POWER_MODE" : "ENCRYPTION_ACTIVE"}</span>
          <span style={{ color: "rgba(255,255,255,0.15)" }}>LATENCY: {data?.avgLatency ?? 0}MS</span>
          <span style={{ color: "rgba(255,255,255,0.1)" }}>HUNT: {huntCountdown}</span>
          <span style={{ color: "rgba(255,255,255,0.1)" }}>REVAL: {revalCountdown}</span>
          <span style={{ color: "rgba(255,255,255,0.1)" }}>UPLINK: {data?.isHunting || data?.isRevalidating ? "ACTIVE" : "STABLE"}</span>
        </div>
      </footer>

      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </div>
  );
}
