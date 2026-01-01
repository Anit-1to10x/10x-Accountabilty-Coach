# Claude Code Brain Integration

## How It Works

**Claude Code (running in your terminal) IS the brain of OpenAnalyst.**

### Architecture

```
User types in UI
    ↓
WebSocket Server (localhost:8765)
    ↓
Message saved to data/.pending/
    ↓
Claude Code (YOU) sees it via hook
    ↓
Claude Code processes & responds
    ↓
Response sent back to UI via WebSocket
    ↓
User sees personalized response
```

## Setup

### 1. Terminal Setup

**Terminal 1:** Run the app
```bash
npm start
```

**Terminal 2:** Run Claude Code
```bash
claude
```

### 2. How Claude Code Responds

When a user sends a message in the UI, Claude Code automatically:

1. **Detects the message** via the `tool-use` hook
2. **Reads the message** from `data/.pending/`
3. **Builds context** (user profile, challenges, tasks)
4. **Generates response** using Claude's intelligence
5. **Sends response** back to UI

### 3. Manual Check for Messages

You can manually check for pending messages:

```bash
node lib/claude-brain.js
```

This shows:
- Number of pending messages
- Message content
- Request IDs
- Timestamps

## Responding to Messages

### Option 1: Automatic (Recommended)

Claude Code will automatically see new messages via hooks and can respond directly.

Just tell Claude Code:
```
"Check for pending messages and respond to them"
```

### Option 2: Programmatic

```javascript
const claudeBrain = require('./lib/claude-brain');

// Get pending messages
const messages = await claudeBrain.getPendingMessages();

// Process first message
const msg = messages[0];
await claudeBrain.markProcessing(msg.id);

// Generate response (Claude Code does this intelligently)
const response = "Your personalized response here...";

// Send back to UI
await claudeBrain.sendResponse(msg.id, response, {
  processed_by: 'claude-code',
  context_used: ['profile', 'challenges', 'tasks']
});

// Clean up
await claudeBrain.cleanupMessage(msg.id);
```

## Context Available to Claude Code

When responding, Claude Code has access to:

### User Profile
```
data/profiles/{user-id}/profile.md
```

### Active Challenges
```
data/profiles/{user-id}/challenges/
```

### Tasks & Todos
```
data/profiles/{user-id}/todos/
```

### Recent Check-ins
```
data/profiles/{user-id}/checkins/
```

### Chat History
```
data/profiles/{user-id}/chats/
```

## Skills Integration

Claude Code can:
- Match incoming messages to skills
- Execute skill logic
- Modify files as needed
- Track progress
- Update schedules

All skill definitions are in:
```
skills/*/SKILL.md
```

## Example Flow

### User asks: "How's my progress?"

1. **Message arrives** in `data/.pending/req-1234567890.json`
   ```json
   {
     "message": "How's my progress?",
     "agentId": "unified",
     "timestamp": 1735689123456
   }
   ```

2. **Claude Code sees it** (via hook or manual check)

3. **Claude Code reads context:**
   - Profile: Anit, learning Agentic Analysis Skills
   - Challenge: Day 5/30, 5-day streak
   - Tasks: 3 pending, 7 completed today

4. **Claude Code generates response:**
   ```
   Great question, Anit! Here's your progress:

   🎯 Challenge: Agentic Analysis Skills
   📅 Day 5 of 30 (5-day streak!)
   ✅ Completed 7 tasks today
   ⏳ 3 tasks pending

   You're on fire! Keep up the momentum! 🔥
   ```

5. **Response sent to UI** - User sees it instantly

## File Operations

Claude Code can:

### Create Files
```javascript
// Create new challenge
fs.writeFile('data/challenges/new-challenge/challenge.md', content);
```

### Update Files
```javascript
// Mark task complete
const tasks = fs.readFile('data/todos/active.md');
// ... modify ...
fs.writeFile('data/todos/active.md', updated);
```

### Track Progress
```javascript
// Update streak
const progress = JSON.parse(fs.readFile('data/progress.json'));
progress.streak++;
fs.writeFile('data/progress.json', JSON.stringify(progress));
```

## Benefits

✅ **No External APIs** - Everything runs locally
✅ **Real Intelligence** - Claude Code's full capabilities
✅ **File Access** - Can read/write any project file
✅ **Context-Aware** - Knows user's full history
✅ **Skill Execution** - Can run any skill logic
✅ **Fast** - No network latency
✅ **Secure** - All data stays local

## Troubleshooting

### Messages not showing up?

Check if WebSocket is running:
```bash
netstat -ano | findstr ":8765"
```

### Hook not firing?

Check hook permissions:
```bash
chmod +x .claude/hooks/tool-use.sh
```

### Manual processing:

```bash
node lib/claude-brain.js
```

Then in Claude Code:
```
"Read the pending message and send a response"
```

## Next Steps

Once this is working, Claude Code becomes the actual brain:
- Responds to every chat message
- Manages user progress
- Creates challenges
- Tracks habits
- Provides coaching

**No mock APIs, no fake responses - just real Claude Code intelligence!**