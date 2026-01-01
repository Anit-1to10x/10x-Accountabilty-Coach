# OpenAnalyst Accountability Coach - Setup Script (Windows PowerShell)
# This script automates the installation and setup process

Write-Host "🚀 OpenAnalyst Accountability Coach - Setup" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js installation
Write-Host "Checking Node.js installation..." -ForegroundColor Yellow

try {
    $nodeVersion = node -v
    $versionNumber = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')

    if ($versionNumber -lt 18) {
        Write-Host "❌ Node.js version 18 or higher is required" -ForegroundColor Red
        Write-Host "Current version: $nodeVersion" -ForegroundColor Red
        exit 1
    }

    Write-Host "✓ Node.js $nodeVersion detected" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed" -ForegroundColor Red
    Write-Host "Please install Node.js 18+ from https://nodejs.org" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Check npm installation
try {
    $npmVersion = npm -v
    Write-Host "✓ npm $npmVersion detected" -ForegroundColor Green
} catch {
    Write-Host "❌ npm is not installed" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Navigate to UI directory
Write-Host "Navigating to UI directory..." -ForegroundColor Yellow
Set-Location -Path "ui"

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm install

Write-Host ""
Write-Host "✓ Dependencies installed" -ForegroundColor Green
Write-Host ""

# Create .env file if it doesn't exist
if (-not (Test-Path ".env")) {
    Write-Host "Creating .env file..." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please enter your API keys (press Enter to skip and configure later):" -ForegroundColor Cyan
    Write-Host ""

    $anthropicKey = Read-Host "Anthropic API Key (for Claude)"
    $geminiKey = Read-Host "Gemini API Key (for vision features)"

    if ([string]::IsNullOrWhiteSpace($anthropicKey)) {
        $anthropicKey = "your_claude_api_key_here"
    }

    if ([string]::IsNullOrWhiteSpace($geminiKey)) {
        $geminiKey = "your_gemini_api_key_here"
    }

    $envContent = @"
# Anthropic API (Claude)
ANTHROPIC_API_KEY=$anthropicKey

# Gemini API (Google)
GEMINI_API_KEY=$geminiKey
GEMINI_MODEL=gemini-1.5-pro

# OpenAnalyst Directory (optional, defaults to ~/.openanalyst)
# OPENANALYST_DIR=/custom/path/to/.openanalyst
"@

    Set-Content -Path ".env" -Value $envContent
    Write-Host ""
    Write-Host "✓ .env file created" -ForegroundColor Green

    if ($anthropicKey -eq "your_claude_api_key_here" -or $geminiKey -eq "your_gemini_api_key_here") {
        Write-Host "⚠️  API keys not provided. Please edit ui\.env to add your keys." -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  .env file already exists, skipping..." -ForegroundColor Yellow
}

Write-Host ""

# Create data directory structure (local to project)
Write-Host "Creating data directory structure..." -ForegroundColor Yellow
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$dataDir = Join-Path $scriptDir "data"

$directories = @(
    ".registry",
    "agents\accountability-coach\workspace",
    "chats",
    "checkins",
    "challenges",
    "contracts",
    "profile",
    "schedule",
    "todos",
    "visionboards",
    ".inbox"
)

foreach ($dir in $directories) {
    $fullPath = Join-Path $dataDir $dir
    if (-not (Test-Path $fullPath)) {
        New-Item -ItemType Directory -Path $fullPath -Force | Out-Null
    }
}

Write-Host "✓ Directory structure created at $dataDir" -ForegroundColor Green
Write-Host ""

# Create system index.md for Claude Code
Write-Host "Creating system index for Claude Code..." -ForegroundColor Yellow
$currentDate = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$shortDate = Get-Date -Format "yyyy-MM-dd"

$indexContent = @"
# OpenAnalyst Architecture Index
> Last Updated: $currentDate
> Version: 2.0

## System Overview
- **App Name:** OpenAnalyst Accountability Coach
- **User:** New User
- **Created:** $shortDate
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
"@

Set-Content -Path (Join-Path $dataDir "index.md") -Value $indexContent
Write-Host "✓ System index created" -ForegroundColor Green
Write-Host ""

# Create default agent config if it doesn't exist
$agentConfigPath = Join-Path $dataDir "agents\accountability-coach\agent.json"
if (-not (Test-Path $agentConfigPath)) {
    $agentConfig = @"
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
"@

    Set-Content -Path $agentConfigPath -Value $agentConfig
    Write-Host "✓ Default agent config created" -ForegroundColor Green
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "✅ Setup Complete!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Configure API keys (if you haven't already):" -ForegroundColor White
Write-Host "   Edit ui\.env and add your Anthropic and Gemini API keys" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Start the development server:" -ForegroundColor White
Write-Host "   cd ui" -ForegroundColor Gray
Write-Host "   npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Open your browser:" -ForegroundColor White
Write-Host "   http://localhost:3000" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Complete first-time onboarding:" -ForegroundColor White
Write-Host "   - Choose your accountability style" -ForegroundColor Gray
Write-Host "   - Set your New Year resolution (optional)" -ForegroundColor Gray
Write-Host "   - Create your first challenge (mandatory)" -ForegroundColor Gray
Write-Host ""
Write-Host "🤖 Claude Code Integration:" -ForegroundColor Yellow
Write-Host ""
Write-Host "   The app is designed to work seamlessly with Claude Code." -ForegroundColor White
Write-Host "   Claude Code will automatically:" -ForegroundColor White
Write-Host "   - Read your data from $dataDir" -ForegroundColor Gray
Write-Host "   - Help you create agents, skills, and challenges" -ForegroundColor Gray
Write-Host "   - Maintain the system index.md for context" -ForegroundColor Gray
Write-Host "   - Execute plans and track progress" -ForegroundColor Gray
Write-Host ""
Write-Host "   No CLI installation required - everything works through the UI!" -ForegroundColor White
Write-Host ""
Write-Host "📚 For more help, see:" -ForegroundColor Cyan
Write-Host "   - USER_MANUAL.md - Complete user guide" -ForegroundColor Gray
Write-Host "   - QUICK_START.md - Quick getting started" -ForegroundColor Gray
Write-Host "   - CLAUDE_STARTUP.md - How Claude Code works" -ForegroundColor Gray
Write-Host ""
Write-Host "Your data is stored in: $dataDir" -ForegroundColor Gray
Write-Host ""
