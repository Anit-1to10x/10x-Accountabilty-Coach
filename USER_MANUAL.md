# OpenAnalyst Accountability Coach - User Manual

## Table of Contents
1. [Getting Started](#getting-started)
2. [Navigation](#navigation)
3. [Challenges](#challenges)
4. [Daily Check-ins](#daily-check-ins)
5. [Schedule & Calendar](#schedule--calendar)
6. [Prompts](#prompts)
7. [Chat Interface](#chat-interface)
8. [Backlog Management](#backlog-management)
9. [Settings](#settings)

---

## Getting Started

### Starting the App

```bash
npm start
```

This starts:
- Next.js UI at http://localhost:3000
- WebSocket Server at ws://localhost:8765
- Fast Cache System
- AI Response Listener

### First-Time Setup

1. **Open the App** - Navigate to http://localhost:3000
2. **Complete Onboarding** - Answer questions about your goals
3. **Create a Challenge** - Set up your first accountability challenge
4. **Start Tracking** - Check in daily to build your streak

---

## Navigation

### Left Sidebar

| Section | Purpose |
|---------|---------|
| **Home** | Main unified chat interface |
| **Schedule** | Calendar view with challenge tasks |
| **Streak** | All challenges overview |
| **Todos** | Task management |
| **Prompts** | Dynamic and custom prompts |
| **Workspace** | File browser for data folder |
| **Skills** | Skills marketplace |
| **Settings** | User preferences |
| **Help** | Documentation |

### Agent Cards
- Click an agent to open agent-specific chat
- Each agent has its own personality and skills

---

## Challenges

### Creating a Challenge

1. Go to **Streak** section
2. Click **Create Challenge**
3. Fill in details:
   - **Name**: Challenge title
   - **Type**: learning, fitness, building, habit, creative, or custom
   - **Duration**: Number of days (default 30)
   - **Start Date**: When to begin
   - **Daily Hours**: Time commitment per day

### Challenge Structure

Each challenge creates:
```
data/challenges/{challenge-id}/
├── challenge.md      # Configuration and progress
├── plan.md           # Learning/activity plan
└── days/             # Daily task files
    ├── day-01.md
    ├── day-02.md
    └── ...
```

### Viewing Challenges

- **Streak Page** - Overview of all challenges
- **Streak Detail** - Click a challenge to see:
  - Progress percentage
  - Current streak
  - Today's tasks
  - Check-in button

---

## Daily Check-ins

### How to Check In

1. Open the check-in modal (available from any page)
2. **Step 1: Tasks** - Select which tasks you completed
3. **Step 2: Mood** - Rate your energy (1-5)
4. **Step 3: Reflection** - Record wins and blockers
5. **Step 4: Commitment** - Set tomorrow's intention

### What Gets Updated

When you complete a check-in:
- Task checkboxes in day files (`[ ]` → `[x]`)
- Challenge progress percentage
- Streak count
- Check-in record in `data/checkins/`
- Registry for streak tracking

### Streak Rules

- Check in daily to maintain your streak
- Missing a day resets the streak to 0
- Best streak is recorded for each challenge

---

## Schedule & Calendar

### Views

- **Month View** - Overview of the entire month
- **Week View** - Weekly task breakdown
- **Day View** - Detailed daily schedule

### Features

- **Auto-navigation** - Calendar jumps to challenge start date
- **Task Display** - Challenge tasks appear on their scheduled day
- **Task Completion** - Click tasks to mark complete
- **Color Coding** - Different colors for different challenges

### Challenge Tasks

Tasks from `data/challenges/{id}/days/day-XX.md` appear in the calendar based on the challenge start date.

---

## Prompts

### Dynamic Prompts

Prompts in `data/prompts/` automatically match your messages:

| Prompt | Trigger Words |
|--------|---------------|
| Motivation | motivation, inspire, encourage |
| Morning Check-in | morning, good morning, start day |
| Evening Review | evening, end of day, wrap up |
| Stuck | stuck, blocked, help |
| Celebration | celebrate, done, finished, achieved |
| Accountability | accountability, honest, real talk |
| Planning | plan, planning, organize, schedule |

### Using Prompts

Just type naturally:
- "I need some motivation"
- "Good morning, let's get started"
- "I'm feeling stuck"
- "Help me plan my week"

The AI automatically detects intent and responds with the appropriate template.

### Custom Prompts

Create your own prompts:

```markdown
# Your Prompt Name

- **Description:** What this prompt does
- **Keywords:** keyword1, keyword2
- **Intent:** trigger phrase 1, trigger phrase 2
- **Category:** your-category
- **Priority:** 10

## Template

Hey {{name}}! Your message here...
```

---

## Chat Interface

### Unified Chat

- Access from **Home**
- Can query all user data
- Uses dynamic prompts

### Agent Chat

- Access by clicking an agent
- Agent-specific personality
- Focused on agent's skills

### Message Types

- **Text**: Regular messages
- **Commands**: Start with `/` (e.g., `/streak`)
- **Questions**: AI responds with context

---

## Backlog Management

### When Backlog Appears

The backlog notification appears when:
- Tasks from previous days are incomplete
- You've missed check-ins

### Options

1. **Adjust Tomorrow**
   - Moves incomplete tasks to tomorrow
   - Adds a backlog section to tomorrow's file

2. **Regenerate Plan**
   - Analyzes your completion pace
   - Redistributes remaining tasks
   - Updates all future day files

---

## Settings

### User Profile

- **Name**: Your display name
- **Email**: For notifications
- **Timezone**: For scheduling

### Preferences

- **Accountability Style**: Strict, Balanced, or Friendly
- **Productive Hours**: When you prefer to work
- **Daily Commitment**: Hours per day

### Data Location

All your data is stored in the `data/` folder:
- Profiles: `data/profiles/{user-id}/`
- Challenges: `data/challenges/`
- Prompts: `data/prompts/`

---

## Tips for Success

1. **Check in at the same time daily** - Build consistency
2. **Be honest about blockers** - The AI can only help if you're transparent
3. **Use the prompts** - Say "I need motivation" when you're struggling
4. **Review weekly** - Check your streak page to see patterns
5. **Adjust when needed** - Use backlog handling instead of giving up

---

## Troubleshooting

### Chat Not Responding

1. Check if WebSocket server is running (port 8765)
2. Verify profile exists in `data/profiles/`
3. Restart app with `npm start`

### Tasks Not Showing in Calendar

1. Verify challenge has correct start date
2. Check day files exist in `data/challenges/{id}/days/`
3. Ensure day files have task checkboxes

### Streak Not Updating

1. Complete check-in for the day
2. Check registry at `data/.registry/challenges.json`
3. Verify challenge.md has correct streak format

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + K` | Open command palette |
| `Enter` | Send message |
| `Escape` | Close modal |

---

## Data Privacy

- All data stored locally in `data/` folder
- No data sent to external servers
- You own and control all your data
- Delete `data/` folder to reset everything

---

Built with care by OpenAnalyst
