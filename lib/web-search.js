/**
 * Web Search Module
 *
 * Provides web search functionality for chat responses.
 * Uses DuckDuckGo Instant Answer API (no API key required)
 */

const https = require('https');
const http = require('http');

/**
 * Perform a web search using DuckDuckGo
 * @param {string} query - Search query
 * @returns {Promise<Object>} Search results
 */
async function search(query) {
  try {
    // Use DuckDuckGo Instant Answer API
    const encodedQuery = encodeURIComponent(query);
    const url = `https://api.duckduckgo.com/?q=${encodedQuery}&format=json&no_html=1&skip_disambig=1`;

    const response = await fetchUrl(url);
    const data = JSON.parse(response);

    const results = {
      query,
      instant: null,
      abstract: null,
      related: [],
      definition: null,
      source: 'DuckDuckGo',
    };

    // Extract instant answer
    if (data.Answer) {
      results.instant = data.Answer;
    }

    // Extract abstract (main result)
    if (data.Abstract) {
      results.abstract = {
        text: data.Abstract,
        source: data.AbstractSource,
        url: data.AbstractURL,
      };
    }

    // Extract definition
    if (data.Definition) {
      results.definition = {
        text: data.Definition,
        source: data.DefinitionSource,
        url: data.DefinitionURL,
      };
    }

    // Extract related topics
    if (data.RelatedTopics && data.RelatedTopics.length > 0) {
      results.related = data.RelatedTopics
        .filter(topic => topic.Text) // Filter out topic groups
        .slice(0, 5) // Limit to 5 results
        .map(topic => ({
          text: topic.Text,
          url: topic.FirstURL,
        }));
    }

    return results;
  } catch (error) {
    console.error('[WebSearch] Error:', error.message);
    return {
      query,
      error: error.message,
      source: 'DuckDuckGo',
    };
  }
}

/**
 * Search using Google Custom Search (requires API key)
 * Fallback option if configured
 */
async function searchGoogle(query) {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

  if (!apiKey || !searchEngineId) {
    return { error: 'Google Search not configured' };
  }

  try {
    const encodedQuery = encodeURIComponent(query);
    const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodedQuery}`;

    const response = await fetchUrl(url);
    const data = JSON.parse(response);

    return {
      query,
      results: (data.items || []).slice(0, 5).map(item => ({
        title: item.title,
        snippet: item.snippet,
        url: item.link,
      })),
      source: 'Google',
    };
  } catch (error) {
    return { query, error: error.message, source: 'Google' };
  }
}

/**
 * Detect if a message is asking for a web search
 * @param {string} message - User message
 * @returns {Object|null} Search intent with query, or null
 */
function detectSearchIntent(message) {
  const lowerMessage = message.toLowerCase().trim();

  // Explicit search patterns
  const searchPatterns = [
    /^search\s+(?:for\s+)?(.+)/i,
    /^google\s+(.+)/i,
    /^look\s+up\s+(.+)/i,
    /^find\s+(?:information\s+)?(?:about\s+)?(.+)/i,
    /^what\s+is\s+(.+)\??$/i,
    /^who\s+is\s+(.+)\??$/i,
    /^when\s+(?:was|is|did)\s+(.+)\??$/i,
    /^where\s+(?:is|was|are)\s+(.+)\??$/i,
    /^how\s+(?:to|do|does|did|can)\s+(.+)\??$/i,
    /^why\s+(?:is|was|are|do|does|did)\s+(.+)\??$/i,
    /^(?:can you\s+)?search\s+(?:the\s+)?(?:web|internet)\s+(?:for\s+)?(.+)/i,
    /^(?:please\s+)?(?:do a\s+)?web\s+search\s+(?:for\s+)?(.+)/i,
  ];

  for (const pattern of searchPatterns) {
    const match = message.match(pattern);
    if (match) {
      return {
        intent: 'search',
        query: match[1].trim(),
        original: message,
      };
    }
  }

  // Check for question words that might need search
  const questionKeywords = ['latest', 'current', 'recent', 'news about', 'update on', 'today\'s'];
  for (const keyword of questionKeywords) {
    if (lowerMessage.includes(keyword)) {
      return {
        intent: 'search',
        query: message,
        original: message,
      };
    }
  }

  return null;
}

/**
 * Format search results for chat display
 * @param {Object} results - Search results object
 * @returns {string} Formatted markdown string
 */
function formatSearchResults(results) {
  if (results.error) {
    return `I tried to search for "${results.query}" but encountered an error: ${results.error}`;
  }

  let response = `**Web Search Results for:** "${results.query}"\n\n`;

  // Add instant answer if available
  if (results.instant) {
    response += `**Quick Answer:** ${results.instant}\n\n`;
  }

  // Add abstract/main result
  if (results.abstract && results.abstract.text) {
    response += `**Summary:** ${results.abstract.text}\n`;
    if (results.abstract.url) {
      response += `*Source: [${results.abstract.source}](${results.abstract.url})*\n\n`;
    }
  }

  // Add definition if available
  if (results.definition && results.definition.text) {
    response += `**Definition:** ${results.definition.text}\n`;
    if (results.definition.url) {
      response += `*Source: [${results.definition.source}](${results.definition.url})*\n\n`;
    }
  }

  // Add related topics
  if (results.related && results.related.length > 0) {
    response += `**Related Information:**\n`;
    results.related.forEach((topic, index) => {
      response += `${index + 1}. ${topic.text}\n`;
      if (topic.url) {
        response += `   [Read more](${topic.url})\n`;
      }
    });
    response += '\n';
  }

  // Add Google results if available
  if (results.results && results.results.length > 0) {
    response += `**Top Results:**\n`;
    results.results.forEach((result, index) => {
      response += `${index + 1}. **[${result.title}](${result.url})**\n`;
      response += `   ${result.snippet}\n\n`;
    });
  }

  // No results case
  if (!results.instant && !results.abstract?.text && !results.definition?.text &&
      (!results.related || results.related.length === 0) &&
      (!results.results || results.results.length === 0)) {
    response = `I searched for "${results.query}" but couldn't find specific results. Try rephrasing your query or being more specific.`;
  }

  response += `\n*Powered by ${results.source}*`;

  return response;
}

/**
 * Helper function to fetch URL content
 */
function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    protocol.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

module.exports = {
  search,
  searchGoogle,
  detectSearchIntent,
  formatSearchResults,
};
