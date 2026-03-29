#!/bin/bash
# ============================================================
# BongBari Oracle VM — ONE-TIME SETUP SCRIPT
# Run this once after first SSH into the Oracle VM:
#   bash oracle-setup.sh
# ============================================================
set -e

echo "======================================================"
echo " BongBari Oracle VM Setup — Ubuntu 20.04"
echo "======================================================"

# ── 1. System Update ─────────────────────────────────────
echo "[1/8] Updating system..."
sudo apt-get update -y
sudo apt-get install -y curl git nginx iptables-persistent

# ── 2. Node.js 20 ────────────────────────────────────────
echo "[2/8] Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version && npm --version

# ── 3. PM2 + esbuild (global) ────────────────────────────
echo "[3/8] Installing PM2 and esbuild globally..."
sudo npm install -g pm2 esbuild

# ── 4. Clone Repo ────────────────────────────────────────
echo "[4/8] Cloning BongBariComedy repo..."
cd /home/ubuntu
if [ -d "bongbari" ]; then
  echo "  → Directory already exists, pulling latest..."
  cd bongbari && git pull origin main
else
  git clone https://github.com/Pramsss108/BongBariComedy.git bongbari
  cd bongbari
fi

# ── 5. Install dependencies ───────────────────────────────
echo "[5/8] Installing npm dependencies..."
npm ci

# ── 6. Create server .env ─────────────────────────────────
echo "[6/8] Creating server/.env (fill in secrets after setup)..."
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

# ── 7. Build server ───────────────────────────────────────
echo "[7/8] Building server with esbuild..."
npx esbuild server/index.ts \
  --platform=node \
  --packages=external \
  --bundle \
  --format=esm \
  --outdir=dist

# ── 8. Nginx config ───────────────────────────────────────
echo "[8/8] Configuring Nginx (port 80 → localhost:5000)..."
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

# ── Firewall: Oracle uses iptables (not ufw) ──────────────
echo "Opening ports 22, 80, 443 in iptables..."
sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 443 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 22 -j ACCEPT
sudo netfilter-persistent save

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
