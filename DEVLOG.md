# Development Log

## January 29, 2026

### Robust Gemini 3 reasoning & tool-calling loop ✅
- **Status**: ✅ **COMPLETED**
- **Components**: `services/providerRegistry.ts`, `services/agentChatService.ts`, `types.ts`
- **Impact**: Skhoot is now fully compatible with the reasoning-first architecture of Gemini 3 Pro and Flash.

**Problem**:
- When using Gemini 3, the AI would frequently error out with a `400 Bad Request` citing a "missing thought_signature".
- This happened because newer Google models generate internal encrypted reasoning tokens that MUST be passed back exactly in the next turn of a tool-calling loop.

**Root Cause**:
- Standard AI adapters treat messages as simple text strings. Gemini 3 requires a complex "Parts" structure where thoughts and signatures are explicitly linked to function calls.
- Skhoot was losing these signatures between tool execution steps.

**Solution**:
- Overhauled the Google AI adapter to scan **every part** of the response for signatures.
- Implemented a "Grouped Turn" strategy that bundles all tool results into a single user message as required by the Gemini protocol.
- Added an automatic safety fallback that injects the official Google bypass signature (`context_engineering_is_the_way_to_go`) if a token is missing, preventing blocking errors.

---

### Cross-Platform UI Polishing (macOS/Windows/Linux) 🎨
- **Status**: ✅ **COMPLETED**
- **Components**: `App.tsx`, `index.css`, `tauri.conf.json`, `Modal.tsx`
- **Impact**: Unified the high-end glassmorphic aesthetic across all operating systems.

**Problem**:
- macOS: Buttons weren't clickable due to `data-tauri-drag-region` conflicts in Tauri v2.
- Windows: "Invisible" square window strokes were visible behind the rounded corners.
- Universal: Modals didn't follow the 32px rounded corner language of the main window.

**Solution**:
- **macOS Fix**: Removed invalid drag-region attributes that were intercepting click events.
- **Windows Fix**: Disabled OS-level shadows (which are always square) and replaced them with internal CSS shadows. Added a 1px "Safe Zone" buffer to prevent corner bleeding.
- **Rounding Fix**: Created a specialized `#modal-portal-root` inside the main clipped container. Modals now "espouse" the app corners perfectly.

---

### Dynamic Model Discovery & Real-Time Updates 🚀
- **Status**: ✅ **COMPLETED**
- **Components**: `services/apiKeyService.ts`, `AISettingsModal.tsx`, `backend/src/ai.rs`
- **Impact**: Skhoot now automatically stays up-to-date with new AI models as they are released.

**Problem**:
- Users couldn't see the latest models (like Gemini 3) in the dropdown without code updates.
- The model list was hard-limited to 10 entries.

**Solution**:
- Refactored the discovery logic to fetch the **full, live list** of models from Google and OpenAI endpoints.
- Implemented **Capability Inference**: The app now "guesses" if an unknown model supports Vision or Tools based on its name (e.g., "gemini-3" → toolCalling: true).
- Added an **Inline Model Switcher** to the AI Settings Modal for faster switching.

---

### Pro STT for Linux: Groq Integration 🎤
- **Status**: ✅ **COMPLETED**
- **Components**: `services/audio/sttService.ts`, `SoundPanel.tsx`
- **Impact**: High-speed, free voice control for Linux users.

**Problem**:
- OpenAI STT is paid, and local Whisper was removed for being too heavy.
- Linux users had no reliable free alternative.

**Solution**:
- Added a **Custom/Groq** provider option.
- Users can now use Groq's Whisper API (Free & Instant) with their own key.
- Kept the specialized **Linux Audio Fallback** which encodes raw PCM into WAV to bypass the broken `MediaRecorder` in WebKitGTK.

---

[... Previous Log Entries ...]
