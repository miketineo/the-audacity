#!/usr/bin/env node
// Broadcast sender for The Audacity waitlist.
//
// Reads a JSON list of recipients and sends one email to each via Amazon SES
// (functions/_lib/ses.js, the same client the site uses).
// Does NOT talk to Cloudflare KV directly — pipe recipients in via a file
// so this works without wrangler (needs node 20+) and without admin API.
//
// Expected input file shape:
//   [{ "email": "a@b.com", "project": "..." }, ...]
//   or
//   { "keys": [{ "name": "email:a@b.com" }, ...] }  // shape from `wrangler kv key list`
//
// Usage:
//   SES_ACCESS_KEY_ID=... SES_SECRET_ACCESS_KEY=... SES_REGION=eu-west-1 node scripts/broadcast.js \
//     --input waitlist-export.json \
//     --subject "Your subject" \
//     --html emails/broadcast-001.html \
//     --text emails/broadcast-001.txt \
//     [--from "The Audacity <obviously@theaudacity.io>"] \
//     [--reply-to obviously@theaudacity.io] \
//     [--dry-run] \
//     [--limit 50] \
//     [--rate 2]            # requests per second, defaults to 2
//     [--log broadcast.log] # JSONL log file, defaults to ./broadcast-<ts>.log

import { readFile, writeFile, appendFile } from 'node:fs/promises';
import { argv, exit } from 'node:process';
import { sendEmail, sesKeys } from '../functions/_lib/ses.js';

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) {
      args[key] = true;
    } else {
      args[key] = next;
      i++;
    }
  }
  return args;
}

function die(msg) {
  console.error(`broadcast: ${msg}`);
  exit(1);
}

async function loadRecipients(path) {
  const raw = await readFile(path, 'utf8');
  const data = JSON.parse(raw);
  if (Array.isArray(data)) {
    return data
      .map((r) => (typeof r === 'string' ? { email: r } : r))
      .filter((r) => r && r.email);
  }
  if (data && Array.isArray(data.keys)) {
    return data.keys
      .map((k) => ({ email: String(k.name || '').replace(/^email:/, '') }))
      .filter((r) => r.email);
  }
  die(`unrecognized input format: ${path}`);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const args = parseArgs(argv);

  if (!args.input) die('missing --input <path>');
  if (!args.subject) die('missing --subject <text>');
  if (!args.html) die('missing --html <path>');

  const keys = sesKeys(process.env);
  if (!keys && !args['dry-run']) die('SES_ACCESS_KEY_ID, SES_SECRET_ACCESS_KEY and SES_REGION env vars required (or pass --dry-run)');

  const from = args.from || 'The Audacity <obviously@theaudacity.io>';
  const replyTo = args['reply-to'] || 'obviously@theaudacity.io';
  const rate = Number(args.rate) || 2;
  const delayMs = Math.ceil(1000 / rate);

  const recipients = await loadRecipients(args.input);
  const limit = args.limit ? Number(args.limit) : recipients.length;
  const batch = recipients.slice(0, limit);

  const html = await readFile(args.html, 'utf8');
  const text = args.text ? await readFile(args.text, 'utf8') : undefined;

  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const logPath = args.log || `broadcast-${ts}.log`;

  console.log(`broadcast: ${batch.length} recipient(s)${args['dry-run'] ? ' (dry run)' : ''}`);
  console.log(`  from:    ${from}`);
  console.log(`  subject: ${args.subject}`);
  console.log(`  rate:    ${rate} req/s`);
  console.log(`  log:     ${logPath}`);
  console.log('');

  let sent = 0;
  let failed = 0;

  for (const r of batch) {
    const entry = { email: r.email, ts: new Date().toISOString() };
    if (args['dry-run']) {
      console.log(`  DRY  ${r.email}`);
      await appendFile(logPath, JSON.stringify({ ...entry, status: 'dry' }) + '\n');
      continue;
    }
    try {
      const result = await sendEmail({
        keys,
        from,
        to: r.email,
        subject: args.subject,
        html,
        text,
        replyTo,
      });
      sent++;
      console.log(`  OK   ${r.email}  id=${result?.MessageId || '-'}`);
      await appendFile(logPath, JSON.stringify({ ...entry, status: 'sent', id: result?.MessageId }) + '\n');
    } catch (err) {
      failed++;
      console.error(`  FAIL ${r.email}  ${err.message}`);
      await appendFile(logPath, JSON.stringify({ ...entry, status: 'failed', error: err.message }) + '\n');
    }
    await sleep(delayMs);
  }

  console.log('');
  console.log(`done: sent=${sent} failed=${failed} total=${batch.length}`);
}

main().catch((err) => {
  console.error(`broadcast: fatal: ${err.stack || err.message}`);
  exit(1);
});
