# Audio Backend Service - Implementation Tasks

## Phase 1: Backend Audio Module Foundation

### Task 1.1: Create audio module structure
- [ ] Create `backend/src/audio/mod.rs` with module exports
- [ ] Create `backend/src/audio/types.rs` with DTOs (AudioDevice, AudioData, RecordingSession)
- [ ] Add `cpal` and `hound` dependencies to `backend/Cargo.toml`
- [ ] Register audio module in `backend/src/lib.rs`

### Task 1.2: Implement device enumeration
- [ ] Create `backend/src/audio/devices.rs`
- [ ] Implement `list_input_devices()` using cpal
- [ ] Implement `get_default_device()`
- [ ] Implement `get_device_by_id()`
- [ ] Handle platform-specific device naming

### Task 1.3: Implement audio recorder
- [ ] Create `backend/src/audio/recorder.rs`
- [ ] Implement `AudioRecorder` struct with cpal stream
- [ ] Implement `start()` - begin capturing to buffer
- [ ] Implement `stop()` - return captured audio as WAV
- [ ] Implement `abort()` - discard recording
- [ ] Handle sample rate conversion to 16kHz for Whisper

## Phase 2: Whisper Integration

### Task 2.1: Move Whisper manager to backend
- [ ] Create `backend/src/audio/whisper.rs`
- [ ] Port `WhisperManager` from `src-tauri/src/whisper.rs`
- [ ] Adapt for backend context (no Tauri app_handle)
- [ ] Use XDG directories for Linux, appropriate paths for other OS
- [ ] Implement health check endpoint

### Task 2.2: Implement transcription router
- [ ] Create `backend/src/audio/transcription.rs`
- [ ] Implement local Whisper transcription
- [ ] Implement OpenAI API transcription
- [ ] Add backend selection logic (preference + fallback)
- [ ] Handle API key retrieval from config/env

## Phase 3: HTTP API

### Task 3.1: Create audio routes
- [ ] Create `backend/src/audio/routes.rs`
- [ ] Implement `POST /api/v1/audio/start`
- [ ] Implement `POST /api/v1/audio/stop`
- [ ] Implement `GET /api/v1/audio/devices`
- [ ] Implement `GET /api/v1/audio/status`
- [ ] Add routes to main router in `backend/src/main.rs`

### Task 3.2: Add audio state management
- [ ] Create `AudioState` struct for AppState
- [ ] Manage active recording sessions
- [ ] Handle concurrent recording requests (reject or queue)
- [ ] Implement session timeout/cleanup

## Phase 4: Frontend Integration

### Task 4.1: Create backend audio service
- [ ] Create `services/audioBackendService.ts`
- [ ] Implement `startRecording()` - call backend API
- [ ] Implement `stopAndTranscribe()` - call backend API
- [ ] Implement `listDevices()` - call backend API
- [ ] Implement `getStatus()` - call backend API

### Task 4.2: Update sttService
- [ ] Modify `sttService.ts` to use `audioBackendService`
- [ ] Remove MediaRecorder logic
- [ ] Remove WebAudioRecorder fallback
- [ ] Keep Web Speech API path for browsers without backend

### Task 4.3: Update voice recording hook
- [ ] Update `useVoiceRecording.ts` to use new service
- [ ] Simplify audio visualization (get levels from backend or remove)
- [ ] Update device selection in SoundPanel

## Phase 5: Cleanup

### Task 5.1: Remove deprecated code
- [ ] Remove `services/webAudioRecorder.ts`
- [ ] Remove MediaRecorder code from `sttService.ts`
- [ ] Simplify `audioService.ts` (keep only Web Speech parts)

### Task 5.2: Update Tauri integration
- [ ] Keep Tauri whisper commands as thin wrappers to backend
- [ ] Or remove Tauri whisper.rs entirely if backend handles all
- [ ] Update settings panel to use backend API for whisper status

### Task 5.3: Documentation
- [ ] Update README with new architecture
- [ ] Document API endpoints
- [ ] Add troubleshooting guide for audio issues

## Testing Checklist

- [ ] Audio recording works on Linux (PipeWire)
- [ ] Audio recording works on Linux (PulseAudio)
- [ ] Audio recording works on macOS
- [ ] Audio recording works on Windows
- [ ] Device enumeration shows correct devices
- [ ] Device selection persists
- [ ] Local Whisper transcription works
- [ ] OpenAI transcription works
- [ ] Fallback from local to OpenAI works
- [ ] Recording abort works cleanly
- [ ] Multiple start/stop cycles work
- [ ] Long recordings (> 1 min) work
