#!/bin/bash
# Phase 2+3: Verify keys, harden SSH, remove Remnawave, install rkhunter.
# IMPORTANT: This script preserves SSH access. We do NOT remove any authorized_keys
# (the unknown Russian key is no longer present per audit), we only:
#   - disable password authentication
#   - print fingerprints of remaining keys for human verification
#   - block port 2222 with ufw (or iptables fallback)
#   - stop+remove the remnanode container and image
#   - remove /opt/remnanode/

set +e
LOG=/root/forensics/cleanup.log
mkdir -p /root/forensics
exec > >(tee -a "$LOG") 2>&1

echo "================ START $(date -u) ================"

echo "--- Current authorized_keys fingerprints ---"
ssh-keygen -lf /root/.ssh/authorized_keys 2>/dev/null
echo "(none of these should equal po9SzNdFeZY77d5wLNkx80bjjyF+bn2wveAS2j60zek)"
echo

echo "--- Backup sshd_config ---"
cp -a /etc/ssh/sshd_config /etc/ssh/sshd_config.bak.$(date +%s)
cp -a /etc/ssh/sshd_config.d/50-cloud-init.conf /etc/ssh/sshd_config.d/50-cloud-init.conf.bak.$(date +%s) 2>/dev/null

echo "--- Disable PasswordAuthentication ---"
# Override file (highest priority among numerically-sorted .d files)
cat > /etc/ssh/sshd_config.d/00-bongbari-harden.conf <<'EOF'
PasswordAuthentication no
PermitRootLogin prohibit-password
ChallengeResponseAuthentication no
KbdInteractiveAuthentication no
PubkeyAuthentication yes
MaxAuthTries 3
LoginGraceTime 20
EOF

echo "--- Validate sshd config ---"
sshd -t && echo "sshd config OK" || { echo "!! sshd config FAILED — aborting"; exit 1; }

echo "--- Reload sshd ---"
systemctl reload ssh || systemctl reload sshd

echo "--- Confirm new policy ---"
sshd -T 2>/dev/null | grep -E '^(passwordauthentication|permitrootlogin|kbdinteractive|challenge)'

echo
echo "================ Stopping + removing Remnawave ================"
docker ps --format '{{.Names}}' | grep -q '^remnanode$' && {
  docker stop remnanode && docker rm remnanode
} || echo "remnanode container not running"

docker images --format '{{.Repository}}:{{.Tag}}' | grep -q '^remnawave/node:latest$' && {
  docker rmi remnawave/node:latest
} || echo "remnawave image already gone"

if [ -d /opt/remnanode ]; then
  echo "--- Backing up docker-compose.yml then removing /opt/remnanode ---"
  cp /opt/remnanode/docker-compose.yml /root/forensics/remnanode-docker-compose.yml.bak 2>/dev/null
  rm -rf /opt/remnanode
fi

echo "--- Verify port 2222 no longer listening ---"
ss -tlnp | grep ':2222' && echo "!! still listening" || echo "port 2222 closed"

echo
echo "================ Firewall belt-and-suspenders ================"
if command -v ufw >/dev/null; then
  ufw status | head -30
  ufw deny 2222/tcp || true
fi

echo
echo "================ Quick malware scan with chkrootkit ================"
DEBIAN_FRONTEND=noninteractive apt-get install -y chkrootkit >/dev/null 2>&1
chkrootkit -q 2>/dev/null | head -40 || echo "chkrootkit not available"

echo
echo "================ Health check: Bong Bari + cobalt + verifier ================"
echo "--- PM2 status ---"
pm2 list --no-colors 2>/dev/null
echo "--- Listening ports (after cleanup) ---"
ss -tlnp
echo "--- Local healthcheck ---"
curl -sS -o /dev/null -w 'bongbari :5000 -> HTTP %{http_code}\n' http://127.0.0.1:5000/api/version
curl -sS -o /dev/null -w 'cobalt   :9000 -> HTTP %{http_code}\n' http://127.0.0.1:9000/
curl -sS -o /dev/null -w 'verifier :6000 -> HTTP %{http_code}\n' http://127.0.0.1:6000/

echo
echo "================ DONE $(date -u) ================"
