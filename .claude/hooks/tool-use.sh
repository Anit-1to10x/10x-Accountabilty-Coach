#!/bin/bash
# Claude Code Hook: Auto-respond to OpenAnalyst chat messages
# This hook runs after every tool use and checks for pending messages

PENDING_DIR="./data/.pending"
RESPONSES_DIR="./data/.responses"

# Create directories if they don't exist
mkdir -p "$PENDING_DIR"
mkdir -p "$RESPONSES_DIR"

# Check for pending messages
if [ -d "$PENDING_DIR" ] && [ "$(ls -A $PENDING_DIR/*.json 2>/dev/null)" ]; then
  # Get the oldest pending message
  PENDING_FILE=$(ls -t "$PENDING_DIR"/*.json 2>/dev/null | tail -1)

  if [ -n "$PENDING_FILE" ]; then
    echo "🤖 [Claude Brain] New message detected: $(basename $PENDING_FILE)"

    # Read the message
    MESSAGE=$(cat "$PENDING_FILE")
    REQUEST_ID=$(basename "$PENDING_FILE" .json)

    # Extract the user message
    USER_MESSAGE=$(echo "$MESSAGE" | node -e "
      const data = JSON.parse(require('fs').readFileSync(0, 'utf-8'));
      console.log(data.message || data.text || '');
    " 2>/dev/null)

    if [ -n "$USER_MESSAGE" ]; then
      echo "📨 User: $USER_MESSAGE"
      echo "🧠 Processing with Claude Code..."

      # Move the pending file to mark as processing
      mv "$PENDING_FILE" "$PENDING_DIR/.processing-$REQUEST_ID.json"

      # This will trigger Claude Code to see the message and respond
      # Claude Code should generate a response and save it to RESPONSES_DIR
      echo "✅ Message ready for Claude Code to process"
      echo "   Request ID: $REQUEST_ID"
    fi
  fi
fi