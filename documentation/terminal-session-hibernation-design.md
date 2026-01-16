# Terminal Session Hibernation System

## Goal
Never limit users by transparently hibernating inactive sessions to disk, allowing unlimited sessions while keeping only active ones in memory.

## Architecture

### States
1. **Active** - Running PTY process, in memory
2. **Hibernated** - Archived to disk, PTY closed, can be restored
3. **Archived** - Permanently stored, read-only historical record

### Hibernation Strategy

```
┌─────────────┐
│   Active    │ ← User/AI actively using
│  (in RAM)   │
└──────┬──────┘
       │ No activity for 5 min
       ↓
┌─────────────┐
│ Hibernated  │ ← Stored on disk, PTY closed
│  (on disk)  │
└──────┬──────┘
       │ User requests access
       ↓
┌─────────────┐
│   Active    │ ← Restored with full history
│  (in RAM)   │
└─────────────┘
```

## Implementation Plan

### 1. Session Snapshot Structure
```rust
struct SessionSnapshot {
    session_id: String,
    created_at: DateTime<Utc>,
    last_activity: DateTime<Utc>,
    shell: String,
    working_directory: String,
    environment: HashMap<String, String>,
    
    // Full terminal history
    command_history: Vec<CommandEntry>,
    output_history: Vec<OutputEntry>,
    
    // Terminal state
    cols: u16,
    rows: u16,
    
    // Metadata
    tags: Vec<String>,
    created_by: String, // "ai" or "user"
}
```

### 2. Hibernation Triggers
- **Time-based**: No activity for 5 minutes
- **Pressure-based**: When approaching max active sessions (e.g., 8/10)
- **Manual**: User/AI can explicitly hibernate sessions

### 3. Transparent Restoration
When accessing a hibernated session:
1. Load snapshot from disk
2. Create new PTY with same config
3. Restore working directory
4. Display history in terminal
5. Mark as active

### 4. Storage Format
```
~/.skhoot/sessions/
  ├── active/
  │   └── session-abc123.json (metadata only)
  ├── hibernated/
  │   ├── session-def456.json (full snapshot)
  │   └── session-ghi789.json
  └── archived/
      └── 2026-01/
          └── session-old123.json (historical)
```

## Benefits

1. **Unlimited Sessions**: Only limited by disk space
2. **Low Memory**: Only active sessions consume RAM
3. **Fast Access**: Hibernated sessions restore in <100ms
4. **Full History**: All commands and output preserved
5. **Transparent**: Users don't notice hibernation
6. **Searchable**: Can search across all session history

## API Changes

### New Endpoints
- `GET /api/v1/terminal/sessions/:id/hibernate` - Manually hibernate
- `GET /api/v1/terminal/sessions/:id/restore` - Restore hibernated session
- `GET /api/v1/terminal/sessions/hibernated` - List hibernated sessions
- `GET /api/v1/terminal/sessions/search?q=command` - Search all sessions

### Modified Behavior
- `create_session` - Never fails due to limit (hibernates oldest)
- `write_to_session` - Auto-restores if hibernated
- `read_from_session` - Returns history even if hibernated
- `list_sessions` - Shows all (active + hibernated)

## Smart Hibernation Logic

### Priority Score (lower = hibernate first)
```rust
fn calculate_priority(session: &Session) -> f64 {
    let age_hours = (now - session.last_activity).hours();
    let command_count = session.command_history.len();
    let created_by_ai = session.created_by == "ai";
    
    // Formula: newer, more active, user-created = higher priority
    let score = 100.0
        - (age_hours as f64 * 10.0)  // Older = lower priority
        + (command_count as f64 * 2.0) // More commands = higher priority
        + (if created_by_ai { 0.0 } else { 50.0 }); // User sessions = higher priority
    
    score.max(0.0)
}
```

### Hibernation Decision
```rust
async fn ensure_capacity(&self) -> Result<(), String> {
    let active_count = self.active_sessions.len();
    
    if active_count >= self.max_active_sessions {
        // Find lowest priority session
        let to_hibernate = self.find_lowest_priority_session().await?;
        self.hibernate_session(&to_hibernate).await?;
    }
    
    Ok(())
}
```

## Performance Targets

- **Hibernation**: <50ms (save to disk, close PTY)
- **Restoration**: <100ms (load from disk, create PTY)
- **Storage**: ~10KB per session (compressed JSON)
- **Search**: <200ms across 1000 sessions

## Migration Path

1. **Phase 1**: Implement snapshot/restore (this PR)
2. **Phase 2**: Add automatic hibernation
3. **Phase 3**: Add search and analytics
4. **Phase 4**: Add session sharing/export

## Configuration

```bash
# Maximum active (in-memory) sessions
TERMINAL_MAX_ACTIVE_SESSIONS=10

# Hibernate after N minutes of inactivity
TERMINAL_HIBERNATE_AFTER_MINS=5

# Archive hibernated sessions after N days
TERMINAL_ARCHIVE_AFTER_DAYS=30

# Maximum total sessions (active + hibernated)
TERMINAL_MAX_TOTAL_SESSIONS=1000
```

## Future Enhancements

1. **Session Replay**: Replay commands from history
2. **Session Diff**: Compare two sessions
3. **Session Templates**: Save common setups
4. **Cloud Sync**: Sync sessions across devices
5. **AI Analysis**: Analyze session patterns for insights
