#!/usr/bin/env node

import { execSync, spawnSync } from 'node:child_process';
import { existsSync, copyFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { platform } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
process.chdir(__dirname);

const os = platform();

// ── Colors (ANSI, works on all platforms with modern terminals) ──
const c = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  reset: '\x1b[0m'
};

// ── Helpers ──

function run(cmd) {
  try {
    execSync(cmd, { stdio: 'inherit' });
    return true;
  } catch {
    return false;
  }
}

function runQuiet(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch {
    return '';
  }
}

function hasCommand(cmd) {
  const check = os === 'win32' ? `where ${cmd}` : `command -v ${cmd}`;
  return spawnSync(check, { shell: true, stdio: 'ignore' }).status === 0;
}

function getComposeCmd() {
  if (spawnSync('docker compose version', { shell: true, stdio: 'ignore' }).status === 0) {
    return 'docker compose';
  }
  if (hasCommand('docker-compose')) {
    return 'docker-compose';
  }
  return null;
}

// ── Preflight ──

if (!existsSync(resolve(__dirname, '.env'))) {
  console.log(`${c.yellow}No .env file found. Creating from .env.example...${c.reset}`);
  copyFileSync(resolve(__dirname, '.env.example'), resolve(__dirname, '.env'));
  console.log(`${c.red}Please edit .env and set DISCORD_TOKEN and CLIENT_ID, then re-run.${c.reset}`);
  process.exit(1);
}

if (!hasCommand('docker')) {
  console.error(`${c.red}Docker is not installed.${c.reset}`);
  if (os === 'darwin') console.log('Install: brew install docker colima');
  else if (os === 'win32') console.log('Install: https://docs.docker.com/desktop/install/windows-install/');
  else console.log('Install: https://docs.docker.com/engine/install/');
  process.exit(1);
}

// macOS: auto-start Colima
if (os === 'darwin' && spawnSync('docker info', { shell: true, stdio: 'ignore' }).status !== 0) {
  if (hasCommand('colima')) {
    console.log(`${c.yellow}Starting Colima...${c.reset}`);
    run('colima start');
  } else {
    console.error(`${c.red}Docker daemon not running. Install Colima: brew install colima${c.reset}`);
    process.exit(1);
  }
}

const COMPOSE = getComposeCmd();
if (!COMPOSE) {
  console.error(`${c.red}Docker Compose not found. Install it first.${c.reset}`);
  process.exit(1);
}

// ── Status ──

function getStatus(service) {
  const state = runQuiet(`${COMPOSE} ps --format "{{.State}}" ${service}`);
  return state || 'not running';
}

function colorStatus(state) {
  if (state === 'running') return `${c.green}${c.bold}running${c.reset}`;
  return `${c.red}${c.bold}${state}${c.reset}`;
}

// ── Display ──

function banner() {
  console.clear();
  console.log(`${c.cyan}${c.bold}`);
  console.log('  ╔══════════════════════════════════════╗');
  console.log('  ║       Fake Giveaway Bot Manager      ║');
  console.log('  ╚══════════════════════════════════════╝');
  console.log(c.reset);

  const botState = getStatus('bot');
  const dbState = getStatus('db');
  console.log(`  Bot: ${colorStatus(botState)}    DB: ${colorStatus(dbState)}`);
  console.log('');
}

function menu() {
  console.log(`  ${c.bold}Commands:${c.reset}`);
  console.log(`    ${c.cyan}s${c.reset} - Start bot`);
  console.log(`    ${c.cyan}r${c.reset} - Restart bot`);
  console.log(`    ${c.cyan}b${c.reset} - Rebuild & restart bot`);
  console.log(`    ${c.cyan}d${c.reset} - Stop bot (keep DB running)`);
  console.log(`    ${c.cyan}l${c.reset} - View bot logs (live)`);
  console.log(`    ${c.cyan}q${c.reset} - Quit (stops everything)`);
  console.log('');
}

// ── Actions ──

function doStart() {
  console.log(`${c.cyan}Starting containers...${c.reset}`);
  run(`${COMPOSE} up -d --build`);
  console.log(`${c.green}Done.${c.reset}`);
}

function doRestart() {
  console.log(`${c.cyan}Restarting bot...${c.reset}`);
  run(`${COMPOSE} restart bot`);
  console.log(`${c.green}Done.${c.reset}`);
}

function doRebuild() {
  console.log(`${c.cyan}Rebuilding and restarting bot...${c.reset}`);
  run(`${COMPOSE} up -d --build bot`);
  console.log(`${c.green}Done.${c.reset}`);
}

function doStopBot() {
  console.log(`${c.yellow}Stopping bot container...${c.reset}`);
  run(`${COMPOSE} stop bot`);
  console.log(`${c.green}Bot stopped. DB still running.${c.reset}`);
}

function doLogs() {
  console.log(`${c.cyan}Showing bot logs (Ctrl+C to return to menu)...${c.reset}`);
  run(`${COMPOSE} logs -f bot`);
}

function doQuit() {
  console.log(`${c.yellow}Shutting down all containers...${c.reset}`);
  run(`${COMPOSE} down`);
  console.log(`${c.green}Goodbye.${c.reset}`);
  process.exit(0);
}

// ── Main loop ──

process.on('SIGINT', () => doQuit());

// Initial start
doStart();

const rl = createInterface({ input: process.stdin, output: process.stdout });

function prompt() {
  banner();
  menu();
  rl.question('  > ', (answer) => {
    const cmd = answer.trim().toLowerCase();
    switch (cmd) {
      case 's': doStart(); break;
      case 'r': doRestart(); break;
      case 'b': doRebuild(); break;
      case 'd': doStopBot(); break;
      case 'l': doLogs(); break;
      case 'q': doQuit(); return;
      default:
        console.log(`${c.red}  Unknown command: ${cmd}${c.reset}`);
        break;
    }
    // Small delay so user can read output before clearing
    setTimeout(prompt, 1500);
  });
}

prompt();
