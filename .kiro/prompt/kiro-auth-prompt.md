// THIS WAS ABORTED BECAUSE OF THE WAY KIRO HANDLES OAUTH 

# Feature Request: Kiro CLI Authentication Bridge

## Context
We want to allow users to authenticate with Skhoot using their existing Kiro CLI session, instead of manually entering an API key.
This provides a "Zero Config" experience for users who are already logged into the CLI.

## Goal
Implement a bridge that reads the authentication token from the Kiro CLI's local database and uses it to make API requests from Skhoot.

## Technical Details

### 1. Authentication Bridge (Backend)
- **Location**: `backend/src/kiro_bridge.rs`
- **Method**: Read the SQLite database at `~/.local/share/kiro-cli/data.sqlite3`
- **Table**: `auth_kv`
- **Key**: `kirocli:odic:token`
- **Value**: JSON blob containing `access_token`
- **Implementation**:
  - Use `sqlx` to connect to the SQLite DB in read-only mode.
  - Fetch the value for the specific key.
  - Parse JSON and extract the token.

### 2. API Provider Integration (Frontend/Backend)
- **Provider ID**: `kiro`
- **Base URL**: `https://api.kiro.dev/v1`
- **API Format**: OpenAI-compatible
- **Models**: `kiro-chat-beta`, `claude-3-5-sonnet-20241022`

### 3. Tauri Bridge
- **Command**: `get_kiro_token`
- **Function**: Calls the backend bridge to retrieve the token and returns it to the frontend.

### 4. UI Implementation (Settings Panel)
- **Component**: `AISettingsPanel.tsx`
- **Design**:
  - Add a dedicated "Connect with Kiro" button with the Kiro logo.
  - When selected, hide the API Key input field.
  - Show a "Check CLI Connection" button instead of "Test Connection".
  - Display "Active" status when connected.
  - Group other providers under a dropdown to save space.

## Reference Implementation Structure

```rust
// backend/src/kiro_bridge.rs
pub async fn get_access_token() -> Result<String> {
    // connect to sqlite
    // select value from auth_kv
    // return token
}
```

```typescript
// services/apiKeyService.ts
async loadKey(provider: string) {
  if (provider === 'kiro') {
    return tauriInvoke('get_kiro_token');
  }
  // ...
}
```

This enables seamless authentication without copy-pasting keys.
