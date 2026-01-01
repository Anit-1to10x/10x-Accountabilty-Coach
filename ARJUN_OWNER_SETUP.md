# 👤 Arjun - Owner & Primary User Setup

## Overview

**Arjun is the OWNER and primary user** of this 10x Accountability Coach app. All other users added to the system are family members under Arjun's account.

---

## Account Structure

```
10x Accountability Coach (App)
│
└── Arjun (Owner) - arjun-gmail-com
    ├── Full System Access
    ├── Manages All Profiles
    ├── Controls All Settings
    │
    └── Family Members (Future)
        ├── Member 1
        ├── Member 2
        └── ...
```

---

## Arjun's Profile

**Location:** `data/profiles/arjun-gmail-com/profile.md`

**Details:**
- **Name:** Arjun
- **Email:** arjun@gmail.com
- **User ID:** arjun-gmail-com
- **Role:** Owner (Primary User)
- **Account Type:** Family Account Owner
- **Permissions:** Manage all profiles, challenges, and settings

**Big Goal:** Learning AI

---

## Arjun's Challenges

### 1. Getting Started with OpenAnalyst
- **ID:** `getting-started`
- **Owner:** arjun-gmail-com
- **Type:** Learning
- **Status:** Active
- **Duration:** 30 days (Jan 1 - Jan 30, 2026)
- **Daily Time:** 0.5 hours
- **Goal:** Learn OpenAnalyst features, build streaks, stay accountable

**Location:** `data/challenges/getting-started/challenge.md`

### 2. 2026 Agentic Analysis Skills Challenge
- **ID:** `2026-agentic-analysis-skills`
- **Owner:** arjun-gmail-com
- **Type:** Learning
- **Status:** Active
- **Duration:** 30 days (Jan 1 - Jan 30, 2026)
- **Daily Time:** 2 hours
- **Goal:** Master Claude Skills development - from basics to production-ready AI agents

**Location:** `data/challenges/2026-agentic-analysis-skills/challenge.md`

**Curriculum:**
- Week 1: Foundations + First Skill
- Week 2: RAG + MCP Integration
- Week 3: Advanced Patterns
- Week 4: Capstone & Portfolio

---

## Default User Configuration

### System Defaults to Arjun

The app automatically defaults to Arjun's profile in several places:

#### 1. Frontend (UI)
**File:** `ui/lib/useProfileId.ts`

```typescript
export function useProfileId(): string | null {
  // If no profile is set, default to Arjun (owner)
  if (!stored) {
    const defaultProfile = 'arjun-gmail-com'
    localStorage.setItem('activeProfileId', defaultProfile)
    return defaultProfile
  }
  return stored
}
```

**Effect:** When UI loads, it automatically selects Arjun's profile

#### 2. Backend (Claude Code)
**File:** `lib/quick-query.js`

```javascript
function getFirstProfileId() {
  const DEFAULT_OWNER = 'arjun-gmail-com';

  // First check if Arjun (owner) exists
  const ownerProfile = cacheManager.getProfile(DEFAULT_OWNER);
  if (ownerProfile) {
    return DEFAULT_OWNER;
  }

  // Fall back to other profiles
  return cacheManager.getFirstProfileId();
}
```

**Effect:** Claude Code responses default to Arjun's context

#### 3. App Configuration
**File:** `data/config.json`

```json
{
  "app": {
    "owner": {
      "profileId": "arjun-gmail-com",
      "name": "Arjun",
      "email": "arjun@gmail.com",
      "role": "owner"
    },
    "defaultProfile": "arjun-gmail-com"
  },
  "profiles": {
    "default": "arjun-gmail-com",
    "owner": "arjun-gmail-com"
  }
}
```

**Effect:** System-wide configuration recognizes Arjun as owner

---

## How It Works

### When Arjun Opens the App:

1. **UI Loads** → Checks localStorage for `activeProfileId`
2. **If not set** → Defaults to `arjun-gmail-com`
3. **Sidebar loads** → Shows Arjun's:
   - Current tasks
   - Recent completions
   - Active challenges
   - Check-in history
   - Previous activity

4. **Chat responds** → Uses Arjun's context:
   - "Hey Arjun!" (uses his name)
   - References his challenges
   - Shows his tasks
   - Tracks his progress

5. **All data** → Filtered to Arjun's profile by default

---

## Claude Code Integration

When Claude Code (Terminal 2) processes messages:

```javascript
// In lib/ws-listener.js
const profileId = quickQuery.getFirstProfileId();
// Returns: "arjun-gmail-com" (Arjun)

const context = contextBuilder.buildContext(profileId);
// Builds context using Arjun's data:
// - Profile: Arjun, Learning AI
// - Challenges: getting-started, 2026-agentic-analysis-skills
// - Tasks: [Arjun's tasks]
// - Progress: [Arjun's stats]
```

**Response Example:**
```
User: "How's my progress?"

Claude Code:
  ├── Loads: arjun-gmail-com
  ├── Reads: 2 active challenges, 0 completed tasks today
  └── Responds: "Hey Arjun! You have 2 active challenges..."
```

---

## Accountability Coach Agent

The Accountability Coach agent automatically works with Arjun's data:

**Right Sidebar Shows:**
- ✅ Skills (3): streak, daily-checkin, smart-scheduler
- ✅ Quick Actions: Check-in, Vision Board, Create Challenge
- ✅ Current Task: (Arjun's task for today)
- ✅ Recent Completions: (Arjun's completed tasks)
- ✅ Previous Activity: (Arjun's actions)

**Data Source:**
```typescript
// In Capabilities.tsx
const profileId = useProfileId(); // Returns "arjun-gmail-com"

const todos = await fetch(`/api/todos?profileId=arjun-gmail-com`);
const challenges = await fetch(`/api/challenges?profileId=arjun-gmail-com`);
```

---

## Family Member Setup (Future)

When adding family members:

1. **Create Profile:**
   ```
   data/profiles/{member-name}-gmail-com/
   └── profile.md (with Role: Family Member)
   ```

2. **Update Config:**
   ```json
   "profiles": {
     "owner": "arjun-gmail-com",
     "members": [
       "arjun-gmail-com",
       "member1-gmail-com",
       "member2-gmail-com"
     ]
   }
   ```

3. **Permissions:**
   - Arjun (Owner): Full access to all
   - Members: Access to their own data only
   - Arjun can view all family members' progress

---

## Why This Setup?

### Benefits:

1. **Zero Configuration**
   - New users see Arjun's data immediately
   - No empty state confusion
   - Working app from first launch

2. **Family-First**
   - Arjun is the account owner
   - Easy to add family members later
   - Central accountability for the family

3. **Claude Code Intelligence**
   - Responses are personalized to Arjun
   - Uses his name, challenges, progress
   - Real AI coaching, not generic templates

4. **Consistent Experience**
   - Same profile across UI and Claude Code
   - No profile switching needed for primary user
   - Seamless integration

---

## Verification

### Check Arjun is Default:

1. **Open app** → http://localhost:3000
2. **No profile selected?** → Automatically uses Arjun
3. **Right sidebar** → Shows Arjun's data
4. **Chat message** → "Hey Arjun!" (personalized)

### Check Challenges Linked:

```bash
# Check challenge ownership
cat data/challenges/getting-started/challenge.md
# Should show: Owner: arjun-gmail-com

cat data/challenges/2026-agentic-analysis-skills/challenge.md
# Should show: Owner: arjun-gmail-com
```

### Check Config:

```bash
cat data/config.json
# Should show:
# "defaultProfile": "arjun-gmail-com"
# "owner": "arjun-gmail-com"
```

---

## Summary

**Arjun is the OWNER:**
- ✅ Primary user of the app
- ✅ All features default to his profile
- ✅ Owns all existing challenges
- ✅ Family members will be added under his account
- ✅ Has full system access and control

**Everything centers around Arjun:**
- UI automatically loads his profile
- Claude Code uses his context
- Sidebar shows his data
- Challenges belong to him
- Personalized AI coaching

**Future family members** will be separate profiles managed by Arjun.

---

**Status:** ✅ CONFIGURED AND READY

Arjun is now the default owner and primary user. All systems recognize him automatically!
