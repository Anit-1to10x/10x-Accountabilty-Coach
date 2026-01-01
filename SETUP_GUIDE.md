# OpenAnalyst Accountability Coach - Setup Guide

Complete guide to get started with your AI-powered accountability system.

## Quick Start

```bash
# One command to start everything
npm start

# This starts:
# - Next.js UI at http://localhost:3000
# - WebSocket Server at ws://localhost:8765
# - Fast Cache System
# - AI Response Listener
```

Open http://localhost:3000 and you're ready!

## Features

### Core System
- **Chat Interface** - Unified and agent-specific chats
- **Challenge Management** - 30-day challenges with daily tasks
- **Check-in System** - 4-step daily check-ins
- **Streak Tracking** - Progress visualization
- **Backlog Handling** - Automatic missed task detection
- **Dynamic Prompts** - Context-aware AI responses
- **Schedule Calendar** - Month/week/day views

### Navigation
- **Home** - Main unified chat
- **Schedule** - Calendar with challenge tasks
- **Streak** - Challenge overview and details
- **Todos** - Task management
- **Prompts** - Dynamic and custom prompts
- **Workspace** - File browser
- **Skills** - Skills marketplace
- **Settings** - User preferences
- **Help** - Documentation

## Installation

### Prerequisites
- Node.js 18+
- npm or yarn

### Steps

1. **Install dependencies**
   ```bash
   npm install
   cd ui && npm install
   ```

2. **Start the app**
   ```bash
   npm start
   ```

3. **Open browser**
   - Navigate to http://localhost:3000

## First-Time Setup

1. **Onboarding**
   - Complete the onboarding flow when first opening the app
   - Answer questions about your goals and preferences
   - This creates your profile in `data/profiles/`

2. **Create Challenge**
   - Go to Streak section
   - Create your first challenge
   - Daily tasks are auto-generated in `data/challenges/{id}/days/`

3. **Daily Check-ins**
   - Open check-in modal from any page
   - Select completed tasks
   - Rate your mood
   - Record wins and blockers
   - Set tomorrow's commitment

## Data Structure

All data is stored in the `data/` folder:

```
data/
├── profiles/                    # Per-user data
│   └── {user-id}/
│       ├── profile.md           # User info
│       ├── availability.md      # Schedule
│       ├── preferences.md       # Settings
│       ├── challenges/          # User's progress
│       ├── chats/               # Chat history
│       ├── checkins/            # Check-ins
│       ├── todos/               # Tasks
│       └── visionboards/        # Vision boards
│
├── challenges/                  # Challenge data
│   └── {challenge-id}/
│       ├── challenge.md         # Config
│       ├── plan.md              # Learning plan
│       └── days/                # Daily tasks
│           ├── day-01.md
│           ├── day-02.md
│           └── ...
│
├── prompts/                     # Global prompts
│   ├── motivation.md
│   ├── morning-checkin.md
│   ├── evening-review.md
│   └── ...
│
├── agents/                      # Agent configs
├── chats/                       # Global chats
├── checkins/                    # Check-in records
└── .cache-index.json            # Cache index
```

## Dynamic Prompts

Create prompts in `data/prompts/` as markdown files:

```markdown
# Prompt Name

- **Description:** What this prompt does
- **Keywords:** word1, word2, word3
- **Intent:** phrase1, phrase2
- **Category:** category-name
- **Priority:** 10

## Template

Hey {{name}}! Your personalized message here...

Variables: {{name}}, {{today_date}}, {{pending_tasks}}, {{current_streak}}, etc.
```

## Check-in System

### Flow
1. **Task Selection** - Mark completed tasks
2. **Mood Rating** - 1-5 scale
3. **Reflection** - Wins & blockers
4. **Commitment** - Tomorrow's plan

### What Gets Updated
- Task checkboxes in day files
- Challenge progress and streak
- Check-in records
- Streak registry

## Backlog Handling

When tasks are missed, the system offers two options:

1. **Adjust Tomorrow**
   - Moves incomplete tasks to tomorrow
   - Adds backlog section to tomorrow's file

2. **Regenerate Plan**
   - Analyzes your completion pace
   - Redistributes tasks across remaining days

## Troubleshooting

### Ports in use
```bash
# Find processes
netstat -ano | findstr ":8765 :3000"

# Kill by PID (Windows)
taskkill /F /PID <pid>
```

### Cache issues
```bash
# Delete cache and restart
rm data/.cache-index.json
npm start
```

### Profile not found
- Ensure `data/profiles/{user-id}/profile.md` exists
- Check localStorage has `activeProfileId` set
- Restart app to rebuild cache

### Chat not responding
- Verify WebSocket server is running on port 8765
- Check browser console for errors
- Ensure cache is initialized

## Project Structure

```
openanalyst-accountability-coach/
├── ui/                     # Next.js frontend
│   ├── app/                # Routes
│   │   ├── (shell)/        # Main app pages
│   │   ├── api/            # API endpoints
│   │   └── onboarding/     # Setup flow
│   ├── components/         # React components
│   └── lib/                # Utilities
│
├── lib/                    # Backend
│   ├── cache-manager.js    # In-memory cache
│   ├── quick-query.js      # Fast queries
│   ├── response-generator.js
│   ├── prompts-manager.js
│   └── ws-listener.js
│
├── server/                 # WebSocket
│   └── websocket.js
│
├── scripts/                # Startup
│   └── start-all.js
│
├── skills/                 # AI Skills
├── commands/               # Slash commands
└── data/                   # User data
```

## API Reference

### Chat
- `POST /api/chat/send` - Send message
- `GET /api/chat/[agentId]` - Get history

### Challenges
- `GET /api/challenges` - List all
- `POST /api/challenges` - Create
- `POST /api/challenges/adjust-backlog` - Handle backlog

### Check-ins
- `POST /api/checkin/complete` - Complete check-in
- `POST /api/checkin` - Save record

### Todos
- `GET /api/todos/from-challenges` - Get challenge tasks
- `POST /api/todos/challenge-task` - Toggle task

### Prompts
- `GET /api/prompts` - List all prompts

## Tips for Success

1. **Check in daily** - Build consistency
2. **Be honest** - Record real blockers
3. **Use prompts** - Say "I need motivation" or "let's plan"
4. **Review progress** - Check streak page weekly
5. **Adjust plans** - Use backlog handling when needed

---

Built with care by OpenAnalyst
