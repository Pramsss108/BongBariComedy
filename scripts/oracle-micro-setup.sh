#!/bin/bash
# ============================================================
# BongBari Oracle VM — MICRO VM SETUP (zero-dnf approach)
# For 503 MB RAM VMs where dnf causes OOM death spirals.
# Uses ONLY curl + tar (pre-installed) — no package manager.
# ============================================================
set -e

echo "======================================================"
echo " BongBari Micro VM Setup (no dnf, curl-only)"
echo "======================================================"

# ── 0. Disable dnf timer (prevents background RAM hog) ───
echo "[0/6] Disabling dnf background cache..."
sudo systemctl stop dnf-makecache.timer 2>/dev/null || true
sudo systemctl disable dnf-makecache.timer 2>/dev/null || true
# Kill any running dnf
sudo pkill -f dnf 2>/dev/null || true
sleep 2

echo "  Memory status:"
free -m

# ── 1. Ensure swap exists ────────────────────────────────
echo "[1/6] Checking swap..."
if ! swapon --show | grep -q swapfile; then
  if [ ! -f /swapfile ]; then
    echo "  Creating 1 GB swap..."
    sudo dd if=/dev/zero of=/swapfile bs=1M count=1024
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
  fi
  sudo swapon /swapfile
  grep -q swapfile /etc/fstab || echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
fi
echo "  Swap: $(free -m | grep Swap | awk '{print $2}') MB"

# ── 2. Install Node.js 20 (binary tarball, no dnf) ──────
echo "[2/6] Installing Node.js 20 (direct binary)..."
if ! command -v node &>/dev/null; then
  cd /tmp
  curl -fsSL https://nodejs.org/dist/v20.18.3/node-v20.18.3-linux-x64.tar.xz -o node.tar.xz
  sudo tar -xJf node.tar.xz -C /usr/local --strip-components=1
  rm node.tar.xz
  echo "  Node: $(node --version), npm: $(npm --version)"
else
  echo "  Already installed: $(node --version)"
fi

# ── 3. Install PM2 + esbuild (npm, no dnf) ──────────────
echo "[3/6] Installing PM2 and esbuild..."
if ! command -v pm2 &>/dev/null; then
  sudo npm install -g pm2 esbuild
fi
echo "  PM2: $(pm2 --version 2>/dev/null || echo 'not found')"

# ── 4. Download repo (curl tarball, no git needed) ───────
echo "[4/6] Downloading BongBariComedy repo..."
HOME_DIR=$(eval echo ~)
cd "$HOME_DIR"
if [ -d "bongbari" ]; then
  echo "  Directory exists — downloading fresh copy..."
  rm -rf bongbari
fi
curl -fsSL https://github.com/Pramsss108/BongBariComedy/archive/refs/heads/main.tar.gz -o repo.tar.gz
tar -xzf repo.tar.gz
mv BongBariComedy-main bongbari
rm repo.tar.gz
cd bongbari
echo "  Repo downloaded to $(pwd)"

# ── 5. Install deps + build server ──────────────────────
echo "[5/6] npm ci + build..."
npm ci --prefer-offline 2>&1 | tail -5
npx esbuild server/index.ts \
  --platform=node \
  --packages=external \
  --bundle \
  --format=esm \
  --outdir=dist
echo "  Build complete: $(ls -la dist/index.js)"

# ── 6. Create .env + open firewall ───────────────────────
echo "[6/6] Creating server/.env and opening firewall..."
if [ ! -f "server/.env" ]; then
cat > server/.env << 'ENVEOF'
PORT=5000
NODE_ENV=production

# ── REQUIRED — fill these in ──────────────────────────────
# DATABASE_URL=postgres://user:pass@host/db
# GEMINI_API_KEY=your-gemini-key
# JWT_SECRET=your-random-32char-secret-here

# ── OPTIONAL ──────────────────────────────────────────────
# YOUTUBE_CHANNEL_ID=
# UPSTASH_REST_URL=
# UPSTASH_REST_TOKEN=
ENVEOF
echo "  → Created server/.env"
fi

# Open port 5000 in firewall (Oracle Linux uses firewalld)
if command -v firewall-cmd &>/dev/null; then
  sudo firewall-cmd --permanent --add-port=5000/tcp 2>/dev/null || true
  sudo firewall-cmd --permanent --add-port=80/tcp 2>/dev/null || true
  sudo firewall-cmd --reload 2>/dev/null || true
  echo "  Firewall: ports 80, 5000 opened"
fi

# ── Install git last (lightweight, for future pulls) ─────
echo "Installing git (needed for future deployments)..."
sudo dnf install -y git --setopt=install_weak_deps=False --setopt=keepcache=False 2>&1 | tail -3 &
GIT_PID=$!
echo "  Git install running in background (PID $GIT_PID)"

echo ""
echo "======================================================"
echo " SETUP COMPLETE!"
echo "======================================================"
echo ""
echo " Start the server:"
echo "   cd ~/bongbari"
echo "   pm2 start dist/index.js --name bongbari"
echo "   pm2 startup   # copy+run the command it prints"
echo "   pm2 save"
echo ""
echo " Test:"
echo "   curl http://localhost:5000/api/version"
echo ""
echo " Fill in secrets:"
echo "   nano ~/bongbari/server/.env"
echo "======================================================"
