#!/bin/bash
# Phase 1: Forensics snapshot (read-only). Saves everything to /root/forensics/
set +e
mkdir -p /root/forensics
cd /root/forensics

echo "=== sshd_config (password auth?) ==="
grep -Ei '^(PasswordAuthentication|PermitRootLogin|PubkeyAuthentication|ChallengeResponseAuthentication|UsePAM|PermitEmptyPasswords|AllowUsers|AllowGroups)' /etc/ssh/sshd_config /etc/ssh/sshd_config.d/*.conf 2>/dev/null

echo
echo "=== Successful root logins last 60 days (auth.log) ==="
zgrep -hE 'Accepted (password|publickey|keyboard-interactive)' /var/log/auth.log* 2>/dev/null \
  | grep -E ' for root ' | tail -50 > sshd_accepted.txt
wc -l sshd_accepted.txt
tail -30 sshd_accepted.txt

echo
echo "=== Method breakdown ==="
awk '{for(i=1;i<=NF;i++) if($i=="Accepted") print $(i+1)}' sshd_accepted.txt | sort | uniq -c | sort -rn

echo
echo "=== Docker images (Remnawave?) ==="
docker images
echo
echo "=== Docker inspect remnanode ==="
docker inspect remnanode 2>/dev/null | head -120
echo
echo "=== /opt/remnanode contents ==="
ls -la /opt/remnanode 2>/dev/null
echo
echo "=== /opt/dist contents (host) ==="
ls -la /opt/dist 2>/dev/null
find /opt/dist -maxdepth 3 -type f 2>/dev/null | head -40
echo
echo "=== /opt/app on HOST (likely empty since container path) ==="
ls -la /opt/app 2>/dev/null
echo
echo "=== systemd units mentioning remna/xray/v2ray ==="
grep -RIli 'remna\|xray\|v2ray' /etc/systemd/system /lib/systemd/system 2>/dev/null
echo
echo "=== /usr/local/bin xray/rw-core on host? ==="
ls -la /usr/local/bin/xray /usr/local/bin/rw-core 2>/dev/null || echo "not on host (only in container)"
echo
echo "=== Files modified between Apr 3 and Apr 6 in /etc /usr/local /opt /root ==="
find /etc /usr/local /opt /root -xdev -type f \
  -newermt '2026-04-03' ! -newermt '2026-04-07' 2>/dev/null \
  | grep -vE '/var/log|\.log$|\.npm/|\.cache/|/snap/|/lib/docker/' \
  | head -80
echo
echo "=== Listening :2222 (panel) details ==="
ss -tlnp | grep ':2222'
echo
echo "(forensics complete)"
