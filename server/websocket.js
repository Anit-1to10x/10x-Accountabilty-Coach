const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const PORT = 8765;
// Use data/ folder in project directory instead of ~/.openanalyst/
const DATA_DIR = path.join(__dirname, '..', 'data');

// Create WebSocket server
const wss = new WebSocket.Server({ port: PORT });

console.log(`🚀 WebSocket server started on ws://localhost:${PORT}`);

// Store connected clients by type
const clients = {
  ui: new Set(),
  'claude-cli': new Set(),
  unknown: new Set()
};

// Message queue for when Claude Code is offline
const messageQueue = [];

// Send message to specific client types
function sendToClients(clientType, message, excludeClient = null) {
  const messageStr = JSON.stringify(message);
  clients[clientType].forEach(client => {
    if (client !== excludeClient && client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  });
}

// Broadcast to all connected clients
function broadcast(message, excludeClient = null) {
  const messageStr = JSON.stringify(message);
  wss.clients.forEach(client => {
    if (client !== excludeClient && client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  });
}

// Queue message for Claude Code if offline
function queueOrSend(message) {
  if (clients['claude-cli'].size === 0) {
    console.log('📥 Claude Code offline, queueing message');
    messageQueue.push(message);
  } else {
    sendToClients('claude-cli', message);
  }
}

// Flush queued messages to Claude Code
function flushQueue() {
  if (messageQueue.length > 0 && clients['claude-cli'].size > 0) {
    console.log(`📤 Flushing ${messageQueue.length} queued messages to Claude Code`);
    messageQueue.forEach(msg => sendToClients('claude-cli', msg));
    messageQueue.length = 0;
  }
}

// Handle new connections
wss.on('connection', (ws) => {
  const clientId = Date.now().toString();
  let clientType = 'unknown';

  // Add to unknown initially
  clients.unknown.add(ws);
  ws.clientId = clientId;
  ws.clientType = clientType;

  console.log(`✅ Client connected: ${clientId} (awaiting registration)`);

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'status',
    content: 'Connected to OpenAnalyst WebSocket server. Please register your client type.',
    timestamp: new Date().toISOString()
  }));

  // Handle incoming messages
  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log(`📨 Received from ${ws.clientType}:`, message.type);

      // Handle different message types
      switch (message.type) {
        case 'register':
          // Client registering its type
          handleClientRegistration(ws, message);
          break;

        case 'chat':
          // Route based on sender
          if (ws.clientType === 'ui') {
            // UI sent message → forward to Claude Code
            handleUIMessage(message, ws);
          } else {
            console.log('⚠️ Only UI clients can send chat messages');
          }
          break;

        case 'response_start':
        case 'response_chunk':
        case 'response_end':
          // Claude Code sending response → forward to UI
          if (ws.clientType === 'claude-cli') {
            sendToClients('ui', message);
            // Also save to chat file when response ends
            if (message.type === 'response_end' && message.fullContent) {
              saveChatMessage(message.agentId, {
                role: 'assistant',
                content: message.fullContent,
                timestamp: new Date().toISOString()
              });
            }
          }
          break;

        case 'file_update':
          handleFileUpdate(message);
          break;

        case 'typing':
          // Forward typing indicators
          if (ws.clientType === 'ui') {
            sendToClients('claude-cli', message);
          } else if (ws.clientType === 'claude-cli') {
            sendToClients('ui', message);
          }
          break;

        case 'ping':
          ws.send(JSON.stringify({
            type: 'pong',
            timestamp: new Date().toISOString()
          }));
          break;

        default:
          console.log(`⚠️ Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error('❌ Error handling message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        content: error.message,
        timestamp: new Date().toISOString()
      }));
    }
  });

  // Handle client disconnect
  ws.on('close', () => {
    // Remove from appropriate set
    clients[ws.clientType].delete(ws);
    console.log(`👋 ${ws.clientType} client disconnected: ${clientId}`);
    console.log(`   UI clients: ${clients.ui.size}, Claude CLI clients: ${clients['claude-cli'].size}`);
  });

  // Handle errors
  ws.on('error', (error) => {
    console.error(`❌ WebSocket error for client ${clientId}:`, error);
  });
});

// Handle client registration
function handleClientRegistration(ws, message) {
  const { clientType } = message;

  if (clientType === 'ui' || clientType === 'claude-cli') {
    // Move from unknown to appropriate set
    clients.unknown.delete(ws);
    clients[clientType].add(ws);
    ws.clientType = clientType;

    console.log(`✅ Client registered as: ${clientType} (${ws.clientId})`);
    console.log(`   UI clients: ${clients.ui.size}, Claude CLI clients: ${clients['claude-cli'].size}`);

    ws.send(JSON.stringify({
      type: 'registered',
      clientType,
      timestamp: new Date().toISOString()
    }));

    // If Claude Code just connected, flush queued messages
    if (clientType === 'claude-cli') {
      flushQueue();
    }
  } else {
    ws.send(JSON.stringify({
      type: 'error',
      content: 'Invalid client type. Must be "ui" or "claude-cli"',
      timestamp: new Date().toISOString()
    }));
  }
}

// Handle message from UI
function handleUIMessage(message, ws) {
  const { agentId, content, requestId } = message;

  console.log(`💬 UI message for ${agentId}: "${content.substring(0, 50)}..."`);

  // Save user message to chat file
  saveChatMessage(agentId, {
    role: 'user',
    content,
    timestamp: new Date().toISOString()
  });

  // Forward to Claude Code (or queue if offline)
  queueOrSend({
    type: 'chat',
    agentId,
    content,
    requestId,
    timestamp: new Date().toISOString(),
    data: message.data
  });
}

// Handle file updates
function handleFileUpdate(message) {
  console.log(`📁 File update: ${message.path}`);

  // Broadcast file update to all clients
  broadcast({
    type: 'file_update',
    path: message.path,
    content: message.content,
    timestamp: new Date().toISOString()
  });
}

// Save chat message to file
function saveChatMessage(agentId, message) {
  const today = new Date().toISOString().split('T')[0];
  const chatsDir = path.join(DATA_DIR, 'chats', today);

  if (!fs.existsSync(chatsDir)) {
    fs.mkdirSync(chatsDir, { recursive: true });
  }

  const chatFile = path.join(chatsDir, `${agentId}.md`);
  const timestamp = new Date().toLocaleString();
  const roleLabel = message.role === 'user' ? '**You**' : '**Assistant**';

  const entry = `\n\n## ${roleLabel} - ${timestamp}\n\n${message.content}\n\n---`;

  fs.appendFileSync(chatFile, entry);
}

// Handle server errors
wss.on('error', (error) => {
  console.error('❌ WebSocket server error:', error);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down WebSocket server...');
  wss.close(() => {
    console.log('✅ WebSocket server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down WebSocket server...');
  wss.close(() => {
    console.log('✅ WebSocket server closed');
    process.exit(0);
  });
});

console.log('📡 WebSocket server is ready for connections');
console.log('   Listening on ws://localhost:8765');
console.log('   Press Ctrl+C to stop\n');
