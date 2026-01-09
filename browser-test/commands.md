# Skhoot Demo Commands

## Available Commands

### Help & Documentation
```javascript
// Show all available commands with descriptions
skhootDemo.help()
```

### Search & Discovery
```javascript
// Demo file search with animation - searches for files and displays results
skhootDemo.searchFiles()

// Demo message search with animation - searches across connected apps
skhootDemo.searchMessages()

// Demo disk analysis with animation - analyzes disk usage and shows largest items
skhootDemo.analyzeDisk()
```

### Cleanup & Maintenance
```javascript
// Demo cleanup functionality - scans for removable files/folders with size analysis
skhootDemo.cleanup()
```

### Content Rendering
```javascript
// Demo markdown rendering - shows all supported markdown features
skhootDemo.showMarkdown()
```

## Usage Examples

Open your browser console (F12) and run any of these commands:

```javascript
// Start with help to see all options
skhootDemo.help()

// Try a file search demo
skhootDemo.searchFiles()

// Test the cleanup feature
skhootDemo.cleanup()
```

## Features Demonstrated

- **File Search**: Animated search with file results, Go/Copy buttons
- **Message Search**: Cross-app message search with app-colored icons
- **Disk Analysis**: Visual disk usage analysis with progress bars
- **Cleanup**: Smart cleanup suggestions with safety warnings and Archive/Remove options
- **Markdown**: Full markdown rendering including code blocks, lists, links, etc.

## Mock Data

The demos use realistic mock data including:
- File system items with sizes and paths
- Messages from Slack, Discord, iMessage
- Cleanup items with safety analysis
- Markdown content examples