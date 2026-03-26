#!/bin/bash
# ============================================================
# BongBari Proxy Verifier — Hetzner VPS Setup Script
# CX23: 2 vCPU, 4GB RAM, 40GB disk
# Purpose: Run Rust proxy verifier as a remote turbo node
# ============================================================

set -e

echo "╔══════════════════════════════════════════════╗"
echo "║  BongBari Hetzner VPS — Proxy Verifier Setup ║"
echo "╚══════════════════════════════════════════════╝"

# ── 1. System update ──────────────────────────────────────
echo "[1/6] Updating system packages..."
apt-get update -y && apt-get upgrade -y

# ── 2. Install essentials ─────────────────────────────────
echo "[2/6] Installing dependencies..."
apt-get install -y curl build-essential git pkg-config libssl-dev

# ── 3. Install Rust (if not present) ─────────────────────
if ! command -v cargo &> /dev/null; then
    echo "[3/6] Installing Rust toolchain..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source "$HOME/.cargo/env"
else
    echo "[3/6] Rust already installed: $(rustc --version)"
    source "$HOME/.cargo/env" 2>/dev/null || true
fi

# ── 4. Install Node.js 20 (for optional bridge) ──────────
if ! command -v node &> /dev/null; then
    echo "[4/6] Installing Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
else
    echo "[4/6] Node.js already installed: $(node --version)"
fi

# ── 5. Create verifier project ───────────────────────────
echo "[5/6] Setting up Rust proxy verifier..."
VERIFIER_DIR="/opt/bongbari-verifier"
mkdir -p "$VERIFIER_DIR/src"

cat > "$VERIFIER_DIR/Cargo.toml" << 'CARGO_EOF'
[package]
name = "bongbari-verifier"
version = "1.0.0"
edition = "2021"

[dependencies]
axum = "0.7"
tokio = { version = "1", features = ["full"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
reqwest = { version = "0.12", features = ["socks"] }
tower-http = { version = "0.5", features = ["cors"] }

[profile.release]
lto = true
opt-level = 3
CARGO_EOF

cat > "$VERIFIER_DIR/src/main.rs" << 'RUST_EOF'
use axum::{routing::{get, post}, Json, Router};
use serde::{Deserialize, Serialize};
use std::time::{Duration, Instant};
use tokio::net::TcpListener;
use tower_http::cors::CorsLayer;

#[derive(Deserialize)]
struct VerifyRequest {
    proxies: Vec<String>,
    #[serde(default = "default_timeout")]
    timeout_ms: u64,
}
fn default_timeout() -> u64 { 10000 }

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
    total: usize,
    verified: usize,
    elapsed_ms: u64,
}

async fn check_url(client: &reqwest::Client, url: &str) -> bool {
    client.get(url).send().await.map(|r| r.status().is_success() || r.status().as_u16() == 204).unwrap_or(false)
}

async fn verify_single(proxy_url: String, timeout: Duration) -> Option<ProxyResult> {
    let proxy = reqwest::Proxy::all(&proxy_url).ok()?;
    let client = reqwest::Client::builder().proxy(proxy).timeout(timeout).danger_accept_invalid_certs(true).build().ok()?;
    let start = Instant::now();
    let (yt, fb, ig) = tokio::join!(
        check_url(&client, "https://www.youtube.com/generate_204"),
        check_url(&client, "https://www.facebook.com/favicon.ico"),
        check_url(&client, "https://www.instagram.com/favicon.ico")
    );
    if !yt && !fb && !ig { return None; }
    Some(ProxyResult { url: proxy_url, yt, fb, ig, latency_ms: start.elapsed().as_millis() as u64 })
}

async fn handle_verify(Json(req): Json<VerifyRequest>) -> Json<VerifyResponse> {
    let start = Instant::now();
    let timeout = Duration::from_millis(req.timeout_ms);
    let total = req.proxies.len();
    let handles: Vec<_> = req.proxies.into_iter().map(|p| tokio::spawn(verify_single(p, timeout))).collect();
    let mut results = Vec::with_capacity(total);
    for h in handles { results.push(h.await.unwrap_or(None)); }
    let verified = results.iter().filter(|r| r.is_some()).count();
    Json(VerifyResponse { results, total, verified, elapsed_ms: start.elapsed().as_millis() as u64 })
}

async fn health() -> &'static str { "ok" }

#[tokio::main]
async fn main() {
    let app = Router::new()
        .route("/verify", post(handle_verify))
        .route("/health", get(health))
        .layer(CorsLayer::permissive());
    let listener = TcpListener::bind("0.0.0.0:6000").await.unwrap();
    println!("🦀 BongBari Verifier running on :6000");
    axum::serve(listener, app).await.unwrap();
}
RUST_EOF

cd "$VERIFIER_DIR"
echo "[5/6] Building Rust verifier (release mode)..."
cargo build --release

# ── 6. Create systemd service ────────────────────────────
echo "[6/6] Creating systemd service..."
cat > /etc/systemd/system/bongbari-verifier.service << 'SERVICE_EOF'
[Unit]
Description=BongBari Proxy Verifier (Rust)
After=network.target

[Service]
Type=simple
User=root
ExecStart=/opt/bongbari-verifier/target/release/bongbari-verifier
Restart=always
RestartSec=5
Environment=RUST_LOG=info

[Install]
WantedBy=multi-user.target
SERVICE_EOF

systemctl daemon-reload
systemctl enable bongbari-verifier
systemctl start bongbari-verifier

# ── 7. Open firewall (if ufw is active) ──────────────────
if command -v ufw &> /dev/null; then
    ufw allow 6000/tcp 2>/dev/null || true
fi

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  ✅ Setup Complete!                          ║"
echo "║  Verifier running on port 6000               ║"
echo "║  systemctl status bongbari-verifier          ║"
echo "║  curl http://localhost:6000/health            ║"
echo "╚══════════════════════════════════════════════╝"

# Test health
sleep 2
curl -s http://localhost:6000/health && echo " — Health OK" || echo " — Service starting..."
