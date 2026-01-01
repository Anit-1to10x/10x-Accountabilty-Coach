/**
 * Convert all JSON files to MD format
 * Run: node scripts/convert-to-md.js
 */

const fs = require('fs');
const path = require('path');

const challengesDir = path.join(__dirname, '..', 'data', 'challenges');

// Convert a daily JSON to MD format
function convertDayJsonToMd(jsonData, dayNum) {
  const todos = jsonData.todos || [];
  const todoList = todos.map(t => `- [${t.status === 'completed' ? 'x' : ' '}] ${t.title} (${t.duration} min)`).join('\n');
  const topics = (jsonData.topics || []).map(t => `- ${t}`).join('\n');

  return `# Day ${dayNum} - ${jsonData.title || 'Untitled'}

## Status: ${jsonData.completed ? 'completed' : 'pending'}

## Topics
${topics || '- No topics listed'}

## Tasks
${todoList || '- No tasks'}

## Quick Win
${jsonData.quickWin || 'Complete your daily goal!'}

## Time Budget
- **Total:** ${jsonData.totalMinutes || 60} minutes

## Notes


## Check-in
- **Completed:** ${jsonData.completed ? 'Yes' : 'No'}
- **Time Spent:** 0 hours
- **Mood:**
- **Blockers:** None

## Reflection

`;
}

// Convert challenge-config.json to challenge.md
function convertChallengeJsonToMd(config) {
  const streak = config.streak || {};
  const startDate = config.startDate || config.start_date || new Date().toISOString().split('T')[0];
  const targetDate = config.targetDate || config.end_date || '';

  return `# ${config.name || 'Untitled Challenge'}

## Overview
- **ID:** ${config.id}
- **Type:** ${config.type || 'custom'}
- **Status:** ${config.status || 'active'}
- **Start Date:** ${startDate}
- **Target Date:** ${targetDate}
- **Daily Hours:** ${config.dailyHours || config.daily_hours || 1}
- **Agent:** ${config.agent || 'accountability-coach'}

## Goal
${config.goal || 'No goal specified'}

## Streak
- **Current:** ${streak.current || 0} days
- **Best:** ${streak.best || 0} days
- **Last Check-in:** ${streak.lastCheckin || 'None'}

## Progress
- **Overall:** ${config.progress || 0}%
- **Current Day:** ${config.currentDay || 1}
- **Total Days:** ${config.totalDays || 30}

## Milestones
${(config.milestones || []).map(m => `- [${m.completed ? 'x' : ' '}] ${m.name} (Day ${m.day})`).join('\n') || '- No milestones set'}

## Notes
Created: ${config.created_at || new Date().toISOString()}
`;
}

// Process a single challenge directory
function processChallenge(challengePath) {
  const challengeName = path.basename(challengePath);
  console.log(`\nProcessing: ${challengeName}`);

  // Create days/ folder if needed
  const daysDir = path.join(challengePath, 'days');
  if (!fs.existsSync(daysDir)) {
    fs.mkdirSync(daysDir, { recursive: true });
  }

  // Convert daily JSON files
  const dailyDir = path.join(challengePath, 'daily');
  if (fs.existsSync(dailyDir)) {
    const files = fs.readdirSync(dailyDir).filter(f => f.endsWith('.json'));
    console.log(`  Found ${files.length} daily JSON files`);

    files.forEach(file => {
      const jsonPath = path.join(dailyDir, file);
      const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      const dayNum = jsonData.day || parseInt(file.match(/\d+/)?.[0]) || 1;

      const mdContent = convertDayJsonToMd(jsonData, dayNum);
      const mdFilename = `day-${String(dayNum).padStart(2, '0')}.md`;
      const mdPath = path.join(daysDir, mdFilename);

      fs.writeFileSync(mdPath, mdContent);
      console.log(`  Converted: ${file} -> days/${mdFilename}`);
    });
  }

  // Convert challenge-config.json to challenge.md
  const configPath = path.join(challengePath, 'challenge-config.json');
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const mdContent = convertChallengeJsonToMd(config);
    const mdPath = path.join(challengePath, 'challenge.md');

    fs.writeFileSync(mdPath, mdContent);
    console.log(`  Converted: challenge-config.json -> challenge.md`);
  }
}

// Main
console.log('Converting challenges to MD format...\n');

if (fs.existsSync(challengesDir)) {
  const challenges = fs.readdirSync(challengesDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => path.join(challengesDir, d.name));

  challenges.forEach(processChallenge);
  console.log('\nConversion complete!');
} else {
  console.log('No challenges directory found');
}
