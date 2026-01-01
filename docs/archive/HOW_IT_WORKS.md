# 🧠 How OpenAnalyst Works with Claude Code

## Architecture Overview

OpenAnalyst is a **WebSocket-based application** where **Claude Code IS the brain**. The web UI communicates with Claude Code CLI via WebSocket for real-time chat, while all data is stored in local files. There are NO external API calls, no SDK dependencies - Claude Code handles everything.

---

## 🚀 User Workflow

### Step 1: Download Template
```bash
git clone <repo>
cd "OpenAnalyst Accountability coach"
```

### Step 2: Start Claude Code (The Brain)
```bash
claude-code
```

Claude Code will:
- Read `ARCHITECTURE_INDEX.md` to understand the system
- Start a WebSocket server on `ws://localhost:8765`
- Watch `~/.openanalyst/` for all file changes
- Process user messages and stream responses via WebSocket
- Read and write files as needed

### Step 3: Start the UI
```bash
cd ui
npm install
npm run dev
```

UI runs on `http://localhost:3000`

---

## 🔄 How Communication Works

### User Sends Message

**UI Action:**
```
User types: "Create a challenge for learning Python"
```

**What Happens:**
1. UI saves to `~/.openanalyst/chats/{date}/{agentId}.md` (for persistence):
```markdown
## 10:30 AM
**User:** Create a challenge for learning Python
```

2. UI sends via WebSocket to Claude Code:
```json
{
  "type": "chat",
  "agentId": "accountability-coach",
  "content": "Create a challenge for learning Python",
  "requestId": "req-1234567890-abc",
  "timestamp": "2025-12-27T10:30:00Z"
}
```

3. UI shows typing indicator while waiting for response

### Claude Code Responds

**Claude Code receives** the WebSocket message.

**Claude Code reads context:**
- User's message from WebSocket
- User's profile from `~/.openanalyst/profile/profile.md`
- Existing challenges from `~/.openanalyst/challenges/`
- Agent capabilities from `~/.openanalyst/agents.json`

**Claude Code streams response** back via WebSocket:

1. Start response:
```json
{
  "type": "response_start",
  "requestId": "req-1234567890-abc"
}
```

2. Stream chunks:
```json
{
  "type": "response_chunk",
  "requestId": "req-1234567890-abc",
  "content": "I'd love to help you "
}
```

```json
{
  "type": "response_chunk",
  "requestId": "req-1234567890-abc",
  "content": "create a Python learning challenge! "
}
```

3. End response:
```json
{
  "type": "response_end",
  "requestId": "req-1234567890-abc"
}
```

**Claude Code also writes** to chat file for persistence:
```markdown
## 10:30 AM
**User:** Create a challenge for learning Python

**Assistant:** I'd love to help you create a Python learning challenge! Let me ask you a few questions:

1. How many hours per day can you dedicate to learning Python?
2. What's your target date to become proficient?
3. Do you have any prior programming experience?

Let's design a personalized plan together!
```

### UI Shows Response

**UI receives** WebSocket chunks and displays them in real-time, creating a streaming effect as Claude Code types.

---

## 📁 File Structure

```
~/.openanalyst/
├── chats/                   # Chat history (persisted)
│   └── {YYYY-MM-DD}/
│       └── {agentId}.md     # Markdown chat log
│
├── challenges/              # Challenge data
│   └── {challenge-id}/
│       ├── challenge-config.json
│       ├── plan.md          # Claude Code generates this
│       ├── activity-log.md  # Claude Code updates this
│       ├── progress.md      # Claude Code tracks milestones
│       ├── backlog.md       # Claude Code manages tasks
│       └── punishment.json
│
├── profile/
│   ├── profile.md           # User info
│   └── preferences.md
│
└── agents.json              # Agent configurations
```

**Note:** With WebSocket integration, `.requests/` and `.responses/` folders are no longer needed. All real-time communication happens via WebSocket, while files are used for persistence.

---

## 🎯 Examples of Claude Code Operations

### Example 1: User Creates Challenge

**UI writes:** `~/.openanalyst/.requests/create-challenge-1234.json`
```json
{
  "type": "create_challenge",
  "data": {
    "name": "Master Python",
    "goal": "Become proficient in Python for data science",
    "dailyHours": 2,
    "targetDate": "2026-03-27"
  },
  "status": "pending"
}
```

**Claude Code:**
1. Reads the request
2. Creates folder: `~/.openanalyst/challenges/python-learning-2025/`
3. Generates `plan.md` based on the goal
4. Creates all 6 challenge files
5. Updates `challenges.json` registry
6. Writes response: `~/.openanalyst/.responses/create-challenge-1234.json`

### Example 2: User Checks In

**UI writes:** `~/.openanalyst/.requests/check-in-5678.json`
```json
{
  "type": "check_in",
  "challengeId": "python-learning-2025",
  "data": {
    "timeSpent": "2 hours",
    "completed": ["Read Python basics", "Solved 10 exercises"],
    "mood": "motivated"
  },
  "status": "pending"
}
```

**Claude Code:**
1. Reads check-in data
2. Updates `activity-log.md` with today's entry
3. Updates streak in `.registry/challenges.json`
4. Checks if punishment should trigger
5. Updates `progress.md` if milestones achieved
6. Responds with encouragement in chat

### Example 3: User Asks to Update Plan

**UI writes:** `~/.openanalyst/.requests/update-plan-9999.json`
```json
{
  "type": "update_plan",
  "challengeId": "python-learning-2025",
  "message": "I'm falling behind, can you adjust the plan to be more realistic?",
  "status": "pending"
}
```

**Claude Code:**
1. Reads current `plan.md`
2. Reads `activity-log.md` to see progress
3. Regenerates `plan.md` with adjusted timeline
4. Updates `backlog.md` to reflect new priorities
5. Responds in chat explaining changes

---

## 🔧 UI Implementation Changes Needed

### Current (WRONG):
UI calls API routes that try to use Claude SDK ❌

### Correct (FILE-BASED):
UI writes files and watches for changes ✅

### Chat Component Update:
```typescript
// OLD (Wrong)
const sendMessage = async (message: string) => {
  const response = await fetch('/api/chat', {
    method: 'POST',
    body: JSON.stringify({ message })
  })
  const data = await response.json()
  // Waiting for API response
}

// NEW (Correct)
const sendMessage = async (message: string) => {
  const requestId = `chat-${Date.now()}`

  // 1. Write user message to chat file
  await fetch('/api/files/write', {
    method: 'POST',
    body: JSON.stringify({
      path: `~/.openanalyst/chats/${today}/${agentId}.md`,
      append: true,
      content: `## ${time}\n**User:** ${message}\n\n**Status:** pending\n\n`
    })
  })

  // 2. Create request for Claude Code
  await fetch('/api/files/write', {
    method: 'POST',
    body: JSON.stringify({
      path: `~/.openanalyst/.requests/${requestId}.json`,
      content: JSON.stringify({
        type: 'chat',
        agentId,
        message,
        timestamp: new Date().toISOString(),
        status: 'pending'
      })
    })
  })

  // 3. Watch for Claude's response
  watchFile(`~/.openanalyst/chats/${today}/${agentId}.md`, (content) => {
    // Update UI when Claude writes response
    updateMessages(content)
  })
}
```

---

## 📝 What Needs to Change

### 1. Remove All API Calls to Claude
- ❌ No `@anthropic-ai/sdk`
- ❌ No Gemini API calls
- ❌ No external AI services

### 2. Add File Watcher API
Create: `ui/app/api/files/watch/route.ts`
- Watches `~/.openanalyst/` for changes
- Returns updates via Server-Sent Events (SSE)

### 3. Add File Read/Write API
Create: `ui/app/api/files/route.ts`
- GET: Read any file in `~/.openanalyst/`
- POST: Write to any file in `~/.openanalyst/`
- PUT: Append to file
- DELETE: Delete file

### 4. Update All UI Components
- Chat → writes to `.requests/`, watches chat files
- Challenge creation → writes request, watches for created challenge
- Plan updates → writes request, watches plan.md
- Check-ins → writes to activity-log.md directly

---

## 🎯 Claude Code's Responsibilities

Claude Code watches and responds to:

1. **`.requests/chat-*.json`** → Responds in chat files
2. **`.requests/create-challenge-*.json`** → Creates challenge with all 6 files
3. **`.requests/update-plan-*.json`** → Regenerates plan.md
4. **`.requests/check-in-*.json`** → Updates activity log & streak
5. **Daily at midnight** → Checks for missed check-ins, triggers punishments
6. **When backlog.md changes** → Adjusts plan.md if needed
7. **When user edits plan.md** → Updates backlog.md to match

---

## 🚀 Final User Experience

```bash
# Terminal 1: Start Claude Code (the brain)
cd "OpenAnalyst Accountability coach"
claude-code

# Claude Code output:
# ✓ Reading ARCHITECTURE_INDEX.md
# ✓ Watching ~/.openanalyst/
# ✓ Ready to assist!

# Terminal 2: Start UI
cd ui
npm run dev

# Browser: http://localhost:3000
# User interacts → Files change → Claude responds → UI updates
```

---

This is a **pure file-based system** where Claude Code IS the intelligence layer, not an API! 🧠
