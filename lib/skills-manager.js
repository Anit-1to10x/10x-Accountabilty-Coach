/**
 * Skills Manager Module
 *
 * Loads, matches, and invokes skills based on user messages.
 * Supports both explicit /command invocation and implicit keyword matching.
 */

const fs = require('fs');
const path = require('path');

class SkillsManager {
  constructor() {
    this.skills = new Map();
    this.commands = new Map();
    this.skillsDir = path.join(__dirname, '..', 'skills');
    this.commandsDir = path.join(__dirname, '..', 'commands');
    this.agentsFile = path.join(__dirname, '..', 'data', 'agents.json');
    this.agents = {};
    this.initialized = false;
  }

  /**
   * Initialize the skills manager
   */
  async initialize() {
    if (this.initialized) return;

    console.log('[SkillsManager] Initializing...');

    try {
      this.loadAllSkills();
      this.loadAllCommands();
      this.loadAgents();
      this.initialized = true;
      console.log(`[SkillsManager] Loaded ${this.skills.size} skills, ${this.commands.size} commands`);
    } catch (error) {
      console.error('[SkillsManager] Initialization error:', error.message);
    }

    return this;
  }

  /**
   * Load all skills from skills/ directory
   * Supports both:
   * 1. Folder-based: skills/{name}/SKILL.md (OpenAnalyst format)
   * 2. File-based: skills/{name}.md (Claude official format)
   */
  loadAllSkills() {
    if (!fs.existsSync(this.skillsDir)) {
      console.warn('[SkillsManager] Skills directory not found:', this.skillsDir);
      return;
    }

    const entries = fs.readdirSync(this.skillsDir, { withFileTypes: true });

    // Load folder-based skills (OpenAnalyst format)
    const skillFolders = entries.filter(d => d.isDirectory()).map(d => d.name);
    skillFolders.forEach(folder => {
      const skillPath = path.join(this.skillsDir, folder, 'SKILL.md');
      if (fs.existsSync(skillPath)) {
        const skill = this.parseSkillFile(skillPath, folder);
        if (skill) {
          this.skills.set(skill.id, skill);
        }
      }
    });

    // Load file-based skills (Claude official format - single .md files)
    const skillFiles = entries.filter(d => d.isFile() && d.name.endsWith('.md')).map(d => d.name);
    skillFiles.forEach(file => {
      const skillPath = path.join(this.skillsDir, file);
      const skillId = file.replace('.md', '');

      // Don't load if folder-based version already exists
      if (!this.skills.has(skillId)) {
        const skill = this.parseSkillFile(skillPath, skillId);
        if (skill) {
          skill.format = 'claude-official'; // Mark as Claude official format
          this.skills.set(skill.id, skill);
        }
      }
    });

    console.log(`[SkillsManager] Loaded ${skillFolders.length} folder skills, ${skillFiles.length} file skills`);
  }

  /**
   * Load all commands from commands/ directory
   */
  loadAllCommands() {
    if (!fs.existsSync(this.commandsDir)) {
      console.warn('[SkillsManager] Commands directory not found:', this.commandsDir);
      return;
    }

    const commandFiles = fs.readdirSync(this.commandsDir)
      .filter(f => f.endsWith('.md'));

    commandFiles.forEach(file => {
      const commandPath = path.join(this.commandsDir, file);
      const command = this.parseCommandFile(commandPath, file);
      if (command) {
        this.commands.set(command.id, command);
      }
    });
  }

  /**
   * Load agents configuration
   */
  loadAgents() {
    if (fs.existsSync(this.agentsFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(this.agentsFile, 'utf8'));
        this.agents = data.agents || data || {};
      } catch (error) {
        console.warn('[SkillsManager] Could not load agents.json:', error.message);
      }
    }
  }

  /**
   * Parse a SKILL.md file
   */
  parseSkillFile(filePath, folderId) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const { frontmatter, body } = this.parseFrontmatter(content);

      // Extract triggers from frontmatter or body
      const triggers = this.extractTriggers(frontmatter, body);

      return {
        id: frontmatter.name || folderId,
        name: frontmatter.name || folderId,
        description: frontmatter.description || '',
        triggers,
        body,
        path: filePath,
        type: 'skill'
      };
    } catch (error) {
      console.warn(`[SkillsManager] Error parsing skill ${folderId}:`, error.message);
      return null;
    }
  }

  /**
   * Parse a command markdown file
   */
  parseCommandFile(filePath, fileName) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const { frontmatter, body } = this.parseFrontmatter(content);
      const commandId = fileName.replace('.md', '');

      return {
        id: commandId,
        name: commandId,
        command: `/${commandId}`,
        description: frontmatter.description || '',
        body,
        path: filePath,
        type: 'command'
      };
    } catch (error) {
      console.warn(`[SkillsManager] Error parsing command ${fileName}:`, error.message);
      return null;
    }
  }

  /**
   * Parse YAML frontmatter from markdown content
   */
  parseFrontmatter(content) {
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
    const match = content.match(frontmatterRegex);

    if (!match) {
      return { frontmatter: {}, body: content };
    }

    const frontmatterStr = match[1];
    const body = match[2];
    const frontmatter = {};

    // Simple YAML parsing
    frontmatterStr.split('\n').forEach(line => {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim();
        let value = line.substring(colonIndex + 1).trim();

        // Handle arrays
        if (value.startsWith('[') && value.endsWith(']')) {
          value = value.slice(1, -1).split(',').map(v => v.trim().replace(/"/g, '').replace(/'/g, ''));
        }

        frontmatter[key] = value;
      }
    });

    return { frontmatter, body };
  }

  /**
   * Extract trigger phrases from skill content
   * Conservative extraction - only explicit triggers
   */
  extractTriggers(frontmatter, body) {
    const triggers = [];

    // From frontmatter triggers array (explicit - most important)
    if (frontmatter.triggers && Array.isArray(frontmatter.triggers)) {
      triggers.push(...frontmatter.triggers.map(t => t.toLowerCase().trim()));
    }

    // Extract only from explicit "Triggers on:" line in description
    if (frontmatter.description) {
      const triggersMatch = frontmatter.description.match(/triggers?\s*(?:on)?:?\s*([^.]+)/i);
      if (triggersMatch) {
        const triggerPhrases = triggersMatch[1].split(',').map(t => t.trim().toLowerCase());
        triggers.push(...triggerPhrases);
      }
    }

    // Extract from "| trigger phrase |" table rows - only the user input column
    const triggerRowRegex = /\|\s*"([^"]+)"\s*\|/g;
    let match;
    while ((match = triggerRowRegex.exec(body)) !== null) {
      const phrase = match[1].trim().toLowerCase();
      if (phrase && phrase.length > 2 && phrase.length < 40) {
        triggers.push(phrase);
      }
    }

    // Deduplicate and filter empty
    return [...new Set(triggers)].filter(t => t && t.length > 2);
  }

  /**
   * Get skills for a specific agent
   * Only returns skills explicitly assigned to the agent
   */
  getAgentSkills(agentId) {
    if (agentId === 'unified') {
      // Unified chat has access to all skills
      return Array.from(this.skills.values());
    }

    // Find agent config
    const agent = Array.isArray(this.agents)
      ? this.agents.find(a => a.id === agentId)
      : this.agents[agentId];

    if (!agent || !agent.skills || agent.skills.length === 0) {
      // No skills assigned - return empty array (strict mode)
      console.log(`[SkillsManager] Agent ${agentId} has no skills assigned`);
      return [];
    }

    // Return only assigned skills
    const assignedSkills = agent.skills
      .map(skillId => this.skills.get(skillId))
      .filter(Boolean);

    console.log(`[SkillsManager] Agent ${agentId} has ${assignedSkills.length} skills assigned`);
    return assignedSkills;
  }

  /**
   * Match user message to skill or command
   * @param {string} message - User message
   * @param {string} agentId - Agent ID for filtering
   * @returns {Object|null} Matched skill/command or null
   */
  matchSkill(message, agentId = 'unified') {
    const lowerMessage = message.toLowerCase().trim();

    // 1. Check for explicit /command
    if (lowerMessage.startsWith('/')) {
      const commandName = lowerMessage.split(/\s+/)[0].substring(1);
      const command = this.commands.get(commandName);
      if (command) {
        console.log(`[SkillsManager] Matched command: /${commandName}`);
        return command;
      }
    }

    // 2. Get available skills for this agent
    const availableSkills = this.getAgentSkills(agentId);

    // 3. Score each skill based on trigger matches
    let bestMatch = null;
    let bestScore = 0;

    for (const skill of availableSkills) {
      const score = this.scoreSkillMatch(skill, lowerMessage);
      if (score > bestScore && score >= 2) { // Minimum threshold
        bestScore = score;
        bestMatch = skill;
      }
    }

    if (bestMatch) {
      console.log(`[SkillsManager] Matched skill: ${bestMatch.id} (score: ${bestScore})`);
    }

    return bestMatch;
  }

  /**
   * Score how well a skill matches the user message
   * Uses strict word boundary matching to avoid false positives
   */
  scoreSkillMatch(skill, message) {
    let score = 0;
    const messageWords = message.split(/\s+/);

    // Check skill name in message (exact word match)
    const skillWords = [skill.id.toLowerCase(), skill.name.toLowerCase()];
    for (const skillWord of skillWords) {
      if (messageWords.includes(skillWord)) {
        score += 5;
      }
    }

    // Check triggers (exact phrase or word match)
    for (const trigger of skill.triggers) {
      const triggerLower = trigger.toLowerCase();
      // For multi-word triggers, check phrase
      if (triggerLower.includes(' ')) {
        if (message.includes(triggerLower)) {
          score += 4;
        }
      } else {
        // For single words, require exact word match
        if (messageWords.includes(triggerLower)) {
          score += 3;
        }
      }
    }

    return score;
  }

  /**
   * Get full skill content for injection
   */
  getSkillContent(skillId) {
    const skill = this.skills.get(skillId) || this.commands.get(skillId);
    if (!skill) return null;

    return skill.body;
  }

  /**
   * Generate a response using a matched skill
   */
  generateSkillResponse(skill, userMessage, profileData = {}) {
    const { name = 'there', streak = 0, challenges = [], todos = [] } = profileData;

    // Build response based on skill type and content
    let response = '';

    if (skill.type === 'command') {
      response = this.generateCommandResponse(skill, userMessage, profileData);
    } else {
      response = this.generateSkillTemplateResponse(skill, userMessage, profileData);
    }

    return response;
  }

  /**
   * Generate response for a /command
   */
  generateCommandResponse(command, userMessage, profileData) {
    const { name = 'there' } = profileData;

    // Parse command arguments
    const args = userMessage.replace(/^\/\S+\s*/, '').trim();

    // Generate response based on command type
    switch (command.id) {
      case 'streak':
        return this.generateStreakResponse(profileData);

      case 'streak-new':
        return this.generateNewChallengePrompt(profileData);

      case 'streak-list':
        return this.generateChallengesList(profileData);

      case 'streak-stats':
        return this.generateStatsResponse(profileData);

      case 'streak-switch':
        return `Hey ${name}! To switch challenges, tell me which one you want to work on.\n\nAvailable challenges:\n${this.formatChallengeList(profileData.challenges)}`;

      case 'streak-insights':
        return this.generateInsightsResponse(profileData);

      default:
        return `Running command: /${command.id}\n\n${command.description || 'Command executed.'}`;
    }
  }

  /**
   * Generate response using skill template/instructions
   */
  generateSkillTemplateResponse(skill, userMessage, profileData) {
    const { name = 'there', streak = 0, challenges = [], completedTasks = 0, pendingTasks = 0 } = profileData;

    // Skill-specific responses
    switch (skill.id) {
      case 'streak':
        return this.generateStreakResponse(profileData);

      case 'motivation':
        return this.generateMotivationResponse(profileData, userMessage);

      case 'daily-checkin':
        return this.generateCheckinPrompt(profileData);

      case 'challenge-onboarding':
        return this.generateNewChallengePrompt(profileData);

      case 'user-onboarding':
        return `Welcome! Let's get you set up.\n\nI'll help you create your profile and first challenge. What would you like to achieve?`;

      case 'schedule-replanner':
        return `I can help you reorganize your schedule. What needs to change?`;

      default:
        // Generic skill response
        return `${skill.name || 'Skill'} activated.\n\n${skill.description || userMessage}`;
    }
  }

  /**
   * Generate streak check-in response
   */
  generateStreakResponse(profileData) {
    const { name = 'there', streak = 0, challenges = [], currentChallenge = null } = profileData;

    if (!currentChallenge && challenges.length === 0) {
      return `Hey ${name}! You don't have any active challenges yet.\n\nWant to start one? Just say "create a challenge" or use /streak-new`;
    }

    const challenge = currentChallenge || challenges[0];
    const challengeName = challenge?.name || challenge?.challenge_name || 'Your Challenge';
    const currentStreak = challenge?.streak || streak || 0;

    let response = `Hey ${name}! Let's check in.\n\n`;
    response += `${challengeName}\n`;
    response += `Current streak: ${currentStreak} day${currentStreak !== 1 ? 's' : ''} ${currentStreak > 0 ? '🔥' : ''}\n\n`;

    if (currentStreak >= 7) {
      response += `Amazing! You've been consistent for over a week!\n\n`;
    } else if (currentStreak >= 3) {
      response += `Nice momentum! Keep it going!\n\n`;
    }

    response += `What did you accomplish today?`;

    return response;
  }

  /**
   * Generate motivation response based on user data
   */
  generateMotivationResponse(profileData, userMessage) {
    const { name = 'there', streak = 0, challenges = [], completedTasks = 0 } = profileData;

    // Build personalized motivation
    let response = `Hey ${name}!\n\n`;

    if (streak > 0) {
      response += `You're on a ${streak}-day streak. That's ${streak} day${streak !== 1 ? 's' : ''} of showing up when you didn't have to.\n\n`;
    }

    if (completedTasks > 0) {
      response += `You've completed ${completedTasks} tasks. Each one is a step forward.\n\n`;
    }

    if (challenges.length > 0) {
      const challengeNames = challenges.map(c => c.name || c.challenge_name).slice(0, 2).join(' and ');
      response += `You're working on ${challengeNames}. Remember why you started.\n\n`;
    }

    // Motivation message
    response += `Every expert was once a beginner. Every success story started with a single step. You're already further than you were yesterday.\n\n`;
    response += `Now close this and do the next thing on your list. You've got this! 💪`;

    return response;
  }

  /**
   * Generate check-in prompt
   */
  generateCheckinPrompt(profileData) {
    const { name = 'there', pendingTasks = 0, challenges = [] } = profileData;

    let response = `Hey ${name}! Time for your daily check-in.\n\n`;

    if (pendingTasks > 0) {
      response += `You have ${pendingTasks} task${pendingTasks !== 1 ? 's' : ''} pending.\n\n`;
    }

    response += `Quick questions:\n`;
    response += `1. What did you work on today?\n`;
    response += `2. How are you feeling? (1-5)\n`;
    response += `3. Any wins to celebrate?\n`;
    response += `4. Any blockers?\n\n`;
    response += `Just share what's on your mind and I'll log your progress.`;

    return response;
  }

  /**
   * Generate new challenge prompt
   */
  generateNewChallengePrompt(profileData) {
    const { name = 'there' } = profileData;

    return `Hey ${name}! Let's create a new challenge.\n\n` +
      `What type of challenge?\n` +
      `- 📚 Learning - Courses, books, skills\n` +
      `- 🔨 Building - Projects, shipping\n` +
      `- 💪 Fitness - Workouts, health\n` +
      `- 🎨 Creative - Art, writing, music\n` +
      `- ✅ Habit - Daily routines\n` +
      `- 🎯 Custom - Something else\n\n` +
      `Just tell me what you want to achieve!`;
  }

  /**
   * Generate challenges list
   */
  generateChallengesList(profileData) {
    const { name = 'there', challenges = [] } = profileData;

    if (challenges.length === 0) {
      return `Hey ${name}! You don't have any challenges yet.\n\nUse /streak-new to create your first one!`;
    }

    let response = `Here are your challenges, ${name}:\n\n`;
    response += this.formatChallengeList(challenges);

    return response;
  }

  /**
   * Format challenge list
   */
  formatChallengeList(challenges = []) {
    if (challenges.length === 0) {
      return '(No challenges yet)';
    }

    return challenges.map((c, i) => {
      const name = c.name || c.challenge_name;
      const streak = c.streak || 0;
      const status = c.status || 'active';
      return `${i + 1}. ${name} - ${streak} day streak ${status === 'active' ? '✓' : '(paused)'}`;
    }).join('\n');
  }

  /**
   * Generate stats response
   */
  generateStatsResponse(profileData) {
    const { name = 'there', streak = 0, challenges = [], completedTasks = 0, pendingTasks = 0 } = profileData;

    const totalChallenges = challenges.length;
    const activeChallenges = challenges.filter(c => c.status !== 'archived' && c.status !== 'paused').length;

    let response = `📊 Your Stats, ${name}\n\n`;

    response += `Challenges:\n`;
    response += `- Active: ${activeChallenges}\n`;
    response += `- Total: ${totalChallenges}\n\n`;

    response += `Tasks:\n`;
    response += `- Completed: ${completedTasks}\n`;
    response += `- Pending: ${pendingTasks}\n\n`;

    if (streak > 0) {
      response += `Streak:\n`;
      response += `- Current: ${streak} days 🔥\n\n`;
    }

    response += `Keep pushing forward!`;

    return response;
  }

  /**
   * Generate insights response
   */
  generateInsightsResponse(profileData) {
    const { name = 'there', challenges = [], completedTasks = 0 } = profileData;

    let response = `🧠 Insights for ${name}\n\n`;

    if (challenges.length === 0) {
      return response + `Start a challenge to see insights about your progress!`;
    }

    response += `Based on your activity:\n\n`;

    // Simple insights
    if (completedTasks > 10) {
      response += `✓ You've built strong momentum with ${completedTasks} completed tasks.\n`;
    }

    if (challenges.length > 1) {
      response += `✓ Running multiple challenges shows commitment.\n`;
    }

    const maxStreak = Math.max(...challenges.map(c => c.streak || 0));
    if (maxStreak >= 7) {
      response += `✓ Your best streak of ${maxStreak} days shows consistency.\n`;
    }

    response += `\nKeep tracking to see more patterns!`;

    return response;
  }

  /**
   * Get all skills for display
   */
  getAllSkills() {
    return Array.from(this.skills.values());
  }

  /**
   * Get all commands for display
   */
  getAllCommands() {
    return Array.from(this.commands.values());
  }

  /**
   * Get all agents
   */
  getAllAgents() {
    this.loadAgents(); // Refresh from file
    return Array.isArray(this.agents) ? this.agents : Object.values(this.agents);
  }

  /**
   * Get an agent by ID
   */
  getAgent(agentId) {
    this.loadAgents();
    if (Array.isArray(this.agents)) {
      return this.agents.find(a => a.id === agentId);
    }
    return this.agents[agentId];
  }

  /**
   * Assign a skill to an agent
   */
  assignSkillToAgent(agentId, skillId) {
    this.loadAgents();

    let agent;
    if (Array.isArray(this.agents)) {
      agent = this.agents.find(a => a.id === agentId);
    } else {
      agent = this.agents[agentId];
    }

    if (!agent) {
      return { success: false, error: 'Agent not found' };
    }

    // Verify skill exists
    if (!this.skills.has(skillId)) {
      return { success: false, error: 'Skill not found' };
    }

    // Initialize skills array if not exists
    if (!agent.skills) {
      agent.skills = [];
    }

    // Check if already assigned
    if (agent.skills.includes(skillId)) {
      return { success: true, message: 'Skill already assigned' };
    }

    // Add skill
    agent.skills.push(skillId);

    // Save to file
    this.saveAgents();

    console.log(`[SkillsManager] Assigned skill ${skillId} to agent ${agentId}`);
    return { success: true, message: 'Skill assigned successfully' };
  }

  /**
   * Remove a skill from an agent
   */
  removeSkillFromAgent(agentId, skillId) {
    this.loadAgents();

    let agent;
    if (Array.isArray(this.agents)) {
      agent = this.agents.find(a => a.id === agentId);
    } else {
      agent = this.agents[agentId];
    }

    if (!agent) {
      return { success: false, error: 'Agent not found' };
    }

    if (!agent.skills || !agent.skills.includes(skillId)) {
      return { success: true, message: 'Skill not assigned' };
    }

    // Remove skill
    agent.skills = agent.skills.filter(s => s !== skillId);

    // Save to file
    this.saveAgents();

    console.log(`[SkillsManager] Removed skill ${skillId} from agent ${agentId}`);
    return { success: true, message: 'Skill removed successfully' };
  }

  /**
   * Update all skills for an agent at once
   */
  updateAgentSkills(agentId, skillIds) {
    this.loadAgents();

    let agent;
    if (Array.isArray(this.agents)) {
      agent = this.agents.find(a => a.id === agentId);
    } else {
      agent = this.agents[agentId];
    }

    if (!agent) {
      return { success: false, error: 'Agent not found' };
    }

    // Validate all skill IDs exist
    const validSkills = skillIds.filter(id => this.skills.has(id));

    // Update skills
    agent.skills = validSkills;

    // Save to file
    this.saveAgents();

    console.log(`[SkillsManager] Updated agent ${agentId} skills:`, validSkills);
    return { success: true, skills: validSkills };
  }

  /**
   * Save agents configuration to file
   */
  saveAgents() {
    try {
      const data = {
        agents: Array.isArray(this.agents) ? this.agents : Object.values(this.agents),
        lastUpdated: new Date().toISOString()
      };
      fs.writeFileSync(this.agentsFile, JSON.stringify(data, null, 2));
      console.log('[SkillsManager] Agents configuration saved');
    } catch (error) {
      console.error('[SkillsManager] Error saving agents:', error.message);
    }
  }

  /**
   * Check if agent has access to a specific skill
   */
  agentHasSkill(agentId, skillId) {
    if (agentId === 'unified') {
      return true; // Unified has all skills
    }

    const agent = this.getAgent(agentId);
    if (!agent || !agent.skills) {
      return false;
    }

    return agent.skills.includes(skillId);
  }
}

// Create singleton instance
const skillsManager = new SkillsManager();

module.exports = skillsManager;
