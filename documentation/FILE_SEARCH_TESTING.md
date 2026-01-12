# File Search Integration Testing Guide

## 🚀 Quick Start

### 1. Start the Backend
```bash
cd backend
cargo run
```
The backend should start on `http://localhost:3001`

### 2. Start the Frontend
```bash
npm run dev
# or
yarn dev
```
The frontend should start on `http://localhost:5173`

### 3. Test the Integration

#### Option A: Use the Test Interface
1. Click the **🔍 Search icon** in the top-right header
2. Or press **Ctrl+Shift+F** to open the test interface
3. Try searching for files like:
   - `main`
   - `*.rs`
   - `config`
   - `package.json`

#### Option B: Chat with the AI
1. Start a new chat
2. Ask the AI to find files:
   - "Find the main.rs file"
   - "Where is the configuration file?"
   - "Show me all TypeScript files"
   - "Search for files containing 'search'"

## 🔍 What to Test

### AI Intent Detection
The AI should automatically detect when you're asking about files and trigger the search function. Try these prompts:

✅ **Should trigger file search:**
- "Find the main configuration file"
- "Where is package.json?"
- "Show me all .rs files"
- "Locate the README"
- "I need to find the login component"

❌ **Should NOT trigger file search:**
- "What's the weather today?"
- "How do I cook pasta?"
- "Tell me a joke"

### Search Modes
The system supports multiple search modes:
- **Auto**: Intelligently chooses the best engine
- **Rust**: Fast fuzzy matching
- **CLI**: Uses system tools (ripgrep, fd)
- **Hybrid**: Combines multiple engines

### Expected Results
When the AI performs a file search, you should see:
1. **Search Info Panel** showing:
   - Query used
   - Search mode
   - Execution time
   - Number of results found
2. **File Results** with:
   - File names and paths
   - Relevance scores
   - Source engine used
   - File snippets (if content search)
3. **AI Suggestions** for refining the search
4. **Action Buttons** to open or copy file paths

## 🐛 Troubleshooting

### Backend Issues
- **"Backend not available"**: Make sure `cargo run` is running in the backend folder
- **Compilation errors**: Check that all Rust dependencies are installed
- **Port conflicts**: Ensure port 3001 is not in use by another service

### Frontend Issues
- **"Search failed"**: Check browser console for detailed error messages
- **No results**: Try different search terms or check if files exist in the project
- **AI not triggering search**: The AI might not detect intent - try more explicit prompts

### Debug Information
- Open browser DevTools (F12)
- Check the Console tab for detailed logs:
  - `🔍 AI triggered file search:` - Shows when AI detects file search intent
  - `✅ File search completed:` - Shows successful search results
  - `❌ File search failed:` - Shows error details

## 📊 Performance Expectations

### Search Times
- **Small projects** (< 1K files): ~10-50ms
- **Medium projects** (1K-10K files): ~50-200ms
- **Large projects** (10K+ files): ~200-500ms

### Search Quality
- **Fuzzy matching**: Should find files even with typos
- **Partial matches**: Should work with incomplete file names
- **Content search**: Should find files containing specific text
- **Smart suggestions**: AI should provide helpful query refinements

## 🎯 Test Scenarios

### Scenario 1: Basic File Finding
1. Ask: "Find the main.rs file"
2. Expected: AI uses `findFile` function, shows Rust files
3. Verify: Results show relevance scores and file paths

### Scenario 2: Content Search
1. Ask: "Find files containing 'TODO'"
2. Expected: AI uses `searchContent` function
3. Verify: Results show file snippets with matching content

### Scenario 3: Project-Specific Search
1. Ask: "Where is the package.json?"
2. Expected: AI finds configuration files
3. Verify: Shows project configuration files

### Scenario 4: Fallback Behavior
1. Stop the backend (`Ctrl+C` in backend terminal)
2. Ask: "Find config files"
3. Expected: AI shows cached/mock results with error message
4. Verify: Error message indicates backend unavailable

## 🔧 Advanced Testing

### Test Different File Types
```
"Find all JavaScript files"
"Show me Python scripts"
"Where are the configuration files?"
"Find image files"
```

### Test Search Refinement
```
"Find config" → Should suggest more specific queries
"Search for main" → Should show multiple main files
"*.rs files in src/" → Should filter by directory
```

### Test Error Handling
- Search for non-existent files
- Use invalid search patterns
- Test with backend offline

## 📝 Expected Console Output

When everything works correctly, you should see:
```
🔍 AI triggered file search: {query: "main", search_mode: "auto"}
✅ File search completed: {query: "main", results: 5, time: "45ms"}
```

When there are issues:
```
❌ File search failed: Backend not available
💡 AI Suggestion result: {should_suggest_file_search: true, confidence: 0.85}
```

## 🎉 Success Criteria

The integration is working correctly when:
1. ✅ AI automatically detects file search requests
2. ✅ Backend search executes successfully
3. ✅ Results display with proper formatting
4. ✅ Search info shows execution time and mode
5. ✅ AI provides helpful suggestions
6. ✅ Error handling works gracefully
7. ✅ Performance is acceptable (< 500ms for most searches)

## 🚨 Common Issues

### "Function not found" errors
- Check that the Gemini service has the updated function definitions
- Verify the AI is using the correct function names

### Empty results
- Ensure you're searching in a directory with files
- Try broader search terms
- Check file permissions

### Slow searches
- Large projects may take longer
- Try using more specific search terms
- Check if exclude patterns are working correctly

---

**Need help?** Check the browser console for detailed error messages and ensure both backend and frontend are running correctly.