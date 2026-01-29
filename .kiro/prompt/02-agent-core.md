# Prompt 02: The Multi-Modal Agent Engine

"Implement a robust AI Agent service that handles multi-provider tool calling. 

Requirements:
1. Support for OpenAI, Anthropic, and Google Gemini APIs.
2. For Gemini 3, implement strict 'thought_signature' management to preserve reasoning context across multi-step turns. 
3. Implement a tool execution loop that can:
   - Execute shell commands via the terminal backend.
   - Read/Write local files.
   - Perform recursive directory listings.
   - Search the web and browse specific URLs.
4. History management must support grouping parallel tool calls into single turns as required by strict providers like Google.
5. Support for multimodal input (images) where images are automatically converted to optimized base64 payloads for Vision APIs."
