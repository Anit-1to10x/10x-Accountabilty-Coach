#!/usr/bin/env node
/**
 * Fast Response Generator using Cache System
 *
 * This script demonstrates how to use the quick query API
 * to generate instant responses without reading files.
 */

const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const quickQuery = require('./lib/quick-query');
const responseGenerator = require('./lib/response-generator');

// Configuration
const WS_URL = 'ws://localhost:8765';
const PENDING_DIR = path.join(__dirname, 'data', '.pending');

// Get request ID from command line
const requestId = process.argv[2];
if (!requestId) {
  console.error('Usage: node send-response-fast.js <requestId>');
  process.exit(1);
}

// Main function
async function main() {
  // Initialize cache system
  console.log('Initializing fast cache system...');
  await quickQuery.initialize();
  console.log('✓ Cache ready\n');

  // Read the pending request
  const pendingFile = path.join(PENDING_DIR, `${requestId}.json`);
  if (!fs.existsSync(pendingFile)) {
    console.error(`Error: Pending request file not found: ${requestId}.json`);
    process.exit(1);
  }

  const request = JSON.parse(fs.readFileSync(pendingFile, 'utf8'));
  const { agentId, content, timestamp } = request;

  // Extract profile ID from request (if available in metadata or localStorage)
  // For now, we'll use the first profile found
  const cacheStats = quickQuery.getCacheStats();
  const profileId = Array.from(cacheStats.totalEntries.profiles || [])[0] || 'anit-gmail-co';

  console.log(`Processing request: ${requestId}`);
  console.log(`Agent: ${agentId}`);
  console.log(`Content: ${content}`);
  console.log(`Profile: ${profileId}\n`);

  // Generate response using cached data (INSTANT!)
  const startTime = Date.now();
  const response = responseGenerator.generateResponse(profileId, content);
  const queryTime = Date.now() - startTime;

  console.log(`✓ Response generated in ${queryTime}ms (cache-powered!)\n`);

  // Send response via WebSocket
  await sendResponse(requestId, agentId, response);

  // Show cache stats
  console.log('\nCache Performance:');
  const stats = quickQuery.getCacheStats();
  console.log(`  Hit Rate: ${(stats.hitRate * 100).toFixed(1)}%`);
  console.log(`  Total Hits: ${stats.hits}`);
  console.log(`  Total Misses: ${stats.misses}`);

  // Cleanup
  quickQuery.shutdown();
  process.exit(0);
}

/**
 * Send response via WebSocket
 */
function sendResponse(requestId, agentId, responseText) {
  return new Promise((resolve, reject) => {
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
        console.log('Streaming response to UI...');

        // Send streaming response
        ws.send(JSON.stringify({
          type: 'response_start',
          agentId,
          requestId,
          timestamp: new Date().toISOString()
        }));

        // Split into chunks
        const chunks = responseText.split('\n\n');
        let fullContent = '';

        chunks.forEach((chunk, index) => {
          setTimeout(() => {
            const chunkText = chunk + '\n\n';
            fullContent += chunkText;

            ws.send(JSON.stringify({
              type: 'response_chunk',
              agentId,
              requestId,
              content: chunkText,
              timestamp: new Date().toISOString()
            }));

            console.log(`  Chunk ${index + 1}/${chunks.length} sent`);

            if (index === chunks.length - 1) {
              setTimeout(() => {
                ws.send(JSON.stringify({
                  type: 'response_end',
                  agentId,
                  requestId,
                  fullContent: fullContent.trim(),
                  timestamp: new Date().toISOString()
                }));

                console.log('✓ Response complete!');

                // Delete pending file
                const pendingFile = path.join(PENDING_DIR, `${requestId}.json`);
                if (fs.existsSync(pendingFile)) {
                  fs.unlinkSync(pendingFile);
                }

                ws.close();
                resolve();
              }, 200);
            }
          }, index * 300);
        });
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error.message);
      reject(error);
    });
  });
}

// Run main
main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
