#!/usr/bin/env node

/**
 * Claude Code WebSocket Listener
 *
 * This script runs as a background daemon that:
 * 1. Connects to the WebSocket server
 * 2. Listens for incoming chat messages from the UI
 * 3. Writes pending messages to data/.pending/ for Claude Code to process
 * 4. Provides an API for Claude Code to send responses back
 */

require('dotenv').config();
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const quickQuery = require('./quick-query');
const responseGenerator = require('./response-generator');
const skillsManager = require('./skills-manager');
const skillExecutor = require('./skill-executor');
const contextBuilder = require('./context-builder');

const WS_URL = process.env.WS_URL || 'ws://localhost:8765';
const DATA_DIR = path.join(__dirname, '..', 'data');
const PENDING_DIR = path.join(DATA_DIR, '.pending');

// Ensure pending directory exists
if (!fs.existsSync(PENDING_DIR)) {
  fs.mkdirSync(PENDING_DIR, { recursive: true });
}

// Initialize cache system for fast queries
let cacheReady = false;
let skillsReady = false;
let pendingMessages = []; // Queue for messages received before systems are ready

// Initialize cache and skills systems
Promise.all([
  quickQuery.initialize(),
  skillsManager.initialize()
]).then(() => {
  cacheReady = true;
  skillsReady = true;
  console.log('[ws-listener] ✓ Fast cache system ready');
  console.log('[ws-listener] ✓ Skills manager ready');

  // Process any pending messages that arrived before systems were ready
  if (pendingMessages.length > 0) {
    console.log(`[ws-listener] Processing ${pendingMessages.length} queued messages...`);
    pendingMessages.forEach(msg => processMessage(msg));
    pendingMessages = [];
  }
}).catch(err => {
  console.error('[ws-listener] System initialization failed:', err.message);
  // Still mark as ready to allow basic responses
  cacheReady = true;
  skillsReady = true;
});

let ws = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_DELAY = 2000;

// Store active requests
const activeRequests = new Map();

/**
 * Connect to WebSocket server
 */
function connect() {
  console.log(`[Claude Code Listener] Connecting to ${WS_URL}...`);

  try {
    ws = new WebSocket(WS_URL);
  } catch (err) {
    console.error('[Claude Code Listener] Failed to create WebSocket:', err.message);
    scheduleReconnect();
    return;
  }

  ws.on('open', () => {
    console.log('[Claude Code Listener] Connected to WebSocket server');
    reconnectAttempts = 0;

    // Register as Claude CLI client
    ws.send(JSON.stringify({
      type: 'register',
      clientType: 'claude-cli',
      timestamp: new Date().toISOString()
    }));
  });

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log('[DEBUG] Received message type:', message.type);
      handleMessage(message);
    } catch (error) {
      console.error('[Claude Code Listener] Failed to parse message:', error);
    }
  });

  ws.on('close', () => {
    console.log('[Claude Code Listener] Connection closed');
    scheduleReconnect();
  });

  ws.on('error', (error) => {
    // Only log if there's an actual message
    if (error && (error.message || error.code)) {
      console.error('[Claude Code Listener] WebSocket error:', error.message || error.code);
    }
    // Error will trigger close event, which handles reconnect
  });
}

/**
 * Schedule a reconnection attempt
 */
function scheduleReconnect() {
  if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
    reconnectAttempts++;
    const delay = RECONNECT_DELAY * Math.pow(2, Math.min(reconnectAttempts - 1, 4)); // Cap at 32 seconds
    console.log(`[Claude Code Listener] Reconnecting in ${delay}ms (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
    setTimeout(connect, delay);
  } else {
    console.error('[Claude Code Listener] Max reconnection attempts reached. Exiting.');
    process.exit(1);
  }
}

/**
 * Handle incoming WebSocket messages
 */
function handleMessage(message) {
  switch (message.type) {
    case 'registered':
      console.log('[Claude Code Listener] Successfully registered as claude-cli');
      break;

    case 'chat':
      // New message from UI
      handleIncomingChat(message);
      break;

    case 'typing':
      // UI is typing (can be logged or ignored)
      console.log(`[Claude Code Listener] UI is ${message.isTyping ? 'typing' : 'stopped typing'}...`);
      break;

    case 'status':
      console.log(`[Claude Code Listener] Status: ${message.content}`);
      break;

    case 'error':
      console.error(`[Claude Code Listener] Error: ${message.content}`);
      break;

    default:
      console.log(`[Claude Code Listener] Unknown message type: ${message.type}`);
  }
}

/**
 * Handle incoming chat message from UI
 *
 * CLAUDE CODE AS BRAIN:
 * - Messages are received and processed immediately
 * - Claude Code (running in terminal) IS the AI intelligence
 * - Uses cached context + skills for responses
 * - Claude Code can see all messages and handle complex operations
 */
async function handleIncomingChat(message) {
  const { agentId, content, requestId, timestamp } = message;

  // Store request for response tracking
  activeRequests.set(requestId, {
    agentId,
    content,
    timestamp: new Date()
  });

  // Write to pending directory (for tracking)
  const pendingFile = path.join(PENDING_DIR, `${requestId}.json`);
  fs.writeFileSync(pendingFile, JSON.stringify({
    id: requestId,
    agentId,
    content,
    timestamp,
    status: 'pending'
  }, null, 2));

  // Log for Claude Code to see
  console.log(`\n[CHAT] ${agentId}: "${content}"`);

  // Check if systems are ready
  if (!cacheReady || !skillsReady) {
    console.log(`[ws-listener] Systems not ready, queuing message...`);
    pendingMessages.push({ agentId, content, requestId });
    return;
  }

  // Process message with smart responses
  processMessage({ agentId, content, requestId });
}

/**
 * Process a message and generate response
 *
 * CLAUDE CODE AS BRAIN:
 * - Uses cached context (profile, challenges, tasks, progress)
 * - Matches skills for structured operations
 * - Generates intelligent responses using context
 * - Handles web searches when requested
 * - Claude Code sees all activity and can handle complex operations
 */
async function processMessage({ agentId, content, requestId }) {
  const request = activeRequests.get(requestId);
  if (!request) {
    console.error(`[Claude Code] No active request found for ${requestId}`);
    return;
  }

  try {
    const startTime = Date.now();
    const profileId = quickQuery.getFirstProfileId();

    // Build context from cached data
    const context = contextBuilder.buildContext(profileId);
    console.log(`[Claude Code] Context: ${contextBuilder.formatContextSummary(context)}`);

    let responseText;
    let skillUsed = null;

    // Check for web search intent FIRST (before skills)
    const webSearchIntent = responseGenerator.detectWebSearchRequest(content);
    if (webSearchIntent) {
      console.log(`[Claude Code] Web search detected: "${webSearchIntent.query}"`);
      skillUsed = 'web-search';

      // Perform web search (async operation)
      responseText = await responseGenerator.generateWebSearchResponse(webSearchIntent.query);

      const queryTime = Date.now() - startTime;
      console.log(`[Claude Code] Web search completed in ${queryTime}ms`);

      streamResponse(requestId, responseText, { skillUsed });
      return;
    }

    // Check for skill match (structured operations)
    const matchedSkill = skillsManager.matchSkill(content, agentId);
    if (matchedSkill) {
      skillUsed = matchedSkill.id;
      console.log(`[Claude Code] Matched skill: ${matchedSkill.id}`);

      // EXECUTE SKILL by reading SKILL.md and following instructions
      console.log(`[Claude Code] Executing skill from SKILL.md: ${matchedSkill.id}`);

      // Send skill_start notification to UI
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'skill_start',
          agentId: request.agentId,
          requestId,
          skillId: matchedSkill.id,
          skillName: matchedSkill.name,
          timestamp: new Date().toISOString()
        }));
      }

      // Execute the skill
      const skillResult = await skillExecutor.executeSkill(matchedSkill, content, context);

      // Send skill_complete notification
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'skill_complete',
          agentId: request.agentId,
          requestId,
          skillId: matchedSkill.id,
          success: skillResult.success,
          actions: skillResult.actions,
          dataUpdated: skillResult.dataUpdated,
          timestamp: new Date().toISOString()
        }));
      }

      responseText = skillResult.response;

      const queryTime = Date.now() - startTime;
      console.log(`[Claude Code] Skill executed in ${queryTime}ms (${skillResult.actions?.length || 0} actions)`);

      streamResponse(requestId, responseText, { skillUsed, actions: skillResult.actions });
      return;
    }

    // Generate response based on agent and context (no skill matched)
    if (agentId === 'unified') {
      responseText = responseGenerator.generateUnifiedResponse(content);
    } else {
      if (!profileId) {
        streamResponse(requestId, `No profile found. Please set up your profile in Settings first.`);
        return;
      }
      responseText = responseGenerator.generateResponse(profileId, content, agentId);
    }

    const queryTime = Date.now() - startTime;
    console.log(`[Claude Code] Response generated in ${queryTime}ms${skillUsed ? ` (skill: ${skillUsed})` : ''}`);

    streamResponse(requestId, responseText, { skillUsed });

  } catch (error) {
    console.error(`[Claude Code] Error:`, error.message);
    streamResponse(requestId, `I encountered an issue. Let me help you with that differently.`);
  }
}

/**
 * Stream response back to UI in chunks
 * @param {string} requestId - Request ID
 * @param {string} responseText - Response content
 * @param {Object} metadata - Optional metadata (skillUsed, etc.)
 */
function streamResponse(requestId, responseText, metadata = {}) {
  const request = activeRequests.get(requestId);
  if (!request || !ws || ws.readyState !== WebSocket.OPEN) {
    console.error(`[Auto-Response] Cannot send response - connection issue`);
    return;
  }

  const { skillUsed } = metadata;

  // Send response_start with skill metadata
  ws.send(JSON.stringify({
    type: 'response_start',
    agentId: request.agentId,
    requestId,
    skillUsed: skillUsed || null,
    timestamp: new Date().toISOString()
  }));

  // Split into chunks and send with small delays for streaming effect
  const chunks = responseText.split('\n\n');
  let fullContent = '';
  let chunkIndex = 0;

  const sendNextChunk = () => {
    if (chunkIndex < chunks.length) {
      const chunkText = chunks[chunkIndex] + (chunkIndex < chunks.length - 1 ? '\n\n' : '');
      fullContent += chunkText;

      ws.send(JSON.stringify({
        type: 'response_chunk',
        agentId: request.agentId,
        requestId,
        content: chunkText,
        timestamp: new Date().toISOString()
      }));

      chunkIndex++;
      setTimeout(sendNextChunk, 100); // Small delay for streaming effect
    } else {
      // Send response_end with skill metadata
      ws.send(JSON.stringify({
        type: 'response_end',
        agentId: request.agentId,
        requestId,
        fullContent: fullContent.trim(),
        skillUsed: skillUsed || null,
        timestamp: new Date().toISOString()
      }));

      console.log(`[Auto-Response] Response sent successfully!${skillUsed ? ` (skill: ${skillUsed})` : ''}`);

      // Clean up
      activeRequests.delete(requestId);
      const pendingFile = path.join(PENDING_DIR, `${requestId}.json`);
      if (fs.existsSync(pendingFile)) {
        fs.unlinkSync(pendingFile);
      }
    }
  };

  sendNextChunk();
}

/**
 * Send a response chunk to the UI
 *
 * @param {string} requestId - The request ID to respond to
 * @param {string} content - The response content chunk
 * @param {boolean} isStart - Whether this is the start of the response
 * @param {boolean} isEnd - Whether this is the end of the response
 * @param {string} fullContent - Full content (only for isEnd=true)
 */
function sendResponseChunk(requestId, content, isStart = false, isEnd = false, fullContent = null) {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.error('[Claude Code Listener] WebSocket not connected. Cannot send response.');
    return false;
  }

  const request = activeRequests.get(requestId);
  if (!request) {
    console.error(`[Claude Code Listener] No active request found for ${requestId}`);
    return false;
  }

  try {
    if (isStart) {
      ws.send(JSON.stringify({
        type: 'response_start',
        agentId: request.agentId,
        requestId,
        timestamp: new Date().toISOString()
      }));
      console.log(`[Claude Code Listener] Started streaming response for ${requestId}`);
    }

    if (content) {
      ws.send(JSON.stringify({
        type: 'response_chunk',
        agentId: request.agentId,
        requestId,
        content,
        timestamp: new Date().toISOString()
      }));
    }

    if (isEnd) {
      ws.send(JSON.stringify({
        type: 'response_end',
        agentId: request.agentId,
        requestId,
        fullContent,
        timestamp: new Date().toISOString()
      }));
      console.log(`[Claude Code Listener] Finished streaming response for ${requestId}`);

      // Clean up
      activeRequests.delete(requestId);
      const pendingFile = path.join(PENDING_DIR, `${requestId}.json`);
      if (fs.existsSync(pendingFile)) {
        fs.unlinkSync(pendingFile);
      }
    }

    return true;
  } catch (error) {
    console.error('[Claude Code Listener] Error sending response:', error);
    return false;
  }
}

/**
 * Send a complete response (non-streaming)
 *
 * @param {string} requestId - The request ID to respond to
 * @param {string} content - The full response content
 */
function sendResponse(requestId, content) {
  const request = activeRequests.get(requestId);
  if (!request) {
    console.error(`[Claude Code Listener] No active request found for ${requestId}`);
    return false;
  }

  // Send as streaming: start -> chunk -> end
  sendResponseChunk(requestId, null, true, false);
  sendResponseChunk(requestId, content, false, false);
  sendResponseChunk(requestId, null, false, true, content);

  return true;
}

/**
 * Get list of pending messages
 */
function getPendingMessages() {
  const files = fs.readdirSync(PENDING_DIR).filter(f => f.endsWith('.json'));
  return files.map(f => {
    const filePath = path.join(PENDING_DIR, f);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return data;
  });
}

// Export API for Claude Code to use
module.exports = {
  sendResponse,
  sendResponseChunk,
  getPendingMessages,
  activeRequests,
  // Export quick query functions for instant data access
  query: quickQuery,
  getCacheStats: () => quickQuery.getCacheStats(),
  // Export skills manager for skill queries
  skills: skillsManager,
  getSkillStats: () => ({
    skills: skillsManager.getAllSkills().length,
    commands: skillsManager.getAllCommands().length
  }),
  // Export skill executor for direct skill execution
  skillExecutor,
  executeSkill: skillExecutor.executeSkill,
  getAllSkillsWithContent: skillExecutor.getAllSkillsWithContent,
};

// Start the listener if run directly
if (require.main === module) {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║      Claude Code WebSocket Listener - Running...          ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log(`Pending directory: ${PENDING_DIR}`);
  console.log(`WebSocket URL: ${WS_URL}\n`);

  connect();

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\n[Claude Code Listener] Shutting down...');
    if (ws) {
      ws.close();
    }
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n\n[Claude Code Listener] Shutting down...');
    if (ws) {
      ws.close();
    }
    process.exit(0);
  });
}
