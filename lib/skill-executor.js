/**
 * Skill Executor Module
 *
 * Reads SKILL.md files and executes the instructions.
 * This is the "Claude Code as brain" implementation - skills are executed
 * by reading their .md files and following the instructions.
 *
 * Architecture:
 * 1. User triggers a skill (via chat message)
 * 2. Skill executor reads the SKILL.md content
 * 3. Executor parses instructions (flows, data storage, questions)
 * 4. Executor performs the operations (file read/write, data queries)
 * 5. Results are streamed back to UI
 */

const fs = require('fs');
const path = require('path');
const quickQuery = require('./quick-query');

const SKILLS_DIR = path.join(__dirname, '..', 'skills');
const DATA_DIR = path.join(__dirname, '..', 'data');

/**
 * Execute a skill based on its SKILL.md instructions
 * @param {Object} skill - The matched skill object
 * @param {string} userMessage - The user's message that triggered the skill
 * @param {Object} context - Current context (profile, challenges, etc.)
 * @returns {Object} Execution result with response and actions
 */
async function executeSkill(skill, userMessage, context) {
  console.log(`[SkillExecutor] Executing skill: ${skill.id}`);

  try {
    // 1. Read the full SKILL.md content
    const skillContent = readSkillContent(skill);
    if (!skillContent) {
      return {
        success: false,
        response: `Could not load skill "${skill.name}". Please try again.`,
        actions: []
      };
    }

    // 2. Parse the skill instructions
    const instructions = parseSkillInstructions(skillContent);

    // 3. Determine which flow to execute based on user message
    const flow = matchFlow(instructions, userMessage);
    console.log(`[SkillExecutor] Matched flow: ${flow?.name || 'default'}`);

    // 4. Execute the flow
    const result = await executeFlow(skill, flow, userMessage, context, instructions);

    // 5. Return result with response and any actions taken
    return {
      success: true,
      skillId: skill.id,
      skillName: skill.name,
      flow: flow?.name || 'default',
      response: result.response,
      actions: result.actions,
      dataUpdated: result.dataUpdated
    };

  } catch (error) {
    console.error(`[SkillExecutor] Error executing skill ${skill.id}:`, error);
    return {
      success: false,
      response: `Error executing skill: ${error.message}`,
      actions: []
    };
  }
}

/**
 * Read the full content of a skill's SKILL.md file
 */
function readSkillContent(skill) {
  try {
    // Handle both folder-based and file-based skills
    let skillPath;
    if (skill.format === 'claude-official') {
      skillPath = path.join(SKILLS_DIR, `${skill.id}.md`);
    } else {
      skillPath = path.join(SKILLS_DIR, skill.id, 'SKILL.md');
    }

    if (fs.existsSync(skillPath)) {
      return fs.readFileSync(skillPath, 'utf8');
    }

    // Try alternative paths
    const altPath = path.join(SKILLS_DIR, skill.id, 'SKILL.md');
    if (fs.existsSync(altPath)) {
      return fs.readFileSync(altPath, 'utf8');
    }

    console.error(`[SkillExecutor] Skill file not found: ${skillPath}`);
    return null;
  } catch (error) {
    console.error(`[SkillExecutor] Error reading skill file:`, error);
    return null;
  }
}

/**
 * Parse skill instructions from markdown content
 */
function parseSkillInstructions(content) {
  const instructions = {
    name: '',
    description: '',
    purpose: '',
    flows: [],
    dataStorage: [],
    triggers: [],
    integrations: [],
    raw: content
  };

  // Extract name from first heading
  const nameMatch = content.match(/^#\s+(.+)$/m);
  if (nameMatch) {
    instructions.name = nameMatch[1].trim();
  }

  // Extract description (first paragraph after heading)
  const descMatch = content.match(/^#\s+.+\n\n([^\n#]+)/m);
  if (descMatch) {
    instructions.description = descMatch[1].trim();
  }

  // Extract purpose section
  const purposeMatch = content.match(/##\s*Purpose\s*\n([\s\S]*?)(?=\n##|$)/i);
  if (purposeMatch) {
    instructions.purpose = purposeMatch[1].trim();
  }

  // Extract flows (sections starting with "## Flow")
  const flowRegex = /##\s*Flow\s*(\d+)?:?\s*(.+?)\n([\s\S]*?)(?=\n##|$)/gi;
  let flowMatch;
  while ((flowMatch = flowRegex.exec(content)) !== null) {
    instructions.flows.push({
      number: flowMatch[1] ? parseInt(flowMatch[1]) : instructions.flows.length + 1,
      name: flowMatch[2].trim(),
      content: flowMatch[3].trim(),
      steps: parseFlowSteps(flowMatch[3])
    });
  }

  // Extract trigger phrases from tables or lists
  const triggerMatch = content.match(/\|\s*User Says\s*\|[^\|]+\|/gi);
  if (triggerMatch) {
    const tableContent = content.match(/\|\s*User Says[\s\S]*?(?=\n\n|\n##|$)/i);
    if (tableContent) {
      const rows = tableContent[0].split('\n').slice(2); // Skip header and separator
      rows.forEach(row => {
        const cells = row.split('|').filter(c => c.trim());
        if (cells.length >= 2) {
          const trigger = cells[0].replace(/"/g, '').trim();
          const flowName = cells[1].trim();
          if (trigger && !trigger.startsWith('-')) {
            instructions.triggers.push({ trigger, flowName });
          }
        }
      });
    }
  }

  // Extract data storage paths
  const storageMatch = content.match(/##\s*Data Storage[\s\S]*?```[\s\S]*?```/i);
  if (storageMatch) {
    const paths = storageMatch[0].match(/[\.~\/][\w\-\/\.]+\.(md|json)/g);
    if (paths) {
      instructions.dataStorage = paths;
    }
  }

  // Extract integration points
  const integrationMatch = content.match(/##\s*Integration Points?\s*\n([\s\S]*?)(?=\n##|$)/i);
  if (integrationMatch) {
    const items = integrationMatch[1].match(/\*\*([^*]+)\*\*/g);
    if (items) {
      instructions.integrations = items.map(i => i.replace(/\*\*/g, '').trim());
    }
  }

  return instructions;
}

/**
 * Parse individual steps from a flow's content
 */
function parseFlowSteps(flowContent) {
  const steps = [];

  // Match numbered steps (1. Step, 2. Step, etc.)
  const numberedSteps = flowContent.match(/^\d+\.\s*\*\*([^*]+)\*\*[:\s]*(.*?)(?=^\d+\.|\n\n|$)/gms);
  if (numberedSteps) {
    numberedSteps.forEach((step, index) => {
      const match = step.match(/^\d+\.\s*\*\*([^*]+)\*\*[:\s]*(.*)/s);
      if (match) {
        steps.push({
          number: index + 1,
          action: match[1].trim(),
          description: match[2].trim()
        });
      }
    });
  }

  // Match markdown checkboxes
  const checkboxSteps = flowContent.match(/^[-*]\s*\[[ x]\]\s*.+$/gm);
  if (checkboxSteps) {
    checkboxSteps.forEach((step, index) => {
      const match = step.match(/^[-*]\s*\[[ x]\]\s*(.+)$/);
      if (match) {
        steps.push({
          number: steps.length + 1,
          action: 'checkbox',
          description: match[1].trim()
        });
      }
    });
  }

  return steps;
}

/**
 * Match the appropriate flow based on user message
 */
function matchFlow(instructions, userMessage) {
  const lowerMessage = userMessage.toLowerCase();

  // Check triggers first
  for (const trigger of instructions.triggers) {
    const triggerWords = trigger.trigger.toLowerCase().split(',').map(t => t.trim());
    for (const word of triggerWords) {
      if (lowerMessage.includes(word)) {
        // Find matching flow
        const flow = instructions.flows.find(f =>
          f.name.toLowerCase().includes(trigger.flowName.toLowerCase().replace('flow', '').trim())
        );
        if (flow) return flow;
      }
    }
  }

  // Check flow names directly
  for (const flow of instructions.flows) {
    const flowKeywords = flow.name.toLowerCase().split(/\s+/);
    for (const keyword of flowKeywords) {
      if (keyword.length > 3 && lowerMessage.includes(keyword)) {
        return flow;
      }
    }
  }

  // Return first flow as default
  return instructions.flows[0] || null;
}

/**
 * Execute a specific flow
 */
async function executeFlow(skill, flow, userMessage, context, instructions) {
  const actions = [];
  const dataUpdated = [];
  let response = '';

  const { name: userName } = context.profile || { name: 'there' };
  const { challenges = [], todos = [] } = context;

  // Get active challenge
  const activeChallenge = challenges.find(c => c.status === 'active') || challenges[0];

  // Build response based on flow type
  if (!flow) {
    // No specific flow - generate helpful response based on skill purpose
    response = generateDefaultResponse(skill, instructions, context);
  } else {
    // Execute the matched flow
    response = await generateFlowResponse(skill, flow, userMessage, context, instructions);

    // Track any data operations
    if (flow.name.toLowerCase().includes('check-in') ||
        flow.name.toLowerCase().includes('log')) {
      actions.push({
        type: 'checkin',
        description: 'Logged progress',
        timestamp: new Date().toISOString()
      });

      // Create check-in file if applicable
      const checkinResult = await createCheckinEntry(context, userMessage);
      if (checkinResult.success) {
        dataUpdated.push(checkinResult.file);
      }
    }

    if (flow.name.toLowerCase().includes('new') ||
        flow.name.toLowerCase().includes('create')) {
      actions.push({
        type: 'create',
        description: 'Started creation flow',
        timestamp: new Date().toISOString()
      });
    }
  }

  return {
    response,
    actions,
    dataUpdated
  };
}

/**
 * Generate a default response when no specific flow matches
 */
function generateDefaultResponse(skill, instructions, context) {
  const { name: userName } = context.profile || { name: 'there' };

  let response = `Hey ${userName}! `;

  if (instructions.description) {
    response += `${instructions.description}\n\n`;
  }

  // List available commands/flows
  if (instructions.flows.length > 0) {
    response += `**What you can do:**\n`;
    instructions.flows.slice(0, 5).forEach(flow => {
      response += `- ${flow.name}\n`;
    });
  }

  // Add trigger hints
  if (instructions.triggers.length > 0) {
    response += `\n**Try saying:**\n`;
    instructions.triggers.slice(0, 3).forEach(t => {
      response += `- "${t.trigger}"\n`;
    });
  }

  return response;
}

/**
 * Generate response for a specific flow
 */
async function generateFlowResponse(skill, flow, userMessage, context, instructions) {
  const { name: userName } = context.profile || { name: 'there' };
  const { challenges = [], todos = [], streak = 0 } = context;
  const activeChallenge = challenges.find(c => c.status === 'active') || challenges[0];

  let response = '';

  // Handle common flow types
  const flowName = flow.name.toLowerCase();

  if (flowName.includes('check-in') || flowName.includes('checkin')) {
    // Daily check-in flow
    response = generateCheckinResponse(userName, activeChallenge, context);
  }
  else if (flowName.includes('list')) {
    // List challenges/items flow
    response = generateListResponse(userName, challenges, context);
  }
  else if (flowName.includes('stat') || flowName.includes('progress')) {
    // Statistics/progress flow
    response = generateStatsResponse(userName, challenges, context);
  }
  else if (flowName.includes('new') || flowName.includes('create')) {
    // New challenge/item creation flow
    response = generateCreationPrompt(userName, skill, flow);
  }
  else if (flowName.includes('insight')) {
    // Insights flow
    response = generateInsightsResponse(userName, challenges, context);
  }
  else {
    // Generic flow response
    response = `**${flow.name}**\n\n`;
    response += `Hey ${userName}! Let me help you with ${flow.name.toLowerCase()}.\n\n`;

    if (flow.steps && flow.steps.length > 0) {
      response += `Here's what we'll do:\n`;
      flow.steps.slice(0, 4).forEach(step => {
        response += `${step.number}. ${step.action}\n`;
      });
    }
  }

  return response;
}

/**
 * Generate check-in response
 */
function generateCheckinResponse(userName, activeChallenge, context) {
  let response = `Hey ${userName}! Time for your check-in.\n\n`;

  if (activeChallenge) {
    const name = activeChallenge.name || activeChallenge.challenge_name;
    const streak = activeChallenge.streak || 0;
    const goal = activeChallenge.goal || '';

    response += `**Active Challenge:** ${name}\n`;
    response += `**Current Streak:** ${streak} day${streak !== 1 ? 's' : ''}\n`;
    if (goal) response += `**Goal:** ${goal}\n`;
    response += `\n`;
  }

  response += `**Quick Check-in:**\n`;
  response += `1. How did today go? (1-5 or describe)\n`;
  response += `2. What did you accomplish?\n`;
  response += `3. Any blockers or wins?\n`;
  response += `4. What's your focus for tomorrow?\n\n`;

  response += `Just reply with your update and I'll log it!`;

  return response;
}

/**
 * Generate list response
 */
function generateListResponse(userName, challenges, context) {
  let response = `Hey ${userName}! Here's your challenge overview:\n\n`;

  if (challenges.length === 0) {
    response += `No challenges yet. Want to start one?\n`;
    response += `Say "new challenge" or "start a streak" to begin!`;
    return response;
  }

  const active = challenges.filter(c => c.status === 'active');
  const pending = challenges.filter(c => c.status === 'pending');
  const completed = challenges.filter(c => c.status === 'completed');

  if (active.length > 0) {
    response += `**Active Challenges:**\n`;
    active.forEach((c, i) => {
      const name = c.name || c.challenge_name;
      const streak = c.streak || 0;
      response += `${i + 1}. ${name}`;
      if (streak > 0) response += ` - ${streak} day streak`;
      response += `\n`;
    });
    response += `\n`;
  }

  if (pending.length > 0) {
    response += `**Pending:** ${pending.length} challenge${pending.length > 1 ? 's' : ''}\n`;
  }

  if (completed.length > 0) {
    response += `**Completed:** ${completed.length} challenge${completed.length > 1 ? 's' : ''}\n`;
  }

  return response;
}

/**
 * Generate stats response
 */
function generateStatsResponse(userName, challenges, context) {
  let response = `**Your Progress, ${userName}:**\n\n`;

  const totalChallenges = challenges.length;
  const activeChallenges = challenges.filter(c => c.status === 'active').length;
  const completedChallenges = challenges.filter(c => c.status === 'completed').length;

  response += `**Challenges:**\n`;
  response += `- Total: ${totalChallenges}\n`;
  response += `- Active: ${activeChallenges}\n`;
  response += `- Completed: ${completedChallenges}\n\n`;

  // Find best streak
  const bestStreak = Math.max(...challenges.map(c => c.streak || 0), 0);
  if (bestStreak > 0) {
    response += `**Best Streak:** ${bestStreak} days\n\n`;
  }

  // Current streaks
  const activeStreaks = challenges.filter(c => c.streak && c.streak > 0);
  if (activeStreaks.length > 0) {
    response += `**Current Streaks:**\n`;
    activeStreaks.forEach(c => {
      response += `- ${c.name || c.challenge_name}: ${c.streak} days\n`;
    });
  }

  return response;
}

/**
 * Generate creation prompt
 */
function generateCreationPrompt(userName, skill, flow) {
  let response = `Great, ${userName}! Let's create something new.\n\n`;

  response += `**What type of challenge would you like to start?**\n\n`;
  response += `1. **Learning** - Courses, books, new skills\n`;
  response += `2. **Building** - Projects, shipping products\n`;
  response += `3. **Fitness** - Workouts, health goals\n`;
  response += `4. **Creative** - Art, writing, music\n`;
  response += `5. **Habit** - Daily routines, consistency\n`;
  response += `6. **Custom** - Something else\n\n`;

  response += `Reply with your choice or describe what you want to track!`;

  return response;
}

/**
 * Generate insights response
 */
function generateInsightsResponse(userName, challenges, context) {
  let response = `**Insights for ${userName}:**\n\n`;

  if (challenges.length === 0) {
    response += `No data to analyze yet. Start a challenge to see insights!`;
    return response;
  }

  // Analyze patterns
  const activeCount = challenges.filter(c => c.status === 'active').length;
  const totalStreak = challenges.reduce((sum, c) => sum + (c.streak || 0), 0);

  response += `**Overview:**\n`;
  response += `- You're tracking ${challenges.length} challenge${challenges.length > 1 ? 's' : ''}\n`;
  response += `- ${activeCount} currently active\n`;
  response += `- Total streak days: ${totalStreak}\n\n`;

  // Suggestions
  if (activeCount === 0) {
    response += `**Suggestion:** Consider reactivating a challenge or starting fresh!\n`;
  } else if (activeCount > 3) {
    response += `**Suggestion:** You have many active challenges. Consider focusing on fewer for better results.\n`;
  } else {
    response += `**Keep it up!** Consistency is key to success.\n`;
  }

  return response;
}

/**
 * Create a check-in entry file
 */
async function createCheckinEntry(context, userMessage) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const profileId = context.profileId || quickQuery.getFirstProfileId();

    if (!profileId) {
      return { success: false, error: 'No profile' };
    }

    // Create check-in directory if needed
    const checkinsDir = path.join(DATA_DIR, 'profiles', profileId, 'checkins');
    if (!fs.existsSync(checkinsDir)) {
      fs.mkdirSync(checkinsDir, { recursive: true });
    }

    // Create check-in file
    const checkinFile = path.join(checkinsDir, `${today}.md`);
    const checkinContent = `# Check-in: ${today}

## Summary
- **Time:** ${new Date().toLocaleTimeString()}
- **Message:** ${userMessage}

## Notes
(Auto-logged by OpenAnalyst)

---
*Created: ${new Date().toISOString()}*
`;

    fs.writeFileSync(checkinFile, checkinContent);

    return { success: true, file: checkinFile };
  } catch (error) {
    console.error('[SkillExecutor] Error creating check-in:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all available skills with their full content
 */
function getAllSkillsWithContent() {
  const skills = [];

  if (!fs.existsSync(SKILLS_DIR)) {
    return skills;
  }

  const entries = fs.readdirSync(SKILLS_DIR, { withFileTypes: true });

  // Folder-based skills
  entries.filter(e => e.isDirectory()).forEach(dir => {
    const skillPath = path.join(SKILLS_DIR, dir.name, 'SKILL.md');
    if (fs.existsSync(skillPath)) {
      const content = fs.readFileSync(skillPath, 'utf8');
      const instructions = parseSkillInstructions(content);
      skills.push({
        id: dir.name,
        name: instructions.name || dir.name,
        description: instructions.description,
        path: skillPath,
        flows: instructions.flows.length,
        triggers: instructions.triggers.length
      });
    }
  });

  // File-based skills
  entries.filter(e => e.isFile() && e.name.endsWith('.md')).forEach(file => {
    const skillPath = path.join(SKILLS_DIR, file.name);
    const content = fs.readFileSync(skillPath, 'utf8');
    const instructions = parseSkillInstructions(content);
    skills.push({
      id: file.name.replace('.md', ''),
      name: instructions.name || file.name.replace('.md', ''),
      description: instructions.description,
      path: skillPath,
      format: 'claude-official',
      flows: instructions.flows.length,
      triggers: instructions.triggers.length
    });
  });

  return skills;
}

module.exports = {
  executeSkill,
  readSkillContent,
  parseSkillInstructions,
  matchFlow,
  getAllSkillsWithContent
};
