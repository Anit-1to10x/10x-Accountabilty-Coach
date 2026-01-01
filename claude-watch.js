#!/usr/bin/env node
/**
 * Claude Code Message Watcher
 *
 * This script helps Claude Code (YOU) watch for and respond to OpenAnalyst messages.
 *
 * Usage (from Claude Code CLI):
 * ```
 * Read and execute: node claude-watch.js
 * ```
 *
 * This will show you:
 * - Current pending messages
 * - User context for responses
 * - How to send responses back
 */

const fs = require('fs');
const path = require('path');

const PENDING_DIR = path.join(__dirname, 'data', '.pending');
const PROFILES_DIR = path.join(__dirname, 'data', 'profiles');

// Colors for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

console.log(colors.cyan + colors.bright);
console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║         Claude Code - OpenAnalyst Message Watcher         ║');
console.log('╚════════════════════════════════════════════════════════════╝');
console.log(colors.reset + '\n');

/**
 * Get pending messages
 */
function getPendingMessages() {
  if (!fs.existsSync(PENDING_DIR)) {
    fs.mkdirSync(PENDING_DIR, { recursive: true });
    return [];
  }

  const files = fs.readdirSync(PENDING_DIR).filter(f => f.endsWith('.json'));
  return files.map(f => {
    try {
      const filePath = path.join(PENDING_DIR, f);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      return { ...data, filename: f };
    } catch (e) {
      return null;
    }
  }).filter(Boolean);
}

/**
 * Get user profile
 */
function getUserProfile() {
  if (!fs.existsSync(PROFILES_DIR)) {
    return null;
  }

  const profiles = fs.readdirSync(PROFILES_DIR).filter(f =>
    fs.statSync(path.join(PROFILES_DIR, f)).isDirectory()
  );

  if (profiles.length === 0) return null;

  const profileId = profiles[0];
  const profilePath = path.join(PROFILES_DIR, profileId);

  const context = {
    profileId,
    profile: null,
    challenges: [],
    todos: null,
  };

  // Read profile.md
  try {
    const profileMd = path.join(profilePath, 'profile.md');
    if (fs.existsSync(profileMd)) {
      context.profile = fs.readFileSync(profileMd, 'utf8');
    }
  } catch (e) {}

  // Read challenges
  try {
    const challengesDir = path.join(profilePath, 'challenges');
    if (fs.existsSync(challengesDir)) {
      const files = fs.readdirSync(challengesDir).filter(f => f.endsWith('.md'));
      context.challenges = files.map(f => {
        return {
          file: f,
          content: fs.readFileSync(path.join(challengesDir, f), 'utf8').substring(0, 200)
        };
      });
    }
  } catch (e) {}

  // Read latest todos
  try {
    const todosDir = path.join(profilePath, 'todos');
    if (fs.existsSync(todosDir)) {
      const files = fs.readdirSync(todosDir).filter(f => f.endsWith('.json'));
      if (files.length > 0) {
        const latest = files.sort().pop();
        context.todos = JSON.parse(fs.readFileSync(path.join(todosDir, latest), 'utf8'));
      }
    }
  } catch (e) {}

  return context;
}

/**
 * Show pending messages
 */
function showPendingMessages() {
  const messages = getPendingMessages();

  if (messages.length === 0) {
    console.log(colors.yellow + '📭 No pending messages right now.' + colors.reset);
    console.log('   Waiting for users to send messages...\n');
    return;
  }

  console.log(colors.green + `📬 ${messages.length} pending message(s):\n` + colors.reset);

  messages.forEach((msg, index) => {
    console.log(colors.bright + `Message ${index + 1}:` + colors.reset);
    console.log(`  Request ID: ${colors.cyan}${msg.id}${colors.reset}`);
    console.log(`  Agent: ${msg.agentId}`);
    console.log(`  Content: "${msg.content}"`);
    console.log(`  File: ${msg.filename}`);
    console.log('');
  });
}

/**
 * Show user context
 */
function showUserContext() {
  const context = getUserProfile();

  if (!context) {
    console.log(colors.yellow + '⚠️  No user profile found.' + colors.reset);
    console.log('   User needs to set up their profile first.\n');
    return;
  }

  console.log(colors.blue + `👤 User Context (${context.profileId}):\n` + colors.reset);

  if (context.profile) {
    console.log('  ✓ Profile loaded');
  }

  if (context.challenges.length > 0) {
    console.log(`  ✓ ${context.challenges.length} active challenge(s)`);
    context.challenges.forEach(c => {
      console.log(`    - ${c.file}`);
    });
  }

  if (context.todos) {
    const pending = context.todos.filter((t: any) => t.status !== 'completed').length;
    console.log(`  ✓ ${pending} pending task(s) today`);
  }

  console.log('');
}

/**
 * Show how to respond
 */
function showHowToRespond() {
  const messages = getPendingMessages();

  if (messages.length === 0) {
    return;
  }

  console.log(colors.bright + '📤 How to Respond:\n' + colors.reset);
  console.log('1. Generate your response based on the user\'s message and context');
  console.log('2. Use the send-response-fast.js script to send it back:');
  console.log('');

  messages.forEach((msg, index) => {
    console.log(colors.cyan + `   node send-response-fast.js ${msg.id}` + colors.reset);
  });

  console.log('');
  console.log('The script will automatically:');
  console.log('  - Load user context');
  console.log('  - Send your response to the UI via WebSocket');
  console.log('  - Delete the pending file');
  console.log('  - User sees your response in real-time');
  console.log('');
}

/**
 * Show continuous watch instructions
 */
function showWatchInstructions() {
  console.log(colors.bright + '🔄 Continuous Watching:\n' + colors.reset);
  console.log('To continuously watch for messages, use Node\'s fs.watch():');
  console.log('');
  console.log(colors.cyan + '```javascript');
  console.log('const fs = require(\'fs\');');
  console.log('const path = require(\'path\');');
  console.log('');
  console.log('const PENDING_DIR = path.join(__dirname, \'data\', \'.pending\');');
  console.log('');
  console.log('// Watch for new messages');
  console.log('fs.watch(PENDING_DIR, (eventType, filename) => {');
  console.log('  if (filename && filename.endsWith(\'.json\')) {');
  console.log('    console.log(`New message: ${filename}`);');
  console.log('    // Process the message here');
  console.log('  }');
  console.log('});');
  console.log('```' + colors.reset);
  console.log('');
  console.log('Or poll every few seconds:');
  console.log('');
  console.log(colors.cyan + '  setInterval(() => {' + colors.reset);
  console.log(colors.cyan + '    checkForPendingMessages();' + colors.reset);
  console.log(colors.cyan + '  }, 2000); // Check every 2 seconds' + colors.reset);
  console.log('');
}

// Main execution
console.log(colors.bright + '📊 Current Status:\n' + colors.reset);
showPendingMessages();
showUserContext();
showHowToRespond();
showWatchInstructions();

console.log(colors.green + colors.bright);
console.log('✨ You (Claude Code) are now informed about OpenAnalyst messages!');
console.log(colors.reset);
console.log('');
console.log('Next steps:');
console.log('1. If there are pending messages, respond to them');
console.log('2. Set up continuous watching if you want to auto-respond');
console.log('3. Or run this script again to check for new messages');
console.log('');
