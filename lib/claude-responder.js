#!/usr/bin/env node
/**
 * Claude Code Auto-Responder
 *
 * This script runs as part of npm start and:
 * 1. Polls for pending messages every 2 seconds
 * 2. Invokes Claude Code CLI for each message
 * 3. Sends Claude's response back to UI via WebSocket
 *
 * Claude Code IS the brain - no third-party APIs.
 */

const { spawn } = require('child_process');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const WS_URL = process.env.WS_URL || 'ws://localhost:8765';
const PENDING_DIR = path.join(__dirname, '..', 'data', '.pending');
const POLL_INTERVAL = 2000; // 2 seconds

let ws = null;
let isProcessing = false;
let reconnectAttempts = 0;

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║         Claude Code Auto-Responder Started                 ║');
console.log('║         I am the brain - ready to respond!                 ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

/**
 * Connect to WebSocket server
 */
function connectWebSocket() {
  return new Promise((resolve, reject) => {
    ws = new WebSocket(WS_URL);

    ws.on('open', () => {
      console.log('[Claude Responder] Connected to WebSocket');
      ws.send(JSON.stringify({
        type: 'register',
        clientType: 'claude-cli',
        timestamp: new Date().toISOString()
      }));
    });

    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'registered') {
        console.log('[Claude Responder] Registered as claude-cli');
        reconnectAttempts = 0;
        resolve();
      }
    });

    ws.on('close', () => {
      console.log('[Claude Responder] WebSocket closed, reconnecting...');
      setTimeout(() => {
        reconnectAttempts++;
        if (reconnectAttempts < 10) {
          connectWebSocket().catch(() => {});
        }
      }, 2000);
    });

    ws.on('error', (err) => {
      if (reconnectAttempts === 0) {
        console.log('[Claude Responder] Waiting for WebSocket server...');
      }
    });

    // Timeout for initial connection
    setTimeout(() => {
      if (ws.readyState !== WebSocket.OPEN) {
        reject(new Error('Connection timeout'));
      }
    }, 5000);
  });
}

/**
 * Get pending messages
 */
function getPendingMessages() {
  if (!fs.existsSync(PENDING_DIR)) {
    return [];
  }

  const files = fs.readdirSync(PENDING_DIR).filter(f => f.endsWith('.json'));
  return files.map(f => {
    try {
      const filePath = path.join(PENDING_DIR, f);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      return { ...data, filePath };
    } catch (e) {
      return null;
    }
  }).filter(Boolean);
}

/**
 * Build context for Claude from user data
 */
function buildContext(profileId) {
  const dataDir = path.join(__dirname, '..', 'data');
  let context = '';

  try {
    // Read profile
    const profileDir = path.join(dataDir, 'profiles', profileId);
    if (fs.existsSync(path.join(profileDir, 'profile.md'))) {
      const profile = fs.readFileSync(path.join(profileDir, 'profile.md'), 'utf8');
      context += `USER PROFILE:\n${profile}\n\n`;
    }

    // Read active challenges
    const challengesDir = path.join(profileDir, 'challenges');
    if (fs.existsSync(challengesDir)) {
      const challenges = fs.readdirSync(challengesDir).filter(f => f.endsWith('.md'));
      if (challenges.length > 0) {
        context += 'ACTIVE CHALLENGES:\n';
        challenges.slice(0, 3).forEach(c => {
          const content = fs.readFileSync(path.join(challengesDir, c), 'utf8');
          context += `- ${c}: ${content.substring(0, 200)}...\n`;
        });
        context += '\n';
      }
    }

    // Read today's todos
    const todosDir = path.join(profileDir, 'todos');
    if (fs.existsSync(todosDir)) {
      const todoFiles = fs.readdirSync(todosDir).filter(f => f.endsWith('.json'));
      if (todoFiles.length > 0) {
        const latestTodo = todoFiles[todoFiles.length - 1];
        const todos = JSON.parse(fs.readFileSync(path.join(todosDir, latestTodo), 'utf8'));
        context += `TODAY'S TASKS: ${JSON.stringify(todos.slice(0, 5))}\n\n`;
      }
    }
  } catch (e) {
    // Ignore errors, context is optional
  }

  return context;
}

/**
 * Invoke Claude Code CLI to get a response
 */
function invokeClaudeCode(message, context) {
  return new Promise((resolve, reject) => {
    const prompt = `You are OpenAnalyst, an AI accountability coach. Be helpful, encouraging, and concise. No markdown bold (**text**). Use plain text.

${context ? `CONTEXT:\n${context}\n` : ''}USER MESSAGE: ${message}

Reply directly (2-4 sentences):`;

    console.log(`[Claude Responder] Invoking Claude Code for: "${message.substring(0, 50)}..."`);

    // Use claude CLI with -p flag for single prompt, skip permissions for speed
    const args = [
      '-p', prompt,
      '--dangerously-skip-permissions',
      '--allowedTools', ''  // No tools, just respond
    ];

    const claude = spawn('claude', args, {
      shell: true,
      cwd: path.join(__dirname, '..'),
      env: {
        ...process.env,
        CLAUDE_NO_TELEMETRY: '1',
        NO_COLOR: '1'
      }
    });

    let output = '';
    let error = '';

    claude.stdout.on('data', (data) => {
      output += data.toString();
    });

    claude.stderr.on('data', (data) => {
      // Ignore stderr unless it's a real error
      const errStr = data.toString();
      if (errStr.includes('Error') || errStr.includes('error')) {
        error += errStr;
      }
    });

    claude.on('close', (code) => {
      if (output.trim()) {
        // Clean up the output (remove any CLI artifacts)
        let cleanOutput = output.trim();
        // Remove ANSI codes and common prefixes
        cleanOutput = cleanOutput.replace(/\x1b\[[0-9;]*m/g, '');
        cleanOutput = cleanOutput.replace(/^(Claude:|Assistant:|Response:)\s*/i, '');
        resolve(cleanOutput);
      } else if (code === 0) {
        resolve("I'm here to help! What would you like to work on today?");
      } else {
        reject(new Error(error || 'Claude CLI failed'));
      }
    });

    claude.on('error', (err) => {
      reject(err);
    });

    // Timeout after 60 seconds (increased for API calls)
    setTimeout(() => {
      claude.kill();
      reject(new Error('Claude CLI timeout'));
    }, 60000);
  });
}

/**
 * Send response to UI via WebSocket
 */
function sendResponse(requestId, agentId, responseText) {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.error('[Claude Responder] WebSocket not connected');
    return false;
  }

  // Send response_start
  ws.send(JSON.stringify({
    type: 'response_start',
    agentId,
    requestId,
    timestamp: new Date().toISOString()
  }));

  // Send response as single chunk
  ws.send(JSON.stringify({
    type: 'response_chunk',
    agentId,
    requestId,
    content: responseText,
    timestamp: new Date().toISOString()
  }));

  // Send response_end
  ws.send(JSON.stringify({
    type: 'response_end',
    agentId,
    requestId,
    fullContent: responseText,
    timestamp: new Date().toISOString()
  }));

  console.log('[Claude Responder] Response sent to UI');
  return true;
}

/**
 * Process a single pending message
 */
async function processMessage(msg) {
  const { id, agentId, content, filePath } = msg;

  console.log(`\n[Claude Responder] Processing: "${content}"`);

  try {
    // Get profile ID (first available)
    const profilesDir = path.join(__dirname, '..', 'data', 'profiles');
    let profileId = null;
    if (fs.existsSync(profilesDir)) {
      const profiles = fs.readdirSync(profilesDir).filter(f =>
        fs.statSync(path.join(profilesDir, f)).isDirectory()
      );
      profileId = profiles[0] || null;
    }

    // Build context
    const context = profileId ? buildContext(profileId) : '';

    // Invoke Claude Code
    const response = await invokeClaudeCode(content, context);

    // Send response
    sendResponse(id, agentId, response);

    // Delete pending file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    console.log('[Claude Responder] Message processed successfully');

  } catch (error) {
    console.error('[Claude Responder] Error:', error.message);

    // Send error response
    sendResponse(id, agentId, `I'm having trouble processing that right now. Please try again.`);

    // Delete pending file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}

/**
 * Poll for pending messages
 */
async function poll() {
  if (isProcessing) return;

  const messages = getPendingMessages();

  if (messages.length > 0) {
    isProcessing = true;

    for (const msg of messages) {
      await processMessage(msg);
    }

    isProcessing = false;
  }
}

/**
 * Main entry point
 */
async function main() {
  // Wait a bit for WebSocket server to start
  await new Promise(r => setTimeout(r, 3000));

  // Connect to WebSocket
  try {
    await connectWebSocket();
  } catch (e) {
    console.log('[Claude Responder] Will retry connection...');
  }

  // Start polling
  console.log(`[Claude Responder] Polling every ${POLL_INTERVAL/1000}s for messages...\n`);
  setInterval(poll, POLL_INTERVAL);

  // Initial poll
  poll();
}

// Handle shutdown
process.on('SIGINT', () => {
  console.log('\n[Claude Responder] Shutting down...');
  if (ws) ws.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n[Claude Responder] Shutting down...');
  if (ws) ws.close();
  process.exit(0);
});

// Start
main();
