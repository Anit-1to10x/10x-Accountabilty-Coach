/**
 * Fast In-Memory Cache Manager for OpenAnalyst
 *
 * This module provides instant data access without reading files every time.
 * Uses in-memory caching with automatic invalidation when files change.
 */

const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');

class CacheManager extends EventEmitter {
  constructor() {
    super();

    // In-memory cache storage
    this.cache = {
      profiles: new Map(),      // profileId -> profile data
      challenges: new Map(),    // profileId -> challenges array
      todos: new Map(),         // profileId -> todos array
      chats: new Map(),         // profileId -> recent chats
      agents: new Map(),        // agentId -> agent data
      index: null,              // Master index file
    };

    // Cache statistics
    this.stats = {
      hits: 0,
      misses: 0,
      lastUpdate: null,
    };

    // File watchers for auto-invalidation
    this.watchers = new Map();

    // TTL in milliseconds (default: 5 minutes)
    this.defaultTTL = 5 * 60 * 1000;

    // Cache entries with expiration
    this.expirations = new Map();

    this.dataDir = path.join(__dirname, '..', 'data');
    this.indexFile = path.join(this.dataDir, '.cache-index.json');
  }

  /**
   * Initialize the cache by loading index and watching files
   */
  async initialize() {
    console.log('[CacheManager] Initializing cache system...');

    // Load or create index
    await this.loadIndex();

    // Preload frequently accessed data
    await this.preloadData();

    // Start file watchers
    this.startWatchers();

    // Start cleanup interval for expired entries
    this.startCleanupInterval();

    console.log('[CacheManager] ✓ Cache system ready');
    console.log(`[CacheManager] Loaded: ${this.cache.profiles.size} profiles, ${this.cache.agents.size} agents`);
  }

  /**
   * Load or create the master index file
   */
  async loadIndex() {
    try {
      if (fs.existsSync(this.indexFile)) {
        const indexData = JSON.parse(fs.readFileSync(this.indexFile, 'utf8'));
        this.cache.index = indexData;
        console.log('[CacheManager] Loaded existing index');
      } else {
        await this.buildIndex();
      }
    } catch (error) {
      console.error('[CacheManager] Error loading index:', error.message);
      await this.buildIndex();
    }
  }

  /**
   * Build master index from file system
   */
  async buildIndex() {
    console.log('[CacheManager] Building index...');

    const index = {
      version: '1.0',
      lastBuild: new Date().toISOString(),
      profiles: {},
      agents: {},
      stats: {
        totalProfiles: 0,
        totalChallenges: 0,
        totalTodos: 0,
      }
    };

    // Index profiles
    const profilesDir = path.join(this.dataDir, 'profiles');
    if (fs.existsSync(profilesDir)) {
      const profileDirs = fs.readdirSync(profilesDir).filter(f =>
        fs.statSync(path.join(profilesDir, f)).isDirectory()
      );

      for (const profileId of profileDirs) {
        const profilePath = path.join(profilesDir, profileId);
        index.profiles[profileId] = {
          id: profileId,
          path: profilePath,
          challenges: path.join(profilePath, 'challenges'),
          todos: path.join(profilePath, 'todos'),
          chats: path.join(profilePath, 'chats'),
        };
        index.stats.totalProfiles++;
      }
    }

    // Index agents - try MD format first
    const agentsMdFile = path.join(this.dataDir, 'agents.md');
    const agentsDir = path.join(this.dataDir, 'agents');
    const agentsJsonFile = path.join(this.dataDir, 'agents.json');

    index.agents = {};

    // Try agents.md first
    if (fs.existsSync(agentsMdFile)) {
      const content = fs.readFileSync(agentsMdFile, 'utf8');
      const parsedAgents = this.parseAgentsMd(content);
      parsedAgents.forEach(agent => {
        if (agent.id) {
          index.agents[agent.id] = agent;
        }
      });
    }

    // Try agent folders (agents/{name}/agent.md)
    if (fs.existsSync(agentsDir)) {
      const dirs = fs.readdirSync(agentsDir, { withFileTypes: true });
      for (const dir of dirs) {
        if (!dir.isDirectory()) continue;

        const agentMdPath = path.join(agentsDir, dir.name, 'agent.md');
        const agentJsonPath = path.join(agentsDir, dir.name, 'agent.json');

        try {
          if (fs.existsSync(agentMdPath)) {
            const content = fs.readFileSync(agentMdPath, 'utf8');
            const agent = this.parseAgentMd(content, dir.name);
            if (agent && agent.id) {
              index.agents[agent.id] = agent;
            }
          } else if (fs.existsSync(agentJsonPath)) {
            const agent = JSON.parse(fs.readFileSync(agentJsonPath, 'utf8'));
            if (agent && agent.id) {
              index.agents[agent.id] = agent;
            }
          }
        } catch (err) {
          console.error(`[CacheManager] Error loading agent ${dir.name}:`, err.message);
        }
      }
    }

    // Fall back to agents.json only if no MD agents found
    if (Object.keys(index.agents).length === 0 && fs.existsSync(agentsJsonFile)) {
      const agentsData = JSON.parse(fs.readFileSync(agentsJsonFile, 'utf8'));
      if (Array.isArray(agentsData)) {
        agentsData.forEach(agent => {
          if (agent.id) {
            index.agents[agent.id] = agent;
          }
        });
      } else {
        const agents = agentsData.agents || agentsData || {};
        Object.entries(agents).forEach(([id, agent]) => {
          index.agents[id] = agent;
        });
      }
    }

    this.cache.index = index;

    // Save index to disk
    fs.writeFileSync(this.indexFile, JSON.stringify(index, null, 2));
    console.log('[CacheManager] ✓ Index built and saved');

    return index;
  }

  /**
   * Preload frequently accessed data into memory
   */
  async preloadData() {
    const index = this.cache.index;
    if (!index) return;

    // Preload all profiles
    for (const [profileId, profileInfo] of Object.entries(index.profiles)) {
      await this.loadProfile(profileId);
      await this.loadTodos(profileId);
    }

    // Load global challenges (from data/challenges)
    await this.loadChallenges('global');

    // Preload agents
    for (const [agentId, agentData] of Object.entries(index.agents)) {
      this.cache.agents.set(agentId, agentData);
    }
  }

  /**
   * Load profile data into cache (includes all onboarding files)
   */
  async loadProfile(profileId) {
    try {
      const profileDir = path.join(this.dataDir, 'profiles', profileId);
      const profilePath = path.join(profileDir, 'profile.md');
      if (!fs.existsSync(profilePath)) return null;

      const content = fs.readFileSync(profilePath, 'utf8');

      // Parse markdown frontmatter and content
      const profile = this.parseMarkdownProfile(content, profileId);

      // Load additional onboarding files
      const preferencesPath = path.join(profileDir, 'preferences.md');
      const availabilityPath = path.join(profileDir, 'availability.md');
      const motivationPath = path.join(profileDir, 'motivation-triggers.md');

      // Parse preferences
      if (fs.existsSync(preferencesPath)) {
        const prefContent = fs.readFileSync(preferencesPath, 'utf8');
        profile.preferences = this.parseOnboardingFile(prefContent);
      }

      // Parse availability
      if (fs.existsSync(availabilityPath)) {
        const availContent = fs.readFileSync(availabilityPath, 'utf8');
        profile.availability = this.parseOnboardingFile(availContent);
      }

      // Parse motivation triggers
      if (fs.existsSync(motivationPath)) {
        const motContent = fs.readFileSync(motivationPath, 'utf8');
        profile.motivation = this.parseOnboardingFile(motContent);
      }

      this.cache.profiles.set(profileId, profile);
      this.setExpiration(`profile:${profileId}`);

      return profile;
    } catch (error) {
      console.error(`[CacheManager] Error loading profile ${profileId}:`, error.message);
      return null;
    }
  }

  /**
   * Parse onboarding files (preferences, availability, motivation)
   */
  parseOnboardingFile(content) {
    const data = {};
    const lines = content.split('\n');

    for (const line of lines) {
      // Match key-value pairs: - **Key:** Value
      const match = line.match(/^-\s*\*\*(.+?):\*\*\s*(.+)$/);
      if (match) {
        const key = match[1].toLowerCase().replace(/\s+/g, '_');
        data[key] = match[2].trim();
      }
    }

    // Also capture section content
    const sections = content.split(/^##\s+/m);
    for (const section of sections) {
      if (!section.trim()) continue;
      const titleMatch = section.match(/^(.+)/);
      if (titleMatch) {
        const sectionTitle = titleMatch[1].trim().toLowerCase().replace(/\s+/g, '_');
        // Get bullet points under section
        const bullets = section.match(/^-\s+(?!\*\*)(.+)$/gm);
        if (bullets) {
          data[sectionTitle + '_items'] = bullets.map(b => b.replace(/^-\s+/, '').trim());
        }
      }
    }

    return data;
  }

  /**
   * Load challenges from global challenges directory (data/challenges)
   */
  async loadChallenges(profileId = 'global') {
    try {
      // Use global challenges directory
      const challengesDir = path.join(this.dataDir, 'challenges');
      if (!fs.existsSync(challengesDir)) {
        this.cache.challenges.set(profileId, []);
        return [];
      }

      const dirs = fs.readdirSync(challengesDir, { withFileTypes: true });
      const challenges = [];

      for (const dir of dirs) {
        if (dir.isDirectory()) {
          const challengeDir = path.join(challengesDir, dir.name);
          const mdPath = path.join(challengeDir, 'challenge.md');
          const jsonPath = path.join(challengeDir, 'challenge-config.json');

          try {
            let challenge = null;

            // Try MD format first
            if (fs.existsSync(mdPath)) {
              const content = fs.readFileSync(mdPath, 'utf8');
              challenge = this.parseMarkdownChallenge(content);
              challenge.id = dir.name;
            } else if (fs.existsSync(jsonPath)) {
              challenge = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
            }

            if (challenge) {
              // Count days (check both 'days' and 'daily' folders)
              const daysDir = path.join(challengeDir, 'days');
              const dailyDir = path.join(challengeDir, 'daily');
              const actualDaysDir = fs.existsSync(daysDir) ? daysDir : (fs.existsSync(dailyDir) ? dailyDir : null);

              if (actualDaysDir) {
                const dayFiles = fs.readdirSync(actualDaysDir).filter(f => f.endsWith('.md') || f.endsWith('.json'));
                challenge.totalDayFiles = dayFiles.length;
              }
              challenges.push(challenge);
            }
          } catch (err) {
            console.error(`[CacheManager] Error loading challenge ${dir.name}:`, err.message);
          }
        }
      }

      this.cache.challenges.set(profileId, challenges);
      this.setExpiration(`challenges:${profileId}`);

      return challenges;
    } catch (error) {
      console.error(`[CacheManager] Error loading challenges:`, error.message);
      return [];
    }
  }

  /**
   * Load todos for a profile
   */
  async loadTodos(profileId) {
    try {
      const todosDir = path.join(this.dataDir, 'profiles', profileId, 'todos');
      const globalTodosDir = path.join(this.dataDir, 'todos');
      const todos = [];

      // Try profile-specific todos first
      if (fs.existsSync(todosDir)) {
        // Try MD file first
        const mdFile = path.join(todosDir, 'active.md');
        if (fs.existsSync(mdFile)) {
          const content = fs.readFileSync(mdFile, 'utf8');
          const parsedTodos = this.parseTodosMd(content);
          todos.push(...parsedTodos);
        } else {
          // Fall back to JSON
          const todoFiles = fs.readdirSync(todosDir).filter(f => f.endsWith('.json'));
          for (const file of todoFiles) {
            const filePath = path.join(todosDir, file);
            const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            if (Array.isArray(content)) {
              todos.push(...content);
            } else if (content.todos) {
              todos.push(...content.todos);
            }
          }
        }
      }

      // Also check global todos
      if (fs.existsSync(globalTodosDir)) {
        const mdFile = path.join(globalTodosDir, 'active.md');
        if (fs.existsSync(mdFile)) {
          const content = fs.readFileSync(mdFile, 'utf8');
          const parsedTodos = this.parseTodosMd(content);
          todos.push(...parsedTodos);
        }
      }

      this.cache.todos.set(profileId, todos);
      this.setExpiration(`todos:${profileId}`);

      return todos;
    } catch (error) {
      console.error(`[CacheManager] Error loading todos for ${profileId}:`, error.message);
      return [];
    }
  }

  /**
   * Parse todos from MD file
   */
  parseTodosMd(content) {
    const todos = [];

    // Match todo items: - [x] or - [ ] followed by text
    const todoMatches = content.matchAll(/- \[([ xX])\]\s*\*\*(.+?)\*\*\n([\s\S]*?)(?=\n- \[|$)/g);

    for (const match of todoMatches) {
      const completed = match[1].toLowerCase() === 'x';
      const title = match[2].trim();
      const details = match[3];

      // Parse details
      const priorityMatch = details.match(/Priority:\s*(\w+)/i);
      const createdMatch = details.match(/Created:\s*(.+)/i);
      const challengeMatch = details.match(/Challenge:\s*(.+)/i);

      todos.push({
        id: `todo-${todos.length + 1}`,
        title,
        text: title,
        status: completed ? 'completed' : 'pending',
        completed,
        priority: priorityMatch?.[1]?.toLowerCase() || 'medium',
        createdAt: createdMatch?.[1]?.trim() || new Date().toISOString(),
        challengeId: challengeMatch?.[1]?.trim() || null,
      });
    }

    return todos;
  }

  /**
   * Parse markdown profile into structured data
   */
  parseMarkdownProfile(content, profileId) {
    const profile = { id: profileId };

    // Extract key-value pairs from markdown
    const lines = content.split('\n');
    for (const line of lines) {
      const match = line.match(/^-\s*\*\*(.+?):\*\*\s*(.+)$/);
      if (match) {
        const key = match[1].toLowerCase().replace(/\s+/g, '_');
        profile[key] = match[2];
      }
    }

    return profile;
  }

  /**
   * Parse markdown challenge into structured data
   */
  parseMarkdownChallenge(content) {
    // Simple frontmatter parser
    const challenge = {};
    const lines = content.split('\n');

    for (const line of lines) {
      const match = line.match(/^-\s*\*\*(.+?):\*\*\s*(.+)$/);
      if (match) {
        const key = match[1].toLowerCase().replace(/\s+/g, '_');
        challenge[key] = match[2];
      }
    }

    return challenge;
  }

  /**
   * Parse agents.md file into array of agents
   */
  parseAgentsMd(content) {
    const agents = [];

    // Split by agent sections (## AgentName)
    const sections = content.split(/\n## /).slice(1);

    for (const section of sections) {
      if (section.startsWith('Overview') || section.startsWith('Available')) continue;

      const lines = section.split('\n');
      const name = lines[0].trim();
      if (!name || name === 'Overview') continue;

      const agent = { name };

      // Parse key-value pairs
      for (const line of lines) {
        const match = line.match(/^-\s*\*\*(.+?):\*\*\s*(.+)$/i);
        if (match) {
          const key = match[1].toLowerCase().replace(/\s+/g, '_');
          agent[key] = match[2].trim();
        }
      }

      // Parse capabilities list
      const capsSection = section.match(/### Capabilities\n([\s\S]*?)(?=\n###|$)/i);
      if (capsSection) {
        agent.capabilities = [];
        const capMatches = capsSection[1].matchAll(/^-\s+(.+)$/gm);
        for (const m of capMatches) {
          agent.capabilities.push(m[1].trim());
        }
      }

      // Parse skills list
      const skillsSection = section.match(/### Skills\n([\s\S]*?)(?=\n###|$)/i);
      if (skillsSection) {
        agent.skills = [];
        const skillMatches = skillsSection[1].matchAll(/^-\s+(.+)$/gm);
        for (const m of skillMatches) {
          agent.skills.push(m[1].trim());
        }
      }

      if (agent.id) {
        agents.push(agent);
      }
    }

    return agents;
  }

  /**
   * Parse single agent.md file into agent object
   */
  parseAgentMd(content, defaultId) {
    const agent = { id: defaultId };

    // Extract name from first heading
    const nameMatch = content.match(/^#\s+(.+)$/m);
    if (nameMatch) {
      agent.name = nameMatch[1].trim();
    }

    // Extract ID if specified
    const idMatch = content.match(/ID:\*\*\s*(.+)/i);
    if (idMatch) {
      agent.id = idMatch[1].trim();
    }

    // Extract description
    const descMatch = content.match(/Description:\*\*\s*(.+)/i) ||
                      content.match(/## Description\n+([^\n#]+)/i);
    if (descMatch) {
      agent.description = descMatch[1].trim();
    }

    // Parse key-value pairs
    const lines = content.split('\n');
    for (const line of lines) {
      const match = line.match(/^-\s*\*\*(.+?):\*\*\s*(.+)$/);
      if (match) {
        const key = match[1].toLowerCase().replace(/\s+/g, '_');
        if (!agent[key]) {
          agent[key] = match[2].trim();
        }
      }
    }

    // Parse capabilities
    const capsSection = content.match(/## Capabilities\n([\s\S]*?)(?=\n##|$)/i);
    if (capsSection) {
      agent.capabilities = [];
      const capMatches = capsSection[1].matchAll(/^-\s+(.+)$/gm);
      for (const m of capMatches) {
        if (!m[1].includes('None')) {
          agent.capabilities.push(m[1].trim());
        }
      }
    }

    // Parse skills
    const skillsSection = content.match(/## Skills\n([\s\S]*?)(?=\n##|$)/i) ||
                         content.match(/## Assigned Skills\n([\s\S]*?)(?=\n##|$)/i);
    if (skillsSection) {
      agent.skills = [];
      const skillMatches = skillsSection[1].matchAll(/^-\s+(.+)$/gm);
      for (const m of skillMatches) {
        if (!m[1].includes('None') && !m[1].includes('No skills')) {
          agent.skills.push(m[1].trim());
        }
      }
    }

    return agent;
  }

  /**
   * Get profile from cache (instant)
   */
  getProfile(profileId) {
    const cached = this.cache.profiles.get(profileId);

    if (cached && !this.isExpired(`profile:${profileId}`)) {
      this.stats.hits++;
      return cached;
    }

    this.stats.misses++;
    // Async reload in background
    this.loadProfile(profileId);
    return cached || null;
  }

  /**
   * Get challenges from cache (instant) - uses global challenges
   */
  getChallenges(profileId = 'global') {
    // Always use global challenges
    const cached = this.cache.challenges.get('global');

    if (cached && !this.isExpired(`challenges:global`)) {
      this.stats.hits++;
      return cached;
    }

    this.stats.misses++;
    this.loadChallenges('global');
    return cached || [];
  }

  /**
   * Get todos from cache (instant)
   */
  getTodos(profileId) {
    const cached = this.cache.todos.get(profileId);

    if (cached && !this.isExpired(`todos:${profileId}`)) {
      this.stats.hits++;
      return cached;
    }

    this.stats.misses++;
    this.loadTodos(profileId);
    return cached || [];
  }

  /**
   * Get agent data from cache
   */
  getAgent(agentId) {
    const cached = this.cache.agents.get(agentId);
    this.stats.hits++;
    return cached || null;
  }

  /**
   * Get all profile IDs
   */
  getAllProfileIds() {
    // If cache is empty, try to scan the profiles directory directly
    if (this.cache.profiles.size === 0) {
      const profilesDir = path.join(this.dataDir, 'profiles');
      if (fs.existsSync(profilesDir)) {
        const dirs = fs.readdirSync(profilesDir, { withFileTypes: true });
        for (const dir of dirs) {
          if (dir.isDirectory()) {
            const profilePath = path.join(profilesDir, dir.name, 'profile.md');
            if (fs.existsSync(profilePath)) {
              // Load it synchronously for immediate availability
              try {
                const content = fs.readFileSync(profilePath, 'utf8');
                const profile = this.parseMarkdownProfile(content, dir.name);
                this.cache.profiles.set(dir.name, profile);
                console.log(`[CacheManager] Loaded profile on-demand: ${dir.name}`);
              } catch (err) {
                console.error(`[CacheManager] Error loading profile ${dir.name}:`, err.message);
              }
            }
          }
        }
      }
    }
    return Array.from(this.cache.profiles.keys());
  }

  /**
   * Get the first available profile ID (for single-user scenarios)
   */
  getFirstProfileId() {
    const ids = this.getAllProfileIds();
    return ids.length > 0 ? ids[0] : null;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      ...this.stats,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0,
      totalEntries: {
        profiles: this.cache.profiles.size,
        challenges: this.cache.challenges.size,
        todos: this.cache.todos.size,
        agents: this.cache.agents.size,
      }
    };
  }

  /**
   * Set expiration time for cache entry
   */
  setExpiration(key, ttl = this.defaultTTL) {
    this.expirations.set(key, Date.now() + ttl);
  }

  /**
   * Check if cache entry is expired
   */
  isExpired(key) {
    const expiration = this.expirations.get(key);
    if (!expiration) return false;
    return Date.now() > expiration;
  }

  /**
   * Invalidate cache for a specific key
   */
  invalidate(key) {
    const [type, id] = key.split(':');

    switch (type) {
      case 'profile':
        this.cache.profiles.delete(id);
        break;
      case 'challenges':
        this.cache.challenges.delete(id);
        break;
      case 'todos':
        this.cache.todos.delete(id);
        break;
    }

    this.expirations.delete(key);
    console.log(`[CacheManager] Invalidated: ${key}`);
  }

  /**
   * Start file watchers for auto-invalidation
   */
  startWatchers() {
    const profilesDir = path.join(this.dataDir, 'profiles');

    if (fs.existsSync(profilesDir)) {
      // Watch profiles directory
      const watcher = fs.watch(profilesDir, { recursive: true }, (eventType, filename) => {
        if (!filename) return;

        // Extract profile ID from path
        const parts = filename.split(path.sep);
        const profileId = parts[0];

        // Invalidate relevant cache
        if (filename.includes('profile.md')) {
          this.invalidate(`profile:${profileId}`);
        } else if (filename.includes('challenges')) {
          this.invalidate(`challenges:${profileId}`);
        } else if (filename.includes('todos')) {
          this.invalidate(`todos:${profileId}`);
        }
      });

      this.watchers.set('profiles', watcher);
    }
  }

  /**
   * Start cleanup interval for expired entries
   */
  startCleanupInterval() {
    setInterval(() => {
      let cleaned = 0;

      for (const [key, expiration] of this.expirations.entries()) {
        if (Date.now() > expiration) {
          this.invalidate(key);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        console.log(`[CacheManager] Cleaned ${cleaned} expired entries`);
      }
    }, 60000); // Every minute
  }

  /**
   * Rebuild index manually
   */
  async rebuildIndex() {
    console.log('[CacheManager] Rebuilding index...');
    await this.buildIndex();
    await this.preloadData();
    console.log('[CacheManager] ✓ Index rebuilt');
  }

  /**
   * Shutdown cache manager
   */
  shutdown() {
    console.log('[CacheManager] Shutting down...');

    // Close all watchers
    for (const [name, watcher] of this.watchers.entries()) {
      watcher.close();
      console.log(`[CacheManager] Closed watcher: ${name}`);
    }

    // Save final stats
    console.log('[CacheManager] Final stats:', this.getStats());
  }
}

// Export singleton instance
const cacheManager = new CacheManager();

module.exports = cacheManager;
