#!/usr/bin/env node
/**
 * Claude Code Response Sender
 *
 * This script allows Claude Code to send responses to the UI.
 * Claude Code reads the pending message, generates a response, and calls this script.
 *
 * Usage:
 *   node claude-respond.js <requestId> "<response text>"
 *
 * Or pipe the response:
 *   echo "Your response here" | node claude-respond.js <requestId>
 */

const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

// Configuration
const WS_URL = 'ws://localhost:8765';
const PENDING_DIR = path.join(__dirname, 'data', '.pending');

// Get request ID and response from command line
const requestId = process.argv[2];
let responseText = process.argv.slice(3).join(' ');

if (!requestId) {
  console.error('Usage: node claude-respond.js <requestId> "<response text>"');
  console.error('   Or: echo "response" | node claude-respond.js <requestId>');
  process.exit(1);
}

// Read the pending request to get agentId
const pendingFile = path.join(PENDING_DIR, `${requestId}.json`);
if (!fs.existsSync(pendingFile)) {
  console.error(`Error: Pending request not found: ${requestId}`);
  console.error(`File expected at: ${pendingFile}`);
  process.exit(1);
}

const request = JSON.parse(fs.readFileSync(pendingFile, 'utf8'));
const { agentId, content } = request;

console.log(`\n📤 Sending Claude Code Response`);
console.log(`   Request: ${requestId}`);
console.log(`   Agent: ${agentId}`);
console.log(`   Original message: ${content.substring(0, 50)}...`);

// If response is empty, read from stdin
if (!responseText) {
  console.log('\nReading response from stdin...');
  const chunks = [];
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', chunk => chunks.push(chunk));
  process.stdin.on('end', () => {
    responseText = chunks.join('');
    sendToUI();
  });
} else {
  sendToUI();
}

/**
 * Send response via WebSocket to UI
 */
function sendToUI() {
  if (!responseText || responseText.trim() === '') {
    console.error('Error: Response text is empty');
    process.exit(1);
  }

  console.log(`   Response length: ${responseText.length} chars\n`);

  const ws = new WebSocket(WS_URL);

  ws.on('open', () => {
    // Register as Claude CLI
    ws.send(JSON.stringify({
      type: 'register',
      clientType: 'claude-cli',
      timestamp: new Date().toISOString()
    }));
  });

  ws.on('message', (data) => {
    const message = JSON.parse(data.toString());

    if (message.type === 'registered') {
      console.log('Connected to WebSocket server');
      console.log('Streaming response to UI...\n');

      // Send response_start
      ws.send(JSON.stringify({
        type: 'response_start',
        agentId,
        requestId,
        timestamp: new Date().toISOString()
      }));

      // Split into chunks for streaming effect
      const chunks = responseText.split('\n\n').filter(c => c.trim());
      let fullContent = '';
      let chunkIndex = 0;

      const sendNextChunk = () => {
        if (chunkIndex < chunks.length) {
          const chunkText = chunks[chunkIndex] + (chunkIndex < chunks.length - 1 ? '\n\n' : '');
          fullContent += chunkText;

          ws.send(JSON.stringify({
            type: 'response_chunk',
            agentId,
            requestId,
            content: chunkText,
            timestamp: new Date().toISOString()
          }));

          console.log(`  ✓ Chunk ${chunkIndex + 1}/${chunks.length}`);
          chunkIndex++;
          setTimeout(sendNextChunk, 100);
        } else {
          // Send response_end
          ws.send(JSON.stringify({
            type: 'response_end',
            agentId,
            requestId,
            fullContent: fullContent.trim(),
            timestamp: new Date().toISOString()
          }));

          console.log('\n✅ Response sent successfully!');

          // Delete pending file
          if (fs.existsSync(pendingFile)) {
            fs.unlinkSync(pendingFile);
            console.log('   Cleaned up pending request');
          }

          setTimeout(() => {
            ws.close();
            process.exit(0);
          }, 200);
        }
      };

      sendNextChunk();
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error.message);
    console.error('Is the WebSocket server running? (npm start)');
    process.exit(1);
  });

  // Timeout after 10 seconds
  setTimeout(() => {
    console.error('Timeout: Could not connect to WebSocket server');
    process.exit(1);
  }, 10000);
}
