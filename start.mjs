#!/usr/bin/env node

import { execSync, spawnSync, spawn } from 'node:child_process';
import { existsSync, copyFileSync } from 'node:fs';
import { platform } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
process.chdir(__dirname);

const os = platform();

// ── Helpers ──

function run(cmd) {
  try {
    execSync(cmd, { stdio: 'inherit' });
    return true;
  } catch {
    return false;
  }
}

function hasCommand(cmd) {
  const check = os === 'win32' ? `where ${cmd}` : `command -v ${cmd}`;
  return spawnSync(check, { shell: true, stdio: 'ignore' }).status === 0;
}

// ── Preflight checks ──

// 1. Check .env
if (!existsSync(resolve(__dirname, '.env'))) {
  console.log('No .env file found. Creating from .env.example...');
  copyFileSync(
    resolve(__dirname, '.env.example'),
    resolve(__dirname, '.env')
  );
  console.log('Please edit .env and set DISCORD_TOKEN and CLIENT_ID, then re-run this script.');
  process.exit(1);
}

// 2. Check Docker
if (!hasCommand('docker')) {
  console.log('Docker is not installed.');
  if (os === 'darwin') {
    console.log('Installing via Homebrew...');
    if (!hasCommand('brew')) {
      console.error('Homebrew is not installed. Install it from https://brew.sh then re-run.');
      process.exit(1);
    }
    run('brew install docker');
  } else if (os === 'linux') {
    console.log('Install Docker: https://docs.docker.com/engine/install/');
    process.exit(1);
  } else {
    console.log('Install Docker Desktop: https://docs.docker.com/desktop/install/windows-install/');
    process.exit(1);
  }
}

// 3. macOS: check Colima
if (os === 'darwin') {
  if (!hasCommand('colima')) {
    console.log('Installing Colima (lightweight Docker runtime)...');
    run('brew install colima');
  }

  if (spawnSync('docker info', { shell: true, stdio: 'ignore' }).status !== 0) {
    console.log('Starting Colima...');
    run('colima start');
  }
}

// 4. Check Docker Compose
function getComposeCmd() {
  if (spawnSync('docker compose version', { shell: true, stdio: 'ignore' }).status === 0) return 'docker compose';
  if (hasCommand('docker-compose')) return 'docker-compose';
  return null;
}

if (!getComposeCmd()) {
  console.log('Docker Compose is not available.');
  if (os === 'darwin') {
    run('brew install docker-compose');
  } else if (os === 'win32') {
    console.log('Docker Compose comes with Docker Desktop. Install Docker Desktop first.');
    process.exit(1);
  } else {
    console.log('Install Docker Compose: https://docs.docker.com/compose/install/');
    process.exit(1);
  }
}

// ── Launch manager ──
console.log('Preflight checks passed. Launching manager...\n');

const child = spawn('node', [resolve(__dirname, 'manager.mjs')], {
  stdio: 'inherit',
  cwd: __dirname
});

child.on('exit', (code) => process.exit(code ?? 0));
