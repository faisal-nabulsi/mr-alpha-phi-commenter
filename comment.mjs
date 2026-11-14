#!/usr/bin/env node
// Posts comments on one Instagram post from your own account, in a real Chrome
// window you log in to yourself. Picks a random line from comments.txt each time,
// waits a random gap between comments, and stops on its own if Instagram shows a
// block/limit message (pushing past a block makes the next one longer).
//
// Usage:
//   npm start                     (the Mr. Alpha Phi post, every 2 seconds)
//   node comment.mjs <post-url> [--min 40] [--max 90] [--limit 0] [--file comments.txt]
//   --min/--max  seconds to wait between comments (random in that range)
//   --limit      stop after this many comments (0 = keep going until Ctrl+C)
//   --file       comments file, one comment per line (# lines ignored)
//
// Ctrl+C once = finish the current comment and stop. Twice = quit now.

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

const BOX = 'textarea[aria-label^="Add a comment"]';
const BLOCK_TEXT =
  /try again later|we limit how often|restrict certain activity|action blocked|couldn.t post (your )?comment/i;

function die(msg) {
  console.error(msg);
  process.exit(1);
}

function parseArgs(argv) {
  const o = {
    url: null,
    min: 40,
    max: 90,
    limit: 0,
    file: path.join(here, 'comments.txt'),
    profile: path.join(here, '.chrome-profile'),
    headless: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--min') o.min = Number(argv[++i]);
    else if (a === '--max') o.max = Number(argv[++i]);
    else if (a === '--limit') o.limit = Number(argv[++i]);
    else if (a === '--file') o.file = path.resolve(argv[++i]);
    else if (a === '--profile') o.profile = path.resolve(argv[++i]);
    else if (a === '--headless') o.headless = true;
    else if (!a.startsWith('--') && !o.url) o.url = a;
    else die(`Unknown argument: ${a}`);
  }
  if (!o.url) die('Usage: node comment.mjs <instagram-post-url> [--min 40] [--max 90] [--limit 0]');
  if (!(o.min >= 0 && o.max >= o.min)) die('--min must be >= 0 and --max must be >= --min');
  return o;
}

function loadComments(file) {
  if (!fs.existsSync(file)) die(`No comments file at ${file}`);
  const lines = fs
    .readFileSync(file, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));
  if (!lines.length) die(`${file} has no comments in it (one per line).`);
  return lines;
}

const stamp = () => new Date().toLocaleTimeString();
const log = (m) => console.log(`[${stamp()}] ${m}`);
const rand = (a, b) => a + Math.random() * (b - a);

let stopping = false;
process.on('SIGINT', () => {
  if (stopping) process.exit(130);
  stopping = true;
  console.log('\nStopping after this comment. (Ctrl+C again to quit right now.)');
});

async function sleep(ms) {
  const end = Date.now() + ms;
  while (!stopping && Date.now() < end) {
    await new Promise((r) => setTimeout(r, Math.min(500, end - Date.now())));
  }
}

async function hasBox(page, timeout) {
  try {
    await page.locator(BOX).first().waitFor({ state: 'visible', timeout });
    return true;
  } catch {
    return false;
  }
}

async function blocked(page) {
  const text = await page.locator('body').innerText().catch(() => '');
  return BLOCK_TEXT.test(text);
}

async function postOne(page, text) {
  const box = page.locator(BOX).first();
  await box.waitFor({ state: 'visible', timeout: 15000 });
  await box.click();
  await box.pressSequentially(text, { delay: Math.round(rand(50, 120)) });
  await page.keyboard.press('Enter');
  // Instagram clears the box once the comment goes through.
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    await page.waitForTimeout(400);
    if (await blocked(page)) return false;
    const v = await box.inputValue().catch(() => '');
    if (v === '') return true;
  }
  throw new Error('comment box never cleared (comment may not have posted)');
}

// Use the computer's own Google Chrome (Mac or Windows). If it isn't installed,
// fall back to Playwright's Chromium (`npx playwright install chromium`).
async function launch(o) {
  const base = { headless: o.headless, viewport: null };
  try {
    return await chromium.launchPersistentContext(o.profile, { ...base, channel: 'chrome' });
  } catch {
    try {
      return await chromium.launchPersistentContext(o.profile, base);
    } catch {
      die(
        "Couldn't open a browser. Install Google Chrome (google.com/chrome),\n" +
          'or run this once in this folder:  npx playwright install chromium',
      );
    }
  }
}

async function main() {
  const o = parseArgs(process.argv.slice(2));
  const comments = loadComments(o.file);
  const context = await launch(o);
  const page = context.pages()[0] ?? (await context.newPage());
  await page.goto(o.url, { waitUntil: 'domcontentloaded' });

  if (!(await hasBox(page, 10000))) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    await rl.question(
      '\nNo comment box yet. Log in to Instagram in the Chrome window that opened\n' +
        '(first run only; it remembers you after), then press Enter here... ',
    );
    rl.close();
    await page.goto(o.url, { waitUntil: 'domcontentloaded' });
    if (!(await hasBox(page, 20000))) {
      await context.close();
      die('Still no comment box on that post. Check the URL and that comments are turned on.');
    }
  }

  log(
    `Commenting on ${o.url} every ${o.min}-${o.max}s` +
      (o.limit ? `, ${o.limit} max` : ', until you press Ctrl+C') +
      ` (${comments.length} comment${comments.length > 1 ? 's' : ''} in rotation)`,
  );

  let posted = 0;
  let fails = 0;
  let last = null;
  while (!stopping && (o.limit === 0 || posted < o.limit)) {
    let text = comments[Math.floor(Math.random() * comments.length)];
    if (comments.length > 1) while (text === last) text = comments[Math.floor(Math.random() * comments.length)];
    last = text;

    try {
      const ok = await postOne(page, text);
      if (ok) {
        posted++;
        fails = 0;
        log(`#${posted} posted: ${text}`);
      }
    } catch (e) {
      fails++;
      log(`Failed (${fails} in a row): ${String(e.message).split('\n')[0]}`);
      if (fails < 3) await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
    }

    if (await blocked(page)) {
      log('Instagram is showing a block/limit message. Stopping now so the block does not get longer.');
      log('Wait a few hours (or until tomorrow) before running it again, and use a longer --min/--max.');
      break;
    }
    if (fails >= 3) {
      log('3 failures in a row. Stopping. Check the Chrome window to see what Instagram is showing.');
      break;
    }
    if (stopping || (o.limit && posted >= o.limit)) break;

    const wait = rand(o.min, o.max);
    log(`next one in ${Math.round(wait)}s`);
    await sleep(wait * 1000);
  }

  log(`Done. ${posted} comment${posted === 1 ? '' : 's'} posted this run.`);
  await context.close();
}

main().catch((e) => die(e.stack || String(e)));
