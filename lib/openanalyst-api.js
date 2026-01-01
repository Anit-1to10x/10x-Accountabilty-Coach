/**
 * OpenAnalyst API Client
 *
 * Connects to OpenAnalyst's AI backend (OpenRouter-compatible format).
 * Supports both streaming and non-streaming responses.
 */

require('dotenv').config();

// Configuration from environment
const API_URL = process.env.OPENANALYST_API_URL || 'https://openrouter.ai/api/v1';
const API_KEY = process.env.OPENANALYST_API_KEY;
const MODEL = process.env.OPENANALYST_MODEL || 'anthropic/claude-3.5-sonnet';

/**
 * Send a chat completion request (non-streaming)
 * @param {Array} messages - Array of {role, content} messages
 * @param {Object} options - Additional options
 * @returns {Promise<string>} The assistant's response content
 */
async function chat(messages, options = {}) {
  if (!API_KEY) {
    throw new Error('OPENANALYST_API_KEY is not set. Please add it to your .env file.');
  }

  const response = await fetch(`${API_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://openanalyst.app',
      'X-Title': 'OpenAnalyst Accountability Coach',
    },
    body: JSON.stringify({
      model: options.model || MODEL,
      messages,
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 2048,
      stream: false,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API request failed: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

/**
 * Send a chat completion request with streaming
 * @param {Array} messages - Array of {role, content} messages
 * @param {Function} onChunk - Callback for each text chunk
 * @param {Function} onComplete - Callback when complete (optional)
 * @param {Object} options - Additional options
 * @returns {Promise<string>} The full response content
 */
async function chatStream(messages, onChunk, onComplete = null, options = {}) {
  if (!API_KEY) {
    throw new Error('OPENANALYST_API_KEY is not set. Please add it to your .env file.');
  }

  const response = await fetch(`${API_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://openanalyst.app',
      'X-Title': 'OpenAnalyst Accountability Coach',
    },
    body: JSON.stringify({
      model: options.model || MODEL,
      messages,
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 2048,
      stream: true,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API request failed: ${response.status} - ${error}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullContent = '';
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      // Decode the chunk and add to buffer
      buffer += decoder.decode(value, { stream: true });

      // Process complete lines from buffer
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        const trimmedLine = line.trim();

        if (!trimmedLine || trimmedLine === 'data: [DONE]') {
          continue;
        }

        if (trimmedLine.startsWith('data: ')) {
          try {
            const jsonStr = trimmedLine.slice(6);
            const data = JSON.parse(jsonStr);
            const content = data.choices?.[0]?.delta?.content;

            if (content) {
              fullContent += content;
              onChunk(content);
            }
          } catch (parseError) {
            // Skip malformed JSON chunks
            console.warn('[OpenAnalyst API] Failed to parse chunk:', trimmedLine);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  if (onComplete) {
    onComplete(fullContent);
  }

  return fullContent;
}

/**
 * Check if the API is configured and accessible
 * @returns {Promise<boolean>}
 */
async function isConfigured() {
  return !!API_KEY;
}

/**
 * Test the API connection
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function testConnection() {
  if (!API_KEY) {
    return { success: false, message: 'API key not configured' };
  }

  try {
    const response = await chat([
      { role: 'user', content: 'Hello' }
    ], { maxTokens: 10 });

    return { success: true, message: 'API connection successful' };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

/**
 * Get current configuration (without exposing API key)
 * @returns {Object}
 */
function getConfig() {
  return {
    apiUrl: API_URL,
    model: MODEL,
    hasApiKey: !!API_KEY,
  };
}

module.exports = {
  chat,
  chatStream,
  isConfigured,
  testConnection,
  getConfig,
};
