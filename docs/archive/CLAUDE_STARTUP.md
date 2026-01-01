# OpenAnalyst Startup Instructions

This file tells Claude Code what to do when the user says "start my app".

---

## When User Says "Start My App"

Follow these steps in order:

### Step 1: Check Dependencies

Check if `ui/node_modules` exists. If not, install dependencies:

```bash
cd ui && npm install
```

### Step 2: Start the Servers

Start both servers in the background:

1. **WebSocket Bridge** (for Claude Code ↔ UI communication):
   ```bash
   node server/websocket-bridge.js
   ```

2. **Next.js UI Server**:
   ```bash
   cd ui && npm run dev
   ```

Wait about 5-8 seconds for servers to start.

### Step 3: Confirm Ready

Tell the user:

```
✅ OpenAnalyst is ready!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👉 Open http://localhost:3000 in your browser
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

I'm now listening for your messages from the app.
Chat with me there and I'll help you stay accountable!

Your active challenges:
[List challenges from data/challenges/]
```

### Step 4: Enter Listening Mode

Watch for messages in `data/.inbox/pending.json`. When a message arrives:

1. Read the message content
2. Read context from `data/` folder:
   - Active challenges: `data/challenges/*/challenge-config.json`
   - Today's todos: Check `data/challenges/*/daily/day-{N}.json`
   - User profile: `data/profile/profile.json`
3. Process and generate response
4. Write response to `data/.inbox/response-{requestId}.json`

---

## Agent & Skills System

When responding to user messages, follow these instructions based on the active agent:

### Reading Agent Instructions

1. **Identify the active agent** from the message's `agentId`
2. **Read the agent's instruction file**: `data/agents/{agentId}/agent.md`
3. **Read the assigned skills** listed in the agent.md file
4. **Load each skill's instructions**: `skills/{skill-id}/SKILL.md`
5. **Combine all instructions** with your main system prompt

### Agent File Structure

Each agent has:
```
data/agents/{agent-id}/
├── agent.md          # Main instructions (YOU READ THIS)
├── agent.json        # Metadata
└── workspace/        # Agent's working files
```

### Skills Library

All skills are in `skills/` folder:
```
skills/
├── streak/           # Universal challenge tracker
├── daily-checkin/    # Check-in flows
├── motivation/       # Motivational messages
├── punishment/       # Accountability consequences
├── skill-writer/     # Create new skills
└── ...
```

Each skill has:
```
skills/{skill-id}/
├── SKILL.md          # Skill instructions (YOU READ THIS)
├── references/       # Supporting docs
└── templates/        # File templates
```

### Processing Flow

When a message arrives:
1. Read agent.md for the specified agentId
2. Parse "Assigned Skills" section to get skill list
3. Read each skill's SKILL.md file
4. Follow combined instructions to respond
5. Update relevant files in `data/` based on actions taken

---

## Data Locations

All data lives in the `data/` folder:

| Data | Location |
|------|----------|
| Challenges | `data/challenges/` |
| Today's Todos | `data/challenges/{id}/daily/day-{N}.json` |
| Active Todos | `data/todos/active.json` |
| User Profile | `data/profile/profile.json` |
| Agents List | `data/agents.json` |
| Agent Instructions | `data/agents/{id}/agent.md` |
| Agent Metadata | `data/agents/{id}/agent.json` |
| Skills Library | `skills/` (at project root) |
| Chat History | `data/chats/{date}/{agentId}.md` |
| Message Inbox | `data/.inbox/` |

---

## Handling User Messages from UI

### "Create a new challenge"
1. Ask for challenge details (name, type, duration, goal)
2. Create folder in `data/challenges/{id}/`
3. Generate 30-day plan with daily todos
4. Create all files: challenge-config.json, plan.md, daily/*.json, streak.json, progress.json

### "Check in for today"
1. Read current challenge from `data/challenges/`
2. Mark today's todos as complete in `daily/day-{N}.json`
3. Update `streak.json` (increment current streak)
4. Update `progress.json` (increment daysCompleted)
5. Give encouragement and show tomorrow's preview

### "What's my plan?"
1. Read `data/challenges/{activeChallenge}/plan.md`
2. Summarize the overall plan
3. Show current day and remaining days

### "Show my progress"
1. Read `data/challenges/{activeChallenge}/progress.json`
2. Read `data/challenges/{activeChallenge}/streak.json`
3. Show: days completed, streak, todos done, % complete

### "What are today's todos?"
1. Determine current day number from challenge start date
2. Read `data/challenges/{activeChallenge}/daily/day-{N}.json`
3. List todos with their durations and status

---

## Challenge Folder Structure

Each challenge in `data/challenges/` follows this structure:

```
data/challenges/{challenge-id}/
├── challenge-config.json    # Challenge metadata
├── plan.md                  # Full plan document
├── streak.json             # Streak tracking
├── progress.json           # Progress stats
├── quick-wins.md           # Milestones and achievements
├── daily/                  # Day-by-day breakdown
│   ├── day-01.json
│   ├── day-02.json
│   └── ... (one for each day)
└── projects/               # Any projects to build
```

---

## WebSocket Message Format

Messages from UI arrive in `data/.inbox/pending.json`:

```json
{
  "type": "chat",
  "agentId": "accountability-coach",
  "content": "User's message here",
  "requestId": "req-123456789",
  "timestamp": "2025-12-28T10:00:00Z"
}
```

Write responses to `data/.inbox/response-{requestId}.json`:

```json
{
  "type": "chunk",
  "content": "Response text..."
}
```

Then signal completion:

```json
{
  "type": "end"
}
```

---

## Quick Reference

- **UI URL**: http://localhost:3000
- **WebSocket Port**: 8765
- **Data Folder**: `./data/`
- **Inbox**: `./data/.inbox/`
