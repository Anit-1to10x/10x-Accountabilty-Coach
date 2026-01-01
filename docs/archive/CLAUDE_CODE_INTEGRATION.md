# Claude Code CLI Integration Guide

This document explains what needs to be implemented on the Claude Code CLI side to work with the OpenAnalyst web UI.

## Summary

The WebSocket integration is **COMPLETE** on the UI side. The UI now:
- ✅ Connects to `ws://localhost:8765` on startup
- ✅ Sends chat messages via WebSocket
- ✅ Displays streaming responses in real-time
- ✅ Shows connection status indicator
- ✅ Auto-reconnects on disconnect
- ✅ Falls back to error messages if Claude Code is not running

## What Claude Code CLI Needs to Do

### 1. Start a WebSocket Server

When `claude-code` command is run in the OpenAnalyst directory, it should:

1. Detect that it's in an OpenAnalyst project (check for `ARCHITECTURE_INDEX.md` or similar)
2. Start a WebSocket server on port `8765` (configurable via environment variable `WEBSOCKET_PORT`)
3. Print startup message:
   ```
   ✓ Reading ARCHITECTURE_INDEX.md
   ✓ Watching ~/.openanalyst/
   ✓ WebSocket server listening on ws://localhost:8765
   ✓ Ready to assist!
   ```

### 2. Handle Incoming WebSocket Messages

Listen for messages from the UI with this structure:

```json
{
  "type": "chat",
  "agentId": "accountability-coach",
  "content": "Create a challenge for learning Python",
  "requestId": "req-1234567890-abc",
  "timestamp": "2025-12-27T10:30:00Z",
  "data": {
    "attachments": []
  }
}
```

### 3. Process the Message

When a chat message is received:

1. **Read context from files:**
   ```python
   # Example pseudocode
   user_profile = read_file('~/.openanalyst/profile/profile.md')
   challenges = list_files('~/.openanalyst/challenges/')
   agent_config = read_file('~/.openanalyst/agents.json')
   chat_history = read_file(f'~/.openanalyst/chats/{today}/{agentId}.md')
   ```

2. **Build the prompt:**
   ```python
   prompt = f"""
   You are {agent.name}, an accountability coach.

   User Profile:
   {user_profile}

   Active Challenges:
   {format_challenges(challenges)}

   Recent Chat History:
   {chat_history}

   User Message:
   {message.content}

   Respond as the accountability coach. Be {persona} in your tone.
   """
   ```

3. **Generate response using Claude API:**
   ```python
   async for chunk in anthropic.messages.stream(
       model="claude-sonnet-4-5-20250929",
       messages=[{"role": "user", "content": prompt}],
       max_tokens=4096
   ):
       # Send each chunk via WebSocket
       send_ws_message({
           "type": "response_chunk",
           "requestId": message.requestId,
           "content": chunk.text,
           "timestamp": now()
       })
   ```

### 4. Send Response via WebSocket

Send responses in three phases:

**Phase 1: Start Response**
```json
{
  "type": "response_start",
  "requestId": "req-1234567890-abc",
  "agentId": "accountability-coach",
  "timestamp": "2025-12-27T10:30:01Z"
}
```

**Phase 2: Stream Chunks**
```json
{
  "type": "response_chunk",
  "requestId": "req-1234567890-abc",
  "content": "I'd love to help you ",
  "timestamp": "2025-12-27T10:30:01Z"
}
```

```json
{
  "type": "response_chunk",
  "requestId": "req-1234567890-abc",
  "content": "create a Python learning challenge! ",
  "timestamp": "2025-12-27T10:30:01Z"
}
```

**Phase 3: End Response**
```json
{
  "type": "response_end",
  "requestId": "req-1234567890-abc",
  "timestamp": "2025-12-27T10:30:05Z"
}
```

**On Error:**
```json
{
  "type": "error",
  "requestId": "req-1234567890-abc",
  "content": "Error message here",
  "timestamp": "2025-12-27T10:30:02Z"
}
```

### 5. Write Files as Needed

After generating the response, Claude Code should:

1. **Append to chat history:**
   ```markdown
   ## 10:30 AM
   **User:** Create a challenge for learning Python

   **Assistant:** I'd love to help you create a Python learning challenge! Let me ask you a few questions:

   1. How many hours per day can you dedicate to learning Python?
   2. What's your target date to become proficient?
   3. Do you have any prior programming experience?

   Let's design a personalized plan together!
   ```

2. **Create challenge files** (if user completes onboarding):
   - `challenge-config.json`
   - `plan.md`
   - `activity-log.md`
   - `progress.md`
   - `backlog.md`
   - `punishment.json`

3. **Update registries:**
   - Add to `~/.openanalyst/.registry/challenges.json`

4. **Notify UI of file changes** (optional):
   ```json
   {
     "type": "file_update",
     "data": {
       "path": "challenges/python-learning/plan.md",
       "action": "created"
     },
     "timestamp": "2025-12-27T10:30:03Z"
   }
   ```

## Example Implementation (Python)

```python
import asyncio
import websockets
import json
from anthropic import Anthropic
import os
from pathlib import Path

class OpenAnalystCLI:
    def __init__(self):
        self.openanalyst_dir = Path.home() / '.openanalyst'
        self.ws_port = int(os.getenv('WEBSOCKET_PORT', 8765))
        self.anthropic = Anthropic(api_key=os.getenv('ANTHROPIC_API_KEY'))
        self.clients = set()

    async def handle_client(self, websocket):
        """Handle a WebSocket client connection"""
        self.clients.add(websocket)
        try:
            async for message in websocket:
                await self.handle_message(websocket, json.loads(message))
        finally:
            self.clients.remove(websocket)

    async def handle_message(self, websocket, message):
        """Handle incoming WebSocket message"""
        if message['type'] == 'chat':
            await self.handle_chat(websocket, message)

    async def handle_chat(self, websocket, message):
        """Handle chat message and stream response"""
        request_id = message['requestId']
        agent_id = message['agentId']
        content = message['content']

        try:
            # Send response start
            await websocket.send(json.dumps({
                'type': 'response_start',
                'requestId': request_id,
                'agentId': agent_id,
                'timestamp': datetime.now().isoformat()
            }))

            # Read context
            context = self.read_context(agent_id)

            # Build prompt
            prompt = self.build_prompt(context, content)

            # Stream response
            full_response = ''
            async with self.anthropic.messages.stream(
                model='claude-sonnet-4-5-20250929',
                messages=[{'role': 'user', 'content': prompt}],
                max_tokens=4096
            ) as stream:
                async for chunk in stream:
                    if chunk.type == 'content_block_delta':
                        text = chunk.delta.text
                        full_response += text

                        # Send chunk
                        await websocket.send(json.dumps({
                            'type': 'response_chunk',
                            'requestId': request_id,
                            'content': text,
                            'timestamp': datetime.now().isoformat()
                        }))

            # Send response end
            await websocket.send(json.dumps({
                'type': 'response_end',
                'requestId': request_id,
                'timestamp': datetime.now().isoformat()
            }))

            # Save to chat file
            self.save_chat_message(agent_id, content, full_response)

        except Exception as e:
            # Send error
            await websocket.send(json.dumps({
                'type': 'error',
                'requestId': request_id,
                'content': str(e),
                'timestamp': datetime.now().isoformat()
            }))

    def read_context(self, agent_id):
        """Read context from files"""
        context = {}

        # Read user profile
        profile_path = self.openanalyst_dir / 'profile' / 'profile.md'
        if profile_path.exists():
            context['profile'] = profile_path.read_text()

        # Read challenges
        challenges_dir = self.openanalyst_dir / 'challenges'
        if challenges_dir.exists():
            context['challenges'] = []
            for challenge_dir in challenges_dir.iterdir():
                if challenge_dir.is_dir():
                    config_path = challenge_dir / 'challenge-config.json'
                    if config_path.exists():
                        context['challenges'].append(json.loads(config_path.read_text()))

        # Read recent chat history
        today = datetime.now().strftime('%Y-%m-%d')
        chat_path = self.openanalyst_dir / 'chats' / today / f'{agent_id}.md'
        if chat_path.exists():
            context['chat_history'] = chat_path.read_text()

        return context

    def build_prompt(self, context, user_message):
        """Build prompt for Claude"""
        return f"""
        You are an accountability coach helping users achieve their goals.

        User Profile:
        {context.get('profile', 'No profile found')}

        Active Challenges:
        {self.format_challenges(context.get('challenges', []))}

        Recent Chat History:
        {context.get('chat_history', 'No history')}

        User Message:
        {user_message}

        Respond naturally as an accountability coach.
        """

    def save_chat_message(self, agent_id, user_content, assistant_content):
        """Save chat message to markdown file"""
        today = datetime.now().strftime('%Y-%m-%d')
        time = datetime.now().strftime('%I:%M %p')

        chat_dir = self.openanalyst_dir / 'chats' / today
        chat_dir.mkdir(parents=True, exist_ok=True)

        chat_file = chat_dir / f'{agent_id}.md'

        message = f"""
## {time}
**User:** {user_content}

**Assistant:** {assistant_content}

"""

        with open(chat_file, 'a') as f:
            f.write(message)

    async def start(self):
        """Start the WebSocket server"""
        print('✓ Reading ARCHITECTURE_INDEX.md')
        print(f'✓ Watching {self.openanalyst_dir}')
        print(f'✓ WebSocket server listening on ws://localhost:{self.ws_port}')
        print('✓ Ready to assist!')

        async with websockets.serve(self.handle_client, 'localhost', self.ws_port):
            await asyncio.Future()  # Run forever

# Run the CLI
if __name__ == '__main__':
    cli = OpenAnalystCLI()
    asyncio.run(cli.start())
```

## Testing the Integration

### 1. Start Claude Code CLI

```bash
cd "OpenAnalyst Accountability coach"
python claude_code_cli.py  # or however you run it
```

Expected output:
```
✓ Reading ARCHITECTURE_INDEX.md
✓ Watching C:\Users\Anit\.openanalyst
✓ WebSocket server listening on ws://localhost:8765
✓ Ready to assist!
```

### 2. Start the Web UI

```bash
cd ui
npm run dev
```

### 3. Test Chat

1. Open `http://localhost:3000` in your browser
2. You should see a green "Claude Code Connected" indicator in the bottom-right corner
3. Send a message in the chat
4. You should see:
   - Typing indicator appears
   - Response streams in character by character
   - Connection stays active

### 4. Verify Files

Check that chat messages are being saved:
```bash
cat ~/.openanalyst/chats/2025-12-27/accountability-coach.md
```

## Environment Variables

**Claude Code CLI:**
```bash
ANTHROPIC_API_KEY=your_api_key_here
WEBSOCKET_PORT=8765
OPENANALYST_DIR=~/.openanalyst
```

**Web UI:**
```bash
NEXT_PUBLIC_WS_URL=ws://localhost:8765
```

## Architecture Benefits

This WebSocket architecture provides:

1. **Real-time streaming** - User sees responses as Claude generates them
2. **No external dependencies** - No need for separate backend server
3. **File-based transparency** - All data visible in `.openanalyst/`
4. **True integration** - Claude Code IS the brain, not a proxy
5. **Low latency** - Direct WebSocket connection, no HTTP overhead
6. **Bidirectional** - Claude Code can proactively notify UI of file changes

## Next Steps

Once this is working, Claude Code can be enhanced to:

1. **Watch for file changes** and auto-update plans when user edits files
2. **Proactively send updates** when challenges are due, punishments trigger, etc.
3. **Generate plans automatically** when challenges are created
4. **Track streaks** and send reminders via WebSocket
5. **Create vision boards** by generating images and saving them

---

## Summary

The UI is **ready** for Claude Code integration. All that's needed is:

1. ✅ WebSocket server on port 8765
2. ✅ Handle `chat` messages
3. ✅ Stream responses using `response_chunk` messages
4. ✅ Read context from files
5. ✅ Write responses back to files

Everything else (connection management, UI updates, error handling) is already implemented on the UI side.
