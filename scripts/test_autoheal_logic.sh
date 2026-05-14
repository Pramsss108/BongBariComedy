#!/usr/bin/env bash
# Simulates the watchdog logic against synthetic index.html with a broken asset.
set +e
SITE="https://www.bongbari.com"
TMP=$(mktemp)
cat > "$TMP" <<'HTML'
<html><head>
<script src="/assets/index-FAKE_BROKEN_HASH.js"></script>
<link rel="stylesheet" href="/assets/index-BnCJ-_VD.css">
</head></html>
HTML

ASSETS=$(grep -oE '/assets/[A-Za-z0-9_.\-]+\.(js|css|mjs)' "$TMP" | sort -u)
BROKEN=""
while IFS= read -r path; do
  read CODE CTYPE BYTES < <(curl -sS -o /dev/null -w "%{http_code} %{content_type} %{size_download}" "$SITE$path")
  STATUS=OK
  [ "$CODE" != "200" ] && STATUS=BAD_STATUS
  echo "$CTYPE" | grep -qi 'text/html' && STATUS=HTML_FALLBACK
  printf '  %-14s %s -> http=%s ctype=%s bytes=%s\n' "$STATUS" "$path" "$CODE" "$CTYPE" "$BYTES"
  [ "$STATUS" != "OK" ] && BROKEN="$BROKEN $path"
done <<< "$ASSETS"

echo ""
if [ -n "$BROKEN" ]; then
  echo "RESULT: BROKEN detected ->$BROKEN"
  echo "Watchdog would dispatch deploy.yml"
else
  echo "RESULT: HEALTHY"
fi
