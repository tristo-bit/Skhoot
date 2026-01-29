# Prompt 06: Voice Intelligence & Linux Audio Fixes

"Implement a hybrid Speech-to-Text (STT) system with specific reliability for Linux systems.

Requirements:
1. Support for Web Speech API (free/native), OpenAI Whisper, and Custom Whisper-compatible endpoints (Groq).
2. Groq Integration: Automatically use `whisper-large-v3-turbo` for near-instant transcription when a Groq URL is detected.
3. CRITICAL LINUX FIX: Standard `MediaRecorder` is often broken in Linux WebKitGTK (returning 0-byte blobs). Implement a fallback using `AudioContext` and a custom `WebAudioRecorder` that captures raw PCM and encodes it into a valid WAV file.
4. Voice Activity Detection: Include a visualizer that reflects real-time audio levels and automatically stops recording when the user finishes speaking."
