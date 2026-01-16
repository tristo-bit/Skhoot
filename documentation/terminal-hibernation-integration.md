# Terminal Hibernation - Frontend Integration Guide

## Overview

The backend now supports transparent session hibernation. This guide shows how to integrate it with the frontend terminal service.

## Backend Changes Summary

### New Capabilities
1. **Automatic hibernation** - Sessions hibernate after 5 minutes of inactivity
2. **Transparent restoration** - Accessing hibernated sessions auto-restores them
3. **Priority-based management** - Smart decisions about which sessions to hibernate
4. **Full history preservation** - All commands and output saved to disk

### New API Endpoints

#### Get Session Statistics
```typescript
GET /api/v1/terminal/sessions/stats

Response:
{
  total: number;        // Total sessions (active + hibernated)
  active: number;       // Currently active in memory
  stale: number;        // Idle sessions ready for hibernation
  max_allowed: number;  // Maximum active sessions
  available: number;    // Available slots
}
```

#### Hibernate Session (Manual)
```typescript
POST /api/v1/terminal/sessions/:id/hibernate

Response: 200 OK
```

#### Restore Session (Manual)
```typescript
POST /api/v1/terminal/sessions/:id/restore

Response: 200 OK
```

### Modified Behavior

#### Existing Endpoints Now Support Hibernation

**Write to Session** - Auto-restores if hibernated:
```typescript
POST /api/v1/terminal/sessions/:id/write
Body: { data: "ls -la\n" }

// If session is hibernated:
// 1. Automatically restores session (<100ms)
// 2. Executes command
// 3. Returns success
```

**Read from Session** - Returns history even if hibernated:
```typescript
GET /api/v1/terminal/sessions/:id/read

// If session is hibernated:
// Returns formatted history without restoring
// If session is active:
// Returns live output as before
```

**Create Session** - Never fails due to limits:
```typescript
POST /api/v1/terminal/sessions
Body: { shell: "/bin/bash", cols: 80, rows: 24 }

// If at capacity:
// 1. Automatically hibernates lowest priority session
// 2. Creates new session
// 3. Returns session_id
```

## Frontend Integration

### 1. Update Terminal Service (Optional)

The hibernation is **transparent** - existing code works without changes. However, you can add optional features:

#### Add Session Stats Display

```typescript
// services/terminalHttpService.ts

interface SessionStats {
  total: number;
  active: number;
  stale: number;
  max_allowed: number;
  available: number;
}

async getSessionStats(): Promise<SessionStats> {
  const response = await fetch(`${this.baseUrl}/sessions/stats`);
  return response.json();
}
```

#### Add Manual Hibernation (Optional)

```typescript
// services/terminalHttpService.ts

async hibernateSession(sessionId: string): Promise<void> {
  await fetch(`${this.baseUrl}/sessions/${sessionId}/hibernate`, {
    method: 'POST',
  });
}

async restoreSession(sessionId: string): Promise<void> {
  await fetch(`${this.baseUrl}/sessions/${sessionId}/restore`, {
    method: 'POST',
  });
}
```

### 2. Add UI Indicators (Optional)

Show session status in the terminal panel:

```typescript
// components/TerminalPanel.tsx

interface SessionStatus {
  id: string;
  isActive: boolean;
  isHibernated: boolean;
  lastActivity: Date;
}

function SessionIndicator({ status }: { status: SessionStatus }) {
  if (status.isHibernated) {
    return (
      <div className="session-status hibernated">
        💤 Hibernated (click to restore)
      </div>
    );
  }
  
  return (
    <div className="session-status active">
      ✓ Active
    </div>
  );
}
```

### 3. Add Session Stats Widget (Optional)

Display capacity information:

```typescript
// components/SessionStatsWidget.tsx

function SessionStatsWidget() {
  const [stats, setStats] = useState<SessionStats | null>(null);
  
  useEffect(() => {
    const fetchStats = async () => {
      const data = await terminalHttpService.getSessionStats();
      setStats(data);
    };
    
    fetchStats();
    const interval = setInterval(fetchStats, 10000); // Update every 10s
    
    return () => clearInterval(interval);
  }, []);
  
  if (!stats) return null;
  
  return (
    <div className="session-stats">
      <div>Active: {stats.active}/{stats.max_allowed}</div>
      <div>Hibernated: {stats.total - stats.active}</div>
      <div>Available: {stats.available}</div>
    </div>
  );
}
```

## Testing

### Test Automatic Hibernation

```typescript
// Create a session
const sessionId = await terminalHttpService.createSession({
  shell: '/bin/bash',
  cols: 80,
  rows: 24,
});

// Use it
await terminalHttpService.write(sessionId, 'echo "test"\n');

// Wait 5+ minutes (or adjust TERMINAL_HIBERNATE_AFTER_MINS)
// Session will automatically hibernate

// Access it again - automatically restores
await terminalHttpService.write(sessionId, 'ls\n');
// ✓ Works seamlessly
```

### Test Capacity Management

```typescript
// Create 15 sessions (max is 10)
const sessions = [];
for (let i = 0; i < 15; i++) {
  const id = await terminalHttpService.createSession({
    shell: '/bin/bash',
  });
  sessions.push(id);
}

// Check stats
const stats = await terminalHttpService.getSessionStats();
console.log(stats);
// {
//   total: 15,
//   active: 10,
//   stale: 0,
//   max_allowed: 10,
//   available: 0
// }

// Oldest 5 sessions are hibernated automatically
```

## Configuration

Users can configure hibernation behavior via environment variables:

```bash
# Backend .env file

# Maximum active sessions (default: 10)
TERMINAL_MAX_SESSIONS=20

# Hibernate after N minutes of inactivity (default: 5)
TERMINAL_HIBERNATE_AFTER_MINS=5

# Archive after N minutes (default: 60)
TERMINAL_TIMEOUT_MINS=60

# Storage location (default: ~/.skhoot/sessions)
TERMINAL_STORAGE_PATH=/custom/path
```

## Error Handling

### Hibernation Errors

Hibernation failures are logged but don't affect user experience:

```typescript
// If hibernation fails, session stays active
// User never sees an error
// Background cleanup will retry later
```

### Restoration Errors

If restoration fails, the error is returned to the caller:

```typescript
try {
  await terminalHttpService.write(sessionId, 'ls\n');
} catch (error) {
  // Handle restoration failure
  console.error('Failed to restore session:', error);
  // Show user-friendly message
}
```

## Performance Considerations

### Latency
- **First write after hibernation**: +100ms (restoration time)
- **Subsequent writes**: Normal latency
- **Read from hibernated session**: Normal latency (returns cached history)

### Memory Usage
- **Before**: 10 sessions × 10MB = 100MB
- **After**: 10 active × 10MB + 90 hibernated × 0MB = 100MB
- **Savings**: Scales with number of hibernated sessions

### Disk Usage
- **Per session**: ~10KB (JSON)
- **100 sessions**: ~1MB
- **1000 sessions**: ~10MB

## Migration Path

### Phase 1: Backend Only (Current)
- ✅ Hibernation works transparently
- ✅ No frontend changes required
- ✅ Existing code continues to work

### Phase 2: Add UI Indicators (Optional)
- Add session status badges
- Show hibernation state
- Add manual hibernate/restore buttons

### Phase 3: Add Analytics (Future)
- Session usage patterns
- Hibernation effectiveness
- Capacity planning insights

## Troubleshooting

### Sessions not hibernating?
1. Check `TERMINAL_HIBERNATE_AFTER_MINS` setting
2. Verify background cleanup task is running
3. Check logs for hibernation errors

### Restoration taking too long?
1. Check disk I/O performance
2. Verify session snapshot size
3. Consider increasing `TERMINAL_MAX_SESSIONS`

### Lost session history?
- History is preserved in `~/.skhoot/sessions/hibernated/`
- Check archived sessions in `~/.skhoot/sessions/archived/`
- Sessions are never deleted, only moved

## Summary

The hibernation system is **fully transparent** to existing code:
- ✅ No frontend changes required
- ✅ Existing API calls work unchanged
- ✅ Sessions never hit limits
- ✅ Full history preserved
- ✅ Automatic capacity management

Optional enhancements:
- Session status indicators
- Manual hibernation controls
- Capacity monitoring widgets
- Session search and analytics
