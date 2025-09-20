#!/usr/bin/env node
import https from 'https';
import http from 'http';

const url = process.argv[2] || 'http://localhost:5000/health';
const lib = url.startsWith('https') ? https : http;

const req = lib.get(url, res => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    const ok = res.statusCode === 200 && /"status"\s*:\s*"ok"/.test(data);
    console.log('Status Code:', res.statusCode);
    console.log('Body:', data);
    if (!ok) process.exit(3);
  });
});
req.on('error', err => { console.error('Request error:', err.message); process.exit(4); });
req.setTimeout(10000, () => { console.error('Timeout'); req.destroy(); process.exit(5); });
