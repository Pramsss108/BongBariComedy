#!/bin/bash
set -e
cd ~/bongbari
echo "=== Oracle Setup Started ===" > /tmp/oracle_setup.log
npm ci --omit=dev >> /tmp/oracle_setup.log 2>&1
npm install --no-save drizzle-orm xml2js @upstash/redis >> /tmp/oracle_setup.log 2>&1
pm2 delete bongbari 2>/dev/null || true
pm2 start dist/index.js --name bongbari >> /tmp/oracle_setup.log 2>&1
pm2 save >> /tmp/oracle_setup.log 2>&1
echo "SETUP_COMPLETE" >> /tmp/oracle_setup.log