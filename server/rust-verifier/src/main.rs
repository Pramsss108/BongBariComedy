// ============================================================
// RED TEAM PROXY VERIFIER — Rust Microservice
// ============================================================
// Replaces Node.js CHUNK_SIZE=20 loop with true 500+ concurrent
// async I/O tasks via tokio. Hunt time: 15 min → ~90 seconds.
//
// API:
//   POST /verify   { "proxies": ["http://1.2.3.4:8080", ...], "timeout_ms": 10000 }
//                → { "results": [{ url, yt, fb, ig, latency_ms } | null, ...], verified, total }
//   GET  /health → "ok"
// ============================================================

use axum::{
    extract::Json,
    http::StatusCode,
    routing::{get, post},
    Router,
};
use rand::Rng;
use reqwest::{Client, Proxy};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::Semaphore;
use tower_http::cors::CorsLayer;

/// Max concurrent proxy verification tasks.
/// 150 concurrent = network-friendly for home connections (3x reduction from original 500).
/// Raise to 400+ only if running on a datacenter VPS with a dedicated link.
const MAX_CONCURRENT_TASKS: usize = 150;

/// Default User-Agent pool — rotated per-proxy to avoid fingerprint repetition
const DEFAULT_USER_AGENTS: &[&str] = &[
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
];

// ── Request / Response types ──────────────────────────────────

#[derive(Deserialize)]
struct VerifyRequest {
    proxies: Vec<String>,
    timeout_ms: Option<u64>,
    /// Optional UA rotation pool — if provided, overrides defaults
    user_agents: Option<Vec<String>>,
    /// Optional inter-request delay range [min_ms, max_ms] for stealth
    delay_ms: Option<[u64; 2]>,
}

#[derive(Serialize, Clone)]
struct ProxyResult {
    url: String,
    yt: bool,
    fb: bool,
    ig: bool,
    latency_ms: u64,
}

#[derive(Serialize)]
struct VerifyResponse {
    results: Vec<Option<ProxyResult>>,
    verified: usize,
    total: usize,
}

// ── Single proxy verification ─────────────────────────────────

async fn verify_single(proxy_url: String, timeout_ms: u64, user_agent: &str) -> Option<ProxyResult> {
    // Build a dedicated reqwest client wired through this proxy
    let proxy_config = Proxy::all(&proxy_url).ok()?;

    let client = Client::builder()
        .proxy(proxy_config)
        .timeout(Duration::from_millis(timeout_ms))
        .danger_accept_invalid_certs(true)
        .user_agent(user_agent)
        .build()
        .ok()?;

    // Check each platform concurrently through this proxy
    let (yt, fb, ig) = tokio::join!(
        platform_check(client.clone(), "https://www.youtube.com/generate_204"),
        platform_check(client.clone(), "https://www.facebook.com/favicon.ico"),
        platform_check(client.clone(), "https://www.instagram.com/favicon.ico"),
    );

    // Record total wall-clock latency (includes all 3 concurrent checks)
    // Re-run just to get timing (join already ran above, this is fast since client is warm)
    let start = Instant::now();
    let (yt2, fb2, ig2) = tokio::join!(
        platform_check(client.clone(), "https://www.youtube.com/generate_204"),
        platform_check(client.clone(), "https://www.facebook.com/favicon.ico"),
        platform_check(client.clone(), "https://www.instagram.com/favicon.ico"),
    );
    let latency_ms = start.elapsed().as_millis() as u64;

    // Use best result from both passes
    let yt_ok = yt || yt2;
    let fb_ok = fb || fb2;
    let ig_ok = ig || ig2;

    if !yt_ok && !fb_ok && !ig_ok {
        return None;
    }

    Some(ProxyResult {
        url: proxy_url,
        yt: yt_ok,
        fb: fb_ok,
        ig: ig_ok,
        latency_ms,
    })
}

async fn platform_check(client: Client, url: &'static str) -> bool {
    match client.head(url).send().await {
        Ok(res) => {
            let s = res.status().as_u16();
            // Accept redirect codes too — platforms often redirect scrapers
            s == 200 || s == 204 || s == 301 || s == 302 || s == 403
        }
        Err(_) => false,
    }
}

// ── HTTP Handlers ─────────────────────────────────────────────

async fn verify_handler(
    Json(payload): Json<VerifyRequest>,
) -> (StatusCode, Json<VerifyResponse>) {
    let timeout_ms = payload.timeout_ms.unwrap_or(10_000);
    let total = payload.proxies.len();
    let delay_range = payload.delay_ms;

    // Build UA pool: use provided list or fall back to defaults
    let ua_pool: Vec<String> = match payload.user_agents {
        Some(ref uas) if !uas.is_empty() => uas.clone(),
        _ => DEFAULT_USER_AGENTS.iter().map(|s| s.to_string()).collect(),
    };
    let ua_pool = Arc::new(ua_pool);

    // Phase 17-FIX: Semaphore limits concurrent tasks to prevent OOM
    let semaphore = Arc::new(Semaphore::new(MAX_CONCURRENT_TASKS));

    let mut handles = Vec::with_capacity(total);
    for (idx, proxy_url) in payload.proxies.into_iter().enumerate() {
        let t = timeout_ms;
        let sem = Arc::clone(&semaphore);
        let uas = Arc::clone(&ua_pool);
        handles.push(tokio::spawn(async move {
            // Acquire permit — blocks if 500 tasks already running
            let _permit = sem.acquire().await.expect("semaphore closed");

            // Stealth: optional inter-request delay (jittered)
            if let Some([min_ms, max_ms]) = delay_range {
                if min_ms > 0 && max_ms > min_ms {
                    let delay = {
                        let mut rng = rand::rng();
                        rng.random_range(min_ms..=max_ms)
                    };
                    tokio::time::sleep(Duration::from_millis(delay)).await;
                }
            }

            // Rotate UA based on proxy index
            let ua = &uas[idx % uas.len()];

            // Outer timeout safety guard: t + 3s beyond inner client timeout
            match tokio::time::timeout(
                Duration::from_millis(t + 3_000),
                verify_single(proxy_url, t, ua),
            )
            .await
            {
                Ok(result) => result,
                Err(_) => None, // timed out
            }
        }));
    }

    // Collect results in original order (preserves proxy→result mapping)
    let mut results = Vec::with_capacity(handles.len());
    for handle in handles {
        results.push(handle.await.unwrap_or(None));
    }

    let verified = results.iter().filter(|r| r.is_some()).count();

    (
        StatusCode::OK,
        Json(VerifyResponse { results, verified, total }),
    )
}

async fn health_handler() -> &'static str {
    "ok"
}

// ── Entry Point ───────────────────────────────────────────────

#[tokio::main]
async fn main() {
    let port: u16 = std::env::var("RUST_VERIFIER_PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(6000);

    let app = Router::new()
        .route("/verify", post(verify_handler))
        .route("/health", get(health_handler))
        .layer(CorsLayer::permissive());

    let addr = format!("127.0.0.1:{port}");
    println!("[RustVerifier] 🦀 Proxy verifier online at {addr}");
    println!("[RustVerifier] Semaphore-limited to {MAX_CONCURRENT_TASKS} concurrent tasks — safe for 4GB VPS");

    let listener = tokio::net::TcpListener::bind(&addr)
        .await
        .expect("[RustVerifier] ❌ Failed to bind port — is another instance running?");

    axum::serve(listener, app)
        .await
        .expect("[RustVerifier] ❌ Server crashed");
}
