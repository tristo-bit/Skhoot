#!/bin/bash

# Test script for web_search toolcall
# Tests the backend endpoint directly

echo "🔍 Testing Web Search Endpoint"
echo "================================"
echo ""

# Check if backend is running
echo "1. Checking if backend is running..."
if curl -s http://localhost:3001/api/v1/ping > /dev/null 2>&1; then
    echo "   ✅ Backend is running"
else
    echo "   ❌ Backend is not running"
    echo "   Please start the backend with: cd backend && cargo run"
    exit 1
fi

echo ""
echo "2. Testing general web search..."
response=$(curl -s "http://localhost:3001/api/v1/search/web?q=rust+programming&num_results=3&search_type=general")
echo "   Response:"
echo "$response" | jq '.' 2>/dev/null || echo "$response"

echo ""
echo "3. Testing news search..."
response=$(curl -s "http://localhost:3001/api/v1/search/web?q=AI+news&num_results=2&search_type=news")
echo "   Response:"
echo "$response" | jq '.' 2>/dev/null || echo "$response"

echo ""
echo "4. Testing docs search..."
response=$(curl -s "http://localhost:3001/api/v1/search/web?q=React+hooks&num_results=2&search_type=docs")
echo "   Response:"
echo "$response" | jq '.' 2>/dev/null || echo "$response"

echo ""
echo "================================"
echo "✅ All tests completed!"
echo ""
echo "Next steps:"
echo "1. Start the frontend: npm run tauri dev"
echo "2. Test in chat: 'Search the web for latest AI news'"
echo "3. The AI should automatically call the web_search tool"
echo ""
echo "To enable real search:"
echo "1. Choose an API (DuckDuckGo, Google, Brave, etc.)"
echo "2. Get API key from the provider"
echo "3. Follow instructions in WEB_SEARCH_IMPLEMENTATION.md"
