#!/bin/bash

# Fix Agent Builder's is_default flag

AGENT_DIR="$HOME/.skhoot/agents"

echo "🔍 Looking for Agent Builder..."

# Find Agent Builder file
AGENT_FILE=$(grep -l '"name": "Agent Builder"' "$AGENT_DIR"/*.json 2>/dev/null | head -1)

if [ -z "$AGENT_FILE" ]; then
    echo "❌ Agent Builder not found in $AGENT_DIR"
    exit 1
fi

echo "✅ Found Agent Builder: $AGENT_FILE"

# Check current is_default value
CURRENT_VALUE=$(grep '"is_default"' "$AGENT_FILE" | grep -o 'true\|false')
echo "📋 Current is_default: $CURRENT_VALUE"

if [ "$CURRENT_VALUE" = "true" ]; then
    echo "✅ Agent Builder is_default is already true, no changes needed"
    exit 0
fi

# Create backup
BACKUP_FILE="${AGENT_FILE}.backup-$(date +%s)"
cp "$AGENT_FILE" "$BACKUP_FILE"
echo "💾 Created backup: $BACKUP_FILE"

# Fix is_default flag
sed -i 's/"is_default": false/"is_default": true/' "$AGENT_FILE"

# Verify change
NEW_VALUE=$(grep '"is_default"' "$AGENT_FILE" | grep -o 'true\|false')
echo "📋 New is_default: $NEW_VALUE"

if [ "$NEW_VALUE" = "true" ]; then
    echo "✅ Successfully updated Agent Builder's is_default to true"
    echo "🔄 Please restart Skhoot to see the changes"
else
    echo "❌ Failed to update is_default flag"
    echo "🔙 Restoring backup..."
    mv "$BACKUP_FILE" "$AGENT_FILE"
    exit 1
fi
