# 10x Accountability Coach

**Powered by Claude Code** - Your Personal AI Accountability System with real-time intelligence, context-aware coaching, and file-based memory.

## 🧠 Architecture: Claude Code is THE BRAIN

This app uses the **Claude Code SDK** to power intelligent responses:

```
┌─────────────────────────────────────────────────────────────┐
│                    TWO TERMINAL SETUP                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Terminal 1: App Infrastructure (npm start)                  │
│  ├── WebSocket Server (ws://localhost:8765)                  │
│  ├── Next.js UI (http://localhost:3000)                      │
│  └── Auto-responder (basic mode)                             │
│                                                              │
│  Terminal 2: Claude Code - THE BRAIN (claude)                │
│  ├── Watches data/.pending/ for messages                     │
│  ├── Reads user profile, challenges, tasks                   │
│  ├── Generates intelligent, personalized responses           │
│  ├── Modifies files (check-ins, progress, tasks)             │
│  └── Sends responses via WebSocket → UI                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**With Claude Code running, you get REAL AI coaching, not mock responses.**

---

## Quick Start

### Terminal 1: Start the App (Zero Setup Required!)

```bash
npm start
```

The script automatically:
1. ✅ Checks and installs root dependencies (dotenv, ws)
2. ✅ Checks and installs UI dependencies (Next.js, React, etc.)
3. ✅ Starts WebSocket server (ws://localhost:8765)
4. ✅ Starts basic auto-responder
5. ✅ Starts Next.js UI (http://localhost:3000)
6. ✅ Initializes fast cache system

### Terminal 2: Start Claude Code - THE BRAIN (Recommended)

```bash
claude
```

Then tell Claude Code:
```
"Watch for 10x messages and respond to users"
```

**Claude Code will:**
- 🧠 Monitor `data/.pending/` for incoming messages
- 📖 Read user context (profile, challenges, tasks, history)
- 💬 Generate personalized, intelligent responses
- 📝 Modify files (check-ins, progress tracking, task updates)
- ⚡ Send responses back to UI in real-time

**Open http://localhost:3000** - Your AI accountability coach is ready!

### Optional: Manual Setup

If you prefer to install dependencies first:

```bash
# Install all dependencies
npm install

# Then start
npm start
```

### Environment Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Add your Gemini API key (for AI image generation):
   ```
   GEMINI_API_KEY=your_api_key_here
   ```

   Get your key from: https://makersuite.google.com/app/apikey

## Features

### Core Accountability
- **Chat-based Onboarding** - Conversational setup for new users
- **Challenge Management** - Create and track 30-day challenges with daily tasks
- **Daily Check-ins** - Mood tracking, wins/blockers, task completion
- **Streak Tracking** - Visual progress with milestones
- **Backlog Management** - Automatic detection of missed tasks with recovery options
- **Dynamic Prompts** - AI responds with context-aware templates

### Schedule & Planning
- **Calendar View** - Month/week/day views with challenge tasks
- **Auto-navigation** - Calendar jumps to challenge start date
- **Task Completion** - Mark tasks complete from Schedule, Streak, or Todos
- **Backlog Notifications** - Two options: Adjust Tomorrow or Regenerate Plan

### Real-time Chat
- **Streaming Responses** - Real-time AI responses via WebSocket
- **Unified Chat** - Access all data from one interface
- **Agent Chat** - Specialized agent conversations
- **Dynamic Prompts** - Context-aware response templates

### Workspace
- **File Browser** - View data folder structure
- **Skills Management** - Browse and manage skills
- **Prompts Library** - Dynamic and custom prompts

## Architecture

```
User (Browser) → WebSocket → data/.pending/ → Claude Code (Terminal 2)
                     ↓                              ↓
                localhost:3000              Reads: profile.md
                                                   challenges/
                                                   tasks/
                                                   ↓
                                            Generates response
                                                   ↓
                                            Writes: check-ins/
                                                   progress.md
                                                   ↓
                                            WebSocket → UI
```

**Key Components:**

1. **Claude Code SDK (Terminal 2)** - THE BRAIN
   - Monitors `data/.pending/` for user messages
   - Has full file system access to read/write user data
   - Generates intelligent, context-aware responses
   - No external APIs needed - runs locally in your terminal

2. **WebSocket Server** (ws://localhost:8765)
   - Real-time bidirectional communication
   - Routes messages between UI and Claude Code

3. **Next.js UI** (http://localhost:3000)
   - React-based frontend
   - Chat interface, Vision Boards, Schedule, Streak tracking

4. **Fast Cache System**
   - In-memory data store (0-2ms queries)
   - Quick access to profiles, challenges, tasks

5. **data/ folder** - File-based storage
   - User profiles, challenges, check-ins, tasks
   - Claude Code reads/writes directly to these files

## Data Structure

```
data/
├── profiles/                    # User-specific data
│   └── {user-id}/
│       ├── profile.md           # User profile
│       ├── availability.md      # Schedule preferences
│       ├── preferences.md       # Settings
│       ├── challenges/          # User's challenge progress
│       ├── chats/               # Chat history
│       ├── checkins/            # Daily check-ins
│       ├── todos/               # Tasks
│       └── visionboards/        # Vision boards
│
├── challenges/                  # Challenge templates & active challenges
│   └── {challenge-id}/
│       ├── challenge.md         # Challenge config
│       ├── plan.md              # Learning plan
│       └── days/                # Daily task files
│           ├── day-01.md
│           ├── day-02.md
│           └── ...
│
├── prompts/                     # Global dynamic prompts
│   ├── motivation.md
│   ├── morning-checkin.md
│   ├── evening-review.md
│   ├── stuck.md
│   ├── celebration.md
│   ├── accountability.md
│   └── planning.md
│
├── agents/                      # Agent configurations
├── chats/                       # Global chat history
├── checkins/                    # Check-in records
└── .cache-index.json            # Cache index
```

## Project Structure

```
openanalyst-accountability-coach/
├── ui/                          # Next.js frontend
│   ├── app/
│   │   ├── (shell)/             # Main app routes
│   │   │   ├── schedule/        # Calendar view
│   │   │   ├── streak/          # Challenge tracking
│   │   │   ├── todos/           # Task management
│   │   │   ├── prompts/         # Prompts library
│   │   │   ├── workspace/       # File browser
│   │   │   ├── skills/          # Skills management
│   │   │   ├── settings/        # User settings
│   │   │   └── help/            # Documentation
│   │   ├── api/                 # API routes
│   │   │   ├── chat/            # Chat endpoints
│   │   │   ├── challenges/      # Challenge CRUD
│   │   │   ├── checkin/         # Check-in endpoints
│   │   │   ├── todos/           # Task endpoints
│   │   │   ├── prompts/         # Prompts API
│   │   │   └── workspace/       # File browser API
│   │   └── onboarding/          # First-time setup
│   ├── components/
│   │   ├── chat/                # Chat components
│   │   ├── schedule/            # Calendar components
│   │   ├── checkin/             # Check-in modal
│   │   ├── backlog/             # Backlog notifications
│   │   └── shell/               # Layout components
│   └── lib/                     # Utilities & stores
│
├── lib/                         # Backend utilities
│   ├── cache-manager.js         # In-memory cache
│   ├── quick-query.js           # Fast data queries
│   ├── response-generator.js    # AI response generation
│   ├── prompts-manager.js       # Dynamic prompts
│   └── ws-listener.js           # WebSocket listener
│
├── server/                      # WebSocket server
│   └── websocket.js
│
├── scripts/                     # Startup scripts
│   └── start-all.js             # Main entry point
│
├── skills/                      # AI Skills
│   ├── streak/
│   ├── daily-checkin/
│   ├── motivation/
│   ├── excalidraw/
│   └── ...
│
├── commands/                    # Slash commands
│   ├── streak.md
│   ├── streak-new.md
│   └── ...
│
└── data/                        # User data (see above)
```

## Pages & Routes

| Route | Purpose |
|-------|---------|
| `/app` | Main chat interface |
| `/onboarding` | First-time setup |
| `/agent/[id]` | Agent-specific chat |
| `/schedule` | Calendar view |
| `/streak` | All challenges overview |
| `/streak/[id]` | Challenge details & check-in |
| `/todos` | Task list |
| `/prompts` | Prompts library |
| `/workspace` | File browser |
| `/skills` | Skills marketplace |
| `/settings` | User preferences |
| `/help` | Documentation |

## API Endpoints

### Chat
- `POST /api/chat/send` - Send message
- `GET /api/chat/[agentId]` - Get chat history

### Challenges
- `GET /api/challenges` - List all challenges
- `POST /api/challenges` - Create challenge
- `GET /api/challenges/[id]` - Get challenge details
- `POST /api/challenges/adjust-backlog` - Handle backlog

### Check-ins
- `POST /api/checkin/complete` - Complete check-in with tasks
- `POST /api/checkin` - Save check-in record

### Todos
- `GET /api/todos/from-challenges` - Get tasks from challenge day files
- `POST /api/todos/challenge-task` - Toggle task completion

### Prompts
- `GET /api/prompts` - List all prompts (dynamic + custom)

## Dynamic Prompts

Prompts are markdown files in `data/prompts/` that automatically match user queries:

```markdown
# Motivation Boost

- **Description:** Provides motivational encouragement
- **Keywords:** motivation, motivate, inspire, encourage
- **Intent:** need motivation, feeling unmotivated
- **Category:** motivation
- **Priority:** 10

## Template

Hey {{name}}! [Your personalized message here...]
```

**Available Variables:**
- `{{name}}` - User's name
- `{{today_date}}` - Current date
- `{{today_day}}` - Day of week
- `{{pending_tasks}}` - Number of pending tasks
- `{{completed_tasks}}` - Number of completed tasks
- `{{active_challenges}}` - Number of active challenges
- `{{current_streak}}` - Current streak days
- `{{task_list}}` - List of tasks
- `{{challenge_list}}` - List of challenges

## Backlog System

When tasks are missed, the system detects backlog and offers two options:

1. **Adjust Tomorrow** - Moves incomplete tasks to tomorrow's schedule
2. **Regenerate Plan** - Redistributes tasks across remaining days based on your pace

## Check-in Flow

The check-in modal has 4 steps:
1. **Task Selection** - Mark completed tasks
2. **Mood Rating** - How are you feeling? (1-5)
3. **Reflection** - Wins & blockers
4. **Commitment** - Tomorrow's intention

Check-ins update:
- Task checkboxes in day files
- Challenge progress and streak
- Check-in records in `data/checkins/`
- Registry for streak tracking

## Development

```bash
# Install dependencies
npm install
cd ui && npm install

# Run in development mode
npm start

# Or run UI only
cd ui && npm run dev
```

## Troubleshooting

### Ports in use
```bash
# Find processes
netstat -ano | findstr ":8765 :3000"

# Kill by PID
taskkill /F /PID <pid>
```

### Cache issues
```bash
# Delete cache and restart
rm data/.cache-index.json
npm start
```

### Profile not found
- Check `data/profiles/` has user folder
- Verify `profile.md` exists in user folder
- Restart app to rebuild cache

## Technology Stack

- **Frontend:** Next.js 14, TypeScript, Tailwind CSS, Framer Motion
- **Backend:** Node.js, WebSocket (ws)
- **Storage:** File system (Markdown + JSON)
- **Cache:** In-memory with file watching

## License

MIT License

---

Built with care by OpenAnalyst
