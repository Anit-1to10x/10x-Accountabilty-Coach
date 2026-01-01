#!/usr/bin/env node
/**
 * Send a response to the UI via WebSocket
 * Usage: node send-response.js <requestId> <response-text>
 */

const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

// Configuration
const WS_URL = 'ws://localhost:8765';
const PENDING_DIR = path.join(__dirname, 'data', '.pending');

// Get request ID from command line
const requestId = process.argv[2];
if (!requestId) {
  console.error('Usage: node send-response.js <requestId> "<response-text>"');
  process.exit(1);
}

// Get response text from remaining arguments
const responseText = process.argv.slice(3).join(' ');
if (!responseText) {
  console.error('Error: Response text is required');
  process.exit(1);
}

// Read the pending request to get agentId
const pendingFile = path.join(PENDING_DIR, `${requestId}.json`);
if (!fs.existsSync(pendingFile)) {
  console.error(`Error: Pending request file not found: ${pendingFile}`);
  process.exit(1);
}

const request = JSON.parse(fs.readFileSync(pendingFile, 'utf8'));
const agentId = request.agentId || 'unified';

console.log(`\nSending response for request: ${requestId}`);
console.log(`Agent: ${agentId}\n`);

// Connect to WebSocket server
const ws = new WebSocket(WS_URL);

ws.on('open', () => {
  console.log('✓ Connected to WebSocket server');

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
    console.log('✓ Registered as claude-cli\n');

    // Send streaming response
    console.log('Streaming response...');

    // Start streaming
    ws.send(JSON.stringify({
      type: 'response_start',
      agentId,
      requestId,
      timestamp: new Date().toISOString()
    }));

    // Split into chunks for streaming effect
    const chunks = responseText.split('\n\n');
    let fullContent = '';

    chunks.forEach((chunk, index) => {
      setTimeout(() => {
        const chunkText = chunk + '\n\n';
        fullContent += chunkText;

        // Send chunk
        ws.send(JSON.stringify({
          type: 'response_chunk',
          agentId,
          requestId,
          content: chunkText,
          timestamp: new Date().toISOString()
        }));

        console.log(`  Chunk ${index + 1}/${chunks.length} sent`);

        // Send end on last chunk
        if (index === chunks.length - 1) {
          setTimeout(() => {
            ws.send(JSON.stringify({
              type: 'response_end',
              agentId,
              requestId,
              fullContent: fullContent.trim(),
              timestamp: new Date().toISOString()
            }));

            console.log('\n✓ Response complete!');

            // Delete pending file
            if (fs.existsSync(pendingFile)) {
              fs.unlinkSync(pendingFile);
              console.log(`✓ Cleaned up: ${requestId}.json`);
            }

            // Close connection
            setTimeout(() => {
              ws.close();
              process.exit(0);
            }, 500);
          }, 200);
        }
      }, index * 400); // 400ms delay between chunks
    });
  }
});

ws.on('error', (error) => {
  console.error('WebSocket error:', error.message);
  process.exit(1);
});

ws.on('close', () => {
  console.log('\nWebSocket connection closed');
});
