# Prompt 05: Web Search & Visual Intelligence

"Integrate advanced information gathering tools into the agent.

Web Search:
1. Implement a `web_search` tool that uses an API (like Tavily or Brave) to find real-time info.
2. Build a `browse` tool that uses hidden Tauri WebViews to extract text from specific URLs.
3. CRITICAL: Inject JavaScript into these hidden WebViews to aggressively block all media playback (videos/audio) to ensure silent background operation.

Visual Intelligence:
1. Implement a Vision pipeline that detects when an image is attached to the chat.
2. Support both local file paths and base64 data URLs (from previous search results).
3. Ensure the AI can perform OCR and visual reasoning on these images using multimodal models like GPT-4o or Gemini 2.0/3.0."
