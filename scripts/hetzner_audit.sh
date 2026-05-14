#!/bin/bash
set +e
echo "=== /opt contents ==="
ls -la /opt
echo
echo "=== /root contents ==="
ls -la /root | head -40
echo
echo "=== running services (filtered) ==="
systemctl list-units --type=service --state=running --no-pager \
  | grep -vE 'systemd|cron|ssh|dbus|networkd|resolved|polkit|udev|journald|getty|fail2ban|qemu|unattended|user@|snapd|multipathd|rsyslog|containerd'
echo
echo "=== enabled non-stock services ==="
systemctl list-unit-files --state=enabled --no-pager | head -60
echo
echo "=== docker ps ==="
docker ps 2>/dev/null || echo "no docker / none running"
echo
echo "=== supervisord config ==="
cat /etc/supervisord.conf 2>/dev/null | head -50
ls /etc/supervisor.d/ /etc/supervisor/conf.d/ 2>/dev/null
echo
echo "=== Suspect PID details ==="
for pid in 3769627 26118 438109 163371 3723498 2843641 3723531; do
  echo "----- PID $pid -----"
  ps -p $pid -o pid,user,etime,cmd --no-headers 2>/dev/null || { echo "(gone)"; continue; }
  echo "exe : $(readlink /proc/$pid/exe 2>/dev/null)"
  echo "cwd : $(readlink /proc/$pid/cwd 2>/dev/null)"
  echo "cmdline:"
  tr '\0' ' ' < /proc/$pid/cmdline 2>/dev/null
  echo
done
echo
echo "=== root crontab ==="
crontab -l 2>/dev/null || echo "(no root crontab)"
echo
echo "=== /etc/cron* ==="
ls -la /etc/cron.d /etc/cron.daily /etc/cron.hourly /etc/cron.weekly /etc/cron.monthly 2>/dev/null
echo
echo "=== authorized_keys ==="
wc -l /root/.ssh/authorized_keys 2>/dev/null
cat /root/.ssh/authorized_keys 2>/dev/null | awk '{print $NF, $1}'
echo
echo "=== /tmp /var/tmp /dev/shm suspicious ==="
ls -la /tmp /var/tmp /dev/shm 2>/dev/null
echo
echo "=== recent files in /usr/local/bin ==="
ls -la --time-style=long-iso /usr/local/bin/ | tail -30
echo
echo "=== last 5 reboot/uptime ==="
last -x | head -10
echo
echo "=== known hits for 'dnsnb8' anywhere ==="
grep -RIal "dnsnb8" /etc /root /opt /var/log 2>/dev/null | head -20 || true
echo "(done)"
