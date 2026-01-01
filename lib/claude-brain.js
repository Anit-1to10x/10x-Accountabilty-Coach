#!/usr/bin/env node
/**
 * Claude Code Brain - Real Integration
 *
 * This module provides the interface between Claude Code and the OpenAnalyst system.
 * Claude Code (the CLI running in terminal) uses this to:
 * 1. Check for pending messages from the UI
 * 2. Build context (user profile, challenges, tasks)
 * 3. Send responses back to the UI via WebSocket
 */

const fs = require('fs').promises;
const path = require('path');
const WebSocket = require('ws');

const DATA_DIR = path.join(__dirname, '..', 'data');
const PENDING_DIR = path.join(DATA_DIR, '.pending');
const RESPONSES_DIR = path.join(DATA_DIR, '.responses');
const WS_URL = process.env.WS_URL || 'ws://localhost:8765';

/**
 * Get all pending messages that Claude Code should process
 */
async function getPendingMessages() {
  try {
    await fs.mkdir(PENDING_DIR, { recursive: true });
    const files = await fs.readdir(PENDING_DIR);
    const jsonFiles = files.filter(f => f.endsWith('.json') && !f.startsWith('.processing'));

    const messages = [];
    for (const file of jsonFiles) {
      const filepath = path.join(PENDING_DIR, file);
      const content = await fs.readFile(filepath, 'utf-8');
      const data = JSON.parse(content);
      messages.push({
        id: file.replace('.json', ''),
        filepath,
        ...data
      });
    }

    return messages.sort((a, b) => a.timestamp - b.timestamp);
  } catch (error) {
    console.error('[Claude Brain] Error reading pending messages:', error);
    return [];
  }
}

/**
 * Mark a message as being processed
 */
async function markProcessing(messageId) {
  const sourcePath = path.join(PENDING_DIR, `${messageId}.json`);
  const targetPath = path.join(PENDING_DIR, `.processing-${messageId}.json`);

  try {
    await fs.rename(sourcePath, targetPath);
  } catch (error) {
    console.error('[Claude Brain] Error marking message as processing:', error);
  }
}

/**
 * Send response back to UI via WebSocket
 */
async function sendResponse(requestId, response, metadata = {}) {
  try {
    await fs.mkdir(RESPONSES_DIR, { recursive: true });

    // Save response to file
    const responseData = {
      requestId,
      response,
      timestamp: Date.now(),
      metadata,
      source: 'claude-code'
    };

    const responseFile = path.join(RESPONSES_DIR, `resp-${requestId}.json`);
    await fs.writeFile(responseFile, JSON.stringify(responseData, null, 2));

    // Send via WebSocket
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(WS_URL);

      ws.on('open', () => {
        ws.send(JSON.stringify({
          type: 'chat_response',
          requestId,
          message: response,
          metadata,
          source: 'claude-code'
        }));

        ws.close();
        resolve();
      });

      ws.on('error', (error) => {
        console.error('[Claude Brain] WebSocket error:', error);
        reject(error);
      });
    });
  } catch (error) {
    console.error('[Claude Brain] Error sending response:', error);
    throw error;
  }
}

/**
 * Clean up processed message
 */
async function cleanupMessage(messageId) {
  const processingPath = path.join(PENDING_DIR, `.processing-${messageId}.json`);

  try {
    await fs.unlink(processingPath);
  } catch (error) {
    // File might already be deleted
  }
}

/**
 * Build context for Claude Code to use when responding
 */
async function buildContext(profileId = 'default') {
  const context = {
    profile: null,
    challenges: [],
    tasks: [],
    recentActivity: []
  };

  try {
    // Load user profile
    const profilePath = path.join(DATA_DIR, 'profiles', profileId, 'profile.md');
    context.profile = await fs.readFile(profilePath, 'utf-8');
  } catch (error) {
    // Profile doesn't exist yet
  }

  return context;
}

module.exports = {
  getPendingMessages,
  markProcessing,
  sendResponse,
  cleanupMessage,
  buildContext
};

// CLI usage: node lib/claude-brain.js
if (require.main === module) {
  (async () => {
    console.log('🧠 Claude Code Brain - Checking for messages...\n');

    const messages = await getPendingMessages();

    if (messages.length === 0) {
      console.log('✓ No pending messages');
      return;
    }

    console.log(`📬 Found ${messages.length} pending message(s):\n`);

    for (const msg of messages) {
      console.log(`  • [${msg.id}] ${msg.message || msg.text || 'No content'}`);
      console.log(`    From: ${msg.agentId || 'unified'}`);
      console.log(`    Time: ${new Date(msg.timestamp).toLocaleString()}\n`);
    }

    console.log('\n💡 Claude Code should now process these messages and send responses.');
    console.log('   Use: claudeBrain.sendResponse(requestId, responseText)\n');
  })();
}