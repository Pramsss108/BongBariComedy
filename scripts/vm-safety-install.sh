#!/bin/bash
# ============================================================
# BongBari VM Safety Guardrails — PERMANENT INSTALL
# ============================================================
# This script installs protections so NO future agent, user, or
# automated deploy can accidentally crash the 503MB micro VM.
#
# What it does:
# 1. Creates MOTD (login banner) with VM rules
# 2. Creates safe-npm wrapper that blocks dangerous packages
# 3. Creates dnf blocker (dnf causes OOM on micro VMs)
# 4. Sets Node.js memory cap (256MB max)
# 5. Creates a "vm-doctor" script for health checks
# ============================================================
set -e

echo "🔧 Installing BongBari VM Safety Guardrails..."

# ============================================================
# 1. MOTD — Shows warning every time anyone logs in via SSH
# ============================================================
sudo tee /etc/motd > /dev/null << 'MOTD'

╔══════════════════════════════════════════════════════════════╗
║         ⚠️  BONGBARI MICRO VM — HANDLE WITH CARE  ⚠️        ║
╠══════════════════════════════════════════════════════════════╣
║  RAM: 503MB only  |  Swap: ~3GB  |  Shape: E2.1.Micro      ║
║                                                              ║
║  🚫 NEVER DO THESE (instant crash):                         ║
║     • dnf install anything (use: safe-dnf)                  ║
║     • npm install firebase-admin, geoip-lite, xlsx          ║
║     • npm install wink-nlp, @gradio/client, ffmpeg-static   ║
║     • npm ci (full project deps)                            ║
║     • Any download > 50MB                                   ║
║                                                              ║
║  ✅ SAFE COMMANDS:                                           ║
║     • safe-npm install <package>   (blocks dangerous ones)  ║
║     • vm-doctor                    (health check)           ║
║     • pm2 list / pm2 logs / pm2 restart bongbari            ║
║                                                              ║
║  📖 Full rules: ~/bongbari/VM_RULES.md                      ║
╚══════════════════════════════════════════════════════════════╝

MOTD
echo "  ✅ MOTD login banner installed"

# ============================================================
# 2. SAFE-NPM — Wrapper that blocks dangerous packages
# ============================================================
sudo tee /usr/local/bin/safe-npm > /dev/null << 'SAFENPM'
#!/bin/bash
# ============================================================
# safe-npm — npm wrapper that blocks packages known to crash
# the BongBari 503MB micro VM.
# ============================================================
BLOCKED_PACKAGES=(
  "firebase-admin"
  "geoip-lite"
  "@gradio/client"
  "wink-nlp"
  "wink-eng-lite-web-model"
  "xlsx"
  "ffmpeg-static"
  "ffmpeg"
  "puppeteer"
  "playwright"
  "sharp"
  "canvas"
  "better-sqlite3"
  "sqlite3"
  "bcrypt"
  "argon2"
  "tensorflow"
  "@tensorflow/tfjs-node"
  "onnxruntime-node"
  "prisma"
  "@prisma/client"
  "esbuild"
  "webpack"
  "vite"
  "next"
  "nuxt"
  "turbo"
)

# Only check on install/add commands
if [[ "$1" == "install" || "$1" == "add" || "$1" == "i" ]]; then
  for arg in "$@"; do
    for blocked in "${BLOCKED_PACKAGES[@]}"; do
      if [[ "$arg" == "$blocked" || "$arg" == "$blocked@"* ]]; then
        echo ""
        echo "╔══════════════════════════════════════════════════════════╗"
        echo "║  🚫 BLOCKED: '$blocked' would crash this 503MB VM!     ║"
        echo "║                                                          ║"
        echo "║  This package is too heavy for Oracle micro VM.          ║"
        echo "║  It will cause OOM (Out of Memory) and freeze the VM.   ║"
        echo "║                                                          ║"
        echo "║  If you REALLY need it, use on the GitHub Actions        ║"
        echo "║  runner instead (in the build step, not on the VM).     ║"
        echo "║                                                          ║"
        echo "║  To override (DANGEROUS): /usr/local/bin/npm install     ║"
        echo "╚══════════════════════════════════════════════════════════╝"
        echo ""
        exit 1
      fi
    done
  done
  
  # Check available memory before allowing install
  FREE_MB=$(free -m | awk '/Mem:/{print $7}')
  SWAP_FREE_MB=$(free -m | awk '/Swap:/{print $4}')
  TOTAL_FREE=$((FREE_MB + SWAP_FREE_MB))
  
  if [ "$TOTAL_FREE" -lt 500 ]; then
    echo ""
    echo "⚠️  WARNING: Very low memory! (${FREE_MB}MB RAM + ${SWAP_FREE_MB}MB swap free)"
    echo "   npm install may OOM. Consider restarting PM2 first:"
    echo "   pm2 stop all && npm install && pm2 restart all"
    echo ""
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      echo "Aborted."
      exit 1
    fi
  fi
  
  # Run npm with memory-safe settings
  echo "🔒 Running npm with --maxsockets=1 (memory-safe mode)..."
  /usr/local/bin/npm "$@" --maxsockets=1
else
  # Non-install commands pass through directly
  /usr/local/bin/npm "$@"
fi
SAFENPM
sudo chmod +x /usr/local/bin/safe-npm
echo "  ✅ safe-npm wrapper installed"

# ============================================================
# 3. DNF BLOCKER — Warns against using dnf
# ============================================================
sudo tee /usr/local/bin/safe-dnf > /dev/null << 'SAFEDNF'
#!/bin/bash
echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║  🚫 DNF IS BLOCKED ON THIS MICRO VM!                   ║"
echo "║                                                          ║"
echo "║  dnf uses too much memory and will crash this 503MB VM. ║"
echo "║  Even 'dnf install nano' can trigger OOM.               ║"
echo "║                                                          ║"
echo "║  Alternatives:                                           ║"
echo "║  • Use binary tarballs (like we did for Node.js)        ║"
echo "║  • Download pre-built binaries with curl/wget           ║"
echo "║  • Build on GitHub Actions runner, SCP to VM            ║"
echo "║                                                          ║"
echo "║  To override (DANGEROUS): /usr/bin/dnf                  ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
exit 1
SAFEDNF
sudo chmod +x /usr/local/bin/safe-dnf
echo "  ✅ safe-dnf blocker installed"

# ============================================================
# 4. NODE MEMORY CAP — Global 256MB limit for all Node procs
# ============================================================
# Create /etc/profile.d script so it applies to ALL sessions
sudo tee /etc/profile.d/bongbari-safety.sh > /dev/null << 'PROFILE'
# BongBari VM Safety — Auto-loaded on every login
export NODE_OPTIONS="--max-old-space-size=256"

# Aliases for safety
alias npm='safe-npm'
alias dnf='safe-dnf'
alias yum='safe-dnf'

# Show quick status on login
echo ""
echo "📊 VM Status: $(free -m | awk '/Mem:/{printf "%sMB used / %sMB total", $3, $2}') RAM | $(pm2 list 2>/dev/null | grep -c 'online') PM2 processes online"
echo ""
PROFILE
sudo chmod +x /etc/profile.d/bongbari-safety.sh
echo "  ✅ Node.js 256MB memory cap installed (via /etc/profile.d/)"

# ============================================================
# 5. VM-DOCTOR — Quick health check script
# ============================================================
sudo tee /usr/local/bin/vm-doctor > /dev/null << 'DOCTOR'
#!/bin/bash
echo ""
echo "🏥 BongBari VM Doctor — Health Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Memory
echo ""
echo "💾 MEMORY:"
free -h | head -3
echo ""

# Swap
echo "💿 SWAP:"
swapon --show
echo ""

# Disk
echo "💽 DISK:"
df -h / | tail -1 | awk '{printf "  Used: %s / %s (%s)\n", $3, $2, $5}'
echo ""

# PM2 processes
echo "⚙️  PM2 PROCESSES:"
pm2 list 2>/dev/null || echo "  PM2 not running"
echo ""

# Node.js
echo "📦 NODE.JS:"
echo "  Version: $(node --version 2>/dev/null || echo 'not found')"
echo "  Memory cap: ${NODE_OPTIONS:-not set}"
echo ""

# Ports
echo "🌐 LISTENING PORTS:"
ss -tlnp 2>/dev/null | grep -E '5000|8080' | awk '{print "  " $4}'
echo ""

# Top memory users
echo "🔝 TOP 5 MEMORY USERS:"
ps aux --sort=-%mem | head -6 | tail -5 | awk '{printf "  %5s MB  %s\n", int($6/1024), $11}'
echo ""

# API check
echo "🧪 API HEALTH:"
RESPONSE=$(curl -s --max-time 5 http://localhost:5000/api/version 2>/dev/null)
if [ $? -eq 0 ] && [ -n "$RESPONSE" ]; then
  echo "  ✅ API responding: $RESPONSE"
else
  echo "  ❌ API not responding!"
fi
echo ""

# Uptime
echo "⏰ UPTIME: $(uptime -p)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
DOCTOR
sudo chmod +x /usr/local/bin/vm-doctor
echo "  ✅ vm-doctor health check installed"

# ============================================================
# 6. VM_RULES.md — Permanent documentation on the VM itself
# ============================================================
cat > ~/bongbari/VM_RULES.md << 'RULES'
# 🚨 BongBari Oracle Micro VM — Rules & Safety

## This VM has only 503MB RAM + ~3GB swap. It WILL crash if you ignore these rules.

## ❌ NEVER DO (causes OOM crash + VM freeze for 15+ minutes)
1. `dnf install` anything — even nano/vim triggers OOM
2. `npm install firebase-admin` — 50MB+ download, native compilation
3. `npm install geoip-lite` — 130MB GeoIP database download
4. `npm install xlsx` — heavy package with native deps
5. `npm install sharp/canvas/puppeteer/playwright` — native compilation OOMs
6. `npm ci` with full project package.json — 100+ packages = instant OOM
7. Any download > 50MB
8. Running multiple Node processes beyond PM2's bongbari + bongbari-proxy

## ✅ SAFE TO DO
1. `safe-npm install <lightweight-package>` — checks blocklist + memory first
2. `pm2 restart bongbari` — restart the main server
3. `pm2 logs bongbari --lines 50` — view recent logs
4. `vm-doctor` — full health check
5. Edit files with `vi` (pre-installed, no install needed)
6. `curl` / `wget` for small downloads (< 50MB)
7. SCP files from your computer

## 📋 What's Running
- `bongbari` (PM2 id:0) — Main Express API on port 5000
- `bongbari-proxy` (PM2 id:1) — CORS proxy on port 8080

## 📋 Stubbed Packages (fake/no-op versions installed)
These are too heavy for 503MB VM. They load without error but throw if actually used:
- firebase-admin, @gradio/client, wink-nlp, wink-eng-lite-web-model
- xlsx, ffmpeg-static, youtube-po-token-generator
- vite, vite-plugin-compression2, @vitejs/plugin-react

## 🔧 If VM Crashes / Becomes Unresponsive
1. From VS Code terminal: `npm run vm:reboot`
2. Wait 2-3 minutes for reboot
3. SSH in: `ssh -i "C:\Users\guita\.ssh\oracle_bongbari2" opc@158.101.175.37`
4. PM2 auto-starts on boot (systemd pm2-opc.service)
5. Run `vm-doctor` to verify everything is healthy

## 🔧 If You Need a Heavy Package
Don't install it on the VM! Instead:
1. Install it on the GitHub Actions runner (in the build step)
2. Bundle the code with esbuild
3. SCP the bundle to the VM
4. Or create a stub (see node_modules/*stub* packages)

## 💡 Key Paths
- Server bundle: ~/bongbari/dist/index.js
- Environment: ~/bongbari/.env
- PM2 config: ~/.pm2/dump.pm2
- Swap files: /.swapfile (950MB) + /swapfile2 (2GB)
- Node.js: /usr/local/bin/node (v22 binary tarball)
- Safety scripts: /usr/local/bin/safe-npm, safe-dnf, vm-doctor
RULES
echo "  ✅ VM_RULES.md written to ~/bongbari/"

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║  🎉 ALL SAFETY GUARDRAILS INSTALLED!                    ║"
echo "║                                                          ║"
echo "║  • MOTD banner on every SSH login                       ║"
echo "║  • safe-npm blocks heavy packages + checks memory       ║"
echo "║  • dnf/yum aliased to blocker                           ║"
echo "║  • Node.js capped at 256MB (NODE_OPTIONS)               ║"
echo "║  • vm-doctor for health checks                          ║"
echo "║  • VM_RULES.md for documentation                        ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
