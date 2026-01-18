# Bookmark System

The bookmark system allows users to save and search important messages across sessions, enabling the AI to retrieve context from previous conversations.

## Architecture

### Backend (Rust)
- **Migration**: `backend/migrations/004_bookmarks.sql` - SQLite schema for bookmarks
- **API**: `backend/src/api/bookmarks.rs` - REST endpoints for bookmark operations
- **Routes**: Registered in `backend/src/main.rs`

### Frontend (React/TypeScript)
- **Service**: `services/bookmarkService.ts` - Client-side API wrapper
- **UI Component**: `components/panels/bookmarks/BookmarksTab.tsx` - Bookmark management UI
- **Integration**: `components/conversations/MessageBubble.tsx` - Bookmark button in messages
- **Panel**: `components/panels/FilesPanel.tsx` - Tabs for Links/Memories/Bookmarks

### AI Tool Call
- **Tool Definition**: `services/agentChatService.ts` - `message_search` tool
- **UI Component**: `components/tool-calls/bookmark-operations/MessageSearchUI.tsx` - Search results display
- **Registry**: `components/tool-calls/registry/ToolCallRegistry.tsx` - Tool registration

## Features

### User Features
1. **Bookmark Messages**: Click bookmark icon on any message to save it
2. **Search Bookmarks**: Search through bookmarked content, tags, and notes
3. **Add Notes**: Add personal notes to bookmarks for context
4. **Tag Organization**: Tag bookmarks for easy categorization
5. **Session Filtering**: Filter bookmarks by session (optional)

### AI Features
1. **Context Retrieval**: AI can search bookmarks using `message_search` tool
2. **Cross-Session Learning**: Access information from previous conversations
3. **Semantic Search**: Search through message content, tags, and notes
4. **Full-Text Search**: Powered by SQLite FTS for fast searching

## API Endpoints

### List Bookmarks
```
GET /api/v1/bookmarks?session_id={id}&limit={n}
```

### Create Bookmark
```
POST /api/v1/bookmarks
Body: {
  message_id: string,
  session_id?: string,
  content: string,
  role: "user" | "assistant",
  tags?: string,
  notes?: string
}
```

### Get Bookmark
```
GET /api/v1/bookmarks/{id}
```

### Delete Bookmark
```
DELETE /api/v1/bookmarks/{id}
```

### Search Bookmarks
```
GET /api/v1/bookmarks/search?q={query}&limit={n}
```

### Update Notes
```
POST /api/v1/bookmarks/{id}/notes
Body: { notes: string }
```

### Update Tags
```
POST /api/v1/bookmarks/{id}/tags
Body: { tags: string }
```

## AI Tool: message_search

The AI can search bookmarks using the `message_search` tool:

```typescript
{
  name: 'message_search',
  description: 'Search through bookmarked messages to retrieve context from previous conversations',
  parameters: {
    query: string,  // Search query
    limit?: number  // Max results (default: 10, max: 50)
  }
}
```

### Example Usage
```
AI: Let me search for our previous discussion about authentication...
Tool Call: message_search({ query: "authentication", limit: 5 })
Result: [
  {
    id: "...",
    content: "We discussed using JWT tokens for authentication...",
    role: "assistant",
    tags: "auth, security",
    notes: "Important decision about token expiry"
  }
]
```

## Database Schema

```sql
CREATE TABLE bookmarks (
    id TEXT PRIMARY KEY,
    message_id TEXT NOT NULL UNIQUE,
    session_id TEXT,
    content TEXT NOT NULL,
    role TEXT NOT NULL,
    created_at TEXT NOT NULL,
    tags TEXT,
    notes TEXT
);

-- Indexes for performance
CREATE INDEX idx_bookmarks_session_id ON bookmarks(session_id);
CREATE INDEX idx_bookmarks_created_at ON bookmarks(created_at);
CREATE INDEX idx_bookmarks_message_id ON bookmarks(message_id);
CREATE INDEX idx_bookmarks_content ON bookmarks(content);
```

## Storage Pattern

Following the file-based approach used throughout the application:
- Bookmarks are stored in SQLite database
- Each bookmark is uniquely identified by message_id
- Supports full-text search through content, tags, and notes
- Indexed for fast retrieval and filtering

## UI Components

### BookmarksTab
- List view of all bookmarks
- Search functionality
- Inline editing of tags and notes
- Delete functionality
- Session filtering

### MessageSearchUI
- Displays search results from AI tool calls
- Expandable cards showing full content
- Tags and notes display
- Metadata (date, role, session)

### MessageBubble Integration
- Bookmark button on all messages
- Filled icon when bookmarked
- Automatic state sync with backend
- Optimistic UI updates

## Future Enhancements

1. **Session Tracking**: Automatically associate bookmarks with sessions
2. **Bulk Operations**: Select and delete multiple bookmarks
3. **Export/Import**: Export bookmarks as JSON/Markdown
4. **Smart Suggestions**: AI suggests messages to bookmark
5. **Collections**: Group bookmarks into collections
6. **Sharing**: Share bookmarks between users
7. **Sync**: Cloud sync for bookmarks across devices
8. **Analytics**: Track most referenced bookmarks

## Development Notes

- Follows existing patterns from Links and Memories (placeholders)
- Reuses UI components from other panels (ImagesTab, WorkflowsPanel)
- Consistent with tool-call architecture
- Backend-first approach with Rust API
- Type-safe with TypeScript interfaces
- Optimized with React.memo and useCallback
