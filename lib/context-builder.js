/**
 * Context Builder
 *
 * Builds rich context from cached user data for API system prompts.
 * Provides all necessary information for personalized AI responses.
 */

const quickQuery = require('./quick-query');

/**
 * Build complete context object from cached data
 * @param {string} profileId - The user's profile ID
 * @returns {Object} Context object with profile, tasks, challenges, progress
 */
function buildContext(profileId) {
  if (!profileId) {
    return {
      profile: null,
      tasks: { summary: { totalTodos: 0, completedToday: 0 }, todos: [] },
      challenges: { data: [], count: 0 },
      progress: { streaks: [] },
    };
  }

  const profile = quickQuery.getProfile(profileId);
  const tasks = quickQuery.getTodaysTasks(profileId);
  const challenges = quickQuery.getChallenges(profileId, { active: true });
  const progress = quickQuery.getProgressSummary(profileId);

  return {
    profile: profile.found ? profile.data : null,
    tasks,
    challenges,
    progress,
  };
}

/**
 * Build the system prompt for the AI with user context
 * @param {Object} context - Context object from buildContext()
 * @param {string} agentId - The agent being used (for personality)
 * @returns {string} System prompt with context
 */
function buildSystemPrompt(context, agentId = 'unified') {
  const userName = context.profile?.name || 'User';
  const challengeCount = context.challenges?.count || 0;
  const pendingTasks = context.tasks?.summary?.totalTodos || 0;
  const completedTasks = context.tasks?.summary?.completedToday || 0;
  const currentStreak = context.progress?.streaks?.[0]?.streak || 0;

  // Build task list
  let taskList = '';
  if (context.tasks?.todos?.length > 0) {
    taskList = context.tasks.todos
      .slice(0, 5)
      .map((t, i) => `  ${i + 1}. ${t.text || t.title}`)
      .join('\n');
  }

  // Build challenge list
  let challengeList = '';
  if (context.challenges?.data?.length > 0) {
    challengeList = context.challenges.data
      .map(c => {
        const name = c.name || c.challenge_name;
        const streak = c.streak || 0;
        return `  - ${name}${streak > 0 ? ` (${streak} day streak)` : ''}`;
      })
      .join('\n');
  }

  // Base system prompt
  let systemPrompt = `You are OpenAnalyst, a personal accountability coach. You help users stay on track with their goals, challenges, and daily tasks.

## User Context
- **Name:** ${userName}
- **Active Challenges:** ${challengeCount}
- **Pending Tasks Today:** ${pendingTasks}
- **Completed Today:** ${completedTasks}
- **Current Streak:** ${currentStreak} days

`;

  // Add task details if available
  if (taskList) {
    systemPrompt += `## Today's Tasks
${taskList}

`;
  }

  // Add challenge details if available
  if (challengeList) {
    systemPrompt += `## Active Challenges
${challengeList}

`;
  }

  // Add coaching guidelines
  systemPrompt += `## Your Role
1. Be encouraging but honest
2. Reference their actual progress and data
3. Help them overcome blockers
4. Celebrate their wins
5. Keep responses concise and actionable

## Slash Commands (if user uses these, follow the skill instructions)
- /streak - Check in to their challenge
- /streak-new - Create a new challenge
- /streak-list - Show all challenges
- /streak-stats - Show statistics

Respond naturally and helpfully. Use the context above to personalize your responses.`;

  return systemPrompt;
}

/**
 * Build a minimal context for when cache isn't available
 * @returns {Object} Minimal context object
 */
function buildMinimalContext() {
  return {
    profile: { name: 'User' },
    tasks: { summary: { totalTodos: 0, completedToday: 0 }, todos: [] },
    challenges: { data: [], count: 0 },
    progress: { streaks: [] },
  };
}

/**
 * Format context as a readable summary string
 * @param {Object} context - Context object from buildContext()
 * @returns {string} Human-readable summary
 */
function formatContextSummary(context) {
  const userName = context.profile?.name || 'User';
  const challengeCount = context.challenges?.count || 0;
  const pendingTasks = context.tasks?.summary?.totalTodos || 0;
  const streak = context.progress?.streaks?.[0]?.streak || 0;

  return `${userName}: ${challengeCount} challenges, ${pendingTasks} pending tasks, ${streak} day streak`;
}

module.exports = {
  buildContext,
  buildSystemPrompt,
  buildMinimalContext,
  formatContextSummary,
};
