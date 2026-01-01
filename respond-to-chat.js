// Script to respond to the user's chat message
const wsListener = require('./lib/ws-listener.js');

// Get the request ID from command line or use the current pending one
const requestId = process.argv[2] || 'req-1767001531739-mhxd4xybk';

// Give it a moment for the ws-listener to be ready
setTimeout(() => {
  console.log(`\nSending response for request: ${requestId}\n`);

  // Craft the response based on user's profile
  const response = `Hey Anit! 👋

I checked your profile and I see you're focused on "Learning AI" - that's exciting! 🤖

Right now, you don't have any active challenges or tasks set up yet. Here's what I recommend:

📋 **Today's Action Items:**
1. Create your first AI learning challenge (I can help with this!)
2. Set up a daily learning schedule
3. Define specific milestones and goals

🎯 **Quick Start Options:**
• Start a 30-day AI fundamentals challenge
• Set up daily coding practice sessions
• Create a project-based learning plan

Would you like me to help you set up your first challenge? Just let me know what aspect of AI you want to focus on first! 🚀`;

  // Send the response with streaming
  console.log('Streaming response...\n');

  // Start streaming
  wsListener.sendResponseChunk(requestId, null, true, false);

  // Split response into chunks for streaming effect
  const chunks = response.split('\n\n');
  let fullContent = '';

  chunks.forEach((chunk, index) => {
    setTimeout(() => {
      const chunkText = chunk + '\n\n';
      fullContent += chunkText;
      console.log(`Chunk ${index + 1}/${chunks.length} sent`);
      wsListener.sendResponseChunk(requestId, chunkText, false, false);

      // Send end on last chunk
      if (index === chunks.length - 1) {
        setTimeout(() => {
          wsListener.sendResponseChunk(requestId, null, false, true, fullContent.trim());
          console.log('\n✅ Response complete!\n');
          process.exit(0);
        }, 100);
      }
    }, index * 300); // 300ms delay between chunks for streaming effect
  });
}, 1000);
