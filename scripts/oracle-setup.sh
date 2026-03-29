#!/bin/bash
# ============================================================
# BongBari Oracle VM — ONE-TIME SETUP SCRIPT
# Works on: Oracle Linux 9 (dnf) AND Ubuntu 20/22 (apt)
# Run this once after first SSH into the Oracle VM:
#   bash oracle-setup.sh
# ============================================================
set -e

echo "======================================================"
echo " BongBari Oracle VM Setup"
echo "======================================================"

# ── Detect OS and set package manager ────────────────────
if command -v dnf &>/dev/null; then
  PKG="dnf"
  echo "  → Detected: Oracle Linux / RHEL (dnf)"
elif command -v apt-get &>/dev/null; then
  PKG="apt-get"
  echo "  → Detected: Ubuntu / Debian (apt-get)"
else
  echo "ERROR: Unsupported OS — no dnf or apt-get found"
  exit 1
fi

# ── 1. System Update ─────────────────────────────────────
echo "[1/7] Updating system..."
sudo $PKG update -y
if [ "$PKG" = "dnf" ]; then
  sudo dnf install -y curl git nginx
  # Open firewall ports on Oracle Linux (firewalld)
  sudo systemctl start firewalld
  sudo firewall-cmd --permanent --add-service=http
  sudo firewall-cmd --permanent --add-service=https
  sudo firewall-cmd --permanent --add-service=ssh
  sudo firewall-cmd --reload
else
  sudo apt-get install -y curl git nginx iptables-persistent
  sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT
  sudo iptables -I INPUT -p tcp --dport 443 -j ACCEPT
  sudo netfilter-persistent save
fi

# ── 2. Node.js 20 ────────────────────────────────────────
echo "[2/7] Installing Node.js 20..."
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash - 2>/dev/null || \
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo $PKG install -y nodejs
node --version && npm --version

# ── 3. PM2 + esbuild (global) ────────────────────────────
echo "[3/7] Installing PM2 and esbuild globally..."
sudo npm install -g pm2 esbuild

# ── 4. Clone Repo ────────────────────────────────────────
echo "[4/7] Cloning BongBariComedy repo..."
cd /home/ubuntu
if [ -d "bongbari" ]; then
  echo "  → Directory already exists, pulling latest..."
  cd bongbari && git pull origin main
else
  git clone https://github.com/Pramsss108/BongBariComedy.git bongbari
  cd bongbari
fi

# ── 5. Install dependencies ───────────────────────────────
echo "[5/7] Installing npm dependencies..."
npm ci

# ── 6. Create server .env ─────────────────────────────────
echo "[6/7] Creating server/.env (fill in secrets after setup)..."
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
echo "  → Created server/.env — EDIT THIS FILE before starting!"
else
echo "  → server/.env already exists, skipping."
fi

# ── 7. Build + Nginx ──────────────────────────────────────
echo "[7/7] Building server and configuring Nginx..."
npx esbuild server/index.ts \
  --platform=node \
  --packages=external \
  --bundle \
  --format=esm \
  --outdir=dist

# ── Nginx config ───────────────────────────────────────
echo "Configuring Nginx (port 80 → localhost:5000)..."
sudo tee /etc/nginx/sites-available/bongbari > /dev/null << 'NGINXEOF'
server {
    listen 80;
    server_name api.bongbari.com _;

    # Allow large request bodies (file uploads)
    client_max_body_size 200M;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }
}
NGINXEOF

sudo ln -sf /etc/nginx/sites-available/bongbari /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx

echo ""
echo "======================================================"
echo " NEXT STEPS (required before starting server):"
echo "======================================================"
echo ""
echo " 1. Fill in secrets:"
echo "    nano /home/ubuntu/bongbari/server/.env"
echo ""
echo " 2. Start the server with PM2:"
echo "    cd /home/ubuntu/bongbari"
echo "    pm2 start dist/index.js --name bongbari"
echo "    pm2 startup   ← copy+run the command it prints"
echo "    pm2 save"
echo ""
echo " 3. Test locally on VM:"
echo "    curl http://localhost:5000/api/version"
echo ""
echo " 4. In Cloudflare DNS:"
echo "    Add record: Type=CNAME, Name=api, Target=130.61.187.107"
echo "    Enable proxy (orange cloud ON)"
echo "    Set SSL mode to Flexible"
echo ""
echo " 5. Test public URL:"
echo "    curl https://api.bongbari.com/api/version"
echo "======================================================"
