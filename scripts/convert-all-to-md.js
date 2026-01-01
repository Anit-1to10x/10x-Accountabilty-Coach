/**
 * Convert ALL JSON files to MD format
 * Run: node scripts/convert-all-to-md.js
 */

const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');

// Helper to safely read JSON
function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    console.error(`  Error reading ${filePath}:`, e.message);
    return null;
  }
}

// Convert agents.json to agents.md
function convertAgents() {
  console.log('\n=== Converting agents.json ===');
  const agentsFile = path.join(dataDir, 'agents.json');
  if (!fs.existsSync(agentsFile)) return;

  const agents = readJson(agentsFile);
  if (!agents) return;

  const agentsList = Array.isArray(agents) ? agents : [agents];

  let md = `# Agents

## Overview
Total Agents: ${agentsList.length}

`;

  agentsList.forEach(agent => {
    md += `## ${agent.name || agent.id}

- **ID:** ${agent.id}
- **Description:** ${agent.description || 'No description'}
- **Avatar:** ${agent.avatar || 'default'}
- **Is Default:** ${agent.isDefault ? 'Yes' : 'No'}

### Capabilities
${(agent.capabilities || []).map(c => `- ${c}`).join('\n') || '- None'}

### Skills
${(agent.skills || []).map(s => `- ${s}`).join('\n') || '- None'}

### Personality
- **Tone:** ${agent.personality?.tone || 'neutral'}
- **Style:** ${agent.personality?.style || 'default'}

---

`;
  });

  fs.writeFileSync(path.join(dataDir, 'agents.md'), md);
  console.log('  Created: agents.md');
}

// Convert agent.json inside agent folders
function convertAgentFolder(agentDir) {
  const agentFile = path.join(agentDir, 'agent.json');
  if (!fs.existsSync(agentFile)) return;

  const agent = readJson(agentFile);
  if (!agent) return;

  const md = `# ${agent.name || path.basename(agentDir)}

## Overview
- **ID:** ${agent.id || path.basename(agentDir)}
- **Description:** ${agent.description || 'No description'}
- **Avatar:** ${agent.avatar || 'default'}

## Capabilities
${(agent.capabilities || []).map(c => `- ${c}`).join('\n') || '- None'}

## Skills
${(agent.skills || []).map(s => `- ${s}`).join('\n') || '- None'}

## Personality
- **Tone:** ${agent.personality?.tone || 'neutral'}
- **Style:** ${agent.personality?.style || 'default'}

## Instructions
${agent.instructions || 'No specific instructions.'}
`;

  fs.writeFileSync(path.join(agentDir, 'agent.md'), md);
  console.log(`  Created: ${path.basename(agentDir)}/agent.md`);
}

// Convert streak.json and progress.json - merge into challenge.md
function updateChallengeMd(challengeDir) {
  const challengeMdPath = path.join(challengeDir, 'challenge.md');
  if (!fs.existsSync(challengeMdPath)) return;

  let challengeMd = fs.readFileSync(challengeMdPath, 'utf8');

  // Read streak.json
  const streakFile = path.join(challengeDir, 'streak.json');
  if (fs.existsSync(streakFile)) {
    const streak = readJson(streakFile);
    if (streak) {
      // Update streak section in challenge.md
      const streakSection = `## Streak
- **Current:** ${streak.current || 0} days
- **Best:** ${streak.best || streak.longest || 0} days
- **Last Check-in:** ${streak.lastCheckin || streak.last_checkin || 'None'}`;

      if (challengeMd.includes('## Streak')) {
        challengeMd = challengeMd.replace(/## Streak[\s\S]*?(?=\n##|$)/, streakSection + '\n\n');
      }
    }
  }

  // Read progress.json
  const progressFile = path.join(challengeDir, 'progress.json');
  if (fs.existsSync(progressFile)) {
    const progress = readJson(progressFile);
    if (progress) {
      // Update progress section
      const progressSection = `## Progress
- **Overall:** ${progress.percentage || progress.progress || 0}%
- **Current Day:** ${progress.currentDay || progress.current_day || 1}
- **Total Days:** ${progress.totalDays || progress.total_days || 30}
- **Completed Days:** ${progress.completedDays || 0}`;

      if (challengeMd.includes('## Progress')) {
        challengeMd = challengeMd.replace(/## Progress[\s\S]*?(?=\n##|$)/, progressSection + '\n\n');
      }
    }
  }

  // Read punishment.json
  const punishmentFile = path.join(challengeDir, 'punishment.json');
  if (fs.existsSync(punishmentFile)) {
    const punishment = readJson(punishmentFile);
    if (punishment && punishment.punishments && punishment.punishments.length > 0) {
      let punishmentSection = `## Punishments
- **Active:** ${punishment.active ? 'Yes' : 'No'}
- **Grace Period:** ${punishment.grace_period_hours || 24} hours

### Rules
`;
      punishment.punishments.forEach((p, i) => {
        punishmentSection += `${i + 1}. **${p.type || 'Rule'}**
   - Trigger: ${p.trigger?.type || 'N/A'} (${p.trigger?.value || 0})
   - Consequence: ${p.consequence?.description || 'N/A'}
   - Severity: ${p.consequence?.severity || 'mild'}

`;
      });

      if (!challengeMd.includes('## Punishments')) {
        challengeMd += '\n' + punishmentSection;
      }
    }
  }

  fs.writeFileSync(challengeMdPath, challengeMd);
  console.log(`  Updated: ${path.basename(challengeDir)}/challenge.md`);
}

// Convert todos/active.json to todos.md
function convertTodos() {
  console.log('\n=== Converting todos ===');
  const todosFile = path.join(dataDir, 'todos', 'active.json');
  if (!fs.existsSync(todosFile)) {
    console.log('  No todos/active.json found');
    return;
  }

  const todos = readJson(todosFile);
  if (!todos || !Array.isArray(todos)) return;

  let md = `# Active Todos

Last Updated: ${new Date().toISOString().split('T')[0]}

## Tasks

`;

  todos.forEach(todo => {
    const status = todo.status === 'completed' ? 'x' : ' ';
    md += `- [${status}] **${todo.title || todo.text}**
  - Priority: ${todo.priority || 'medium'}
  - Created: ${todo.createdAt || 'Unknown'}
  - Challenge: ${todo.challengeId || 'None'}

`;
  });

  fs.writeFileSync(path.join(dataDir, 'todos', 'active.md'), md);
  console.log('  Created: todos/active.md');
}

// Convert prompts/prompts.json to prompts.md
function convertPrompts() {
  console.log('\n=== Converting prompts ===');
  const promptsFile = path.join(dataDir, 'prompts', 'prompts.json');
  if (!fs.existsSync(promptsFile)) {
    console.log('  No prompts/prompts.json found');
    return;
  }

  const prompts = readJson(promptsFile);
  if (!prompts) return;

  const promptsList = Array.isArray(prompts) ? prompts : (prompts.prompts || [prompts]);

  let md = `# Prompts

## Available Prompts

`;

  promptsList.forEach(prompt => {
    md += `### ${prompt.name || prompt.title || 'Untitled'}

- **ID:** ${prompt.id || 'N/A'}
- **Category:** ${prompt.category || 'general'}
- **Description:** ${prompt.description || 'No description'}

**Template:**
\`\`\`
${prompt.template || prompt.content || prompt.text || 'No template'}
\`\`\`

---

`;
  });

  fs.writeFileSync(path.join(dataDir, 'prompts', 'prompts.md'), md);
  console.log('  Created: prompts/prompts.md');
}

// Convert profile/activity-log.json
function convertProfileActivityLog() {
  console.log('\n=== Converting profile activity log ===');
  const activityFile = path.join(dataDir, 'profile', 'activity-log.json');
  if (!fs.existsSync(activityFile)) {
    console.log('  No profile/activity-log.json found');
    return;
  }

  const activities = readJson(activityFile);
  if (!activities) return;

  const activityList = Array.isArray(activities) ? activities : (activities.activities || []);

  let md = `# Activity Log

## Recent Activity

`;

  activityList.forEach(activity => {
    md += `### ${activity.date || activity.timestamp || 'Unknown Date'}

- **Type:** ${activity.type || 'activity'}
- **Description:** ${activity.description || activity.message || 'No description'}
- **Challenge:** ${activity.challengeId || 'N/A'}

`;
  });

  fs.writeFileSync(path.join(dataDir, 'profile', 'activity-log.md'), md);
  console.log('  Created: profile/activity-log.md');
}

// Delete old JSON files that have been converted
function cleanupJsonFiles() {
  console.log('\n=== Cleaning up converted JSON files ===');

  // Delete daily/*.json files (converted to days/*.md)
  const dailyDir = path.join(dataDir, 'challenges', '30-day-react-mastery', 'daily');
  if (fs.existsSync(dailyDir)) {
    const files = fs.readdirSync(dailyDir).filter(f => f.endsWith('.json'));
    files.forEach(file => {
      fs.unlinkSync(path.join(dailyDir, file));
      console.log(`  Deleted: daily/${file}`);
    });
    // Remove the daily directory if empty
    if (fs.readdirSync(dailyDir).length === 0) {
      fs.rmdirSync(dailyDir);
      console.log('  Removed empty daily/ directory');
    }
  }

  // Delete challenge-config.json files (converted to challenge.md)
  const challengesDir = path.join(dataDir, 'challenges');
  if (fs.existsSync(challengesDir)) {
    fs.readdirSync(challengesDir).forEach(challenge => {
      const configFile = path.join(challengesDir, challenge, 'challenge-config.json');
      if (fs.existsSync(configFile)) {
        fs.unlinkSync(configFile);
        console.log(`  Deleted: ${challenge}/challenge-config.json`);
      }

      // Delete streak.json after merging
      const streakFile = path.join(challengesDir, challenge, 'streak.json');
      if (fs.existsSync(streakFile)) {
        fs.unlinkSync(streakFile);
        console.log(`  Deleted: ${challenge}/streak.json`);
      }

      // Delete progress.json after merging
      const progressFile = path.join(challengesDir, challenge, 'progress.json');
      if (fs.existsSync(progressFile)) {
        fs.unlinkSync(progressFile);
        console.log(`  Deleted: ${challenge}/progress.json`);
      }

      // Delete punishment.json after merging
      const punishmentFile = path.join(challengesDir, challenge, 'punishment.json');
      if (fs.existsSync(punishmentFile)) {
        fs.unlinkSync(punishmentFile);
        console.log(`  Deleted: ${challenge}/punishment.json`);
      }
    });
  }
}

// Main
console.log('Converting all JSON to MD format...');

// Convert agents
convertAgents();

// Convert agent folders
const agentsDir = path.join(dataDir, 'agents');
if (fs.existsSync(agentsDir)) {
  console.log('\n=== Converting agent folders ===');
  fs.readdirSync(agentsDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .forEach(d => convertAgentFolder(path.join(agentsDir, d.name)));
}

// Update challenge.md files with streak/progress data
const challengesDir = path.join(dataDir, 'challenges');
if (fs.existsSync(challengesDir)) {
  console.log('\n=== Updating challenge.md files ===');
  fs.readdirSync(challengesDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .forEach(d => updateChallengeMd(path.join(challengesDir, d.name)));
}

// Convert other files
convertTodos();
convertPrompts();
convertProfileActivityLog();

// Cleanup old JSON files
cleanupJsonFiles();

console.log('\n=== Conversion Complete ===');
console.log('All data is now in MD format!');
