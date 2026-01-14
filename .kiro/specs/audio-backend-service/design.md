# Audio Backend Service Design

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Tauri)                         │
│  ┌─────────────────┐                                            │
│  │  sttService.ts  │ ──HTTP──▶ Backend Audio API                │
│  │  (simplified)   │                                            │
│  └─────────────────┘                                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Backend (Rust/Axum)                         │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Audio Service                          │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐   │   │
│  │  │   Recorder  │  │  Whisper    │  │  Transcription  │   │   │
│  │  │   Manager   │  │  Manager    │  │  Router         │   │   │
│  │  └──────┬──────┘  └──────┬──────┘  └────────┬────────┘   │   │
│  │         │                │                   │            │   │
│  │         ▼                ▼                   ▼            │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐   │   │
│  │  │   cpal      │  │  whisper    │  │  OpenAI API     │   │   │
│  │  │  (audio)    │  │  server     │  │  (fallback)     │   │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘   │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Module Structure

```
backend/src/audio/
├── mod.rs              # Module exports
├── recorder.rs         # Audio capture using cpal
├── devices.rs          # Device enumeration and selection
├── whisper.rs          # Whisper server management (moved from Tauri)
├── transcription.rs    # Transcription routing (local vs OpenAI)
├── routes.rs           # HTTP API endpoints
└── types.rs            # Shared types and DTOs
```

## Key Components

### 1. AudioRecorder (recorder.rs)
Uses `cpal` crate for cross-platform audio capture.

```rust
pub struct AudioRecorder {
    device: Option<cpal::Device>,
    stream: Option<cpal::Stream>,
    buffer: Arc<Mutex<Vec<f32>>>,
    sample_rate: u32,
    is_recording: AtomicBool,
}

impl AudioRecorder {
    pub fn new() -> Self;
    pub fn list_devices() -> Vec<AudioDevice>;
    pub fn start(&mut self, device_id: Option<&str>) -> Result<()>;
    pub fn stop(&mut self) -> Result<AudioData>;
    pub fn abort(&mut self);
}
```

### 2. WhisperManager (whisper.rs)
Manages local Whisper server lifecycle.

```rust
pub struct WhisperManager {
    process: Option<Child>,
    port: u16,
    model_path: PathBuf,
    binary_path: PathBuf,
}

impl WhisperManager {
    pub async fn ensure_running(&mut self) -> Result<()>;
    pub async fn transcribe(&self, audio: &AudioData) -> Result<String>;
    pub async fn stop(&mut self);
    pub fn is_healthy(&self) -> bool;
}
```

### 3. TranscriptionRouter (transcription.rs)
Routes transcription requests to appropriate backend.

```rust
pub enum TranscriptionBackend {
    LocalWhisper,
    OpenAI { api_key: String },
}

pub struct TranscriptionRouter {
    whisper: WhisperManager,
    openai_key: Option<String>,
    preference: TranscriptionBackend,
}

impl TranscriptionRouter {
    pub async fn transcribe(&self, audio: AudioData) -> Result<String>;
}
```

## API Endpoints

### POST /api/v1/audio/start
Start recording from microphone.

Request:
```json
{
  "device_id": "optional-device-id"
}
```

Response:
```json
{
  "session_id": "uuid",
  "device": "USB Microphone",
  "sample_rate": 16000
}
```

### POST /api/v1/audio/stop
Stop recording and get audio data.

Request:
```json
{
  "session_id": "uuid",
  "transcribe": true,
  "backend": "local" | "openai"
}
```

Response:
```json
{
  "duration_ms": 3500,
  "transcript": "Hello world",
  "audio_base64": "..." // only if transcribe=false
}
```

### GET /api/v1/audio/devices
List available input devices.

Response:
```json
{
  "devices": [
    {
      "id": "device-id",
      "name": "USB Microphone",
      "is_default": true,
      "sample_rates": [16000, 44100, 48000]
    }
  ]
}
```

### GET /api/v1/audio/status
Get current recording status.

Response:
```json
{
  "is_recording": true,
  "session_id": "uuid",
  "duration_ms": 1500,
  "whisper_status": "running" | "stopped" | "starting"
}
```

## Dependencies

Add to `backend/Cargo.toml`:
```toml
cpal = "0.15"           # Cross-platform audio
hound = "3.5"           # WAV encoding
```

## Frontend Changes

Simplify `services/sttService.ts` to just call backend API:

```typescript
// Before: Complex MediaRecorder/WebAudioRecorder logic
// After: Simple HTTP calls

export const sttService = {
  async startRecording(deviceId?: string) {
    const res = await fetch('/api/v1/audio/start', {
      method: 'POST',
      body: JSON.stringify({ device_id: deviceId })
    });
    return res.json(); // { session_id }
  },

  async stopAndTranscribe(sessionId: string, backend: 'local' | 'openai') {
    const res = await fetch('/api/v1/audio/stop', {
      method: 'POST', 
      body: JSON.stringify({ session_id: sessionId, transcribe: true, backend })
    });
    return res.json(); // { transcript }
  },

  async listDevices() {
    const res = await fetch('/api/v1/audio/devices');
    return res.json();
  }
};
```

## Migration Path

1. **Phase 1**: Create backend audio module with cpal recording
2. **Phase 2**: Move Whisper management from Tauri to backend
3. **Phase 3**: Add HTTP routes and integrate with frontend
4. **Phase 4**: Remove WebAudioRecorder and MediaRecorder code from frontend
5. **Phase 5**: Clean up Tauri whisper.rs (keep only IPC forwarding if needed)

## Error Handling

- Device not found → 404 with available devices list
- Recording already in progress → 409 Conflict
- Whisper server failed → 503 with fallback suggestion
- OpenAI API error → Forward error message to frontend
