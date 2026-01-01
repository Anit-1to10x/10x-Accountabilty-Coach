# Claude Code Startup & Orchestration Guide

## The Vision

When a user downloads OpenAnalyst, they should:

1. **Download the template**
2. **Open terminal and run:** `claude-code`
3. **Claude Code does EVERYTHING:**
   - Installs all dependencies
   - Starts the Next.js server
   - Opens WebSocket server
   - Provides a single link to the UI
4. **User clicks link** → Interacts ONLY with the UI
5. **Claude Code handles ALL logic** behind the scenes

The user should **NEVER** need to:
- Run `npm install` manually
- Run `npm run dev` manually
- Know about WebSocket ports
- Understand the technical architecture

## What Claude Code Should Do on `start` Command

When the user runs `claude-code` in the OpenAnalyst directory and says "start" or "start the app":

###Step 1: Detect OpenAnalyst Project

```python
def is_openanalyst_project():
    """Check if current directory is OpenAnalyst"""
    required_files = [
        'ARCHITECTURE_INDEX.md',
        'HOW_IT_WORKS.md',
        'ui/package.json',
        '.env'
    ]
    return all(os.path.exists(f) for f in required_files)
```

### Step 2: Install Dependencies (if needed)

```bash
# Check if node_modules exists
if [ ! -d "ui/node_modules" ]; then
    echo "📦 Installing dependencies..."
    cd ui && npm install
fi
```

### Step 3: Start WebSocket Server

```python
# Start WebSocket server on port 8765
print("🔌 Starting WebSocket server on ws://localhost:8765")
asyncio.create_task(start_websocket_server())
```

### Step 4: Start Next.js Dev Server

```python
# Start Next.js in background
print("🚀 Starting Next.js UI server...")
ui_process = subprocess.Popen(
    ['npm', 'run', 'dev'],
    cwd='ui',
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE
)

# Wait for "Ready" message
wait_for_nextjs_ready(ui_process)
```

### Step 5: Show User the Link

```
✓ Reading ARCHITECTURE_INDEX.md
✓ Installing dependencies
✓ WebSocket server listening on ws://localhost:8765
✓ Next.js UI server ready at http://localhost:3000
✓ All systems ready!

🎉 OpenAnalyst is running!

👉 Open your browser and visit: http://localhost:3000

I'm monitoring everything behind the scenes. Just use the UI!
```

### Step 6: Handle Shutdown Gracefully

```python
def shutdown():
    """Clean shutdown"""
    print("\n🛑 Shutting down OpenAnalyst...")

    # Close WebSocket connections
    for client in websocket_clients:
        client.close()

    # Stop Next.js server
    ui_process.terminate()

    print("✓ All servers stopped")
    print("Thanks for using OpenAnalyst! 👋")
```

## Claude Code's Responsibilities

### 1. **Chat Intelligence (via WebSocket)**

When user sends a message in the UI:

```
UI → WebSocket → Claude Code
```

Claude Code:
1. Receives message via WebSocket
2. Reads context from `~/.openanalyst/` files
3. Uses Claude API to generate intelligent response
4. Streams response back via WebSocket
5. Saves response to chat file
6. Performs any requested actions (create challenge, update plan, etc.)

**NO API routes involved** - this is direct WebSocket communication.

### 2. **Plan Generation**

When user creates a challenge, Claude Code:
1. Reads user's goal, time commitment, deadline
2. Uses Claude API to generate a detailed plan
3. Writes to `~/.openanalyst/challenges/{id}/plan.md`
4. Generates backlog from plan
5. Creates schedule entries

**The UI never calls `/api/plans`** - Claude Code handles this automatically.

### 3. **Web Search (Built-in)**

Claude Code can use its built-in web search:
- User asks: "Find Python learning resources"
- Claude Code uses web search tool
- Returns results directly in chat
- No external API calls needed

### 4. **File Monitoring**

Claude Code watches `~/.openanalyst/` for changes:
- User edits plan.md manually
- Claude Code detects change
- Sends `file_update` message via WebSocket
- UI refreshes automatically

### 5. **Proactive Notifications**

Claude Code can proactively send messages:
- Daily check-in reminder at scheduled time
- Streak break warning
- Punishment trigger notification
- Milestone achievement celebration

## What API Routes Handle (NOT Claude Code)

The Next.js API routes handle **file system operations only**:

| Route | Purpose | Used By |
|-------|---------|---------|
| `GET /api/files` | Read a file from `.openanalyst/` | UI displays plan, progress, etc. |
| `PUT /api/files` | Write to a file | UI saves user edits |
| `GET /api/challenges` | List all challenges | UI sidebar shows challenges |
| `POST /api/challenges` | Create challenge file structure | Onboarding creates 6 files |
| `GET /api/agents` | List all agents | UI shows agent selector |
| `GET /api/skills` | List available skills | Skills marketplace |
| `GET /api/prompts` | List custom prompts | Prompts library |
| `GET /api/todos` | List todos from files | Calendar and sidebar |
| `GET /api/schedule/today` | Today's schedule from files | Calendar view |

**Key Point:** These routes are **file readers/writers**, not intelligence. They don't generate content - Claude Code does.

## Example: Creating a Challenge

### Current Flow (Onboarding):

```
1. User completes onboarding in UI
2. UI sends to POST /api/challenges
3. API creates 6 files (challenge-config.json, plan.md, etc.)
4. API returns success
```

### Enhanced Flow (with Claude Code):

```
1. User completes onboarding in UI
2. UI sends message via WebSocket: "Create challenge: Learn Python, 2 hours/day, 90 days"
3. Claude Code:
   - Receives via WebSocket
   - Uses Claude API to generate personalized plan
   - Creates 6 files with generated content
   - Sends confirmation via WebSocket
4. UI shows: "✅ Challenge created! Check your plan tab."
```

## Example: User Asks for Plan Update

### User Action:
```
User (in chat): "I'm falling behind. Can you adjust my Python learning plan to be less intense?"
```

### Claude Code Flow:
```python
async def handle_plan_update_request(message):
    # 1. Read current plan
    plan = read_file('~/.openanalyst/challenges/python-learning/plan.md')
    activity_log = read_file('~/.openanalyst/challenges/python-learning/activity-log.md')

    # 2. Build context
    context = f"""
    User's current plan:
    {plan}

    Recent activity:
    {activity_log}

    User request:
    {message.content}
    """

    # 3. Generate new plan using Claude API
    new_plan = await anthropic.messages.create(
        model="claude-sonnet-4-5-20250929",
        messages=[{
            "role": "user",
            "content": f"{context}\n\nGenerate an updated, less intense plan in markdown format."
        }]
    )

    # 4. Save new plan
    write_file('~/.openanalyst/challenges/python-learning/plan.md', new_plan.content)

    # 5. Notify UI via WebSocket
    send_websocket_message({
        "type": "file_update",
        "data": {
            "path": "challenges/python-learning/plan.md",
            "action": "updated"
        }
    })

    # 6. Respond to user
    stream_response(
        "I've updated your plan to be more manageable! Check the Plans tab to see the changes. " +
        "I've reduced the daily commitment and extended your timeline to avoid burnout. 📚"
    )
```

**NO API route called** - Claude Code handles everything.

## Example: User Creates a Skill via Chat

### User Action:
```
User: "Create a new skill for meditation guidance"
```

### Claude Code Flow:
```python
async def handle_skill_creation_request(message):
    # 1. Use Claude API to generate skill content
    skill_content = await generate_skill_content("meditation guidance")

    # 2. Create skill directory and file
    skill_id = "meditation-guide"
    os.makedirs(f'skills/{skill_id}', exist_ok=True)

    # 3. Write SKILL.md
    with open(f'skills/{skill_id}/SKILL.md', 'w') as f:
        f.write(skill_content)

    # 4. Update skills registry
    update_skills_registry(skill_id)

    # 5. Notify UI
    send_websocket_message({
        "type": "file_update",
        "data": {
            "path": f"skills/{skill_id}/SKILL.md",
            "action": "created"
        }
    })

    # 6. Respond
    stream_response(
        "✅ Created 'Meditation Guide' skill! You can now attach it to any agent from the Skills page."
    )
```

Again, **NO API route needed** - Claude Code creates the files directly.

## Startup Command Implementation

```python
class OpenAnalystCLI:
    def __init__(self):
        self.ws_server = None
        self.ui_process = None
        self.is_running = False

    async def start_command(self):
        """Handle 'start' or 'start the app' command"""

        # Check if in OpenAnalyst project
        if not self.is_openanalyst_project():
            return "This doesn't look like an OpenAnalyst project. Please run this command in the OpenAnalyst directory."

        print("🚀 Starting OpenAnalyst...\n")

        # Step 1: Install dependencies
        if not os.path.exists('ui/node_modules'):
            print("📦 Installing dependencies (this may take a minute)...")
            subprocess.run(['npm', 'install'], cwd='ui', check=True)
            print("✓ Dependencies installed\n")

        # Step 2: Start WebSocket server
        print("🔌 Starting WebSocket server...")
        self.ws_server = asyncio.create_task(self.start_websocket_server())
        await asyncio.sleep(1)  # Give it a moment
        print("✓ WebSocket server listening on ws://localhost:8765\n")

        # Step 3: Start Next.js
        print("🎨 Starting UI server...")
        self.ui_process = subprocess.Popen(
            ['npm', 'run', 'dev'],
            cwd='ui',
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            universal_newlines=True
        )

        # Wait for Next.js to be ready
        await self.wait_for_nextjs()
        print("✓ UI server ready at http://localhost:3000\n")

        # Step 4: Read architecture
        print("📚 Reading ARCHITECTURE_INDEX.md...")
        self.load_architecture_context()
        print("✓ Architecture loaded\n")

        # Step 5: Success message
        print("=" * 60)
        print("🎉 OpenAnalyst is running!")
        print("=" * 60)
        print("\n👉 Open your browser and visit: \033[1;34mhttp://localhost:3000\033[0m\n")
        print("I'm monitoring everything behind the scenes.")
        print("Just use the UI - I'll handle the rest!\n")
        print("Press Ctrl+C to stop.\n")

        self.is_running = True

        # Keep running
        try:
            while self.is_running:
                await asyncio.sleep(1)
        except KeyboardInterrupt:
            await self.shutdown()

    async def wait_for_nextjs(self):
        """Wait for Next.js to print 'Ready'"""
        for line in iter(self.ui_process.stdout.readline, ''):
            if 'Ready in' in line or 'Local:' in line:
                break

    async def shutdown(self):
        """Graceful shutdown"""
        print("\n\n🛑 Shutting down OpenAnalyst...")

        # Stop WebSocket server
        if self.ws_server:
            self.ws_server.cancel()
            print("✓ WebSocket server stopped")

        # Stop UI server
        if self.ui_process:
            self.ui_process.terminate()
            self.ui_process.wait()
            print("✓ UI server stopped")

        print("\nThanks for using OpenAnalyst! 👋\n")
        self.is_running = False
```

## Summary

### Claude Code's Role:
✅ **Start everything** with one command
✅ **Generate intelligent responses** via WebSocket
✅ **Create plans, skills, prompts** via Claude API
✅ **Web search** using built-in capabilities
✅ **Monitor files** and notify UI of changes
✅ **Proactive notifications** (reminders, warnings, celebrations)

### API Routes' Role:
✅ **File operations only** (read/write/list)
✅ **No intelligence** - just CRUD operations
✅ **UI data fetching** (display challenges, todos, schedule)

### User Experience:
1. Downloads template
2. Runs `claude-code`
3. Types "start" or "start the app"
4. Gets link to http://localhost:3000
5. Uses ONLY the UI
6. Claude Code handles everything else behind the scenes

This is the **true AI-native architecture** where Claude Code is the orchestrator, brain, and automation engine all in one! 🚀
