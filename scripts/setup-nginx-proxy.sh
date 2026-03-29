#!/bin/bash
# ── Nginx reverse proxy setup for Oracle Micro VM ──
# Proxies port 80 → localhost:5000
# SAFE: Uses pre-built nginx from EPEL (small install, won't OOM)
# Run this via SSH: ssh opc@79.76.110.66 < scripts/setup-nginx-proxy.sh
set -e

echo "=== Nginx Reverse Proxy Setup ==="

# Check if nginx is already installed
if command -v nginx &>/dev/null; then
  echo "✅ Nginx already installed: $(nginx -v 2>&1)"
else
  echo "⚠️  Nginx not found. Installing via dnf (lightweight)..."
  echo "NOTE: If this causes OOM, use the manual binary approach instead."
  # nginx is a small package (~1.5MB), should NOT cause OOM like git did
  sudo dnf install -y nginx --setopt=install_weak_deps=False --setopt=tsflags=nodocs --best
  echo "✅ Nginx installed: $(nginx -v 2>&1)"
fi

# Create nginx config for reverse proxy
echo "Configuring nginx as reverse proxy (80 → 5000)..."
sudo tee /etc/nginx/conf.d/bongbari.conf > /dev/null << 'NGXCONF'
server {
    listen 80;
    listen [::]:80;
    server_name 79.76.110.66 api.bongbari.com;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy to Node.js backend
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300;
        proxy_connect_timeout 60;
    }

    # Health check endpoint (fast, no proxy overhead)
    location = /nginx-health {
        return 200 'ok';
        add_header Content-Type text/plain;
    }
}
NGXCONF

# Remove default server block if it conflicts on port 80
sudo sed -i '/listen.*80.*default_server/d' /etc/nginx/nginx.conf 2>/dev/null || true

# Test nginx config
echo "Testing nginx configuration..."
sudo nginx -t

# Enable and start nginx
sudo systemctl enable nginx
sudo systemctl restart nginx

echo ""
echo "=== Nginx Reverse Proxy Active ==="
echo "  Port 80 → localhost:5000 (Node.js)"
echo "  Test: curl http://79.76.110.66/api/version"
echo "  Health: curl http://79.76.110.66/nginx-health"
echo "========================================="
