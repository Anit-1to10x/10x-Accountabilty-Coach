# OpenAnalyst + Claude Code Integration Guide

## Problem You're Facing

You have **two terminals** but Claude Code (Terminal 2) doesn't know what to do. It's not automatically responding to OpenAnalyst messages.

## Why This Happens

The system has **automatic response handling** built-in (`ws-listener.js` and `claude-responder.js`), but the `claude-responder.js` approach spawns a new Claude CLI process for each message, which:
- ❌ Doesn't preserve conversation context
- ❌ Is slow (new process each time)
- ❌ Doesn't use full Claude Code capabilities

## The Better Solution: Manual Claude Code Integration

### How It Should Work

**Terminal 1: Run the App**
```bash
npm start
```

This automatically starts:
- ✅ WebSocket Server (ws://localhost:8765)
- ✅ ws-listener (auto-responder for basic queries)
- ✅ Next.js UI (http://localhost:3000)
- ⚠️ claude-responder (NOT recommended - we'll disable this)

**Terminal 2: Run Claude Code (THE BRAIN)**
```bash
claude
```

Then in the Claude Code CLI, say:
```
I want you to continuously watch for OpenAnalyst messages and respond to them. Here's how:

1. Check for JSON files in data/.pending/ directory
2. When you find a pending message:
   - Read the user's message from the JSON file
   - Load context from data/profiles/{userId}/ (profile.md, challenges, todos)
   - Generate an intelligent, personalized response
   - Send the response back using the send-response-fast.js script
3. Continue monitoring for new messages

Let me know when you're ready to start watching.
```

### What Claude Code Will Do

When you give it this instruction, Claude Code will:
1. Set up a file watcher on `data/.pending/`
2. Process messages with FULL context awareness
3. Use all Claude Code capabilities (file editing, web search, etc.)
4. Send responses back to the UI via WebSocket
5. Maintain conversation context across messages

### Responding to Messages

When a message comes in, Claude Code should:

1. **Read the pending message**:
```javascript
// Example: data/.pending/abc123.json
{
  "id": "abc123",
  "agentId": "unified",
  "content": "Check my progress",
  "timestamp": "..."
}
```

2. **Load user context** from `data/profiles/{userId}/`:
   - profile.md (user info, goals)
   - challenges/ (active challenges)
   - todos/ (current tasks)
   - checkins/ (recent check-ins)

3. **Generate response** using full Claude capabilities

4. **Send response**:
```bash
node send-response-fast.js abc123
```

This script will:
- Read the pending message
- Stream your response back to the UI
- Delete the pending file
- User sees the response in real-time

## Better Approach: Disable claude-responder.js

Since you want to use Claude Code manually for full capabilities, let's disable the automated responder:

### Option A: Temporary Disable (for this session)

In Terminal 1, instead of `npm start`, run:
```bash
# Start WebSocket server
node server/websocket.js &

# Start ws-listener (handles message routing)
node lib/ws-listener.js &

# Start UI
cd ui && npm run dev
```

Then in Terminal 2:
```bash
claude
# Tell it to watch for messages
```

### Option B: Permanent Change (update start script)

Edit `scripts/start-all.js` to comment out the claude-responder:

```javascript
// Step 4: Start Claude Code Brain (THE AI)
// await startClaudeResponder();  // COMMENTED OUT - using manual Claude Code instead
```

Then you can use `npm start` in Terminal 1 and `claude` in Terminal 2.

## Quick Test

1. Start the app (`npm start` in Terminal 1)
2. Start Claude Code (`claude` in Terminal 2)
3. In Claude Code, say: "Watch for OpenAnalyst messages and respond"
4. Open http://localhost:3000
5. Send a message in the chat
6. Claude Code should detect the pending message and respond

## Using SDK Integration (Advanced)

If you want to build a custom integration using the Claude Agent SDK:

```javascript
// custom-brain.js
const { Claude } = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');

const PENDING_DIR = path.join(__dirname, 'data', '.pending');

// Watch for messages
fs.watch(PENDING_DIR, async (eventType, filename) => {
  if (filename.endsWith('.json')) {
    const msg = JSON.parse(fs.readFileSync(path.join(PENDING_DIR, filename)));

    // Load context
    const context = loadUserContext(msg.agentId);

    // Generate response using Claude
    const response = await generateResponse(msg.content, context);

    // Send back to UI
    sendResponse(msg.id, msg.agentId, response);
  }
});
```

But the manual `claude` command is simpler and gives you full control!

## Summary

**Recommended Setup:**

- **Terminal 1**: `npm start` (with claude-responder disabled)
- **Terminal 2**: `claude` → "Watch for OpenAnalyst messages"

This gives you:
- ✅ Full Claude Code capabilities
- ✅ Conversation context preserved
- ✅ File modification abilities
- ✅ Web search when needed
- ✅ Intelligent, context-aware responses
- ✅ Real AI brain, not mock responses

The automated responder (`claude-responder.js`) is a fallback for users without Claude Code access, but since you want to use Claude Code's full power, the manual approach is better.
