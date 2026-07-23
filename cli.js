#!/usr/bin/env node
'use strict';

// Snip CLI — zero dependencies, CommonJS, Node ≥18 global fetch
const API = (process.env.SNIP_API || 'http://localhost:3000').replace(/\/$/, '');

const USAGE = `
Usage: snip <command> [args]

Commands:
  snip add <url>      Shorten a URL and print the short link
  snip ls             List all shortened links
  snip open <code>    Open the original URL for a short code in the browser
  snip help           Show this help text
`.trim();

async function cmdAdd(url) {
  if (!url) {
    process.stderr.write('Error: missing URL argument\n  Usage: snip add <url>\n');
    process.exit(1);
  }
  let res;
  try {
    res = await fetch(`${API}/api/links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
  } catch (e) {
    process.stderr.write(`Error: could not reach backend at ${API}\n  ${e.message}\n`);
    process.exit(1);
  }
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { const b = await res.json(); msg = b.error || msg; } catch {}
    process.stderr.write(`Error: ${msg}\n`);
    process.exit(1);
  }
  const link = await res.json();
  process.stdout.write(`${link.shortUrl}\n`);
}

async function cmdLs() {
  let res;
  try {
    res = await fetch(`${API}/api/links`);
  } catch (e) {
    process.stderr.write(`Error: could not reach backend at ${API}\n  ${e.message}\n`);
    process.exit(1);
  }
  if (!res.ok) {
    process.stderr.write(`Error: HTTP ${res.status}\n`);
    process.exit(1);
  }
  const links = await res.json();
  if (!links.length) {
    process.stdout.write('No links yet.\n');
    return;
  }
  // Compute column widths
  const codeW = Math.max(4, ...links.map(l => l.code.length));
  const hitsW = Math.max(4, ...links.map(l => String(l.hits).length));
  const urlW  = Math.max(3, ...links.map(l => l.url.length));

  const pad = (s, w) => String(s).padEnd(w);
  const row = (code, hits, url) =>
    `${pad(code, codeW)}  ${pad(hits, hitsW)}  ${url}\n`;

  process.stdout.write(row('CODE', 'HITS', 'URL'));
  process.stdout.write(row('-'.repeat(codeW), '-'.repeat(hitsW), '-'.repeat(Math.min(urlW, 60))));
  for (const l of links) {
    process.stdout.write(row(l.code, l.hits, l.url));
  }
}

async function cmdOpen(code) {
  if (!code) {
    process.stderr.write('Error: missing code argument\n  Usage: snip open <code>\n');
    process.exit(1);
  }
  let res;
  try {
    res = await fetch(`${API}/${code}`, { redirect: 'manual' });
  } catch (e) {
    process.stderr.write(`Error: could not reach backend at ${API}\n  ${e.message}\n`);
    process.exit(1);
  }
  // manual redirect: 3xx with Location header
  const location = res.headers.get('location');
  if (!location) {
    if (res.status === 404) {
      process.stderr.write(`Error: short code "${code}" not found\n`);
    } else {
      process.stderr.write(`Error: unexpected response HTTP ${res.status}\n`);
    }
    process.exit(1);
  }
  // Open in OS browser
  const { spawn } = require('child_process');
  const cmd =
    process.platform === 'win32'  ? ['cmd', ['/c', 'start', '', location]] :
    process.platform === 'darwin' ? ['open', [location]] :
                                    ['xdg-open', [location]];
  spawn(cmd[0], cmd[1], { detached: true, stdio: 'ignore' }).unref();
  process.stdout.write(`Opening ${location}\n`);
}

async function main() {
  const [,, command, ...rest] = process.argv;
  switch (command) {
    case 'add':  await cmdAdd(rest[0]);  break;
    case 'ls':   await cmdLs();          break;
    case 'open': await cmdOpen(rest[0]); break;
    case 'help':
    case undefined:
      process.stdout.write(USAGE + '\n');
      break;
    default:
      process.stderr.write(`Error: unknown command "${command}"\n\n${USAGE}\n`);
      process.exit(1);
  }
}

main().catch(e => {
  process.stderr.write(`Unexpected error: ${e.message}\n`);
  process.exit(1);
});
