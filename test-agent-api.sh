#!/bin/bash

echo "Testing Agent API..."
echo ""

# Test 1: List agents (should be empty initially)
echo "1. Listing agents:"
curl -s http://localhost:3001/api/v1/agents | jq '.' 2>/dev/null || curl -s http://localhost:3001/api/v1/agents
echo ""
echo ""

# Test 2: Create a test agent
echo "2. Creating test agent:"
curl -s http://localhost:3001/api/v1/agents \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Agent",
    "description": "A test agent for API validation",
    "master_prompt": "You are a test agent. Your purpose is to validate the agent API.",
    "tags": ["test", "validation"],
    "workflows": [],
    "allowed_tools": ["read_file", "write_file"],
    "allowed_workflows": []
  }' | jq '.' 2>/dev/null || curl -s http://localhost:3001/api/v1/agents -X POST -H "Content-Type: application/json" -d '{"name":"Test Agent","description":"A test agent","master_prompt":"You are a test agent","tags":["test"],"workflows":[],"allowed_tools":["read_file"],"allowed_workflows":[]}'
echo ""
echo ""

# Test 3: List agents again (should show the created agent)
echo "3. Listing agents after creation:"
curl -s http://localhost:3001/api/v1/agents | jq '.' 2>/dev/null || curl -s http://localhost:3001/api/v1/agents
echo ""
echo ""

# Test 4: Get specific agent (extract ID from list first)
echo "4. Getting specific agent details:"
AGENT_ID=$(curl -s http://localhost:3001/api/v1/agents | jq -r '.[0].id' 2>/dev/null)
if [ -n "$AGENT_ID" ] && [ "$AGENT_ID" != "null" ]; then
  echo "Agent ID: $AGENT_ID"
  curl -s "http://localhost:3001/api/v1/agents/$AGENT_ID" | jq '.' 2>/dev/null || curl -s "http://localhost:3001/api/v1/agents/$AGENT_ID"
else
  echo "No agent ID found"
fi
echo ""
echo ""

echo "Test complete!"
