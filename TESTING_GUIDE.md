# File Search Integration Testing Guide

## 🚀 Quick Test Setup

### 1. Start the Backend
```bash
cd backend
cargo run
```
**Expected output:**
```
Starting Skhoot Backend v0.1.0
Backend server listening on 127.0.0.1:3001
```

### 2. Start the Frontend
```bash
# In the root directory
npm run dev
```
**Expected output:**
```
Local:   http://localhost:5173/
```

### 3. Set Environment Variables
Create `.env` file in the root directory:
```bash
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

## 🔍 Testing the Integration

### Method 1: AI Chat Interface
1. Open http://localhost:5173
2. Start a new chat
3. Try these prompts:
   - **"Find the main.rs file"**
   - **"Where is package.json?"**
   - **"Show me all TypeScript files"**
   - **"Search for files containing 'search'"**

**Expected behavior:**
- AI automatically detects file search intent
- Shows search results with file paths, scores, and execution time
- Displays search info panel with query details

### Method 2: Test Interface
1. Click the **🔍 Search icon** in the top-right header
2. Or press **Ctrl+Shift+F**
3. Try searching for:
   - `main`
   - `*.rs`
   - `config`
   - `package.json`

**Expected behavior:**
- Direct search interface opens
- Shows real-time search results
- Displays performance metrics

## 🔧 Troubleshooting

### Backend Issues
```bash
# Check if backend is running
curl http://localhost:3001/health

# Expected response:
{
  "status": "healthy",
  "version": "0.1.0",
  "database": "connected",
  "indexer": "stopped"
}
```

### Frontend Issues
1. **Open browser DevTools (F12)**
2. **Check Console tab for:**
   - `🔍 AI triggered file search:` - Shows when AI detects file search
   - `✅ File search completed:` - Shows successful results
   - `❌ File search failed:` - Shows errors

### Common Issues & Solutions

#### "Backend not available"
- Ensure `cargo run` is running in backend folder
- Check port 3001 is not in use: `lsof -i :3001`

#### "No results found"
- Try broader search terms
- Ensure you're in a directory with files
- Check file permissions

#### "AI not triggering search"
- Use explicit prompts: "find file", "search for"
- Check Gemini API key is set correctly

## 📊 Performance Verification

### Search Performance Targets
- **Small projects** (< 1K files): ~10-50ms
- **Medium projects** (1K-10K files): ~50-200ms
- **Large projects** (10K+ files): ~200-500ms

### Test Commands
```bash
# Test backend API directly
curl "http://localhost:3001/api/v1/search/files?q=main&mode=auto"

# Test search suggestions
curl -X POST http://localhost:3001/api/v1/search/suggest \
  -H "Content-Type: application/json" \
  -d '{"prompt": "find the config file"}'
```

## ✅ Success Indicators

The integration is working correctly when you see:

1. **AI Detection**: Console shows `🔍 AI triggered file search`
2. **Fast Results**: Search completes in < 500ms for most projects
3. **Rich Display**: Results show file paths, scores, execution time
4. **Smart Suggestions**: AI provides query refinements
5. **Error Handling**: Graceful fallback when backend offline

## 🎯 Test Scenarios

### Scenario 1: Basic File Search
```
User: "Find the main.rs file"
Expected: AI uses findFile function, shows Rust files with scores
```

### Scenario 2: Content Search
```
User: "Find files containing TODO"
Expected: AI uses searchContent function, shows file snippets
```

### Scenario 3: Project Navigation
```
User: "Where is the configuration?"
Expected: Shows config files (package.json, Cargo.toml, etc.)
```

### Scenario 4: Fallback Behavior
```
1. Stop backend (Ctrl+C)
2. Ask: "Find config files"
Expected: Shows cached results with error message
```

## 🚀 Advanced Testing

### Load Testing
```bash
# Install hey for load testing
go install github.com/rakyll/hey@latest

# Test search endpoint
hey -n 100 -c 10 "http://localhost:3001/api/v1/search/files?q=test"
```

### Memory Usage
```bash
# Monitor backend memory usage
ps aux | grep skhoot-backend

# Expected: < 50MB for small projects
```

## 📝 Integration Checklist

- [ ] Backend compiles without warnings
- [ ] Backend starts on port 3001
- [ ] Frontend connects to backend
- [ ] AI detects file search prompts
- [ ] Search results display correctly
- [ ] Performance is acceptable (< 500ms)
- [ ] Error handling works
- [ ] Test interface accessible
- [ ] Search suggestions work
- [ ] Fallback to mock data works

## 🎉 Success!

If all tests pass, your file search integration is working perfectly! The AI can now:
- Automatically detect when users want to find files
- Execute fast, intelligent searches
- Display rich results with metadata
- Provide helpful suggestions
- Handle errors gracefully

Ready for production use! 🚀