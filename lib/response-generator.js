/**
 * Response Generator Module
 *
 * Generates natural, conversational responses like Claude.
 * Dynamically uses skills, prompts, and templates for enhanced responses.
 *
 * Priority Order:
 * 1. Skills (explicit /commands and implicit keyword matching)
 * 2. Dynamic Prompts (general templates)
 * 3. Intent-based detection (fallback)
 */

const quickQuery = require('./quick-query');
const promptsManager = require('./prompts-manager');
const skillsManager = require('./skills-manager');
const webSearch = require('./web-search');

/**
 * Get time-appropriate greeting
 */
function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  if (hour >= 17 && hour < 21) return 'Good evening';
  return 'Hi';
}

/**
 * Generate response based on user message intent
 * Checks skills first, then prompts, then intent-based
 */
function generateResponse(profileId, userMessage, agentId = 'unified') {
  const lowerMessage = userMessage.toLowerCase();

  // 1. Try to match a skill first (highest priority)
  const matchedSkill = skillsManager.matchSkill(userMessage, agentId);

  if (matchedSkill) {
    console.log(`[ResponseGenerator] Using skill: ${matchedSkill.id}`);
    return generateSkillBasedResponse(profileId, userMessage, matchedSkill);
  }

  // 2. Try to match a prompt
  const matchedPrompt = promptsManager.matchPrompt(userMessage);

  if (matchedPrompt) {
    console.log(`[ResponseGenerator] Using prompt: ${matchedPrompt.name}`);
    return generatePromptBasedResponse(profileId, userMessage, matchedPrompt);
  }

  // 3. Fall back to intent-based detection
  if (lowerMessage.includes('task') || lowerMessage.includes('todo')) {
    return generateTodayTasksResponse(profileId);
  }

  if (lowerMessage.includes('progress') || lowerMessage.includes('summary') || lowerMessage.includes('stats')) {
    return generateProgressResponse(profileId);
  }

  if (lowerMessage.includes('challenge')) {
    return generateChallengesResponse(profileId);
  }

  if (lowerMessage.includes('search') || lowerMessage.includes('find')) {
    const query = userMessage.replace(/search|find/gi, '').trim();
    return generateSearchResponse(profileId, query);
  }

  // Default: greeting/general
  return generateGeneralResponse(profileId, userMessage);
}

/**
 * Generate response using a matched skill
 */
function generateSkillBasedResponse(profileId, userMessage, skill) {
  // Gather profile data for skill response (includes onboarding data)
  const profile = quickQuery.getProfile(profileId);
  const onboarding = quickQuery.getOnboardingData(profileId);
  const todaysData = quickQuery.getTodaysTasks(profileId);
  const progressData = quickQuery.getProgressSummary(profileId);
  const challengesData = quickQuery.getChallenges(profileId, { active: true });

  // Build profile data object for skill (with onboarding data)
  const profileData = {
    name: profile.found ? profile.data.name : 'there',
    streak: progressData.streaks?.[0]?.streak || 0,
    challenges: challengesData.data || [],
    currentChallenge: challengesData.data?.[0] || null,
    completedTasks: todaysData.summary?.completedToday || 0,
    pendingTasks: todaysData.summary?.totalTodos || 0,
    todos: todaysData.todos || [],
    // Onboarding data
    accountabilityStyle: onboarding.found ? onboarding.data.accountabilityStyle : 'balanced',
    productiveTime: onboarding.found ? onboarding.data.productiveTime : 'morning',
    dailyCapacity: onboarding.found ? onboarding.data.dailyCapacity : '2 hours',
    bigGoal: onboarding.found ? onboarding.data.bigGoal : null,
    preferences: onboarding.found ? onboarding.data.preferences : {},
    availability: onboarding.found ? onboarding.data.availability : {},
    motivation: onboarding.found ? onboarding.data.motivation : {},
  };

  // Generate response using skills manager
  const response = skillsManager.generateSkillResponse(skill, userMessage, profileData);

  return response || generateGeneralResponse(profileId, userMessage);
}

/**
 * Generate response using a matched prompt template
 */
function generatePromptBasedResponse(profileId, userMessage, prompt) {
  // Gather data for template variables (includes onboarding data)
  const profile = quickQuery.getProfile(profileId);
  const onboarding = quickQuery.getOnboardingData(profileId);
  const todaysData = quickQuery.getTodaysTasks(profileId);
  const progressData = quickQuery.getProgressSummary(profileId);
  const challengesData = quickQuery.getChallenges(profileId, { active: true });

  // Build variables object (with onboarding data)
  const variables = {
    name: profile.found ? profile.data.name : 'there',
    greeting: getGreeting(),
    user_message: userMessage,
    total_tasks: todaysData.summary?.totalTodos || 0,
    completed_tasks: todaysData.summary?.completedToday || 0,
    pending_tasks: todaysData.summary?.totalTodos || 0,
    total_challenges: challengesData.count || 0,
    active_challenges: challengesData.count || 0,
    completion_rate: progressData.todos?.completionRate?.toFixed(0) || 0,
    current_streak: progressData.streaks?.[0]?.streak || 0,
    today_date: new Date().toLocaleDateString(),
    today_day: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
    // Onboarding data
    accountability_style: onboarding.found ? onboarding.data.accountabilityStyle : 'balanced',
    productive_time: onboarding.found ? onboarding.data.productiveTime : 'morning',
    daily_capacity: onboarding.found ? onboarding.data.dailyCapacity : '2 hours',
    big_goal: onboarding.found ? onboarding.data.bigGoal : '',
    timezone: onboarding.found ? onboarding.data.timezone : '',
  };

  // Add task list if available
  if (todaysData.todos && todaysData.todos.length > 0) {
    variables.task_list = todaysData.todos
      .slice(0, 5)
      .map((t, i) => `${i + 1}. ${t.text || t.title}`)
      .join('\n');
  }

  // Add challenge list if available
  if (challengesData.data && challengesData.data.length > 0) {
    variables.challenge_list = challengesData.data
      .map((c, i) => {
        const name = c.name || c.challenge_name;
        const streak = c.streak || 0;
        return streak > 0 ? `${i + 1}. ${name} (${streak} day streak)` : `${i + 1}. ${name}`;
      })
      .join('\n');
  }

  // Fill the template
  const response = promptsManager.fillTemplate(prompt.template, variables);

  return response || generateGeneralResponse(profileId, userMessage);
}

/**
 * Generate today's tasks response
 */
function generateTodayTasksResponse(profileId) {
  const data = quickQuery.getTodaysTasks(profileId);

  if (!data.profile) {
    return `I couldn't find your profile. Let's get you set up first.`;
  }

  const { profile, summary, todos, challenges } = data;
  const name = profile.name || 'there';

  if (summary.totalTodos === 0 && summary.totalChallenges === 0) {
    return `Hey ${name}, looks like you don't have any tasks or challenges set up yet. Want me to help you create your first one?`;
  }

  let parts = [];
  parts.push(`Hey ${name}, here's what you've got going on today:`);

  if (summary.completedToday > 0) {
    parts.push(`You've already completed ${summary.completedToday} task${summary.completedToday > 1 ? 's' : ''} - nice work!`);
  }

  if (summary.totalTodos > 0) {
    parts.push(`You have ${summary.totalTodos} pending task${summary.totalTodos > 1 ? 's' : ''}:`);
    todos.slice(0, 5).forEach((todo, i) => {
      parts.push(`  ${i + 1}. ${todo.text || todo.title}`);
    });
    if (todos.length > 5) {
      parts.push(`  ...and ${todos.length - 5} more`);
    }
  }

  if (challenges.length > 0) {
    const challengeList = challenges.map(c => {
      const name = c.name || c.challenge_name;
      const streak = c.streak || 0;
      return streak > 0 ? `${name} (${streak} day streak)` : name;
    }).join(', ');
    parts.push(`Active challenges: ${challengeList}`);
  }

  return parts.join('\n\n');
}

/**
 * Generate progress summary response
 */
function generateProgressResponse(profileId) {
  const data = quickQuery.getProgressSummary(profileId);
  const profile = quickQuery.getProfile(profileId);
  const name = profile.found ? profile.data.name : 'there';

  let parts = [];
  parts.push(`Here's your progress summary, ${name}:`);

  if (data.challenges.total > 0) {
    parts.push(`Challenges: ${data.challenges.active} active, ${data.challenges.completed} completed out of ${data.challenges.total} total`);
  } else {
    parts.push(`No challenges created yet.`);
  }

  const totalTasks = data.todos.completed + data.todos.pending;
  if (totalTasks > 0) {
    parts.push(`Tasks: ${data.todos.completed} completed, ${data.todos.pending} pending (${data.todos.completionRate.toFixed(0)}% completion rate)`);
  } else {
    parts.push(`No tasks tracked yet.`);
  }

  if (data.streaks.length > 0) {
    const streakList = data.streaks.map(s => `${s.name}: ${s.streak} days`).join(', ');
    parts.push(`Current streaks: ${streakList}`);
  }

  return parts.join('\n\n');
}

/**
 * Generate challenges response
 */
function generateChallengesResponse(profileId) {
  const data = quickQuery.getChallenges(profileId, { active: true });
  const profile = quickQuery.getProfile(profileId);
  const name = profile.found ? profile.data.name : 'there';

  if (data.count === 0) {
    return `You don't have any active challenges right now, ${name}. Want to start one?`;
  }

  let parts = [];
  parts.push(`Here are your ${data.count} active challenge${data.count > 1 ? 's' : ''}, ${name}:`);

  data.data.forEach((challenge, i) => {
    const cName = challenge.name || challenge.challenge_name;
    const streak = challenge.streak || 0;
    const goal = challenge.goal;

    let line = `${i + 1}. ${cName}`;
    if (streak > 0) line += ` - ${streak} day streak`;
    if (goal) line += ` (Goal: ${goal})`;
    parts.push(line);
  });

  return parts.join('\n');
}

/**
 * Generate search response (local data search)
 */
function generateSearchResponse(profileId, query) {
  if (!query || query.trim() === '') {
    return `What would you like me to search for?`;
  }

  const data = quickQuery.search(profileId, query);

  if (!data.found) {
    return `I couldn't find anything matching "${query}". Try a different keyword.`;
  }

  let parts = [];
  parts.push(`Found ${data.count.total} result${data.count.total > 1 ? 's' : ''} for "${query}":`);

  if (data.count.challenges > 0) {
    parts.push(`Challenges:`);
    data.results.challenges.slice(0, 3).forEach(c => {
      parts.push(`  - ${c.name || c.challenge_name}`);
    });
  }

  if (data.count.todos > 0) {
    parts.push(`Tasks:`);
    data.results.todos.slice(0, 3).forEach(t => {
      parts.push(`  - ${t.text || t.title}`);
    });
  }

  return parts.join('\n');
}

/**
 * Generate web search response (searches the internet)
 * This is an async function that performs a real web search
 */
async function generateWebSearchResponse(query) {
  console.log(`[ResponseGenerator] Performing web search for: "${query}"`);

  try {
    const results = await webSearch.search(query);
    const formattedResponse = webSearch.formatSearchResults(results);
    return formattedResponse;
  } catch (error) {
    console.error('[ResponseGenerator] Web search error:', error);
    return `I tried to search the web for "${query}" but encountered an error. Please try again.`;
  }
}

/**
 * Check if message requests a web search and return the query
 */
function detectWebSearchRequest(message) {
  return webSearch.detectSearchIntent(message);
}

/**
 * Generate general/greeting response
 */
function generateGeneralResponse(profileId, userMessage) {
  const profile = quickQuery.getProfile(profileId);
  const todaysData = quickQuery.getTodaysTasks(profileId);
  const greeting = getGreeting();

  if (!profile.found) {
    return `${greeting}! I'm your OpenAnalyst accountability coach. I don't see a profile set up for you yet. Let's get started!`;
  }

  const name = profile.data.name;
  const { summary } = todaysData;
  const lowerMessage = userMessage.toLowerCase();

  // Simple greetings
  if (lowerMessage.match(/^(hi|hey|hello|yo|sup|what's up|howdy)/)) {
    if (summary.totalTodos === 0 && summary.totalChallenges === 0) {
      return `${greeting}, ${name}! Good to see you. You don't have any active tasks or challenges yet. Want to set something up?`;
    }

    let response = `${greeting}, ${name}! `;
    if (summary.totalTodos > 0) {
      response += `You have ${summary.totalTodos} task${summary.totalTodos > 1 ? 's' : ''} pending today. `;
    }
    if (summary.totalChallenges > 0) {
      response += `${summary.totalChallenges} active challenge${summary.totalChallenges > 1 ? 's' : ''} running. `;
    }
    if (summary.completedToday > 0) {
      response += `Already knocked out ${summary.completedToday} today!`;
    }
    return response.trim();
  }

  // Help request
  if (lowerMessage.includes('help') || lowerMessage.includes('what can you do')) {
    return `I'm your OpenAnalyst accountability coach. I can help you with:\n\n- Tracking your daily tasks\n- Managing challenges and streaks\n- Showing your progress\n- Searching through your goals\n\nJust ask me things like "what are my tasks?" or "show my progress"`;
  }

  // Default friendly response
  return `${greeting}, ${name}! I'm here to help you stay accountable. Ask me about your tasks, challenges, or progress - or just tell me what's on your mind.`;
}

/**
 * Generate help response
 */
function generateHelpResponse(profileId) {
  const profile = quickQuery.getProfile(profileId);
  const name = profile.found ? profile.data.name : 'there';

  return `Hey ${name}! I'm your OpenAnalyst accountability coach, powered by Claude Code. Here's what I can do:

Quick Commands:
- "What are my tasks?" - See today's pending tasks
- "Show my progress" - View your overall progress
- "My challenges" - List your active challenges
- "Motivate me" - Get some encouragement
- "Check in" - Log your daily progress

Smart Features:
- Click any task/challenge card to check in
- I can search the web for you - just ask!
- I learn your patterns and adapt to your style

Skills:
- I have various skills that help with specific tasks
- If you need something I can't do, I can help create a new skill!

Just talk to me naturally - I'll figure out what you need!`;
}

/**
 * Generate skill suggestion response when no skill matches a complex request
 */
function generateSkillSuggestionResponse(userMessage, profileId) {
  const profile = quickQuery.getProfile(profileId);
  const name = profile.found ? profile.data.name : 'there';
  const availableSkills = skillsManager.getAllSkills();

  let response = `Hey ${name}! That's an interesting request.\n\n`;
  response += `I don't have a specific skill for that yet, but I can help!\n\n`;

  response += `Options:\n`;
  response += `1. Create a new skill - I can help you build a custom skill for this\n`;
  response += `2. Use existing skills - Try one of these:\n`;

  // Show a few relevant skills
  const relevantSkills = availableSkills.slice(0, 3);
  relevantSkills.forEach(skill => {
    response += `   - ${skill.name}: ${skill.description || 'No description'}\n`;
  });

  response += `\nOr just tell me more about what you're trying to do and I'll help directly!\n`;
  response += `\nWant me to create a skill for this? Just say "create a skill for [description]"`;

  return response;
}

/**
 * Analyze user intent to determine the best response strategy
 * Returns: { type: 'greeting' | 'general' | 'skill' | 'web_search' | 'suggest_skill', ... }
 */
function analyzeIntent(userMessage) {
  const lowerMessage = userMessage.toLowerCase().trim();

  // Greeting patterns - respond directly
  if (lowerMessage.match(/^(hi|hey|hello|yo|sup|what's up|howdy|good morning|good afternoon|good evening|greetings)/)) {
    return { type: 'greeting', confidence: 1.0 };
  }

  // Help/info requests - respond directly
  if (lowerMessage.match(/(what can you do|help me|how do|how can|tell me about yourself)/)) {
    return { type: 'help', confidence: 1.0 };
  }

  // Progress/stats queries - respond directly with data
  if (lowerMessage.match(/(my progress|show progress|how am i doing|my stats|statistics|summary|overview)/)) {
    return { type: 'progress', confidence: 0.9 };
  }

  // Motivation requests - respond directly
  if (lowerMessage.match(/(motivate me|need motivation|feeling down|encourage|inspire|boost)/)) {
    return { type: 'motivation', confidence: 0.9 };
  }

  // Task/todo queries - respond directly with data
  if (lowerMessage.match(/(my tasks|my todos|what.*do.*today|pending tasks|what's next)/)) {
    return { type: 'tasks', confidence: 0.9 };
  }

  // Challenge queries - respond directly with data
  if (lowerMessage.match(/(my challenges|active challenges|show challenges|challenge status)/)) {
    return { type: 'challenges', confidence: 0.9 };
  }

  // Web search - handle with web search
  const webSearchIntent = webSearch.detectSearchIntent(userMessage);
  if (webSearchIntent) {
    return { type: 'web_search', confidence: 0.95, query: webSearchIntent.query };
  }

  // Check-in requests - needs skill
  if (lowerMessage.match(/(check in|log progress|daily checkin|update my streak|record progress)/)) {
    return { type: 'skill_needed', skillType: 'checkin', confidence: 0.95 };
  }

  // New challenge requests - needs skill
  if (lowerMessage.match(/(new challenge|start.*challenge|create.*challenge|begin.*streak)/)) {
    return { type: 'skill_needed', skillType: 'create_challenge', confidence: 0.95 };
  }

  // Schedule/planning requests - needs skill
  if (lowerMessage.match(/(schedule|plan my day|reschedule|change.*time|set.*reminder)/)) {
    return { type: 'skill_needed', skillType: 'schedule', confidence: 0.9 };
  }

  // Complex/unknown - might suggest skill creation
  if (lowerMessage.length > 50 && !lowerMessage.match(/^(what|how|why|when|where|who|show|list|get)/)) {
    return { type: 'complex', confidence: 0.5, suggestSkill: true };
  }

  // Default - general query
  return { type: 'general', confidence: 0.5 };
}

/**
 * Generate motivation response
 */
function generateMotivationResponse(profileId) {
  const profile = quickQuery.getProfile(profileId);
  const progressData = quickQuery.getProgressSummary(profileId);
  const name = profile.found ? profile.data.name : 'there';

  const motivationalQuotes = [
    "Every step forward is a step toward your goals.",
    "Consistency beats intensity. Keep showing up!",
    "You're stronger than you think. Let's do this!",
    "Small progress is still progress. Don't give up!",
    "The only bad workout is the one that didn't happen.",
    "Your future self will thank you for the effort you put in today.",
  ];

  const randomQuote = motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];

  let response = `Hey ${name}! Here's some motivation for you:\n\n`;
  response += `"${randomQuote}"\n\n`;

  if (progressData.streaks && progressData.streaks.length > 0) {
    const bestStreak = progressData.streaks.reduce((best, s) => s.streak > best.streak ? s : best, progressData.streaks[0]);
    response += `You're on a ${bestStreak.streak} day streak with ${bestStreak.name}! Keep it going!\n`;
  }

  if (progressData.todos && progressData.todos.completed > 0) {
    response += `You've completed ${progressData.todos.completed} tasks so far. That's awesome!\n`;
  }

  response += `\nRemember: Progress, not perfection. You've got this!`;

  return response;
}

/**
 * Generate response for UNIFIED chat (access all data, no profile required)
 * Uses smart intent detection to determine the best response strategy
 */
function generateUnifiedResponse(userMessage) {
  const lowerMessage = userMessage.toLowerCase();
  const allProfileIds = quickQuery.getAllProfileIds();
  const profileId = allProfileIds[0] || null;

  console.log(`[ResponseGenerator] Processing: "${userMessage.substring(0, 50)}..."`);

  // 1. Analyze user intent
  const intent = analyzeIntent(userMessage);
  console.log(`[ResponseGenerator] Intent: ${intent.type} (confidence: ${intent.confidence})`);

  // 2. Handle different intent types
  switch (intent.type) {
    case 'greeting':
      return generateGeneralResponse(profileId, userMessage);

    case 'help':
      return generateHelpResponse(profileId);

    case 'progress':
      return generateProgressResponse(profileId);

    case 'motivation':
      return generateMotivationResponse(profileId);

    case 'tasks':
      return generateTodayTasksResponse(profileId);

    case 'challenges':
      return generateChallengesResponse(profileId);

    case 'web_search':
      // Web search is handled async in ws-listener, this is a fallback
      return `I'll search the web for: "${intent.query}"\n\n(Web search processing...)`;

    case 'complex':
      // Suggest creating a skill for complex requests
      return generateSkillSuggestionResponse(userMessage, profileId);
  }

  // 3. Try to match a skill (for skill_needed intents or unhandled cases)
  const matchedSkill = skillsManager.matchSkill(userMessage, 'unified');

  console.log(`[ResponseGenerator] Skill match result: ${matchedSkill ? matchedSkill.id : 'none'}`);

  if (matchedSkill) {
    console.log(`[ResponseGenerator] Unified using skill: ${matchedSkill.id}`);
    if (profileId) {
      return generateSkillBasedResponse(profileId, userMessage, matchedSkill);
    }
    // Generate with minimal data if no profile
    const minimalData = {
      name: 'User',
      streak: 0,
      challenges: [],
      currentChallenge: null,
      completedTasks: 0,
      pendingTasks: 0,
      todos: []
    };
    return skillsManager.generateSkillResponse(matchedSkill, userMessage, minimalData);
  }

  // 2. Try to match a prompt
  const matchedPrompt = promptsManager.matchPrompt(userMessage);

  if (matchedPrompt) {
    console.log(`[ResponseGenerator] Unified using prompt: ${matchedPrompt.name}`);
    if (profileId) {
      return generatePromptBasedResponse(profileId, userMessage, matchedPrompt);
    }
    // Generate with minimal variables if no profile
    const variables = {
      name: 'User',
      user_message: userMessage,
      today_date: new Date().toLocaleDateString(),
      today_day: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
    };
    return promptsManager.fillTemplate(matchedPrompt.template, variables);
  }

  // Collect all data across all profiles
  let allChallenges = [];
  let allTodos = [];
  let allProfiles = [];

  allProfileIds.forEach(profileId => {
    const profile = quickQuery.getProfile(profileId);
    if (profile.found) {
      allProfiles.push({ id: profileId, ...profile.data });
    }

    const challenges = quickQuery.getChallenges(profileId);
    if (challenges.data) {
      allChallenges = allChallenges.concat(challenges.data.map(c => ({ ...c, profileId })));
    }

    const todos = quickQuery.getTodos(profileId);
    if (todos.data) {
      allTodos = allTodos.concat(todos.data.map(t => ({ ...t, profileId })));
    }
  });

  // Handle different intents
  if (lowerMessage.includes('user') || lowerMessage.includes('profile') || lowerMessage.includes('who')) {
    if (allProfiles.length === 0) {
      return `No users registered yet.`;
    }
    let response = `There ${allProfiles.length === 1 ? 'is' : 'are'} ${allProfiles.length} user${allProfiles.length > 1 ? 's' : ''} in the system:\n`;
    allProfiles.forEach((p, i) => {
      response += `\n${i + 1}. ${p.name || p.id} (${p.id})`;
      if (p.goal) response += ` - Goal: ${p.goal}`;
    });
    return response;
  }

  if (lowerMessage.includes('challenge')) {
    if (allChallenges.length === 0) {
      return `No challenges created yet across any users.`;
    }
    let response = `Found ${allChallenges.length} challenge${allChallenges.length > 1 ? 's' : ''} across all users:\n`;
    allChallenges.slice(0, 10).forEach((c, i) => {
      const name = c.name || c.challenge_name;
      const streak = c.streak || 0;
      response += `\n${i + 1}. ${name}`;
      if (streak > 0) response += ` (${streak} day streak)`;
      response += ` - by ${c.profileId}`;
    });
    if (allChallenges.length > 10) {
      response += `\n\n...and ${allChallenges.length - 10} more`;
    }
    return response;
  }

  if (lowerMessage.includes('task') || lowerMessage.includes('todo')) {
    if (allTodos.length === 0) {
      return `No tasks found across any users.`;
    }
    const pending = allTodos.filter(t => !t.completed);
    const completed = allTodos.filter(t => t.completed);
    let response = `Task summary across all users:\n\n`;
    response += `Total: ${allTodos.length} tasks\n`;
    response += `Pending: ${pending.length}\n`;
    response += `Completed: ${completed.length}`;
    if (pending.length > 0) {
      response += `\n\nRecent pending tasks:`;
      pending.slice(0, 5).forEach((t, i) => {
        response += `\n${i + 1}. ${t.text || t.title} (${t.profileId})`;
      });
    }
    return response;
  }

  if (lowerMessage.includes('search') || lowerMessage.includes('find')) {
    const query = userMessage.replace(/search|find/gi, '').trim();
    if (!query) {
      return `What would you like me to search for across all data?`;
    }

    // Search across all profiles
    let results = [];
    allProfileIds.forEach(profileId => {
      const searchResult = quickQuery.search(profileId, query);
      if (searchResult.found) {
        results.push({ profileId, ...searchResult });
      }
    });

    if (results.length === 0) {
      return `No results found for "${query}" across any user data.`;
    }

    let response = `Search results for "${query}":\n`;
    results.forEach(r => {
      response += `\nFrom ${r.profileId}:`;
      if (r.count.challenges > 0) {
        r.results.challenges.slice(0, 2).forEach(c => {
          response += `\n  - Challenge: ${c.name || c.challenge_name}`;
        });
      }
      if (r.count.todos > 0) {
        r.results.todos.slice(0, 2).forEach(t => {
          response += `\n  - Task: ${t.text || t.title}`;
        });
      }
    });
    return response;
  }

  // Check for simple greetings first
  if (lowerMessage.match(/^(hi|hey|hello|yo|sup|what's up|howdy|good morning|good afternoon|good evening)/)) {
    const greeting = getGreeting();
    const mainProfile = allProfiles[0];
    const name = mainProfile?.name || 'there';

    let response = `${greeting}, ${name}! `;

    if (allChallenges.length > 0) {
      const activeCount = allChallenges.filter(c => c.status !== 'completed').length;
      response += `${activeCount} active challenge${activeCount !== 1 ? 's' : ''} running. `;
    }

    if (allTodos.length > 0) {
      const pendingCount = allTodos.filter(t => !t.completed).length;
      if (pendingCount > 0) {
        response += `${pendingCount} task${pendingCount !== 1 ? 's' : ''} pending.`;
      }
    }

    return response.trim() || `${greeting}, ${name}! How can I help you today?`;
  }

  // Help request
  if (lowerMessage.includes('help') || lowerMessage.includes('what can you do')) {
    const mainProfile = allProfiles[0];
    const name = mainProfile?.name || 'there';
    return `Hey ${name}! I can help you with:\n\n- Tracking your daily tasks\n- Managing challenges and streaks\n- Showing your progress\n- Planning your day\n\nJust ask naturally - like "what are my tasks?" or "show my challenges"`;
  }

  // Default: friendly response with context
  const greeting = getGreeting();
  const mainProfile = allProfiles[0];
  const name = mainProfile?.name || 'there';

  return `${greeting}, ${name}! I'm here to help you stay on track. Ask me about your tasks, challenges, or progress.`;
}

module.exports = {
  generateResponse,
  generateUnifiedResponse,
  generateTodayTasksResponse,
  generateProgressResponse,
  generateChallengesResponse,
  generateSearchResponse,
  generateGeneralResponse,
  generateWebSearchResponse,
  detectWebSearchRequest,
  // New dynamic response functions
  analyzeIntent,
  generateHelpResponse,
  generateMotivationResponse,
  generateSkillSuggestionResponse
};
