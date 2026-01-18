#!/bin/bash

# Test Tool Call Dropdown Feature
# Runs all tests related to the tool call dropdown feature

set -e

echo "🧪 Testing Tool Call Dropdown Feature"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test ToolCallInput component
echo -e "${BLUE}Testing ToolCallInput component...${NC}"
npm test -- components/chat/__tests__/ToolCallInput.test.tsx --run

echo ""
echo -e "${GREEN}✓ ToolCallInput tests passed${NC}"
echo ""

# Test ToolCallDropdown component
echo -e "${BLUE}Testing ToolCallDropdown component...${NC}"
npm test -- components/chat/__tests__/ToolCallDropdown.test.tsx --run

echo ""
echo -e "${GREEN}✓ ToolCallDropdown tests passed${NC}"
echo ""

# Test Integration
echo -e "${BLUE}Testing integration flow...${NC}"
npm test -- components/chat/__tests__/ToolCallDropdown.integration.test.tsx --run

echo ""
echo -e "${GREEN}✓ Integration tests passed${NC}"
echo ""

# Test Service
echo -e "${BLUE}Testing AgentChatService direct tool call...${NC}"
npm test -- services/__tests__/agentChatService.directToolCall.test.ts --run

echo ""
echo -e "${GREEN}✓ Service tests passed${NC}"
echo ""

echo "======================================"
echo -e "${GREEN}✅ All Tool Call Dropdown tests passed!${NC}"
echo ""
echo "📊 Run 'npm test -- --coverage' for coverage report"
