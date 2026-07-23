#!/usr/bin/env node
// scripts/build-bundle.mjs — assembles bundle/ from source submodules.
// Zero dependencies. Works on Windows, macOS, Linux, and in CI.
// Usage:
//   node scripts/build-bundle.mjs          # assemble locally, no push
//   node scripts/build-bundle.mjs --push   # assemble + push bundle + bump main pointer

import { execFileSync, execSync } from 'child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT   = resolve(__dirname, '..');          // superproject root
const BUNDLE = join(ROOT, 'bundle');

const doPush = process.argv.includes('--push');

// ─── helpers ──────────────────────────────────────────────────────────────────

function log(msg) { process.stdout.write(`\n[build-bundle] ${msg}\n`); }

/** Run a command, streaming output to the terminal. */
function run(cmd, args, cwd = ROOT) {
  log(`> ${cmd} ${args.join(' ')} (in ${cwd})`);
  execFileSync(cmd, args, { cwd, stdio: 'inherit' });
}

/** Run via shell (needed so npm/.cmd wrappers work on Windows). */
function runShell(cmd, cwd = ROOT) {
  log(`> ${cmd} (in ${cwd})`);
  execSync(cmd, { cwd, stdio: 'inherit', shell: true });
}

/** Return true if the git index in `dir` has staged changes vs HEAD. */
function hasStagedChanges(dir) {
  try {
    // exit 1 = differences, exit 0 = no differences
    execFileSync('git', ['diff', '--cached', '--quiet'], { cwd: dir });
    return false;
  } catch {
    return true;
  }
}

/** Commit in `dir` if there is anything staged; return true if committed. */
function commitIfChanged(dir, message) {
  if (!hasStagedChanges(dir)) {
    log(`Nothing staged in ${dir} — skipping commit.`);
    return false;
  }
  execFileSync('git', [
    '-c', 'user.email=ci@example.com',
    '-c', 'user.name=build-bundle',
    'commit', '-m', message,
  ], { cwd: dir, stdio: 'inherit' });
  return true;
}

/** Return true if `dir` has local commits not yet on the remote. */
function hasUnpushedCommits(dir, remoteBranch) {
  try {
    const out = execFileSync(
      'git', ['rev-list', '--count', `${remoteBranch}..HEAD`],
      { cwd: dir, encoding: 'utf8' }
    ).trim();
    return parseInt(out, 10) > 0;
  } catch {
    // If the remote ref doesn't exist yet, there are unpushed commits
    return true;
  }
}

// ─── Step 1: update source submodules to branch tips ──────────────────────────

log('Updating source submodules (backend, frontend, cli) to branch tips…');
run('git', ['submodule', 'update', '--init', '--remote', 'backend', 'frontend', 'cli']);

// ─── Step 2: build the Angular frontend ───────────────────────────────────────

const FRONTEND = join(ROOT, 'frontend');
const DIST_INDEX = join(FRONTEND, 'dist', 'snip-frontend', 'browser', 'index.html');

log('Installing frontend dependencies…');
// Use shell=true so npm.cmd is found on Windows
runShell('npm install', FRONTEND);

log('Building Angular app…');
runShell('npx ng build', FRONTEND);

if (!existsSync(DIST_INDEX)) {
  process.stderr.write(
    `\n[build-bundle] ERROR: expected build output at:\n  ${DIST_INDEX}\n` +
    'ng build may have failed or changed its outputPath.\n'
  );
  process.exit(1);
}

// ─── Step 3: assemble bundle/ ─────────────────────────────────────────────────

log('Assembling bundle/…');

// 3a. Copy server.js from backend
cpSync(join(ROOT, 'backend', 'server.js'), join(BUNDLE, 'server.js'));

// 3b. Copy cli.js from cli
cpSync(join(ROOT, 'cli', 'cli.js'), join(BUNDLE, 'cli.js'));

// 3c. Copy Angular build output → bundle/public
const BUNDLE_PUBLIC = join(BUNDLE, 'public');
if (existsSync(BUNDLE_PUBLIC)) {
  rmSync(BUNDLE_PUBLIC, { recursive: true, force: true });
}
mkdirSync(BUNDLE_PUBLIC, { recursive: true });
cpSync(join(FRONTEND, 'dist', 'snip-frontend', 'browser'), BUNDLE_PUBLIC, { recursive: true });

// 3d. Write .env  (Bun auto-loads this; switches server into static-serving mode)
writeFileSync(join(BUNDLE, '.env'), 'PUBLIC_DIR=./public\n', 'utf8');

// 3e. Write package.json  — NO "type":"module" so cli.js runs under plain node
writeFileSync(join(BUNDLE, 'package.json'), JSON.stringify({
  name: 'snip-bundle',
  version: '1.0.0',
  scripts: { start: 'bun server.js' },
}, null, 2) + '\n', 'utf8');

// 3f. Write Dockerfile
writeFileSync(join(BUNDLE, 'Dockerfile'), [
  'FROM oven/bun:1-alpine',
  'WORKDIR /app',
  'COPY . .',
  'ENV PORT=3000',
  'EXPOSE 3000',
  'CMD ["bun", "server.js"]',
  '',
].join('\n'), 'utf8');

// 3g. Write .dockerignore
writeFileSync(join(BUNDLE, '.dockerignore'), [
  '.git',
  '*.md',
  '.env',
  '',
].join('\n'), 'utf8');

// 3h. Write railway.json
writeFileSync(join(BUNDLE, 'railway.json'), JSON.stringify({
  '$schema': 'https://railway.app/railway.schema.json',
  build: { builder: 'DOCKERFILE', dockerfilePath: 'Dockerfile' },
}, null, 2) + '\n', 'utf8');

log('bundle/ assembled.');

// ─── Step 4: commit inside bundle/ ────────────────────────────────────────────

log('Staging changes in bundle/…');
run('git', ['add', '-A'], BUNDLE);

const bundleCommitted = commitIfChanged(BUNDLE, 'chore: rebuild bundle from source submodules');

// ─── Step 5: bump bundle pointer in superproject ──────────────────────────────

run('git', ['add', 'bundle'], ROOT);
const superCommitted = commitIfChanged(ROOT, 'chore: bump bundle submodule pointer');

// ─── Step 6: push (only with --push) ──────────────────────────────────────────

if (doPush) {
  if (bundleCommitted || hasUnpushedCommits(BUNDLE, 'origin/bundle')) {
    log('Pushing bundle branch…');
    // Submodule checkout is detached; push HEAD to the remote bundle branch explicitly
    run('git', ['push', 'origin', 'HEAD:bundle'], BUNDLE);
  } else {
    log('bundle branch unchanged — nothing to push.');
  }

  if (superCommitted || hasUnpushedCommits(ROOT, 'origin/main')) {
    log('Pushing main branch…');
    run('git', ['push'], ROOT);
  } else {
    log('main branch unchanged — nothing to push.');
  }
} else {
  log('Dry run (no --push). Pass --push to publish.');
}

log('build-bundle.mjs finished successfully.');
