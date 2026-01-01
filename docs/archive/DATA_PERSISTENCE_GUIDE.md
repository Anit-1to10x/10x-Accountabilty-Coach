# OpenAnalyst Data Persistence Guide

> **Last Updated:** 2025-12-27
> **Version:** 2.0

This document outlines ALL data persistence mechanisms in OpenAnalyst, ensuring every user interaction is properly saved to markdown files in the `~/.openanalyst/` directory.

---

## Directory Structure

```
~/.openanalyst/
├── index.md                       # System manifest for Claude Code
├── profile/
│   ├── profile.md                 # User basic info
│   ├── availability.md            # Time slots and daily hours
│   ├── preferences.md             # User preferences
│   ├── motivation-triggers.md     # What motivates the user
│   └── resolution.md              # New Year resolution (if set)
├── challenges/
│   └── {challenge-id}/
│       ├── .skill-meta.json       # Challenge metadata
│       ├── plan.md                # Challenge plan
│       ├── progress.md            # Progress tracking
│       └── punishment.json        # Punishment configuration
├── checkins/
│   └── {YYYY-MM-DD}.md           # Daily check-ins
├── chats/
│   ├── index.json                 # Chat sessions index
│   └── {YYYY-MM-DD}/
│       └── {agentId}.md           # Chat transcripts
├── schedule/
│   └── events.json                # Calendar events
├── todos/
│   └── todos.json                 # Todo list
├── punishments/
│   ├── active.json                # Active punishments
│   ├── history.json               # Punishment history
│   └── config.json                # Global punishment settings
├── plans/
│   └── {challengeId}/
│       └── plan.md                # Detailed challenge plans
├── assets/
│   ├── vision-boards/             # Vision board images
│   ├── images/                    # User uploaded images
│   ├── videos/                    # User uploaded videos
│   └── uploads/                   # General uploads
├── skills/                        # Custom user-created skills
│   └── {skill-id}/
│       ├── SKILL.md               # Skill description and instructions
│       └── .skill-meta.json       # Skill metadata
├── agents/
│   └── {agent-id}/
│       ├── agent.json             # Agent configuration
│       ├── context/               # Agent-specific context
│       ├── outputs/               # Agent outputs
│       └── resources/             # Agent resources
└── .registry/
    ├── challenges.json            # Challenges registry
    └── modifications.json         # All file modifications log
```

---

## Feature-by-Feature Data Persistence

### 1. Daily Check-In

**User Action:** Completes daily check-in via modal
**API Endpoint:** `POST /api/checkin`
**Data Saved:**

1. **Check-in file:** `~/.openanalyst/checkins/{YYYY-MM-DD}.md`
   - Appends new check-in entry with timestamp
   - Includes: energy level, focus level, challenges, completed tasks
   - Multiple check-ins per day are appended

2. **Todo updates:** For each completed task
   - `PATCH /api/todos/{id}` → `completed: true`
   - Saved in: `~/.openanalyst/todos/todos.json`

3. **Index update:** `POST /api/system/index`
   - Logs check-in event to `~/.openanalyst/index.md`

**Example Check-in File:**
```markdown
# Daily Check-Ins - Monday, December 27, 2025

## Check-In @ 09:30 AM

**Agent:** accountability-coach

### Context
- **Energy Level:** High
- **Focus Level:** Laser-focused
- **Challenges:** None today

### Completed Tasks
1. Task ID: task-123
2. Task ID: task-456
3. Task ID: task-789

**Total Completed:** 3 tasks

---

## Check-In @ 05:00 PM

**Agent:** unified

### Context
- **Energy Level:** Medium
- **Focus Level:** Okay

### Completed Tasks
1. Task ID: task-999

**Total Completed:** 1 task

---
```

---

### 2. Skill Creation from Chat

**User Action:** Creates custom skill via "Create Custom Skill" button
**API Endpoint:** `POST /api/skills/create`
**Data Saved:**

1. **Skill directory:** `skills/{skill-id}/`
   - Created in project's `skills/` folder

2. **SKILL.md file:** `skills/{skill-id}/SKILL.md`
   - Contains: name, description, category, triggers, instructions, examples
   - Markdown format for readability

3. **.skill-meta.json file:** `skills/{skill-id}/.skill-meta.json`
   - Contains: metadata, version, creation date, attached agents
   ```json
   {
     "id": "python-code-reviewer",
     "name": "Python Code Reviewer",
     "description": "Reviews Python code for best practices",
     "category": "productivity",
     "triggers": ["review", "code review", "check code"],
     "version": "1.0.0",
     "createdBy": "accountability-coach",
     "createdAt": "2025-12-27T10:30:00.000Z",
     "attachedTo": ["accountability-coach"],
     "isCustom": true
   }
   ```

4. **Agent skills update:** `PUT /api/agents/{agentId}/skills`
   - Adds skill to creating agent's skills array

5. **Index update:** `POST /api/system/index`
   - Logs skill creation to `~/.openanalyst/index.md`

---

### 3. User Availability

**User Action:** Sets available time slots and daily hours
**API Endpoint:** `POST /api/user/availability`
**Data Saved:**

1. **Availability file:** `~/.openanalyst/profile/availability.md`
   ```markdown
   # User Availability

   **Last updated:** 2025-12-27

   ## Available Time Slots

   - Morning (8-12pm)
   - Afternoon (12-5pm)
   - Evening (5-9pm)

   ## Daily Hours

   **Total available:** 6 hours per day

   ## Preferences

   - **Best time:** Morning
   - **Productivity peak:** 9-11am

   ---

   This profile helps the system schedule your tasks and challenges optimally.
   ```

2. **Index update:** `POST /api/system/index`
   - Logs file creation/modification

---

### 4. Event Rescheduling

**User Action:** Reschedules calendar event
**API Endpoint:** `POST /api/schedule/reschedule`
**Data Saved:**

1. **Events file:** `~/.openanalyst/schedule/events.json`
   - Updates event's date and time
   ```json
   [
     {
       "id": "event-123",
       "title": "Python Learning",
       "date": "2025-12-28",
       "time": "14:00",
       "duration": 120,
       "type": "challenge",
       "challengeId": "python-mastery"
     }
   ]
   ```

2. **Index update:** `POST /api/system/index`
   - Logs rescheduling action with old and new times

---

### 5. Todos Management

**User Action:** Creates, updates, or completes todo
**API Endpoints:**
- `POST /api/todos` - Create
- `PATCH /api/todos/{id}` - Update
- `GET /api/todos` - Fetch

**Data Saved:**

1. **Todos file:** `~/.openanalyst/todos/todos.json`
   ```json
   {
     "todos": [
       {
         "id": "todo-123",
         "title": "Learn React Hooks",
         "date": "2025-12-27",
         "time": "10:00",
         "completed": false,
         "priority": "high",
         "challengeId": "react-learning"
       }
     ]
   }
   ```

---

### 6. Challenge Creation (Onboarding)

**User Action:** Completes onboarding flow
**API Endpoints:**
- `POST /api/user/onboarding`
- `POST /api/challenges`

**Data Saved:**

1. **Profile:** `~/.openanalyst/profile/profile.md`
   - Name, timezone, persona (strict/balanced/friendly)

2. **Resolution:** `~/.openanalyst/profile/resolution.md` (if set)
   - New Year resolution text

3. **Challenge directory:** `~/.openanalyst/challenges/{id}/`

4. **Challenge metadata:** `.skill-meta.json`
   ```json
   {
     "id": "python-mastery",
     "name": "Python Mastery",
     "type": "learning",
     "dailyHours": 2,
     "deadline": "2026-03-01",
     "punishments": [...],
     "gracePeriod": 24,
     "createdAt": "2025-12-27T..."
   }
   ```

5. **Plan file:** `plan.md`
   - AI-generated plan for achieving the challenge

6. **Progress file:** `progress.md`
   - Tracks daily/weekly progress

7. **Challenges registry:** `~/.openanalyst/.registry/challenges.json`
   - Global registry of all challenges

8. **Index update:** `~/.openanalyst/index.md`

---

### 7. Chat Messages

**User Action:** Sends message in chat
**API Endpoint:** `POST /api/chat/send`
**Data Saved:**

1. **Chat transcript:** `~/.openanalyst/chats/{YYYY-MM-DD}/{agentId}.md`
   - Appends user message and assistant response
   ```markdown
   # Chat - December 27, 2025
   ## Agent: accountability-coach

   ---

   **User** (10:30 AM):
   Help me create a Python learning plan.

   **Assistant** (10:30 AM):
   I'd be happy to help! Let's start by understanding your current level...

   ---
   ```

2. **Chat index:** `~/.openanalyst/chats/index.json`
   - Tracks all chat sessions
   ```json
   {
     "sessions": [
       {
         "date": "2025-12-27",
         "agentId": "accountability-coach",
         "messageCount": 12,
         "lastMessage": "Great! Let's get started."
       }
     ]
   }
   ```

---

### 8. System Index Updates

**Triggered by:** ANY significant user action
**API Endpoint:** `POST /api/system/index`
**Data Saved:**

**Index file:** `~/.openanalyst/index.md`

This is the **most critical file** - it's Claude Code's manifest for understanding the system state.

**Updated on:**
- Challenge created
- Skill created
- Check-in completed
- File modified
- Event rescheduled
- Punishment triggered
- Agent created
- User preference changed

**Example Index:**
```markdown
# OpenAnalyst Architecture Index
> Last Updated: 2025-12-27 10:45:32
> Version: 2.0

## System Overview
- **App Name:** OpenAnalyst Accountability Coach
- **User:** John Doe
- **Created:** 2025-12-27
- **Total Challenges:** 2
- **Active Streaks:** 1

## Features Status

| Feature | Status | Location | Notes |
|---------|--------|----------|-------|
| User Profile | ✅ Active | ~/.openanalyst/profile/ | Completed onboarding |
| Challenges | ✅ Active | ~/.openanalyst/challenges/ | 2 active challenges |
| Streak Tracking | ✅ Active | /streak | 15-day streak |
| Calendar | ✅ Active | /schedule | 8 events scheduled |
| Daily Check-in | ✅ Active | /checkin | Last: 2025-12-27 |

## Active Challenges

| ID | Name | Progress | Streak | Created |
|----|------|----------|--------|---------|
| python-mastery | Python Mastery | 45% | 15 days | 2025-12-12 |
| fitness-journey | 30-Day Fitness | 20% | 6 days | 2025-12-21 |

## Custom Skills

| ID | Name | Category | Created By | Attached To |
|----|------|----------|------------|-------------|
| python-code-reviewer | Python Code Reviewer | productivity | accountability-coach | [accountability-coach] |

## Recent Actions

- **2025-12-27 10:45:** Daily check-in completed (3 tasks)
- **2025-12-27 10:30:** Skill created: Python Code Reviewer
- **2025-12-27 09:15:** Event rescheduled: Python Learning
- **2025-12-27 08:00:** Challenge progress updated: Python Mastery (45%)

---

**This index is automatically maintained by the system. Claude Code uses this to understand the current state.**
```

---

## Verification Checklist

### ✅ All Features Save to Markdown Files

- [x] **Daily Check-in** → `checkins/{date}.md`
- [x] **Skill Creation** → `skills/{id}/SKILL.md`
- [x] **User Availability** → `profile/availability.md`
- [x] **Event Rescheduling** → `schedule/events.json` (JSON for structured data)
- [x] **Todos** → `todos/todos.json` (JSON for structured data)
- [x] **Chat Messages** → `chats/{date}/{agentId}.md`
- [x] **Challenge Creation** → `challenges/{id}/plan.md`, `progress.md`
- [x] **User Profile** → `profile/profile.md`
- [x] **System Index** → `index.md`

### ✅ Index Updates

Every significant action triggers an index update:
- [x] Check-in completed
- [x] Skill created
- [x] Challenge created
- [x] Event rescheduled
- [x] File modified
- [x] Punishment triggered

---

## API Endpoints Reference

| Endpoint | Method | Saves To | Updates Index? |
|----------|--------|----------|----------------|
| `/api/checkin` | POST | `checkins/{date}.md` | ✅ Yes |
| `/api/skills/create` | POST | `skills/{id}/SKILL.md` | ✅ Yes |
| `/api/user/availability` | POST/PUT | `profile/availability.md` | ✅ Yes |
| `/api/schedule/reschedule` | POST | `schedule/events.json` | ✅ Yes |
| `/api/todos` | POST | `todos/todos.json` | ✅ Yes |
| `/api/todos/{id}` | PATCH | `todos/todos.json` | ✅ Yes |
| `/api/challenges` | POST | `challenges/{id}/` | ✅ Yes |
| `/api/chat/send` | POST | `chats/{date}/{agent}.md` | ❌ No (too frequent) |
| `/api/user/onboarding` | POST | `profile/profile.md` | ✅ Yes |
| `/api/system/index` | POST | `index.md` | N/A (is the index) |

---

## Claude Code Integration

Claude Code reads the `index.md` file to understand:
- What challenges exist
- Which skills are available
- What actions have been taken
- Current system state

**How Claude Code Uses Data:**

1. **Before any action:** Reads `index.md` to understand context
2. **During execution:** Reads relevant markdown files for details
3. **After action:** Updates `index.md` to log the change

**Example Workflow:**

```
User: "Show me my progress on Python Mastery"

1. Claude reads ~/.openanalyst/index.md
   → Sees challenge "python-mastery" exists

2. Claude reads ~/.openanalyst/challenges/python-mastery/progress.md
   → Gets detailed progress data

3. Claude reads ~/.openanalyst/checkins/*.md
   → Analyzes recent check-ins for insights

4. Claude responds with comprehensive progress report
```

---

## File Format Standards

### Markdown Files (.md)
- **Purpose:** Human-readable documentation
- **Used for:** Check-ins, chats, plans, profiles
- **Benefits:**
  - Easy to read in any text editor
  - Version control friendly
  - Claude can easily parse

### JSON Files (.json)
- **Purpose:** Structured data
- **Used for:** Todos, events, registries, metadata
- **Benefits:**
  - Type-safe
  - Easy to query
  - Programmatic access

---

## Summary

✅ **ALL user interactions save to markdown or JSON files**
✅ **System index (`index.md`) is updated for every significant action**
✅ **Data is human-readable and accessible**
✅ **Claude Code can fully understand the system state**
✅ **No database required**

Every feature respects the principle: **"If it happens, it's logged."**

---

**End of Data Persistence Guide**
