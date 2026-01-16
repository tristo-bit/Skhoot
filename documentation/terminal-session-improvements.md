# Terminal Session Management Improvements

## Problem
The terminal service had a hard limit of 10 concurrent sessions with no automatic cleanup, causing users to hit the limit and be unable to create new terminals.

## Root Cause
- **Hard-coded limit**: 10 sessions maximum in `backend/src/terminal/manager.rs`
- **No automatic cleanup**: Stale sessions accumulated until manual closure
- **No visibility**: Users couldn't see session stats or which sessions were inactive

## Improvements Made

### 1. Automatic Cleanup on Session Creation
**File**: `backend/src/terminal/manager.rs`

Now automatically cleans up stale sessions before checking the limit:
```rust
pub async fn create_session(&self, config: Option<SessionConfig>) -> Result<String, String> {
    // First, try to cleanup stale sessions
    self.cleanup_stale_sessions().await;
    
    let sessions = self.sessions.read().await;
    if sessions.len() >= self.max_sessions {
        return Err(format!("Maximum sessions ({}) reached. Try closing unused terminals or wait for inactive sessions to timeout.", self.max_sessions));
    }
    // ...
}
```

### 2. Environment Variable Configuration
**File**: `backend/src/terminal/manager.rs`

Limits are now configurable via environment variables:
```rust
impl Default for TerminalManager {
    fn default() -> Self {
        let max_sessions = std::env::var("TERMINAL_MAX_SESSIONS")
            .ok()
            .and_then(|s| s.parse().ok())
            .unwrap_or(10);
        
        let timeout_mins = std::env::var("TERMINAL_TIMEOUT_MINS")
            .ok()
            .and_then(|s| s.parse().ok())
            .unwrap_or(60);
        
        Self::new(max_sessions, timeout_mins)
    }
}
```

**Usage**:
```bash
# Increase max sessions to 20
export TERMINAL_MAX_SESSIONS=20

# Reduce timeout to 30 minutes
export TERMINAL_TIMEOUT_MINS=30
```

### 3. Background Cleanup Task
**File**: `backend/src/main.rs`

Spawns a background task that cleans up stale sessions every 5 minutes:
```rust
// Spawn background task to cleanup stale sessions every 5 minutes
{
    let manager = terminal_manager.clone();
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(300));
        loop {
            interval.tick().await;
            manager.cleanup_stale_sessions().await;
        }
    });
}
```

### 4. Session Statistics API
**Files**: `backend/src/terminal/manager.rs`, `backend/src/terminal/routes.rs`

New endpoint to get session statistics:
```rust
pub struct SessionStats {
    pub total: usize,      // Total sessions
    pub active: usize,     // Recently active sessions
    pub stale: usize,      // Inactive sessions (will be cleaned up)
    pub max_allowed: usize, // Maximum allowed
    pub available: usize,   // Available slots
}
```

**API Endpoint**: `GET /api/v1/terminal/sessions/stats`

**Example Response**:
```json
{
  "total": 7,
  "active": 5,
  "stale": 2,
  "max_allowed": 10,
  "available": 3
}
```

## Benefits

1. **Self-healing**: Automatically recovers from stale sessions
2. **Configurable**: Adjust limits without recompiling
3. **Transparent**: Users can see session stats
4. **Better error messages**: Tells users what to do when limit is reached
5. **Proactive cleanup**: Background task prevents accumulation

## Configuration Options

Add to `.env` file:
```bash
# Maximum concurrent terminal sessions (default: 10)
TERMINAL_MAX_SESSIONS=20

# Session timeout in minutes (default: 60)
TERMINAL_TIMEOUT_MINS=30
```

## Future Improvements

1. **Priority-based eviction**: Close least-recently-used sessions when limit is reached
2. **Per-user limits**: Different limits for different users/agents
3. **Session tagging**: Tag sessions by purpose (AI, user, system) for better management
4. **Metrics**: Track session creation/closure rates for capacity planning
5. **Frontend integration**: Show session stats in UI with ability to close sessions
6. **Graceful degradation**: Warn users when approaching limit (e.g., at 80% capacity)

## Testing

The improvements maintain backward compatibility. Existing tests pass without modification.

To test the new functionality:
```bash
# Test with custom limits
TERMINAL_MAX_SESSIONS=5 TERMINAL_TIMEOUT_MINS=10 cargo run

# Check session stats
curl http://localhost:3000/api/v1/terminal/sessions/stats
```
