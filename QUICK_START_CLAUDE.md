# Quick Start: OpenAnalyst + Claude Code

## The 2-Terminal Setup

### Terminal 1: Start the App
```bash
cd C:\Users\Anit\Downloads\Agentic_Skills-main
npm start
```

Wait for this message:
```
╔══════════════════════════════════════════════════════════════╗
║                  YOUR APP IS READY!                          ║
║               Open: http://localhost:3000                    ║
╚══════════════════════════════════════════════════════════════╝
```

### Terminal 2: Run Claude Code (THE BRAIN)

**Step 1:** Open a second terminal and run:
```bash
claude
```

**Step 2:** Paste this exact prompt into Claude Code:
```
Read and execute: node claude-watch.js

This shows you pending messages and user context. Then set up continuous watching for new messages in data/.pending/ and respond to them using: node send-response-fast.js <requestId>
```

**That's it!** Claude Code will now:
- ✅ Watch for messages from the UI
- ✅ Load user context automatically
- ✅ Generate intelligent responses
- ✅ Send responses back to UI in real-time

## What You'll See

### In Terminal 1 (App):
```
[ws-listener] ✓ Fast cache system ready
[ws-listener] ✓ Skills manager ready
[CHAT] unified: "Check my progress"
```

### In Terminal 2 (Claude Code):
```
📬 1 pending message(s):
  Request ID: abc123
  Content: "Check my progress"

👤 User Context (anit-gmail-co):
  ✓ Profile loaded
  ✓ 2 active challenge(s)
  ✓ 3 pending task(s) today
```

Claude Code will automatically respond with personalized coaching!

## Testing

1. Open http://localhost:3000 in your browser
2. Type a message: "Check my progress"
3. Watch Claude Code detect it in Terminal 2
4. See the personalized response appear in the UI

## Troubleshooting

**Claude Code not detecting messages?**
- Make sure you ran the prompt in Terminal 2
- Check that `data/.pending/` directory exists
- Try `node claude-watch.js` manually to see pending messages

**Ports already in use?**
```bash
netstat -ano | findstr ":8765 :3000"
taskkill /F /PID <pid>
npm start
```

## Advanced: Using Claude Agent SDK

If you want to build a custom integration instead:

```javascript
// custom-integration.js
const fs = require('fs');
const path = require('path');

const PENDING_DIR = path.join(__dirname, 'data', '.pending');

fs.watch(PENDING_DIR, async (eventType, filename) => {
  if (filename?.endsWith('.json')) {
    // Message received!
    const msgPath = path.join(PENDING_DIR, filename);
    const msg = JSON.parse(fs.readFileSync(msgPath, 'utf8'));

    // Your custom logic here...
    console.log('New message:', msg.content);

    // Respond using:
    // node send-response-fast.js <msg.id>
  }
});
```

But the manual `claude` approach is simpler and gives you full AI capabilities!

## Why 2 Terminals?

- **Terminal 1 (npm start)**: Runs the web app, WebSocket server, and message routing
- **Terminal 2 (claude)**: Runs Claude Code with full AI capabilities to respond to messages

This gives you the **full power of Claude Code** instead of basic scripted responses:
- ✅ Context-aware coaching
- ✅ Web search when needed
- ✅ File modifications
- ✅ Complex reasoning
- ✅ Conversation memory

## Need Help?

See detailed documentation:
- [CLAUDE.md](./CLAUDE.md) - Full architecture and how it works
- [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) - Detailed integration options
