#!/usr/bin/env node
/**
 * OpenAnalyst - Automated Startup Script
 *
 * This script starts all necessary services:
 * 1. WebSocket Server (port 8765)
 * 2. Cache System
 * 3. ws-listener (Claude Code integration)
 * 4. Next.js UI (port 3000)
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT_DIR = path.join(__dirname, '..');
const UI_DIR = path.join(ROOT_DIR, 'ui');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

// Track running processes
const processes = [];

// Banner
function showBanner() {
  console.log('\n' + colors.cyan + colors.bright);
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                                                              ║');
  console.log('║               10x Accountability Coach                       ║');
  console.log('║               Automated Startup System                       ║');
  console.log('║                                                              ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(colors.reset + '\n');
}

// Log with timestamp
function log(message, color = colors.reset) {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`${colors.bright}[${timestamp}]${colors.reset} ${color}${message}${colors.reset}`);
}

// Check if dependencies are installed
async function checkDependencies() {
  log('Checking dependencies...', colors.blue);

  let needsInstall = false;

  // Check root dependencies (dotenv, ws)
  if (!fs.existsSync(path.join(ROOT_DIR, 'node_modules'))) {
    log('⚠️  Root dependencies not found. Installing...', colors.yellow);
    needsInstall = true;

    await new Promise((resolve, reject) => {
      const npm = spawn('npm', ['install'], {
        cwd: ROOT_DIR,
        shell: true,
        stdio: 'inherit'
      });

      npm.on('close', (code) => {
        if (code === 0) {
          log('✓ Root dependencies installed', colors.green);
          resolve();
        } else {
          reject(new Error('Failed to install root dependencies'));
        }
      });
    });
  }

  // Check UI dependencies
  if (!fs.existsSync(path.join(UI_DIR, 'node_modules'))) {
    log('⚠️  UI dependencies not found. Installing...', colors.yellow);
    needsInstall = true;

    await new Promise((resolve, reject) => {
      const npm = spawn('npm', ['install'], {
        cwd: UI_DIR,
        shell: true,
        stdio: 'inherit'
      });

      npm.on('close', (code) => {
        if (code === 0) {
          log('✓ UI dependencies installed', colors.green);
          resolve();
        } else {
          reject(new Error('Failed to install UI dependencies'));
        }
      });
    });
  }

  if (!needsInstall) {
    log('✓ All dependencies OK', colors.green);
  }
}

// Start WebSocket server
function startWebSocketServer() {
  return new Promise((resolve) => {
    log('Starting WebSocket server...', colors.blue);

    const wsServer = spawn('node', ['server/websocket.js'], {
      cwd: ROOT_DIR,
      shell: true,
    });

    processes.push({ name: 'WebSocket Server', process: wsServer });

    let started = false;

    wsServer.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('WebSocket server started') && !started) {
        started = true;
        log('✓ WebSocket server running on ws://localhost:8765', colors.green);
        setTimeout(resolve, 500);
      }
    });

    wsServer.stderr.on('data', (data) => {
      console.error(`${colors.red}[WebSocket Error]${colors.reset} ${data}`);
    });
  });
}

// Start ws-listener (Claude Code integration)
function startWsListener() {
  return new Promise((resolve) => {
    log('Starting Claude Code listener...', colors.blue);

    const listener = spawn('node', ['lib/ws-listener.js'], {
      cwd: ROOT_DIR,
      shell: true,
    });

    processes.push({ name: 'ws-listener', process: listener });

    let started = false;

    listener.stdout.on('data', (data) => {
      const output = data.toString();
      if ((output.includes('registered as claude-cli') || output.includes('Fast cache system ready')) && !started) {
        started = true;
        log('✓ Claude Code listener connected', colors.green);
        setTimeout(resolve, 500);
      }
    });

    listener.stderr.on('data', (data) => {
      console.error(`${colors.red}[Listener Error]${colors.reset} ${data}`);
    });
  });
}

// Start Next.js UI
function startUI() {
  return new Promise((resolve) => {
    log('Starting Next.js UI...', colors.blue);

    const ui = spawn('npm', ['run', 'dev'], {
      cwd: UI_DIR,
      shell: true,
    });

    processes.push({ name: 'Next.js UI', process: ui });

    let started = false;

    ui.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Ready in') && !started) {
        started = true;
        log('✓ UI ready at http://localhost:3000', colors.green);
        setTimeout(resolve, 1000);
      }
    });

    ui.stderr.on('data', (data) => {
      // Next.js logs warnings to stderr, ignore them
      const output = data.toString();
      if (output.includes('Error') || output.includes('error')) {
        console.error(`${colors.red}[UI Error]${colors.reset} ${data}`);
      }
    });
  });
}

// Start Claude Code Auto-Responder (THE BRAIN)
function startClaudeResponder() {
  return new Promise((resolve) => {
    log('Starting Claude Code Brain...', colors.blue);

    const responder = spawn('node', ['lib/claude-responder.js'], {
      cwd: ROOT_DIR,
      shell: true,
    });

    processes.push({ name: 'Claude Brain', process: responder });

    let started = false;

    responder.stdout.on('data', (data) => {
      const output = data.toString();
      // Show Claude responder output
      if (output.includes('[Claude Responder]')) {
        console.log(colors.cyan + output.trim() + colors.reset);
      }
      if (output.includes('Polling') && !started) {
        started = true;
        log('✓ Claude Code Brain active and listening!', colors.green);
        setTimeout(resolve, 500);
      }
    });

    responder.stderr.on('data', (data) => {
      console.error(`${colors.red}[Claude Brain Error]${colors.reset} ${data}`);
    });
  });
}

// Show ready message
function showReadyMessage() {
  console.log('\n' + colors.green + colors.bright);
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                                                              ║');
  console.log('║                  YOUR APP IS READY!                          ║');
  console.log('║                                                              ║');
  console.log('║               Open: http://localhost:3000                    ║');
  console.log('║                                                              ║');
  console.log('║  All Services Running:                                       ║');
  console.log('║    ✓ WebSocket Server (ws://localhost:8765)                  ║');
  console.log('║    ✓ Claude Code Brain (AI Responder)                        ║');
  console.log('║    ✓ Fast Cache System (in-memory)                           ║');
  console.log('║    ✓ Next.js UI (http://localhost:3000)                      ║');
  console.log('║                                                              ║');
  console.log('║  Press Ctrl+C to stop all services                           ║');
  console.log('║                                                              ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(colors.reset + '\n');

  // Show Claude Code integration instructions
  console.log(colors.cyan + colors.bright + '📋 TERMINAL 2: Run Claude Code (THE BRAIN)\n' + colors.reset);
  console.log(colors.yellow + 'Open a second terminal and run:' + colors.reset);
  console.log(colors.cyan + '  claude\n' + colors.reset);

  console.log(colors.yellow + 'Then paste this prompt into Claude Code:' + colors.reset);
  console.log(colors.bright + '┌─────────────────────────────────────────────────────────────┐' + colors.reset);
  console.log(colors.cyan + '│ Read and execute: node claude-watch.js                      │');
  console.log('│                                                             │');
  console.log('│ This shows you pending messages and user context. Then set │');
  console.log('│ up continuous watching for new messages in data/.pending/  │');
  console.log('│ and respond to them using:                                 │');
  console.log('│   node send-response-fast.js <requestId>                   │' + colors.reset);
  console.log(colors.bright + '└─────────────────────────────────────────────────────────────┘' + colors.reset);
  console.log('');

  console.log(colors.green + '✨ Once Claude Code is running, it will:' + colors.reset);
  console.log('   • Detect messages from the UI automatically');
  console.log('   • Load user context (profile, challenges, tasks)');
  console.log('   • Generate intelligent, personalized responses');
  console.log('   • Stream responses back to the UI in real-time');
  console.log('   • Maintain conversation context across messages');
  console.log('');

  console.log(colors.bright + 'For detailed instructions, see: CLAUDE.md' + colors.reset);
  console.log('');
}

// Graceful shutdown
function shutdown() {
  console.log('\n' + colors.yellow + 'Shutting down all services...' + colors.reset);

  processes.forEach(({ name, process }) => {
    log(`Stopping ${name}...`, colors.yellow);
    process.kill();
  });

  log('All services stopped', colors.green);
  process.exit(0);
}

// Main startup sequence
async function main() {
  showBanner();

  try {
    // Step 1: Check dependencies
    await checkDependencies();

    // Step 2: Start WebSocket server
    await startWebSocketServer();

    // Step 3: Start ws-listener (for message routing)
    await startWsListener();

    // Step 4: Start Claude Code Brain (THE AI)
    await startClaudeResponder();

    // Step 5: Start UI
    await startUI();

    // Show ready message
    showReadyMessage();

    // Handle shutdown
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

  } catch (error) {
    console.error(`${colors.red}Startup failed:${colors.reset}`, error.message);
    shutdown();
  }
}

// Start
main();
