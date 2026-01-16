### Terminal Hibernation Panic Fix - Async/Blocking Deadlock ✅
- **Critical Bug Fix**: Fixed "Cannot block the current thread from within a runtime" panic
- **Issue**: Backend crashed when trying to hibernate sessions
- **Root Cause**: Calling `blocking_read()` inside async filter closure

**Problem**:
Backend panicked immediately after creating terminal sessions:
```
thread 'tokio-runtime-worker' panicked at src/terminal/manager.rs:319:46:
Cannot block the current thread from within a runtime. This happens because 
a function attempted to block the current thread while the thread is being 
used to drive asynchronous tasks.
```

**Root Cause**:
In `cleanup_stale_sessions()`, we were calling `blocking_read()` inside a filter closure:
```rust
let to_hibernate: Vec<String> = snapshots
    .iter()
    .filter(|(id, snapshot)| {
        // ❌ WRONG: blocking_read() inside async context!
        let sessions = self.sessions.blocking_read();
        sessions.contains_key(*id) && snapshot.should_hibernate(hibernate_threshold)
    })
    .map(|(id, _)| id.clone())
    .collect();
```

**Why This Fails**:
- `cleanup_stale_sessions()` is an async function running on tokio runtime
- The filter closure is executed on the same async thread
- `blocking_read()` tries to block the thread to wait for the lock
- But the thread is already being used by tokio to drive async tasks
- Result: Deadlock → Panic

**Fix Applied** (`backend/src/terminal/manager.rs`):
```rust
// ✅ CORRECT: Acquire lock before the filter
let snapshots = self.snapshots.read().await;
let sessions = self.sessions.read().await;  // Read lock BEFORE filter

let to_hibernate: Vec<String> = snapshots
    .iter()
    .filter(|(id, snapshot)| {
        // Now we can use the already-acquired lock
        sessions.contains_key(*id) && snapshot.should_hibernate(hibernate_threshold)
    })
    .map(|(id, _)| id.clone())
    .collect();

drop(snapshots);
drop(sessions);  // Explicitly drop locks
```

**Key Principles**:
1. **Never use `blocking_*` methods inside async functions** - Use `.await` instead
2. **Acquire locks before closures** - Don't try to acquire locks inside filter/map closures
3. **Drop locks explicitly** - Release locks as soon as possible to avoid holding them

**Result**:
- ✅ Backend starts without panicking
- ✅ Terminal sessions created successfully
- ✅ Hibernation cleanup runs without deadlock
- ✅ Proper async/await usage throughout

**Files Modified**:
- `backend/src/terminal/manager.rs` - Fixed async lock acquisition in cleanup_stale_sessions

**Lesson Learned**:
This is a common Rust async pitfall. When working with async code:
- Use `.read().await` and `.write().await` for RwLock
- Never use `blocking_read()` or `blocking_write()` in async contexts
- Acquire locks before entering closures that need them

---
