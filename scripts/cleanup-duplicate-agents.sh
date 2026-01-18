#!/bin/bash

# Cleanup Duplicate Agents Script
# Removes duplicate Agent Builder entries, keeping only the oldest one

AGENTS_DIR="$HOME/.skhoot/agents"

echo "🔍 Scanning for duplicate Agent Builders in $AGENTS_DIR"
echo ""

if [ ! -d "$AGENTS_DIR" ]; then
    echo "❌ Agents directory not found: $AGENTS_DIR"
    exit 1
fi

# Find all Agent Builder files
AGENT_BUILDERS=()
while IFS= read -r -d '' file; do
    # Check if file contains "Agent Builder" name
    if grep -q '"name":"Agent Builder"' "$file" 2>/dev/null; then
        AGENT_BUILDERS+=("$file")
    fi
done < <(find "$AGENTS_DIR" -name "agent-*.json" -print0)

TOTAL=${#AGENT_BUILDERS[@]}

if [ $TOTAL -eq 0 ]; then
    echo "✅ No Agent Builder files found"
    exit 0
fi

if [ $TOTAL -eq 1 ]; then
    echo "✅ Only one Agent Builder found (no duplicates)"
    echo "   File: ${AGENT_BUILDERS[0]}"
    exit 0
fi

echo "⚠️  Found $TOTAL Agent Builder files:"
echo ""

# Sort by creation time (oldest first) using filename timestamp
SORTED_BUILDERS=($(printf '%s\n' "${AGENT_BUILDERS[@]}" | sort))

# Keep the oldest one
KEEP="${SORTED_BUILDERS[0]}"
echo "✅ KEEPING (oldest): $(basename "$KEEP")"

# Delete the rest
DELETED=0
for ((i=1; i<${#SORTED_BUILDERS[@]}; i++)); do
    file="${SORTED_BUILDERS[$i]}"
    echo "🗑️  DELETING: $(basename "$file")"
    rm "$file"
    ((DELETED++))
done

echo ""
echo "✨ Cleanup complete!"
echo "   Kept: 1 Agent Builder"
echo "   Deleted: $DELETED duplicates"
echo ""
echo "🔄 Please restart Skhoot to see the changes"
