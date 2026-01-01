# WebSocket Integration Guide

## Overview

OpenAnalyst uses **WebSocket** for real-time communication between the web UI and Claude Code CLI. Claude Code acts as the backend "brain" that processes all user requests, reads/writes files, and generates responses.

## Architecture

```
┌─────────────────┐         WebSocket          ┌──────────────────┐
│   Web UI        │ ◄─────────────────────────► │  Claude Code CLI │
│  (Next.js)      │    ws://localhost:8765      │   (WebSocket)    │
└─────────────────┘                             └──────────────────┘
        │                                                 │
        │ HTTP (file operations)                         │ File I/O
        ▼                                                 ▼
┌─────────────────┐                             ┌──────────────────┐
│   Next.js API   │                             │  ~/.openanalyst/ │
│    Routes       │                             │   (Data files)   │
└─────────────────┘                             └──────────────────┘
```

### Communication Flow

1. **User sends message** in the UI
2. **UI saves to chat file** via HTTP POST to `/api/chat` (for persistence)
3. **UI sends to Claude Code** via WebSocket
4. **Claude Code processes** the message
5. **Claude Code streams response** back via WebSocket
6. **UI displays response** in real-time
7. **Claude Code writes files** as needed (plan.md, progress.md, etc.)

## WebSocket Message Protocol

### Client → Server (UI → Claude Code)

```json
{
  "type": "chat",
  "agentId": "accountability-coach",
  "content": "Create a challenge for learning Python",
  "requestId": "req-1234567890-abc123",
  "timestamp": "2025-12-27T10:30:00Z",
  "data": {
    "attachments": ["path/to/file.png"]
  }
}
```

### Server → Client (Claude Code → UI)

**Response Start:**
```json
{
  "type": "response_start",
  "requestId": "req-1234567890-abc123",
  "agentId": "accountability-coach",
  "timestamp": "2025-12-27T10:30:01Z"
}
```

**Response Chunk (Streaming):**
```json
{
  "type": "response_chunk",
  "requestId": "req-1234567890-abc123",
  "content": "I'd love to help you create a Python learning challenge! ",
  "timestamp": "2025-12-27T10:30:01Z"
}
```

**Response End:**
```json
{
  "type": "response_end",
  "requestId": "req-1234567890-abc123",
  "timestamp": "2025-12-27T10:30:05Z"
}
```

**Error:**
```json
{
  "type": "error",
  "requestId": "req-1234567890-abc123",
  "content": "Error message here",
  "timestamp": "2025-12-27T10:30:02Z"
}
```

**File Update (Proactive):**
```json
{
  "type": "file_update",
  "data": {
    "path": "challenges/python-learning/plan.md",
    "action": "created" | "updated" | "deleted"
  },
  "timestamp": "2025-12-27T10:30:03Z"
}
```

**Typing Indicator:**
```json
{
  "type": "typing",
  "agentId": "accountability-coach",
  "timestamp": "2025-12-27T10:30:01Z"
}
```

## User Workflow

### 1. Download Template
```bash
git clone <repo>
cd "OpenAnalyst Accountability coach"
```

### 2. Start Claude Code (The Brain)
```bash
claude-code
```

Claude Code will:
- Start a WebSocket server on `ws://localhost:8765`
- Watch `~/.openanalyst/` directory for file changes
- Process all user messages and generate intelligent responses
- Read and write files as needed

### 3. Start the Web UI
```bash
cd ui
npm install
npm run dev
```

UI runs on `http://localhost:3000` and connects to Claude Code's WebSocket server.

## Implementation Details

### Client-Side (UI)

**WebSocket Client:** [`ui/lib/websocket.ts`](ui/lib/websocket.ts)
- Singleton WebSocket connection manager
- Automatic reconnection with exponential backoff
- Request/response correlation via `requestId`
- Streaming response handling

**Chat Store:** [`ui/lib/store.ts`](ui/lib/store.ts)
- Sends user messages via WebSocket
- Listens for streaming responses
- Updates UI in real-time
- Still saves to markdown files for persistence

**WebSocket Manager:** [`ui/components/websocket/WebSocketManager.tsx`](ui/components/websocket/WebSocketManager.tsx)
- Auto-connects on app load
- Shows connection status indicator
- Handles reconnection attempts

### Server-Side (Claude Code CLI)

Claude Code should implement a WebSocket server that:

1. **Listens on port 8765** (configurable via environment variable)
2. **Handles incoming chat messages:**
   - Parse the message content
   - Read user profile and context from `~/.openanalyst/`
   - Generate intelligent response
   - Stream response back in chunks
3. **Watches file system:**
   - Monitor `~/.openanalyst/` for changes
   - Send `file_update` messages when files change
4. **Manages file operations:**
   - Create/update challenges
   - Generate plans
   - Track progress
   - Update todos

## Configuration

### Environment Variables

**UI (`.env.local`):**
```bash
NEXT_PUBLIC_WS_URL=ws://localhost:8765
```

**Claude Code CLI:**
```bash
WEBSOCKET_PORT=8765
OPENANALYST_DIR=~/.openanalyst
```

### Custom WebSocket URL

You can override the WebSocket URL in the browser console:
```javascript
window.__CLAUDE_WS_URL__ = 'ws://localhost:8765'
```

## Error Handling

### Connection Failures

If the WebSocket connection fails:
1. UI shows "Claude Code Disconnected" indicator
2. User messages are still saved to files
3. UI prompts user to start Claude Code CLI
4. Automatic reconnection attempts (max 5 times)

### Message Timeouts

If Claude Code doesn't respond within 2 minutes:
- Request is rejected with timeout error
- UI shows error message
- User can retry the message

## Testing the Integration

### 1. Start Claude Code with WebSocket Support

```bash
# Claude Code should start WebSocket server automatically
claude-code
```

Expected output:
```
✓ Reading ARCHITECTURE_INDEX.md
✓ Watching ~/.openanalyst/
✓ WebSocket server listening on ws://localhost:8765
✓ Ready to assist!
```

### 2. Start the UI

```bash
cd ui
npm run dev
```

### 3. Test Connection

Open the browser console and check for:
```
[WebSocket] Connected to Claude Code
```

### 4. Send a Test Message

In the UI chat, type:
```
Hello! Create a test challenge for me.
```

You should see:
1. User message appears immediately
2. Typing indicator shows
3. Claude Code response streams in character by character
4. Response completes
5. Challenge files are created in `~/.openanalyst/challenges/`

## File Operations

Even with WebSocket, the UI still uses HTTP APIs for file operations:

- **Read files:** `GET /api/files?path=...`
- **Write files:** `PUT /api/files`
- **List challenges:** `GET /api/challenges`
- **Create challenge:** `POST /api/challenges`

This separation allows:
- WebSocket for real-time chat
- HTTP for reliable file operations
- Claude Code to directly modify files via file system

## Benefits of WebSocket Architecture

1. **Real-time streaming responses** - See Claude Code's response as it types
2. **Bidirectional communication** - Claude Code can proactively notify UI of file changes
3. **Lower latency** - No HTTP overhead for each message
4. **Connection state** - Know when Claude Code is connected/disconnected
5. **True integration** - Claude Code IS the backend, not a proxy to another API

## Debugging

### Check WebSocket Connection

Browser console:
```javascript
// Get WebSocket client
const ws = window.__wsClient__

// Check status
ws.getStatus() // 'connected' | 'connecting' | 'disconnected'

// Test send
ws.sendChatMessage('accountability-coach', 'Hello!')
```

### Enable WebSocket Logging

In [`ui/lib/websocket.ts`](ui/lib/websocket.ts), all WebSocket events are logged to console:
- `[WebSocket] Connected to Claude Code`
- `[WebSocket] Connection closed`
- `[WebSocket] Reconnecting...`

### Claude Code Logs

Claude Code should log:
- Incoming WebSocket connections
- Received messages
- Sent responses
- File operations

## Future Enhancements

1. **File watchers via WebSocket** - UI auto-refreshes when Claude Code modifies files
2. **Progress notifications** - Claude Code sends progress updates during long operations
3. **Multiple agents** - Support multiple WebSocket connections for different agents
4. **Compression** - Use WebSocket compression for large messages
5. **Authentication** - Add token-based auth for multi-user scenarios

---

## Summary

The WebSocket integration transforms OpenAnalyst into a **true AI-native application** where:

- **No external APIs** - Everything happens locally
- **No SDK calls** - Claude Code CLI handles all AI logic
- **Real-time interaction** - Streaming responses, instant feedback
- **File-based data** - All data in `~/.openanalyst/` for transparency
- **Claude Code as the brain** - The CLI orchestrates everything

This is exactly the architecture you requested: **User downloads template → Starts Claude Code → Starts UI → Claude Code is the brain that communicates via WebSocket**.
