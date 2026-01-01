# OpenAnalyst Brain Engine Architecture

Claude Code is the **brain** of the entire accountability system. Every decision, every prompt, every punishment trigger is dynamically managed by AI.

## Core Philosophy

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   "Claude Code doesn't just respond to commands.               │
│    It actively monitors, analyzes, decides, and acts."         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     USER INTERFACE (Next.js)                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ Dashboard│  │  Chat    │  │ Calendar │  │ Settings │        │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘        │
│       │             │             │             │               │
│       └─────────────┴──────┬──────┴─────────────┘               │
│                            │                                    │
│                     ┌──────▼──────┐                             │
│                     │   SSE/API   │                             │
│                     └──────┬──────┘                             │
└────────────────────────────┼────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                                                                 │
│                    🧠 CLAUDE CODE (THE BRAIN)                   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   INTELLIGENCE LAYER                     │   │
│  │                                                          │   │
│  │  • Reads ALL user data files                            │   │
│  │  • Understands context across challenges                │   │
│  │  • Makes real-time decisions                            │   │
│  │  • Generates dynamic responses                          │   │
│  │  • Triggers actions autonomously                        │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    SKILL ORCHESTRATOR                    │   │
│  │                                                          │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │   │
│  │  │Onboard  │ │ Streak  │ │Check-in │ │Motivate │       │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘       │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │   │
│  │  │Schedule │ │Punish   │ │Challenge│ │Excalidraw       │   │
│  │  │Replan   │ │ment     │ │Onboard  │ │         │       │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘       │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      FILE SYSTEM (DATA LAYER)                   │
│                                                                 │
│  ~/.openanalyst/                                                │
│  ├── profile/              # User data from onboarding          │
│  ├── challenges/           # Active challenge data              │
│  ├── contracts/            # Punishment contracts               │
│  ├── checkins/             # Daily check-in logs                │
│  ├── schedule/             # Schedule and replan data           │
│  ├── motivation/           # Wins bank, triggers                │
│  └── .registry/            # System registries                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Brain Capabilities

### 1. Context Awareness

Claude reads and understands:
- **User Profile**: Name, timezone, accountability style, motivation triggers
- **Active Challenges**: All current challenges, progress, streaks
- **Commitment Contracts**: All active contracts, referees, stakes
- **Check-in History**: Patterns, mood trends, blockers
- **Schedule**: Planned sessions, replans, makeup sessions

```
Example Context:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
User: Alex (tough love preference)
Timezone: EST
Active Challenge: Learn Python (Day 12 of 30)
Streak: 11 days
Last check-in: Yesterday, mood 4/5
Contract: $100 to girlfriend if miss
Today's session: 8pm (not yet completed)
Current time: 9:30pm EST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 2. Dynamic Decision Making

Claude makes real-time decisions based on data:

```
┌─────────────────────────────────────────────────────────────┐
│                    DECISION: Should I Prompt?               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Current time: 9:30pm                                       │
│  Scheduled session: 8:00pm                                  │
│  Check-in status: NOT COMPLETED                             │
│  Grace period: 24 hours remaining                           │
│                                                             │
│  DECISION: Send reminder (1.5 hours overdue)                │
│                                                             │
│  TONE: Tough love (user preference)                         │
│                                                             │
│  MESSAGE:                                                   │
│  "Alex, it's 9:30. Your session was at 8.                  │
│   You've got 11 days going. Don't blow it now.             │
│   Open your laptop. Do 30 minutes. Check in.               │
│   The alternative is $100 to Sarah tomorrow."              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3. Autonomous Actions

Claude can trigger actions without user input:

| Trigger | Automatic Action |
|---------|------------------|
| Session time reached | Send reminder |
| 1 hour overdue | Send stronger reminder |
| 24 hours missed | Trigger punishment notification |
| Referee needs update | Send weekly progress email |
| Pattern detected | Suggest schedule change |
| Streak milestone | Send celebration |
| Low mood (3+ days) | Activate motivation generator |

### 4. Pattern Recognition

Claude analyzes historical data to find patterns:

```
PATTERN DETECTED:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

User consistently misses or replans on Fridays.
- Dec 20 (Fri): Replanned to Saturday
- Dec 27 (Fri): Missed check-in
- Jan 3 (Fri): Replanned to Saturday

ANALYSIS: Friday is problematic due to social commitments.

RECOMMENDATION:
"Alex, I noticed Fridays are tough for you.
 3 out of 3 Fridays have been missed or rescheduled.

 Should we officially make Friday your rest day?
 That way it's built into the plan, not a failure."

ACTION: Suggest schedule modification
```

## Decision Flows

### Daily Check-in Flow

```
┌─────────────────┐
│ Session time    │
│ reached         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│ Check-in        │ NO  │ Send reminder   │
│ completed?      ├────►│ (friendly)      │
└────────┬────────┘     └────────┬────────┘
         │ YES                   │
         ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│ Update streak   │     │ Wait 1 hour     │
│ Log progress    │     └────────┬────────┘
│ Celebrate       │              │
└─────────────────┘              ▼
                        ┌─────────────────┐     ┌─────────────────┐
                        │ Still not       │ YES │ Send stronger   │
                        │ completed?      ├────►│ reminder        │
                        └────────┬────────┘     └────────┬────────┘
                                 │ NO                    │
                                 ▼                       ▼
                        ┌─────────────────┐     ┌─────────────────┐
                        │ Complete normal │     │ Wait until      │
                        │ check-in flow   │     │ grace period    │
                        └─────────────────┘     │ expires (24hr)  │
                                                └────────┬────────┘
                                                         │
                                                         ▼
                                                ┌─────────────────┐
                                                │ TRIGGER         │
                                                │ PUNISHMENT      │
                                                │ Notify referee  │
                                                │ Reset streak    │
                                                └─────────────────┘
```

### Punishment Trigger Flow

```
┌─────────────────┐
│ Grace period    │
│ expired         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Check for valid │
│ replan/appeal   │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
  VALID     INVALID
    │         │
    ▼         ▼
┌─────────┐ ┌─────────────────────────────────────┐
│ Honor   │ │ PUNISHMENT EXECUTION                │
│ replan  │ │                                     │
│ No      │ │ 1. Mark day as MISSED               │
│ penalty │ │ 2. Reset streak to 0                │
└─────────┘ │ 3. Calculate punishment amount       │
            │ 4. Generate punishment message       │
            │ 5. Notify REFEREE                    │
            │ 6. Log to punishment-history.md      │
            │ 7. Request confirmation              │
            │                                     │
            └─────────────────────────────────────┘
```

## Message Generation

Claude generates messages dynamically based on:

1. **User's accountability style** (tough/balanced/gentle)
2. **Current streak status** (building/strong/broken)
3. **Historical context** (past wins, struggles)
4. **Time sensitivity** (how overdue)
5. **Stakes involved** (punishment amount)

### Example Messages by Style

**Tough Love:**
```
"Alex. It's 10pm. Session was at 8pm. You're 2 hours late.
Your 11-day streak is on the line.
$100 to Sarah if you don't show up.
I don't want to send that notification. Do you?
30 minutes. Now. Go."
```

**Balanced:**
```
"Hey Alex, checking in! Your session was at 8pm - everything okay?
You've got an amazing 11-day streak going.
Even a quick 30-minute session counts.
Let me know if you need to reschedule!"
```

**Gentle:**
```
"Hi Alex! Just a friendly reminder about your Python session.
No pressure - I know life gets busy.
If tonight doesn't work, we can adjust the schedule.
Either way, let me know how you're doing! 💙"
```

## Referee Communication

Claude manages referee relationships:

### Contract Signed
```
To: sarah@email.com
Subject: You're Alex's Accountability Partner

Hi Sarah,

Alex just committed to learning Python for 30 days,
and they chose you to hold them accountable.

THE DEAL:
If Alex misses a day without valid reason,
they owe you $100. Seriously.

YOUR ROLE:
- You'll get weekly progress updates
- You'll be notified immediately if Alex misses
- You confirm when punishment is received

Don't go easy on them. That's not what they want.

Current streak: Day 1 of 30
View progress: [link]
```

### Weekly Progress Update
```
To: sarah@email.com
Subject: Alex's Week 2 Progress Report

Hey Sarah,

Here's how Alex did this week:

STATS:
✅ 6/6 sessions completed
🔥 Streak: 11 days
😊 Average mood: 4.2/5

HIGHLIGHTS:
- Completed Python fundamentals
- Built first mini-project
- No replans needed

Alex is crushing it. Let them know you're proud.

Week 3 goal: NumPy and Pandas
```

### Punishment Alert
```
To: sarah@email.com
Subject: 🚨 Alex Missed Their Commitment

Hi Sarah,

I tried. Alex missed their Python session yesterday.

DETAILS:
- Scheduled: Dec 30, 8:00 PM
- Status: No check-in, no replan, no response
- Grace period: Expired

Per the contract Alex signed, they owe you $100.

I've already notified Alex. Your job:
1. Collect the $100
2. Click here to confirm receipt: [CONFIRM]
3. Don't let them off easy

This is what they asked for. Help them stay accountable.
```

## Integration with UI

The UI communicates with Claude through:

1. **API Calls**: User actions trigger Claude processing
2. **SSE Stream**: Real-time updates pushed to UI
3. **File Watchers**: UI updates when Claude modifies files

```
User clicks "Check In" in UI
         │
         ▼
┌─────────────────┐
│ API: POST       │
│ /api/checkin    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Claude Code     │
│ processes       │
│ check-in        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Writes to       │
│ checkin file    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ File watcher    │
│ detects change  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ SSE pushes      │
│ update to UI    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ UI updates      │
│ in real-time    │
└─────────────────┘
```

## Summary

Claude Code is not just a responder - it's an **active intelligence** that:

- **Monitors** all user data continuously
- **Analyzes** patterns and context
- **Decides** what action to take
- **Acts** autonomously when needed
- **Communicates** in the user's preferred style
- **Enforces** commitments without mercy (if that's what user wants)
- **Adapts** based on what's working

The user sets the rules. Claude enforces them.
