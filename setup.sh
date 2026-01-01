#!/bin/bash

# OpenAnalyst Accountability Coach - Setup Script
# This script automates the installation and setup process

set -e

echo "🚀 OpenAnalyst Accountability Coach - Setup"
echo "==========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node.js installation
echo "Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    echo "Please install Node.js 18+ from https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js version 18 or higher is required${NC}"
    echo "Current version: $(node -v)"
    exit 1
fi

echo -e "${GREEN}✓ Node.js $(node -v) detected${NC}"
echo ""

# Check npm installation
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ npm $(npm -v) detected${NC}"
echo ""

# Navigate to UI directory
echo "Navigating to UI directory..."
cd ui

# Install dependencies
echo "📦 Installing dependencies..."
npm install

echo ""
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file..."

    # Prompt for API keys
    echo ""
    echo "Please enter your API keys (press Enter to skip and configure later):"
    echo ""

    read -p "Anthropic API Key (for Claude): " ANTHROPIC_KEY
    read -p "Gemini API Key (for vision features): " GEMINI_KEY

    cat > .env << EOF
# Anthropic API (Claude)
ANTHROPIC_API_KEY=${ANTHROPIC_KEY:-your_claude_api_key_here}

# Gemini API (Google)
GEMINI_API_KEY=${GEMINI_KEY:-your_gemini_api_key_here}
GEMINI_MODEL=gemini-1.5-pro

# OpenAnalyst Directory (optional, defaults to ~/.openanalyst)
# OPENANALYST_DIR=/custom/path/to/.openanalyst
EOF

    echo ""
    echo -e "${GREEN}✓ .env file created${NC}"

    if [ -z "$ANTHROPIC_KEY" ] || [ -z "$GEMINI_KEY" ]; then
        echo -e "${YELLOW}⚠️  API keys not provided. Please edit ui/.env to add your keys.${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  .env file already exists, skipping...${NC}"
fi

echo ""

# Create data directory structure (local to project)
echo "Creating data directory structure..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATA_DIR="$SCRIPT_DIR/data"

mkdir -p "$DATA_DIR"/{.registry,.inbox,chats,checkins,challenges,contracts,profile,schedule,todos,visionboards}
mkdir -p "$DATA_DIR/agents/accountability-coach/workspace"

echo -e "${GREEN}✓ Directory structure created at $DATA_DIR${NC}"
echo ""

# Create system index.md for Claude Code
echo "Creating system index for Claude Code..."
cat > "$DATA_DIR/index.md" << 'INDEXEOF'
# OpenAnalyst Architecture Index
> Last Updated: $(date +"%Y-%m-%d %H:%M:%S")
> Version: 2.0

## System Overview
- **App Name:** OpenAnalyst Accountability Coach
- **User:** New User
- **Created:** $(date +"%Y-%m-%d")
- **Total Challenges:** 0
- **Active Streaks:** 0

## Features Status

| Feature | Status | Location | Notes |
|---------|--------|----------|-------|
| User Profile | ⏳ Pending | data/profile/ | Needs first-time setup |
| Challenges | ⏳ Pending | data/challenges/ | No challenges yet |
| Streak Tracking | ✅ Ready | /streak | Available after first challenge |
| Calendar | ✅ Ready | /schedule | Available |
| Planning | ✅ Ready | /plan | Available |
| Skills Marketplace | ✅ Ready | /skills | 14 skills available |
| Punishments | ✅ Ready | /contracts | Available |
| Chat System | ✅ Ready | /app | Available |

## Available Skills (14)
1. streak - Challenge tracking
2. daily-checkin - Daily check-ins
3. motivation - Personalized motivation
4. punishment - Accountability contracts
5. excalidraw - Architecture diagrams
6. schedule-replanner - Schedule optimization
7. user-onboarding - First-time setup
8. challenge-onboarding - Challenge creation
9. nutritional-specialist - Nutrition advice
10. skill-writer - Create new skills
11. nanobanana-skill - AI image generation
12. workout-program-designer - Fitness plans
13. wisdom-accountability-coach - Philosophy & coaching
14. reinforcement-drills - Post-coaching practice

## Session Context
- **First Time Setup:** Required
- **Next Action:** Complete onboarding to create first challenge

---

**This index is automatically maintained by the system. Claude Code uses this to understand the current state.**
INDEXEOF

echo -e "${GREEN}✓ System index created${NC}"
echo ""

# Create default agent config if it doesn't exist
AGENT_CONFIG="$DATA_DIR/agents/accountability-coach/agent.json"
if [ ! -f "$AGENT_CONFIG" ]; then
    cat > "$AGENT_CONFIG" << 'EOF'
{
  "id": "accountability-coach",
  "name": "Accountability Coach",
  "description": "Your personal accountability partner - direct, supportive, action-focused",
  "version": "1.0.0",
  "capabilities": [
    "daily-checkins",
    "goal-setting",
    "schedule-management",
    "commitment-contracts",
    "progress-insights"
  ],
  "quickActions": [
    {
      "id": "checkin",
      "label": "Daily Check-in",
      "icon": "✓",
      "description": "Log your daily progress"
    },
    {
      "id": "schedule",
      "label": "Review Schedule",
      "icon": "📅",
      "description": "View and manage your calendar"
    },
    {
      "id": "insights",
      "label": "View Insights",
      "icon": "📊",
      "description": "See your progress analytics"
    }
  ]
}
EOF
    echo -e "${GREEN}✓ Default agent config created${NC}"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo "=========================================="
echo ""
echo "Next steps:"
echo ""
echo "1. Configure API keys (if you haven't already):"
echo "   Edit ui/.env and add your Anthropic and Gemini API keys"
echo ""
echo "2. Start the development server:"
echo "   cd ui && npm run dev"
echo ""
echo "3. Open your browser:"
echo "   http://localhost:3000"
echo ""
echo "4. Complete first-time onboarding:"
echo "   - Choose your accountability style"
echo "   - Set your New Year resolution (optional)"
echo "   - Create your first challenge (mandatory)"
echo ""
echo -e "${YELLOW}🤖 Claude Code Integration:${NC}"
echo ""
echo "   The app is designed to work seamlessly with Claude Code."
echo "   Claude Code will automatically:"
echo "   - Read your data from $DATA_DIR"
echo "   - Help you create agents, skills, and challenges"
echo "   - Maintain the system index.md for context"
echo "   - Execute plans and track progress"
echo ""
echo "   No CLI installation required - everything works through the UI!"
echo ""
echo "📚 For more help, see:"
echo "   - USER_MANUAL.md - Complete user guide"
echo "   - QUICK_START.md - Quick getting started"
echo "   - CLAUDE_STARTUP.md - How Claude Code works"
echo ""
echo "Your data is stored in: $DATA_DIR"
echo ""
