#!/usr/bin/env node
/**
 * Claude Query CLI - Instant data access for Claude Code
 *
 * Usage:
 *   node claude-query.js profile <profileId>
 *   node claude-query.js tasks <profileId>
 *   node claude-query.js challenges <profileId>
 *   node claude-query.js progress <profileId>
 *   node claude-query.js search <profileId> <query>
 *   node claude-query.js stats
 */

const quickQuery = require('./lib/quick-query');

const command = process.argv[2];
const profileId = process.argv[3];
const args = process.argv.slice(4);

async function main() {
  // Initialize cache
  await quickQuery.initialize();

  switch (command) {
    case 'profile':
      if (!profileId) {
        console.error('Usage: node claude-query.js profile <profileId>');
        process.exit(1);
      }
      showProfile(profileId);
      break;

    case 'tasks':
    case 'todos':
      if (!profileId) {
        console.error('Usage: node claude-query.js tasks <profileId>');
        process.exit(1);
      }
      showTasks(profileId);
      break;

    case 'challenges':
      if (!profileId) {
        console.error('Usage: node claude-query.js challenges <profileId>');
        process.exit(1);
      }
      showChallenges(profileId);
      break;

    case 'progress':
      if (!profileId) {
        console.error('Usage: node claude-query.js progress <profileId>');
        process.exit(1);
      }
      showProgress(profileId);
      break;

    case 'search':
      if (!profileId || args.length === 0) {
        console.error('Usage: node claude-query.js search <profileId> <query>');
        process.exit(1);
      }
      showSearch(profileId, args.join(' '));
      break;

    case 'stats':
      showStats();
      break;

    default:
      console.log('Claude Query CLI - Instant data access');
      console.log('');
      console.log('Commands:');
      console.log('  profile <profileId>        Show profile data');
      console.log('  tasks <profileId>          Show today\'s tasks');
      console.log('  challenges <profileId>     Show active challenges');
      console.log('  progress <profileId>       Show progress summary');
      console.log('  search <profileId> <query> Search all data');
      console.log('  stats                      Show cache statistics');
      console.log('');
      console.log('Example:');
      console.log('  node claude-query.js tasks anit-gmail-co');
  }

  quickQuery.shutdown();
}

function showProfile(profileId) {
  const startTime = Date.now();
  const result = quickQuery.getProfile(profileId);
  const queryTime = Date.now() - startTime;

  console.log(`\n📊 Profile Data (${queryTime}ms)\n`);

  if (!result.found) {
    console.log('❌ Profile not found');
    return;
  }

  const profile = result.data;
  console.log(`Name: ${profile.name || 'N/A'}`);
  console.log(`Email: ${profile.email || 'N/A'}`);
  console.log(`Timezone: ${profile.timezone || 'N/A'}`);
  console.log(`Goal: ${profile.about || profile.big_goal || 'N/A'}`);
  console.log('');
}

function showTasks(profileId) {
  const startTime = Date.now();
  const result = quickQuery.getTodaysTasks(profileId);
  const queryTime = Date.now() - startTime;

  console.log(`\n📋 Today's Tasks (${queryTime}ms)\n`);

  const { summary, todos, challenges } = result;

  console.log(`Total Tasks: ${summary.totalTodos}`);
  console.log(`Completed: ${summary.completedToday}`);
  console.log(`Active Challenges: ${summary.totalChallenges}`);
  console.log('');

  if (todos.length > 0) {
    console.log('Pending Tasks:');
    todos.forEach((todo, i) => {
      console.log(`  ${i + 1}. ${todo.text || todo.title}`);
    });
    console.log('');
  }

  if (challenges.length > 0) {
    console.log('Active Challenges:');
    challenges.forEach(c => {
      const name = c.name || c.challenge_name;
      const streak = c.streak || 0;
      console.log(`  • ${name} (${streak} day streak)`);
    });
    console.log('');
  }
}

function showChallenges(profileId) {
  const startTime = Date.now();
  const result = quickQuery.getChallenges(profileId, { active: true });
  const queryTime = Date.now() - startTime;

  console.log(`\n🎯 Active Challenges (${queryTime}ms)\n`);

  if (result.count === 0) {
    console.log('No active challenges found.');
    return;
  }

  result.data.forEach((challenge, i) => {
    const name = challenge.name || challenge.challenge_name;
    const streak = challenge.streak || 0;
    const goal = challenge.goal || 'No goal set';

    console.log(`${i + 1}. ${name}`);
    console.log(`   Streak: ${streak} days`);
    console.log(`   Goal: ${goal}`);
    console.log('');
  });
}

function showProgress(profileId) {
  const startTime = Date.now();
  const result = quickQuery.getProgressSummary(profileId);
  const queryTime = Date.now() - startTime;

  console.log(`\n📊 Progress Summary (${queryTime}ms)\n`);

  console.log('Challenges:');
  console.log(`  Active: ${result.challenges.active}`);
  console.log(`  Completed: ${result.challenges.completed}`);
  console.log(`  Total: ${result.challenges.total}`);
  console.log('');

  console.log('Tasks:');
  console.log(`  Completed: ${result.todos.completed}`);
  console.log(`  Pending: ${result.todos.pending}`);
  console.log(`  Completion Rate: ${result.todos.completionRate.toFixed(1)}%`);
  console.log('');

  if (result.streaks.length > 0) {
    console.log('Streaks:');
    result.streaks.forEach(s => {
      console.log(`  • ${s.name}: ${s.streak} days`);
    });
    console.log('');
  }
}

function showSearch(profileId, query) {
  const startTime = Date.now();
  const result = quickQuery.search(profileId, query);
  const queryTime = Date.now() - startTime;

  console.log(`\n🔍 Search Results for "${query}" (${queryTime}ms)\n`);

  if (!result.found) {
    console.log('No results found.');
    return;
  }

  if (result.count.challenges > 0) {
    console.log(`Challenges (${result.count.challenges}):`);
    result.results.challenges.forEach(c => {
      console.log(`  • ${c.name || c.challenge_name}`);
    });
    console.log('');
  }

  if (result.count.todos > 0) {
    console.log(`Tasks (${result.count.todos}):`);
    result.results.todos.forEach(t => {
      console.log(`  • ${t.text || t.title}`);
    });
    console.log('');
  }
}

function showStats() {
  const stats = quickQuery.getCacheStats();

  console.log('\n💾 Cache Statistics\n');
  console.log(`Hit Rate: ${(stats.hitRate * 100).toFixed(1)}%`);
  console.log(`Total Hits: ${stats.hits}`);
  console.log(`Total Misses: ${stats.misses}`);
  console.log('');

  console.log('Cached Entries:');
  console.log(`  Profiles: ${stats.totalEntries.profiles}`);
  console.log(`  Challenges: ${stats.totalEntries.challenges}`);
  console.log(`  Todos: ${stats.totalEntries.todos}`);
  console.log(`  Agents: ${stats.totalEntries.agents}`);
  console.log('');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
