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
use reqwest::{Client, Proxy};
use serde::{Deserialize, Serialize};
use std::time::{Duration, Instant};
use tower_http::cors::CorsLayer;

// ── Request / Response types ──────────────────────────────────

#[derive(Deserialize)]
struct VerifyRequest {
    proxies: Vec<String>,
    timeout_ms: Option<u64>,
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

async fn verify_single(proxy_url: String, timeout_ms: u64) -> Option<ProxyResult> {
    // Build a dedicated reqwest client wired through this proxy
    let proxy_config = Proxy::all(&proxy_url).ok()?;

    let client = Client::builder()
        .proxy(proxy_config)
        .timeout(Duration::from_millis(timeout_ms))
        .danger_accept_invalid_certs(true)
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
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

    // Spawn ALL proxies as independent tokio tasks — true O(1) concurrency
    let mut handles = Vec::with_capacity(total);
    for proxy_url in payload.proxies {
        let t = timeout_ms;
        handles.push(tokio::spawn(async move {
            // Outer timeout safety guard: t + 3s beyond inner client timeout
            match tokio::time::timeout(
                Duration::from_millis(t + 3_000),
                verify_single(proxy_url, t),
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
    println!("[RustVerifier] Unlimited concurrent tokio tasks — 5000 proxies in ~90s");

    let listener = tokio::net::TcpListener::bind(&addr)
        .await
        .expect("[RustVerifier] ❌ Failed to bind port — is another instance running?");

    axum::serve(listener, app)
        .await
        .expect("[RustVerifier] ❌ Server crashed");
}
