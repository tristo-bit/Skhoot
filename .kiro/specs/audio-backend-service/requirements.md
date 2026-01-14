# Audio Backend Service Requirements

## Problem Statement
The current STT (Speech-to-Text) implementation has audio capture running in the Tauri frontend (WebKitGTK webview), which has broken MediaRecorder support on Linux. This creates a fragile architecture where the frontend handles both UI and audio processing.

## Goals
1. Move audio capture and processing to the Rust backend
2. Provide a clean HTTP API for the frontend to control recording
3. Manage Whisper server lifecycle in the backend
4. Support multiple audio backends (PulseAudio, PipeWire, ALSA)
5. Eliminate WebKitGTK audio limitations

## Functional Requirements

### FR-1: Audio Recording API
- `POST /api/v1/audio/start` - Start recording from default/specified input device
- `POST /api/v1/audio/stop` - Stop recording and return audio data or transcription
- `GET /api/v1/audio/devices` - List available audio input devices
- `GET /api/v1/audio/status` - Get current recording status

### FR-2: Transcription API
- `POST /api/v1/audio/transcribe` - Transcribe audio file (multipart upload)
- `POST /api/v1/audio/transcribe-recording` - Stop recording and transcribe in one call
- Support both local Whisper and OpenAI API

### FR-3: Whisper Server Management
- Move whisper server lifecycle from Tauri to backend
- Auto-start whisper server when local STT is requested
- Health monitoring and auto-restart

### FR-4: Audio Device Management
- Enumerate available input devices
- Allow device selection by ID
- Remember last used device

## Non-Functional Requirements

### NFR-1: Platform Support
- Linux: PipeWire (preferred), PulseAudio, ALSA fallback
- macOS: CoreAudio
- Windows: WASAPI

### NFR-2: Performance
- Low latency audio capture (< 50ms buffer)
- Streaming support for long recordings
- Efficient memory usage for audio buffers

### NFR-3: Reliability
- Graceful handling of device disconnection
- Automatic reconnection on device availability
- Clean resource cleanup on stop/abort

## Out of Scope
- Real-time streaming transcription (future enhancement)
- Audio playback/TTS (separate feature)
- Video capture
