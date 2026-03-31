#!/bin/bash
# ============================================================
# BongBari Proxy Engine — Oracle VM Setup (One-Time)
# Run via SSH: ssh opc@79.76.110.66 < scripts/setup-proxy-engine.sh
# ============================================================
set -e

echo "======================================================"
echo " BongBari CORS Proxy Engine — Oracle VM Setup"
echo "======================================================"

# ── 1. Open port 8080 in firewall ─────────────────────────
echo "[1/3] Opening port 8080 in firewall..."
if sudo firewall-cmd --list-ports | grep -q "8080/tcp"; then
  echo "  ✅ Port 8080 already open"
else
  sudo firewall-cmd --permanent --add-port=8080/tcp
  sudo firewall-cmd --reload
  echo "  ✅ Port 8080 opened"
fi

# ── 2. Create proxy engine directory ──────────────────────
echo "[2/3] Setting up proxy engine directory..."
mkdir -p ~/bongbari/server/proxy-engine

# Create empty proxies.txt if not exists
if [ ! -f ~/bongbari/server/proxy-engine/proxies.txt ]; then
  cat > ~/bongbari/server/proxy-engine/proxies.txt << 'EOF'
# BongBari Proxy List
# Format: protocol://host:port or protocol://user:pass@host:port
# Lines starting with # are ignored
# Supported: http://, https://, socks5://
#
# Example:
# http://proxy1.example.com:8080
# socks5://user:pass@proxy2.example.com:1080
EOF
  echo "  ✅ Created proxies.txt template"
else
  echo "  ✅ proxies.txt already exists"
fi

# ── 3. Set environment variables ──────────────────────────
echo "[3/3] Setting proxy engine environment..."

# Add PROXY_API_KEY to .env if not present
ENV_FILE=~/bongbari/.env
if [ -f "$ENV_FILE" ] && grep -q "PROXY_API_KEY" "$ENV_FILE"; then
  echo "  ✅ PROXY_API_KEY already in .env"
else
  # Generate a random 32-char key
  PROXY_KEY=$(openssl rand -hex 16)
  echo "" >> "$ENV_FILE"
  echo "# CORS Proxy Engine" >> "$ENV_FILE"
  echo "PROXY_API_KEY=$PROXY_KEY" >> "$ENV_FILE"
  echo "PROXY_PORT=8080" >> "$ENV_FILE"
  echo "PROXY_RATE_LIMIT=120" >> "$ENV_FILE"
  echo "  ✅ Added PROXY_API_KEY=$PROXY_KEY to .env"
  echo "  ⚠️  SAVE THIS KEY — you need it in your frontend .env too"
fi

# ── 4. Raise file descriptor limit ───────────────────────
echo "[+] Raising file descriptor limit..."
LIMITS_FILE=/etc/security/limits.conf
if sudo grep -q "bongbari-proxy" "$LIMITS_FILE" 2>/dev/null; then
  echo "  ✅ File descriptor limits already configured"
else
  echo "# BongBari proxy engine" | sudo tee -a "$LIMITS_FILE" > /dev/null
  echo "opc soft nofile 4096" | sudo tee -a "$LIMITS_FILE" > /dev/null
  echo "opc hard nofile 8192" | sudo tee -a "$LIMITS_FILE" > /dev/null
  echo "  ✅ File descriptor limits raised (soft=4096, hard=8192)"
fi

echo ""
echo "======================================================"
echo " ✅ Setup complete!"
echo " To start the proxy engine:"
echo "   cd ~/bongbari && pm2 start server/proxy-engine/server.mjs --name bongbari-proxy"
echo "   pm2 save"
echo ""
echo " Test it:"
echo "   curl http://localhost:8080/health"
echo "======================================================"
