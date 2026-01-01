# 🏗️ ARCHITECTURE INDEX - OpenAnalyst Accountability Coach
> **READ THIS FIRST** - This file tells Claude Code everything about this app's structure, features, and initialization
>
> **Last Updated:** 2025-12-27
> **Version:** 2.0.0

---

## 📋 TABLE OF CONTENTS
1. [System Overview](#system-overview)
2. [Critical Instructions for Claude Code](#critical-instructions-for-claude-code)
3. [Directory Structure](#directory-structure)
4. [User Data Initialization](#user-data-initialization)
5. [Features Registry](#features-registry)
6. [API Endpoints](#api-endpoints)
7. [Skills System](#skills-system)
8. [Punishment System](#punishment-system)
9. [Vision Board System](#vision-board-system)
10. [Data Persistence Rules](#data-persistence-rules)

---

## 🎯 SYSTEM OVERVIEW

**App Name:** OpenAnalyst Accountability Coach
**Purpose:** Personal accountability and goal-tracking application
**Tech Stack:** Next.js 14, TypeScript, Zustand, Tailwind CSS
**User Data Location:** `~/.openanalyst/` (auto-created per user)
**Current Directory:** This is the template repository

### Key Principle
**NEVER break the existing architecture. ALWAYS enhance and scale it.**

This template is designed to work for ANY user who downloads it from GitHub. All initialization must be automatic and self-contained.

---

## ⚠️ CRITICAL INSTRUCTIONS FOR CLAUDE CODE

### 1. **ALWAYS Read This File First**
When a user starts the app or interacts with you:
1. Read `ARCHITECTURE_INDEX.md` (this file)
2. Check if `~/.openanalyst/` exists
3. If not, initialize user data (see [User Data Initialization](#user-data-initialization))
4. Load user's profile, challenges, agents from `~/.openanalyst/`

### 2. **File Path Rules**
- **Template files:** Use relative paths from current directory (e.g., `./skills/streak/SKILL.md`)
- **User data files:** ALWAYS use `~/.openanalyst/` (e.g., `~/.openanalyst/profile/profile.md`)
- **NEVER hardcode absolute paths** like `C:\Users\Anit\...`

### 3. **Initialization Rules**
For first-time users:
1. Create `~/.openanalyst/` directory
2. Create subdirectories: `profile/`, `challenges/`, `agents/`, `visionboards/`, `punishments/`, `chats/`, `assets/`
3. Create `agents.json` with default "accountability-coach" agent
4. Create `profile/profile.md` with blank template
5. Copy skills from `./skills/` to user's awareness (read-only, don't copy files)

### 4. **Skills System Rules**
- Skills are stored in `./skills/` directory (14+ skills available)
- Each skill has a `SKILL.md` file
- Skills are READ from this directory, NOT copied to user data
- User can edit skill descriptions via UI (saves to `./skills/[skill-name]/SKILL.md`)
- Skills are attached to agents via `~/.openanalyst/agents.json`

### 5. **Challenge Tracking Rules**
When user creates a challenge:
1. Create folder: `~/.openanalyst/challenges/[challenge-id]/`
2. Create **6 mandatory files**:
   - `challenge-config.json` (challenge metadata & settings)
   - `plan.md` (AI-generated structured plan)
   - `activity-log.md` (daily check-ins, activities, streak tracking)
   - `progress.md` (overall progress, milestones, weekly summaries)
   - `backlog.md` (pending tasks, ideas, resources)
   - `punishment.json` (punishment configuration & history)
3. Update `~/.openanalyst/.registry/challenges.json` with challenge entry
4. Update `~/.openanalyst/agents.json` to link challenge to agent (optional)

### 6. **Data Persistence**
- **Profile data:** `~/.openanalyst/profile/profile.md`
- **Challenges:** `~/.openanalyst/challenges/[id]/`
- **Agents:** `~/.openanalyst/agents.json`
- **Vision Boards:** `~/.openanalyst/visionboards/[id].json`
- **Punishments:** `~/.openanalyst/punishments/active.json`
- **Chat history:** `~/.openanalyst/chats/[YYYY-MM-DD]/[agentId].md`

---

## 📁 DIRECTORY STRUCTURE

```
OpenAnalyst Accountability coach/         # ← Current directory (template)
├── ARCHITECTURE_INDEX.md                 # ← THIS FILE (read first!)
├── README.md                             # User-facing documentation
├── CLAUDE_CODE_INSTRUCTIONS.md           # Detailed Claude Code guide
├── DATA_PERSISTENCE_GUIDE.md             # How data is stored
├── USER_MANUAL.md                        # End-user manual
├── SETUP_GUIDE.md                        # Installation guide
├── SKILL_CREATION_GUIDE.md               # How to create skills
├── .env.example                          # Environment variables template
├── package.json                          # Dependencies
├── settings.json                         # Claude Code settings
├── setup.sh / setup.ps1                  # Setup scripts
│
├── ui/                                   # Next.js frontend
│   ├── app/                              # App Router pages
│   │   ├── (shell)/                      # Main app pages
│   │   │   ├── schedule/                 # Calendar page
│   │   │   ├── todos/                    # Todos page
│   │   │   ├── skills/                   # Skills marketplace
│   │   │   ├── prompts/                  # Prompts library
│   │   │   ├── visionboards/             # Vision boards page
│   │   │   └── streak/                   # Streak tracking
│   │   ├── agent/[id]/                   # Agent detail page
│   │   └── api/                          # API routes
│   │       ├── agents/                   # Agent CRUD
│   │       ├── challenges/               # Challenge CRUD
│   │       ├── skills/                   # Skills API
│   │       ├── prompts/                  # Prompts API
│   │       ├── visionboards/             # Vision boards API
│   │       ├── punishments/              # Punishments API
│   │       └── system/index/             # Architecture index API
│   ├── components/                       # React components
│   │   ├── agent/                        # Agent components
│   │   ├── chat/                         # Chat components
│   │   ├── punishment/                   # Punishment UI
│   │   ├── visionboard/                  # Vision board UI
│   │   ├── schedule/                     # Calendar components
│   │   └── skills/                       # Skills components
│   ├── types/                            # TypeScript types
│   ├── lib/                              # Utilities
│   └── styles/                           # CSS
│
├── skills/                               # Skills library (14+ skills)
│   ├── streak/                           # Streak tracking skill
│   ├── daily-checkin/                    # Daily check-in skill
│   ├── motivation/                       # Motivation skill
│   ├── punishment/                       # Punishment skill
│   ├── excalidraw/                       # Architecture diagrams
│   ├── schedule-replanner/               # Schedule optimization
│   ├── user-onboarding/                  # First-time onboarding
│   ├── challenge-onboarding/             # Challenge creation
│   ├── nutritional-specialist/           # Nutrition advice
│   ├── skill-writer/                     # Create new skills
│   ├── nanobanana-skill/                 # AI image generation
│   ├── workout-program-designer/         # Fitness plans
│   ├── wisdom-accountability-coach/      # Philosophy & coaching
│   └── reinforcement-drills/             # Post-coaching practice
│
├── lib/                                  # Backend utilities
├── scripts/                              # Automation scripts
├── plugins/                              # Claude Code plugins
├── docs/                                 # Additional documentation
└── .streak/                              # Streak challenge data
```

---

## 🚀 USER DATA INITIALIZATION

### First-Time User Detection
```bash
# Check if user data exists
if [ ! -d ~/.openanalyst ]; then
    # First-time user - initialize
fi
```

### Auto-Initialization Steps

#### 1. Create Directory Structure
```bash
~/.openanalyst/
├── profile/
│   ├── profile.md              # User info (name, timezone, goals)
│   ├── availability.md         # Available time slots
│   ├── preferences.md          # UI preferences, persona
│   ├── motivation-triggers.md  # What motivates the user
│   └── resolution.md           # New Year resolution (optional)
├── challenges/
│   └── [challenge-id]/
│       ├── challenge-config.json  # Challenge metadata & settings
│       ├── plan.md                # AI-generated structured plan
│       ├── activity-log.md        # Daily check-ins & activities
│       ├── progress.md            # Overall progress & milestones
│       ├── backlog.md             # Pending tasks & ideas
│       └── punishment.json        # Punishment config & history
├── agents/
│   └── [agent-id]/
│       ├── agent.json          # Agent metadata
│       ├── README.md           # Agent description
│       ├── workspace/          # Agent files
│       ├── prompts/            # Custom prompts
│       └── config/             # Configuration
├── visionboards/
│   └── [board-id]/
│       ├── [board-id].json     # Vision board data
│       └── images/             # Uploaded images
├── punishments/
│   ├── active.json             # Active punishments
│   └── history.json            # Past punishments
├── chats/
│   ├── index.json              # Chat index
│   └── [YYYY-MM-DD]/
│       └── [agentId].md        # Daily chat logs
├── assets/
│   └── uploads/                # User-uploaded files
├── agents.json                 # All agents (centralized)
└── .registry/
    ├── challenges.json         # Challenge registry
    └── modifications.json      # Track all modifications
```

#### 2. Create Default Files

**`~/.openanalyst/profile/profile.md`**
```markdown
# User Profile

- **Name:** [To be set]
- **Timezone:** [To be set]
- **Created:** [Current date]
- **Onboarding Completed:** false

## About
[User will add their big goal here]
```

**`~/.openanalyst/agents.json`**
```json
[
  {
    "id": "accountability-coach",
    "name": "Accountability Coach",
    "icon": "🎯",
    "description": "Track challenges, maintain streaks, stay accountable",
    "skills": ["streak", "daily-checkin", "motivation", "punishment"],
    "quickActions": [
      { "id": "new-challenge", "label": "New Challenge", "icon": "plus" },
      { "id": "vision-board", "label": "Create Vision Board", "icon": "image" },
      { "id": "check-in", "label": "Daily Check-in", "icon": "check" }
    ],
    "sections": [
      { "id": "challenges", "label": "Challenges", "path": "challenges/" },
      { "id": "streaks", "label": "Streaks", "path": "streaks/" },
      { "id": "contracts", "label": "Contracts", "path": "contracts/" }
    ],
    "capabilities": {
      "visionBoard": true,
      "scheduling": true,
      "streaks": true,
      "punishments": true
    }
  }
]
```

#### 3. Initialization Code
Location: `ui/lib/initializeUserData.ts`

```typescript
export async function initializeUserData() {
  const openanalystDir = path.join(os.homedir(), '.openanalyst')

  // Check if already initialized
  if (await exists(openanalystDir)) {
    return { isFirstTime: false }
  }

  // Create directory structure
  await createDirectories(openanalystDir)

  // Create default files
  await createDefaultProfile(openanalystDir)
  await createDefaultAgents(openanalystDir)

  return { isFirstTime: true }
}
```

---

## 🎨 FEATURES REGISTRY

### Core Features (100% Complete)

| Feature | Status | Location | API Endpoint |
|---------|--------|----------|--------------|
| **User Profile** | ✅ Active | `~/.openanalyst/profile/` | `/api/profile` |
| **Challenges** | ✅ Active | `~/.openanalyst/challenges/` | `/api/challenges` |
| **Agents** | ✅ Active | `~/.openanalyst/agents.json` | `/api/agents` |
| **Skills Marketplace** | ✅ Active | `./skills/` + UI page | `/api/skills` |
| **Interactive Onboarding** | ✅ Active | Chat-based wizard | Built into chat |
| **Streak Tracking** | ✅ Active | Challenge metadata | `/api/challenges/[id]/streak` |
| **Calendar (Month/Week/Day)** | ✅ Active | `/schedule` page | `/api/schedule` |
| **Planning Section** | ✅ Active | `/plan` page | `/api/plans` |
| **Punishment System** | ✅ Active | `~/.openanalyst/punishments/` | `/api/punishments` |
| **Vision Boards** | ✅ Active | `~/.openanalyst/visionboards/` | `/api/visionboards` |
| **Custom Prompts** | ✅ Active | `/prompts` page | `/api/prompts` |
| **Chat History** | ✅ Active | `~/.openanalyst/chats/` | `/api/chats` |

### Punishment System Components

| Component | File | Purpose |
|-----------|------|---------|
| PunishmentBanner | `ui/components/punishment/PunishmentBanner.tsx` | Shows active punishments |
| PunishmentSetup | `ui/components/punishment/PunishmentSetup.tsx` | 3-step wizard to configure |
| PunishmentHistory | `ui/components/punishment/PunishmentHistory.tsx` | View/manage history |

### Vision Board System Components

| Component | File | Purpose |
|-----------|------|---------|
| VisionBoardWizard | `ui/components/visionboard/VisionBoardWizard.tsx` | 5-step creation wizard |
| VisionBoardViewer | `ui/components/visionboard/VisionBoardViewer.tsx` | Interactive viewer |
| Vision Boards Page | `ui/app/(shell)/visionboards/page.tsx` | Management page |

---

## 🔌 API ENDPOINTS

### Agents
```
GET    /api/agents              # List all agents
POST   /api/agents              # Create new agent
GET    /api/agents/[id]         # Get agent details
PUT    /api/agents/[id]         # Update agent
DELETE /api/agents/[id]         # Delete agent
GET    /api/agents/[id]/skills  # Get agent's skills
PUT    /api/agents/[id]/skills  # Update agent's skills
```

### Challenges
```
GET    /api/challenges          # List all challenges
POST   /api/challenges          # Create challenge
GET    /api/challenges/[id]     # Get challenge details
PUT    /api/challenges/[id]     # Update challenge
DELETE /api/challenges/[id]     # Delete challenge
```

### Skills
```
GET    /api/skills              # List all skills (from ./skills/)
GET    /api/skills/[id]         # Get skill details + SKILL.md content
PUT    /api/skills/[id]         # Update skill (saves to ./skills/[id]/SKILL.md)
```

### Vision Boards
```
GET    /api/visionboards        # List all vision boards
POST   /api/visionboards        # Create vision board
GET    /api/visionboards/[id]   # Get board details
PUT    /api/visionboards/[id]   # Update board
DELETE /api/visionboards/[id]   # Delete board
```

### Punishments
```
GET    /api/punishments         # List punishments (with filters)
POST   /api/punishments         # Create punishment
GET    /api/punishments/[id]    # Get punishment details
PUT    /api/punishments/[id]    # Update punishment
DELETE /api/punishments/[id]    # Delete punishment
GET    /api/punishments/check   # Check if any should trigger
```

### Plans
```
GET    /api/plans               # List all plans
POST   /api/plans               # Create plan
GET    /api/plans/[id]          # Get plan details
PUT    /api/plans/[id]          # Update plan
DELETE /api/plans/[id]          # Delete plan
```

### System
```
GET    /api/system/index        # Read architecture index
PUT    /api/system/index        # Update index section
POST   /api/system/index        # Log action to index
```

---

## 🎓 SKILLS SYSTEM

### How Skills Work

1. **Skills are stored in `./skills/` directory** (part of template)
2. **Each skill has a `SKILL.md` file** describing what it does
3. **Skills are READ-ONLY** for users (can view, not delete from disk)
4. **Users can edit descriptions** via UI (saves back to `./skills/[id]/SKILL.md`)
5. **Skills are attached to agents** via `~/.openanalyst/agents.json`

### Available Skills (14 total)

| Skill ID | Name | Category | Description |
|----------|------|----------|-------------|
| streak | Streak Tracker | Productivity | Track daily streaks and habits |
| daily-checkin | Daily Check-in | Productivity | Guided daily reflection |
| motivation | Motivation | Productivity | Personalized motivational messages |
| punishment | Punishment | Accountability | Accountability contracts |
| excalidraw | Excalidraw Diagrams | Creative | Generate architecture diagrams |
| schedule-replanner | Schedule Replanner | Productivity | Optimize schedules |
| user-onboarding | User Onboarding | Learning | First-time setup wizard |
| challenge-onboarding | Challenge Onboarding | Learning | Create challenges |
| nutritional-specialist | Nutritional Specialist | Health | Personalized nutrition advice |
| skill-writer | Skill Writer | Learning | Create new skills |
| nanobanana-skill | NanoBanana AI Images | Creative | AI image generation |
| workout-program-designer | Workout Program Designer | Health | Fitness plans |
| wisdom-accountability-coach | Wisdom Coach | Productivity | Philosophy & coaching |
| reinforcement-drills | Reinforcement Drills | Learning | Post-coaching practice |

### Skill File Structure
```
skills/
└── [skill-id]/
    ├── SKILL.md              # Main skill description (editable via UI)
    ├── examples/             # Optional examples
    ├── prompts/              # Optional custom prompts
    └── assets/               # Optional assets
```

### Adding Skills to Agents
```typescript
// Via API
PUT /api/agents/[id]/skills
{
  "skills": ["streak", "daily-checkin", "motivation", "punishment"]
}

// Via UI
1. Go to Skills Marketplace page
2. Click "Add to Agent" on any skill
3. Skills automatically attached to current agent
```

---

## ⚖️ PUNISHMENT SYSTEM

### How Punishments Work

1. **User creates a challenge** (e.g., "Learn Python")
2. **User sets up punishment** via `PunishmentSetup` wizard
3. **System tracks streak** and checks conditions daily
4. **Punishment triggers** when conditions are met
5. **User can forgive or execute** punishment

### Punishment Types

| Type | Description | Severity |
|------|-------------|----------|
| Message | Stern accountability message | Mild |
| Restriction | Lose feature access for 24h | Moderate |
| Donation | Donate $10 to charity | Severe |
| Public Shame | Post confession to social media | Severe |
| Custom | User-defined consequence | Moderate |

### Trigger Types

| Trigger | Description | Example |
|---------|-------------|---------|
| streak_days | Consecutive days missed | Miss 3 days in a row |
| missed_count | Total missed check-ins | Miss 5 total check-ins |
| deadline | Deadline missed | Miss target date |

### Punishment Workflow
```
1. User creates challenge
2. PunishmentSetup wizard opens:
   Step 1: Choose trigger (streak_days, missed_count, deadline)
   Step 2: Set threshold (e.g., 3 days)
   Step 3: Choose consequence (message, restriction, donation, etc.)
3. Punishment saved to ~/.openanalyst/punishments/active.json
4. System checks daily via /api/punishments/check
5. If triggered:
   - Status changes to "triggered"
   - PunishmentBanner shows in UI
   - User can "forgive" or "mark executed"
6. History tracked in ~/.openanalyst/punishments/history.json
```

---

## 🎨 VISION BOARD SYSTEM

### How Vision Boards Work

1. **User clicks "Create Vision Board"** in sidebar or quick action
2. **5-step wizard** guides creation:
   - Step 1: Basic Info (title, description)
   - Step 2: Goals (categorized by career, health, etc.)
   - Step 3: Affirmations (positive statements)
   - Step 4: Images (upload inspirational photos)
   - Step 5: Customization (theme, layout)
3. **Board saved** to `~/.openanalyst/visionboards/[id].json`
4. **Images stored** in `~/.openanalyst/visionboards/[id]/images/`
5. **Interactive viewer** allows marking goals as achieved

### Vision Board Structure
```json
{
  "id": "vb-1234567890",
  "title": "My 2025 Goals",
  "description": "Visualizing my dreams",
  "agentId": "accountability-coach",
  "images": [
    { "id": "img-1", "url": "path/to/image.jpg", "caption": "Dream home" }
  ],
  "goals": [
    {
      "id": "goal-1",
      "text": "Build a successful SaaS product",
      "category": "career",
      "achieved": false
    }
  ],
  "affirmations": [
    "I am capable of achieving my goals",
    "Success is my natural state"
  ],
  "theme": "dark",
  "layout": "grid",
  "createdAt": "2025-12-27T00:00:00.000Z",
  "updatedAt": "2025-12-27T00:00:00.000Z"
}
```

### Goal Categories
- Career & Professional
- Health & Fitness
- Relationships & Social
- Personal Growth
- Financial & Wealth
- Creative & Hobbies
- Custom

---

## 💾 DATA PERSISTENCE RULES

### Rule 1: User Data Lives in `~/.openanalyst/`
**NEVER store user data in the template directory.**

✅ **Correct:**
```typescript
const openanalystDir = path.join(os.homedir(), '.openanalyst')
const profilePath = path.join(openanalystDir, 'profile', 'profile.md')
```

❌ **Wrong:**
```typescript
const profilePath = './profile/profile.md' // DON'T DO THIS
```

### Rule 2: Skills Read from `./skills/`
Skills are part of the template, not user data.

✅ **Correct:**
```typescript
const skillPath = path.join(process.cwd(), 'skills', skillId, 'SKILL.md')
```

### Rule 3: Auto-Create Missing Directories
Always ensure directories exist before writing.

```typescript
await fs.mkdir(dirPath, { recursive: true })
await fs.writeFile(filePath, content)
```

### Rule 4: Handle First-Time Users
Check and initialize if needed.

```typescript
const openanalystDir = path.join(os.homedir(), '.openanalyst')
try {
  await fs.access(openanalystDir)
} catch {
  // First-time user - initialize
  await initializeUserData()
}
```

### Rule 5: Log All Modifications
Track what changed and when.

```typescript
// After modifying a file
await fetch('/api/system/index', {
  method: 'POST',
  body: JSON.stringify({
    action: 'file_modified',
    data: { path: filePath, changes: 'What changed' }
  })
})
```

---

## 🔄 TYPICAL USER FLOWS

### First-Time User Flow
```
1. User downloads template from GitHub
2. Runs `npm install` and `npm run dev`
3. Opens http://localhost:3000
4. App detects no ~/.openanalyst/ folder
5. Auto-creates directory structure
6. Shows onboarding wizard:
   - Choose persona (Strict/Balanced/Friendly)
   - Set name and timezone
   - Optionally set New Year resolution
   - Create first challenge (MANDATORY)
7. User data initialized in ~/.openanalyst/
8. User can now use all features
```

### Returning User Flow
```
1. User opens http://localhost:3000
2. App detects ~/.openanalyst/ exists
3. Loads profile, agents, challenges from files
4. Displays dashboard with:
   - Active challenges
   - Streak status
   - Quick actions
5. User continues tracking progress
```

### Creating a Challenge Flow
```
1. User clicks "New Challenge" quick action
2. Conversational onboarding starts in chat
3. Agent asks questions:
   - What skill/goal?
   - Challenge type? (learning, fitness, habit, etc.)
   - Deadline?
   - Daily hours commitment?
   - Available time slots?
   - Punishment setup?
4. Agent generates plan
5. Creates challenge files:
   - ~/.openanalyst/challenges/[id]/.skill-meta.json
   - ~/.openanalyst/challenges/[id]/plan.md
   - ~/.openanalyst/challenges/[id]/progress.md
   - ~/.openanalyst/challenges/[id]/punishment.json
6. Links challenge to agent in agents.json
7. Challenge appears in sidebar
```

### Creating Vision Board Flow
```
1. User clicks "Create Vision Board"
2. 5-step wizard opens
3. User fills in:
   - Title and description
   - Goals (categorized)
   - Affirmations
   - Images (uploads)
   - Theme and layout
4. Saves to:
   - ~/.openanalyst/visionboards/[id].json
   - ~/.openanalyst/visionboards/[id]/images/
5. Appears in Vision Boards page
6. User can view, edit, delete
```

---

## 📝 IMPORTANT NOTES FOR CLAUDE CODE

### What to Do on EVERY Session
1. **Read `ARCHITECTURE_INDEX.md`** (this file) first
2. **Check if `~/.openanalyst/` exists**
   - If yes: Load user data
   - If no: Initialize user data
3. **Read user's profile** from `~/.openanalyst/profile/profile.md`
4. **Read agents** from `~/.openanalyst/agents.json`
5. **Read challenges** from `~/.openanalyst/challenges/`
6. **Now you know the user's context** - proceed accordingly

### What NEVER to Do
1. ❌ Break the existing architecture
2. ❌ Hardcode absolute paths (use `~/.openanalyst/` or relative paths)
3. ❌ Delete skills from `./skills/` directory
4. ❌ Store user data in template directory
5. ❌ Skip initialization checks
6. ❌ Assume files exist without checking

### What to ALWAYS Do
1. ✅ Read this file first
2. ✅ Initialize user data if missing
3. ✅ Use `~/.openanalyst/` for user data
4. ✅ Use `./skills/` for skills (read-only)
5. ✅ Create directories before writing files
6. ✅ Handle errors gracefully
7. ✅ Log modifications to architecture index
8. ✅ Preserve existing structure while enhancing

---

## 🎯 SUCCESS CRITERIA

### For Claude Code
- ✅ Can initialize any new user automatically
- ✅ Reads this file first on every session
- ✅ Never breaks existing architecture
- ✅ Uses correct file paths (user data vs template)
- ✅ Creates missing files/folders as needed
- ✅ Tracks all modifications

### For Users
- ✅ Can download template and run immediately
- ✅ No manual setup required (auto-initialization)
- ✅ All features work out-of-box
- ✅ Data persists across sessions
- ✅ Can create challenges, vision boards, punishments
- ✅ Conversational onboarding works seamlessly

---

## 📚 RELATED DOCUMENTATION

- **[README.md](./README.md)** - Main project README
- **[CLAUDE_CODE_INSTRUCTIONS.md](./CLAUDE_CODE_INSTRUCTIONS.md)** - Detailed Claude Code guide
- **[DATA_PERSISTENCE_GUIDE.md](./DATA_PERSISTENCE_GUIDE.md)** - Data storage patterns
- **[USER_MANUAL.md](./USER_MANUAL.md)** - End-user guide
- **[SETUP_GUIDE.md](./SETUP_GUIDE.md)** - Installation guide
- **[SKILL_CREATION_GUIDE.md](./SKILL_CREATION_GUIDE.md)** - Create custom skills

---

## 🔧 TROUBLESHOOTING

### Issue: "Agent not found" error
**Solution:** Check if `~/.openanalyst/agents.json` exists. If not, run initialization.

### Issue: Skills not loading
**Solution:** Skills are in `./skills/` directory. Ensure API reads from correct path.

### Issue: User data not persisting
**Solution:** Check `~/.openanalyst/` permissions. Ensure app can write to user's home directory.

### Issue: First-time user sees errors
**Solution:** Ensure auto-initialization runs. Check `initializeUserData()` function.

---

## 🏁 FINAL CHECKLIST

Before any user starts:
- [ ] `ARCHITECTURE_INDEX.md` exists in root directory
- [ ] `./skills/` directory has 14+ skills
- [ ] All API endpoints work
- [ ] Auto-initialization code is in place
- [ ] UI components are complete
- [ ] No hardcoded paths exist
- [ ] All documentation is up-to-date

---

**End of Architecture Index**

This file is the source of truth for Claude Code. Keep it updated as features evolve.
