# Installation Guide - 10x Accountability Coach

**Powered by Claude Code SDK** - This app uses Claude Code as THE BRAIN for intelligent, context-aware coaching.

## For Absolute Beginners

This guide will help you get the 10x Accountability Coach running on your machine, even if you've never used Node.js or Claude Code before.

---

## Prerequisites

### 1. Node.js

You need Node.js installed on your computer. If you don't have it:

### Download Node.js:
1. Go to https://nodejs.org/
2. Download the **LTS version** (recommended for most users)
3. Install it (just click Next → Next → Finish)
4. Restart your computer

### Verify Installation:
Open your terminal/command prompt and run:
```bash
node --version
npm --version
```

You should see version numbers like:
```
v18.17.0
9.6.7
```

---

### 2. Claude Code (Optional but Recommended)

For full AI-powered intelligence, install Claude Code:

```bash
npm install -g @anthropic-ai/claude-code
```

Or visit: https://docs.anthropic.com/claude/docs/claude-code

**Without Claude Code:** The app still works with basic auto-responses.
**With Claude Code:** You get REAL AI coaching with context-aware, personalized responses.

---

## Installation (3 Options)

### Option 1: Zero-Setup Start (Recommended for Beginners)

#### Terminal 1: Start the App Infrastructure

The easiest way - just one command:

```bash
npm start
```

**That's it!** The app will:
- Automatically check if dependencies are installed
- Install any missing dependencies (root + UI)
- Start WebSocket server
- Start basic auto-responder
- Start Next.js UI
- Open at http://localhost:3000

**First-time users:** The first run will take 1-2 minutes to install dependencies. Subsequent runs are instant.

#### Terminal 2: Start Claude Code - THE BRAIN (Optional)

For full AI intelligence:

```bash
claude
```

Then tell Claude Code:
```
"Watch for OpenAnalyst messages and respond to users"
```

Claude Code will monitor `data/.pending/` and respond intelligently to all user messages.

---

### Option 2: Manual Install First

If you prefer to install everything first:

```bash
# Step 1: Install root dependencies
npm install

# Step 2: Install UI dependencies (happens automatically via postinstall)
# (or manually: cd ui && npm install)

# Step 3: Start the app
npm start
```

---

### Option 3: Use Setup Script

Run the complete setup script:

```bash
npm run setup
```

This explicitly installs both root and UI dependencies, then you can:

```bash
npm start
```

---

## What Gets Installed?

### Root Dependencies:
- `dotenv` - Environment variable management
- `ws` - WebSocket server for real-time chat

### UI Dependencies:
- `next` - React framework
- `react` - UI library
- Plus ~200 more packages for the frontend

**Total size:** ~300-400 MB (typical for modern web apps)

---

## First Run

When you run `npm start` for the first time:

```
╔══════════════════════════════════════════════════════════════╗
║               10x Accountability Coach                       ║
║               Automated Startup System                       ║
╚══════════════════════════════════════════════════════════════╝

[3:00:00 PM] Checking dependencies...
[3:00:01 PM] ⚠️  Root dependencies not found. Installing...

... (npm install output) ...

[3:01:30 PM] ✓ Root dependencies installed
[3:01:31 PM] ⚠️  UI dependencies not found. Installing...

... (npm install output) ...

[3:03:45 PM] ✓ UI dependencies installed
[3:03:46 PM] Starting WebSocket server...
[3:03:47 PM] ✓ WebSocket server running on ws://localhost:8765
[3:03:48 PM] Starting Claude Code listener...
[3:03:49 PM] ✓ Claude Code listener connected
[3:03:50 PM] Starting Next.js UI...
[3:04:15 PM] ✓ UI ready at http://localhost:3000

╔══════════════════════════════════════════════════════════════╗
║                  YOUR APP IS READY!                          ║
║               Open: http://localhost:3000                    ║
╚══════════════════════════════════════════════════════════════╝
```

---

## Subsequent Runs

After the first install, `npm start` is instant:

```
╔══════════════════════════════════════════════════════════════╗
║               10x Accountability Coach                       ║
╚══════════════════════════════════════════════════════════════╝

[3:00:00 PM] Checking dependencies...
[3:00:01 PM] ✓ All dependencies OK
[3:00:02 PM] Starting WebSocket server...
[3:00:03 PM] ✓ WebSocket server running on ws://localhost:8765
[3:00:04 PM] Starting Claude Code listener...
[3:00:05 PM] ✓ Claude Code listener connected
[3:00:06 PM] Starting Next.js UI...
[3:00:20 PM] ✓ UI ready at http://localhost:3000

╔══════════════════════════════════════════════════════════════╗
║                  YOUR APP IS READY!                          ║
║               Open: http://localhost:3000                    ║
╚══════════════════════════════════════════════════════════════╝
```

**Startup time:** ~20-30 seconds

---

## Optional: Environment Configuration

The app works out of the box, but for AI image generation (Vision Board feature), you need a Gemini API key:

### Step 1: Copy the example env file
```bash
# Windows
copy .env.example .env

# Mac/Linux
cp .env.example .env
```

### Step 2: Get a Gemini API key
1. Go to https://makersuite.google.com/app/apikey
2. Sign in with Google account
3. Create API key
4. Copy the key

### Step 3: Edit .env file
Open `.env` and add your key:
```
GEMINI_API_KEY=your_actual_api_key_here
```

**Note:** Without this key, the app still works - you just can't generate AI images in Vision Boards.

---

## Troubleshooting

### "npm: command not found"
- Node.js is not installed
- Install from https://nodejs.org/
- Restart terminal after install

### "Cannot find module 'dotenv'"
- Root dependencies not installed
- Run: `npm install` in root directory
- Or just run `npm start` (auto-installs)

### Port 3000 or 8765 already in use
- Another app is using those ports
- Find and stop the other app
- Or change ports in `.env`:
  ```
  PORT=3001
  WS_PORT=8766
  ```

### UI dependencies fail to install
- Network issue or npm cache problem
- Clear npm cache: `npm cache clean --force`
- Try again: `npm install`

### "Permission denied" on Linux/Mac
- Run with proper permissions
- Or use: `sudo npm install` (not recommended)
- Better: Fix npm permissions (Google: "npm fix permissions")

---

## What's Running?

After `npm start`, you have 4 processes running:

1. **WebSocket Server** (port 8765)
   - Handles real-time chat
   - Message routing

2. **Claude Code Listener** (background)
   - Auto-responds to messages
   - AI-powered coaching

3. **Cache System** (in-memory)
   - Fast data queries (0-2ms)
   - Profile/challenge lookups

4. **Next.js UI** (port 3000)
   - Frontend application
   - React-based interface

---

## Stopping the App

Press `Ctrl+C` in the terminal where you ran `npm start`.

All services will shut down gracefully:
```
Shutting down all services...
[3:10:00 PM] Stopping WebSocket Server...
[3:10:00 PM] Stopping ws-listener...
[3:10:00 PM] Stopping Next.js UI...
[3:10:01 PM] All services stopped
```

---

## Summary

### For New Users:
```bash
npm start
```

### That's It!
- First run: Installs everything automatically
- Opens at http://localhost:3000
- All features work out of the box
- Optional: Add Gemini API key for AI image generation

### Need Help?
- Check troubleshooting section above
- Open an issue: https://github.com/Anit-1to10x/10x-Accountability-Coach/issues
- Read the docs: See README.md

---

**Welcome to 10x Accountability Coach!** 🚀
