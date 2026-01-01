# OpenAnalyst - Powered by Claude Code

## Architecture

**OpenAnalyst is the accountability coach app. Claude Code (running in terminal) IS the brain.**

```
User (OpenAnalyst UI) → WebSocket → data/.pending/ → Claude Code (YOU)
                                                          ↓
                                                  Read context, process
                                                          ↓
                                              Generate intelligent response
                                                          ↓
                                                  Send via WebSocket
                                                          ↓
                                              User sees personalized reply
```

Claude Code:
- **YOU** (Claude Code CLI running in terminal)
- Watches for messages in `data/.pending/`
- Reads user profile, challenges, tasks for context
- Generates intelligent responses using full Claude capabilities
- Modifies files (check-ins, progress, tasks) as needed
- **Real AI brain, not mock responses**

---

## Quick Start

### Terminal 1: Start the App
```bash
npm start
```

This starts:
- Next.js UI at http://localhost:3000
- WebSocket Server at ws://localhost:8765
- File watcher system

### Terminal 2: Run Claude Code (THE BRAIN)
```bash
claude
```

Then tell Claude Code:
```
"Watch for OpenAnalyst messages and respond to users"
```

Claude Code will automatically:
1. Detect messages from UI
2. Read user context
3. Generate personalized responses
4. Send back to UI
5. Update files as needed

If ports are busy:
```bash
netstat -ano | findstr ":8765 :3000"
taskkill /F /PID <pid1>
taskkill /F /PID <pid2>
npm start
```

---

## How It Works

### Message Flow

1. **User types in UI** → "Check my progress"
2. **WebSocket** → Routes to ws-listener
3. **Claude Code processes:**
   - Loads context (profile, challenges, tasks)
   - Matches skills (if applicable)
   - Generates intelligent response
4. **Response streams** → Back to UI in real-time
5. **User sees** → Personalized coach response

### What Claude Code Sees

```
[ws-listener] ✓ Fast cache system ready
[ws-listener] ✓ Skills manager ready
[CHAT] unified: "Check my progress"
[Claude Code] Context: Anit: 2 challenges, 3 pending tasks, 5 day streak
[Claude Code] Response generated in 2ms
```

---

## Cache System (0-2ms Access)

All user data is cached in RAM for instant access:

```javascript
const quickQuery = require('./lib/quick-query');

// Get profile (0ms)
quickQuery.getProfile('anit-gmail-co');

// Get today's tasks (0ms)
quickQuery.getTodaysTasks('anit-gmail-co');

// Get challenges (0ms)
quickQuery.getChallenges('anit-gmail-co');

// Get progress (0ms)
quickQuery.getProgressSummary('anit-gmail-co');
```

CLI:
```bash
npm run query tasks {profile-id}
npm run query progress {profile-id}
npm run query challenges {profile-id}
npm run query stats
```

---

## Skills System

20 skills + 6 commands for structured operations:

### Slash Commands
- `/streak` - Check in to challenge
- `/streak-new` - Create new challenge
- `/streak-list` - List all challenges
- `/streak-stats` - View statistics
- `/streak-switch` - Switch active challenge
- `/streak-insights` - Cross-challenge insights

### Skill Matching
When user says "check in" or "/streak", the system:
1. Matches the skill
2. Uses skill context for response
3. Handles the operation appropriately

---

## Data Structure

```
data/
├── profiles/{user-id}/
│   ├── profile.md
│   ├── challenges/
│   ├── todos/
│   ├── checkins/
│   └── chats/
├── challenges/{challenge-id}/
│   ├── challenge.md
│   └── days/
├── skills/          # Skill definitions
├── commands/        # Slash commands
└── .pending/        # Active requests
```

---

## What Claude Code Handles

### Auto-Handled (via ws-listener):
- Chat responses with context
- Skill matching and execution
- Progress queries
- Status updates

### Complex Operations (when needed):
- Plan generation
- Multi-file updates
- Data migration
- Challenge restructuring

---

## Response Generator

Uses context to generate personalized responses:

```javascript
const context = {
  profile: { name: 'Anit', ... },
  tasks: { pending: 3, completedToday: 5 },
  challenges: { active: 2, streak: 5 },
  progress: { ... }
};

// Response includes:
// - User's name
// - Current streak
// - Pending tasks
// - Active challenges
// - Personalized coaching
```

---

## Troubleshooting

### Cache Issues
```bash
npm run query stats
# If hit rate <80%, restart
npm start
```

### WebSocket Issues
```bash
netstat -ano | findstr ":8765 :3000"
taskkill /F /PID <pid1> && taskkill /F /PID <pid2>
npm start
```

### Check Logs
Look for:
- `[ws-listener] ✓ Fast cache system ready`
- `[ws-listener] ✓ Skills manager ready`
- `[CHAT] ...` messages

---

## Summary

**OpenAnalyst is the product. Claude Code is the brain.**

- User runs `npm start`
- Opens http://localhost:3000
- Types message in chat
- Claude Code automatically:
  - Sees the message
  - Loads user context
  - Matches skills
  - Generates intelligent response
  - Streams back to UI
- User sees personalized coach response

No external APIs. No manual intervention. Claude Code handles everything.
