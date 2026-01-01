# 🧠 Claude Code Integration - THE BRAIN

## Overview

**This app is powered by the Claude Code SDK.** Claude Code runs in a separate terminal and acts as THE BRAIN - monitoring messages, reading user context, and generating intelligent responses.

---

## Why Claude Code?

### Without Claude Code:
- ❌ Basic auto-responses
- ❌ No context awareness
- ❌ Generic, template-based replies
- ❌ No file modifications
- ❌ Limited intelligence

### With Claude Code:
- ✅ **Real AI intelligence**
- ✅ **Full context awareness** (reads user profile, challenges, tasks)
- ✅ **Personalized responses** (uses your name, streak, goals)
- ✅ **File modifications** (creates check-ins, updates progress)
- ✅ **Memory** (remembers your history)
- ✅ **Adaptive coaching** (adjusts based on your progress)

---

## Two Terminal Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Terminal 1: App Infrastructure                              │
│  $ npm start                                                  │
│                                                              │
│  Runs:                                                       │
│  • WebSocket Server (ws://localhost:8765)                    │
│  • Next.js UI (http://localhost:3000)                        │
│  • Basic auto-responder (fallback mode)                      │
│  • Fast cache system                                         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Terminal 2: Claude Code - THE BRAIN                         │
│  $ claude                                                     │
│                                                              │
│  Then: "Watch for OpenAnalyst messages and respond"          │
│                                                              │
│  Claude Code:                                                │
│  • Monitors data/.pending/ for new messages                  │
│  • Reads user profile, challenges, tasks, check-ins          │
│  • Builds complete user context                              │
│  • Generates intelligent, personalized responses             │
│  • Modifies files (check-ins, progress, tasks)               │
│  • Sends responses via WebSocket → UI                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Message Flow

### Step 1: User Types Message

User types in the UI: **"How's my progress today?"**

```
UI → WebSocket → Saved to data/.pending/req-123.json
```

**File created:**
```json
{
  "requestId": "req-1735689600000",
  "message": "How's my progress today?",
  "agentId": "accountability-coach",
  "timestamp": 1735689600000
}
```

---

### Step 2: Claude Code Detects Message

Claude Code monitors `data/.pending/` and detects the new file.

```javascript
// lib/claude-brain.js
const messages = await getPendingMessages();
// Returns: [{ id: "req-123", message: "How's my progress today?" }]
```

---

### Step 3: Claude Code Builds Context

Claude Code reads user data:

```javascript
const context = await buildContext('anit-gmail-co');

// Returns:
{
  profile: {
    name: "Anit",
    email: "anit.c@1to10x.com",
    goals: ["Build accountability system", "Ship daily"]
  },
  challenges: [
    {
      id: "build-openanalyst",
      name: "Build OpenAnalyst",
      streak: 5,
      status: "active",
      startDate: "2026-01-01"
    }
  ],
  tasks: {
    pending: 3,
    completedToday: 2,
    total: 15
  },
  recentCheckins: [
    { date: "2026-01-01", mood: 4, tasks: 3 },
    { date: "2025-12-31", mood: 5, tasks: 2 }
  ]
}
```

**Files read:**
- `data/profiles/anit-gmail-co/profile.md`
- `data/challenges/build-openanalyst/challenge.md`
- `data/profiles/anit-gmail-co/todos/active.md`
- `data/profiles/anit-gmail-co/checkins/2026-01-01.md`

---

### Step 4: Claude Code Generates Response

Using the context, Claude Code generates a personalized response:

```
Hey Anit! You're crushing it today! 🔥

Build OpenAnalyst - Day 5
Current streak: 5 days

Today's progress:
✓ Completed 2 tasks
• 3 tasks pending

You've been consistent for 5 days straight. That's amazing momentum!

The 3 pending tasks for today:
1. Fix dependency installation
2. Update documentation
3. Test integration

Want to knock out one more before end of day?
```

---

### Step 5: Claude Code Sends Response

```javascript
await sendResponse(requestId, response, {
  agentId: "accountability-coach",
  contextUsed: ["profile", "challenges", "tasks", "checkins"],
  actions: ["read profile", "read challenges", "read tasks"]
});
```

Response sent via WebSocket → User sees it in UI in real-time.

---

### Step 6: Claude Code Modifies Files (If Needed)

If the user checks in, Claude Code can modify files:

**User:** "I completed 2 more tasks!"

**Claude Code:**
1. Updates `data/profiles/anit-gmail-co/todos/active.md` (marks tasks complete)
2. Creates/updates `data/profiles/anit-gmail-co/checkins/2026-01-01.md`
3. Updates `data/challenges/build-openanalyst/plan.md`
4. Logs to `data/profiles/anit-gmail-co/activity-log.md`

---

## How to Run Claude Code

### Installation

```bash
# Install Claude Code globally
npm install -g @anthropic-ai/claude-code

# Or visit: https://docs.anthropic.com/claude/docs/claude-code
```

### Start Claude Code

```bash
# Terminal 2
claude
```

### Tell Claude Code What to Do

```
You: "Watch for OpenAnalyst messages and respond to users"
```

Claude Code will:
1. Read `CLAUDE.md` to understand the architecture
2. Load `lib/claude-brain.js` module
3. Start monitoring `data/.pending/`
4. Respond to all incoming messages

---

## What Claude Code Can Access

### Read Access:
- ✅ `data/profiles/{user-id}/profile.md` - User profile
- ✅ `data/challenges/{id}/challenge.md` - Challenge details
- ✅ `data/challenges/{id}/days/*.md` - Daily progress
- ✅ `data/profiles/{user-id}/todos/*.md` - Task lists
- ✅ `data/profiles/{user-id}/checkins/*.md` - Check-in history
- ✅ `data/profiles/{user-id}/progress.md` - Statistics
- ✅ `data/profiles/{user-id}/activity-log.md` - Action history

### Write Access:
- ✅ `data/profiles/{user-id}/checkins/*.md` - Create new check-ins
- ✅ `data/profiles/{user-id}/todos/*.md` - Update task status
- ✅ `data/profiles/{user-id}/progress.md` - Update stats
- ✅ `data/profiles/{user-id}/activity-log.md` - Log actions
- ✅ `data/challenges/{id}/plan.md` - Update challenge plan
- ✅ `data/challenges/{id}/days/*.md` - Update daily progress

---

## Claude Code Integration Files

### Core Integration:
1. **[lib/claude-brain.js](lib/claude-brain.js)** - Main interface
   - `getPendingMessages()` - Check for new messages
   - `buildContext(userId)` - Load user data
   - `sendResponse(requestId, response)` - Send to UI
   - `markProcessed(requestId)` - Clean up processed messages

2. **[CLAUDE.md](CLAUDE.md)** - Architecture documentation
   - Explains the two-terminal setup
   - Message flow diagrams
   - File structure
   - Quick start guide

3. **[.claude/BRAIN_INTEGRATION.md](.claude/BRAIN_INTEGRATION.md)** - Integration guide
   - Detailed implementation guide
   - API reference
   - Usage examples

### Helper Modules:
4. **[lib/skills-manager.js](lib/skills-manager.js)** - Skills system
   - Load and match skills
   - Generate skill-based responses

5. **[lib/quick-query.js](lib/quick-query.js)** - Fast cache
   - 0-2ms data queries
   - In-memory caching

6. **[lib/ws-listener.js](lib/ws-listener.js)** - WebSocket listener
   - Monitors WebSocket for messages
   - Routes to appropriate handler

---

## Example: Claude Code Session

```bash
$ claude

Claude Code v1.0.0

You: Watch for OpenAnalyst messages and respond to users

Claude: I'll monitor the data/.pending/ directory for incoming messages
from the OpenAnalyst app and respond intelligently.

Let me check the architecture... *reads CLAUDE.md*

Architecture understood:
- User types in UI → Saved to data/.pending/
- I read the message + user context
- Generate personalized response
- Send via WebSocket → UI

Starting monitoring now...

[11:30:45 AM] New message detected: req-1735689645000
[11:30:45 AM] User: anit-gmail-co
[11:30:45 AM] Message: "How's my progress today?"
[11:30:45 AM] Loading context...
[11:30:45 AM] ✓ Profile loaded (Anit)
[11:30:45 AM] ✓ Challenges loaded (1 active)
[11:30:45 AM] ✓ Tasks loaded (3 pending)
[11:30:45 AM] Generating response...
[11:30:46 AM] ✓ Response sent via WebSocket
[11:30:46 AM] ✓ Message marked as processed

Waiting for next message...
```

---

## Benefits of Claude Code

### 1. Context-Aware Intelligence
Claude Code has access to ALL user data:
- Knows your name, goals, preferences
- Tracks your streak, progress, history
- Remembers past conversations
- Adapts to your patterns

### 2. Real File Operations
Not just simulated - Claude Code actually:
- Creates check-in files
- Updates progress statistics
- Modifies task lists
- Logs all activities

### 3. Skills Integration
Claude Code can use 20+ skills:
- `/streak` - Check-in handling
- `/streak-new` - Challenge creation
- `daily-checkin` - Progress logging
- `motivation` - Personalized encouragement
- And more...

### 4. No External APIs
Everything runs locally:
- No API keys needed (except Gemini for image generation)
- No external services
- Full privacy
- Works offline

---

## Comparison

| Feature | Basic Auto-responder | Claude Code |
|---------|---------------------|-------------|
| Intelligence | Template responses | Real AI |
| Context | None | Full user context |
| Personalization | Generic | Uses your name, data |
| File Access | Read-only | Full read/write |
| Memory | None | Remembers everything |
| Learning | No | Adapts to you |
| Skills | Limited | 20+ skills |

---

## Summary

**Claude Code is THE BRAIN of this accountability system.**

**Without it:** You get a functional app with basic responses.

**With it:** You get a truly intelligent accountability coach that:
- Knows your goals and progress
- Remembers your history
- Provides personalized coaching
- Modifies your data
- Helps you stay accountable

**To activate Claude Code:**
1. Open Terminal 2
2. Run: `claude`
3. Tell it: "Watch for OpenAnalyst messages and respond to users"
4. Enjoy real AI accountability coaching!

---

**Claude Code transforms this from a todo app into an intelligent accountability partner.**
