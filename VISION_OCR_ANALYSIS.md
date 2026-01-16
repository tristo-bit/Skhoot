# Vision & OCR System Analysis - Root Cause Identified

## 🔴 CRITICAL ISSUE FOUND

**The AI says "I cannot process images" because images are NOT being passed to the AI in Agent Mode.**

## Problem Summary

Your vision/OCR system is **fully implemented and working** in **Normal Mode**, but **completely broken in Agent Mode** because:

1. ✅ **Normal Mode**: Images are passed to `aiService.chat()` with the `images` parameter
2. ❌ **Agent Mode**: Images are NOT passed to `agentChatService.executeWithTools()` - the parameter doesn't exist!

## Data Flow Comparison

### Normal Mode (WORKING) ✅
```
User attaches image
    ↓
ChatInterface.tsx: processAttachedFiles() → converts to base64
    ↓
imageFiles array created with { fileName, base64, mimeType }
    ↓
aiService.chat(message, history, onStatusUpdate, imageFiles) ← Images passed here!
    ↓
Provider-specific handler (chatWithOpenAI/Google/Anthropic)
    ↓
Vision API receives images
    ↓
AI can see and analyze images ✅
```

### Agent Mode (BROKEN) ❌
```
User attaches image
    ↓
ChatInterface.tsx: processAttachedFiles() → converts to base64
    ↓
imageFiles array created with { fileName, base64, mimeType }
    ↓
agentChatService.executeWithTools(message, history, options) ← NO images parameter!
    ↓
agentChatService.chat() → NO images parameter!
    ↓
Provider API called WITHOUT images
    ↓
AI has no images to analyze ❌
    ↓
AI responds: "I cannot process images" (because it literally can't - no images sent!)
```

## Code Evidence

### ChatInterface.tsx - Line 586-700

**Normal Mode** (lines 700-750):
```typescript
const result = await aiService.chat(
  processedMessage,
  history,
  (status) => { setSearchStatus(status); },
  imageFiles  // ← Images passed here!
);
```

**Agent Mode** (lines 586-650):
```typescript
const result = await agentChatService.executeWithTools(
  processedMessage,
  agentHistory,
  {
    sessionId: currentSessionId,
    onToolStart: (toolCall) => { ... },
    onToolComplete: (result) => { ... },
    onStatusUpdate: (status) => { ... },
    // ← NO images parameter! Images are lost here!
  }
);
```

### agentChatService.ts - Missing Image Support

The entire `agentChatService.ts` file has **ZERO** image handling:

1. **No `images` parameter** in `executeWithTools()` method
2. **No `images` parameter** in `chat()` method
3. **No image support** in `chatOpenAIFormat()`, `chatAnthropicFormat()`, `chatGoogleFormat()`
4. **No vision capabilities** in system prompt
5. **No image conversion** in history converters

Compare to `aiService.ts`:
- ✅ Has `images` parameter in all methods
- ✅ Converts images to provider-specific formats
- ✅ Includes vision capabilities in system prompt
- ✅ Logs image processing

## Why This Happens

The agent mode was designed for **tool calling** (shell commands, file operations), not for **multimodal input** (images, vision). The architecture treats images as a separate concern that was only implemented in the normal chat flow.

## Solution Architecture

You need to treat **images as part of the message context**, similar to how tool calls are handled. Here's the recommended approach:

### Option 1: Add Images to AgentChatMessage (Recommended)

Modify the `AgentChatMessage` interface to include images:

```typescript
export interface AgentChatMessage {
  role: 'user' | 'assistant' | 'tool' | 'system';
  content: string;
  toolCalls?: AgentToolCall[];
  toolCallId?: string;
  toolResults?: ToolResult[];
  images?: Array<{ fileName: string; base64: string; mimeType: string }>; // ← Add this
}
```

Then update all agent chat methods to handle images in the message history.

### Option 2: Add Images as Separate Parameter

Add an `images` parameter to agent methods (similar to aiService):

```typescript
async executeWithTools(
  message: string,
  history: AgentChatMessage[],
  options: AgentChatOptions,
  images?: Array<{ fileName: string; base64: string; mimeType: string }> // ← Add this
): Promise<{ content: string; toolResults: ToolResult[] }>
```

### Option 3: Treat Images as Tool Calls (Your Suggestion)

Create vision/OCR as tools that the agent can call:

```typescript
{
  name: 'analyze_image',
  description: 'Analyze an image using vision AI (OCR, object detection, scene understanding)',
  parameters: {
    type: 'object',
    properties: {
      image_data: { type: 'string', description: 'Base64 encoded image data' },
      task: { type: 'string', description: 'Analysis task: ocr, describe, detect_objects' },
    },
    required: ['image_data', 'task'],
  },
}
```

**Pros**: Fits agent architecture, explicit control
**Cons**: Requires extra step, less natural for users

## Recommended Fix (Option 1)

This is the most natural and consistent approach:

### Step 1: Update Types
```typescript
// services/agentChatService.ts
export interface AgentChatMessage {
  role: 'user' | 'assistant' | 'tool' | 'system';
  content: string;
  toolCalls?: AgentToolCall[];
  toolCallId?: string;
  toolResults?: ToolResult[];
  images?: Array<{ fileName: string; base64: string; mimeType: string }>; // NEW
}
```

### Step 2: Update ChatInterface.tsx
```typescript
// When building agent history (line ~620)
const agentHistory = messages.map(m => ({
  role: m.role as 'user' | 'assistant',
  content: m.content,
  toolCalls: m.toolCalls,
  toolResults: m.toolResults,
  images: m.images, // NEW - pass images from message history
}));

// When calling executeWithTools (line ~640)
const result = await agentChatService.executeWithTools(
  processedMessage,
  agentHistory,
  {
    sessionId: currentSessionId,
    images: imageFiles, // NEW - pass current images
    onToolStart: (toolCall) => { ... },
    onToolComplete: (result) => { ... },
    onStatusUpdate: (status) => { ... },
  }
);
```

### Step 3: Update AgentChatOptions
```typescript
export interface AgentChatOptions {
  sessionId: string;
  provider?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  customEndpoint?: string;
  images?: Array<{ fileName: string; base64: string; mimeType: string }>; // NEW
  onToolStart?: (toolCall: AgentToolCall) => void;
  onToolComplete?: (result: ToolResult) => void;
  onStatusUpdate?: (status: string) => void;
}
```

### Step 4: Update System Prompt
```typescript
function getAgentSystemPrompt(provider: string, model: string, workingDirectory: string, capabilities?: ModelCapabilities): string {
  // Check if model supports vision
  const visionModels = [
    'gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4-vision-preview',
    'gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash',
    'claude-3-5-sonnet-20241022', 'claude-3-opus-20240229'
  ];
  
  const supportsVision = visionModels.some(vm => model.toLowerCase().includes(vm.toLowerCase()));
  
  const visionCapabilities = supportsVision ? `

VISION CAPABILITIES:
- You CAN see and analyze images that users attach to their messages
- You have OCR capabilities to read text from images (screenshots, documents, signs, etc.)
- You can describe what's in images, identify objects, people, and scenes
- You can answer questions about image content
- When users attach images, analyze them and respond based on what you see
- NEVER say you cannot see images - you have full vision capabilities` : '';

  return `You are Skhoot Agent, an AI coding and system assistant...
${visionCapabilities}
...`;
}
```

### Step 5: Update Provider Methods

Add image handling to each provider format method:

**OpenAI Format:**
```typescript
private async chatOpenAIFormat(
  baseUrl: string,
  apiKey: string,
  message: string,
  history: AgentChatMessage[],
  model: string,
  provider: string,
  capabilities: ModelCapabilities | undefined,
  options: AgentChatOptions
): Promise<AgentChatResponse> {
  const workingDirectory = (await agentService.getConfig(options.sessionId))?.workingDirectory || '.';
  
  const messages = [
    { role: 'system', content: getAgentSystemPrompt(provider, model, workingDirectory, capabilities) },
    ...this.convertHistoryToOpenAI(history), // This needs to handle images
  ];

  // Add current message with images if provided
  if (options.images && options.images.length > 0) {
    messages.push({
      role: 'user',
      content: [
        { type: 'text', text: message },
        ...options.images.map(img => ({
          type: 'image_url',
          image_url: {
            url: `data:${img.mimeType};base64,${img.base64}`,
            detail: 'high'
          }
        }))
      ]
    });
  } else if (message) {
    messages.push({ role: 'user', content: message });
  }
  
  // ... rest of method
}
```

**History Converter:**
```typescript
private convertHistoryToOpenAI(history: AgentChatMessage[]): any[] {
  const messages: any[] = [];

  for (const msg of history) {
    if (msg.role === 'user') {
      if (msg.images && msg.images.length > 0) {
        // User message with images
        messages.push({
          role: 'user',
          content: [
            { type: 'text', text: msg.content },
            ...msg.images.map(img => ({
              type: 'image_url',
              image_url: {
                url: `data:${img.mimeType};base64,${img.base64}`,
                detail: 'high'
              }
            }))
          ]
        });
      } else {
        messages.push({ role: 'user', content: msg.content });
      }
    } else if (msg.role === 'assistant') {
      // ... existing code
    } else if (msg.role === 'tool') {
      // ... existing code
    }
  }

  return messages;
}
```

Repeat similar changes for `chatGoogleFormat()`, `chatAnthropicFormat()`, and their history converters.

## Testing Checklist

After implementing the fix:

1. ✅ Enable Agent Mode
2. ✅ Attach an image with text (screenshot, document)
3. ✅ Ask "What do you see in this image?"
4. ✅ Check browser console for `[AgentChatService] Adding images` logs
5. ✅ Verify AI responds with image analysis (not "I cannot process images")
6. ✅ Test OCR: "Read the text in this image"
7. ✅ Test with multiple images
8. ✅ Test with different providers (OpenAI, Google, Anthropic)
9. ✅ Verify images persist in conversation history

## Files to Modify

1. **services/agentChatService.ts** (main changes)
   - Update `AgentChatMessage` interface
   - Update `AgentChatOptions` interface
   - Update `getAgentSystemPrompt()` to include vision capabilities
   - Update `chatOpenAIFormat()` to handle images
   - Update `chatGoogleFormat()` to handle images
   - Update `chatAnthropicFormat()` to handle images
   - Update all history converters to handle images

2. **components/chat/ChatInterface.tsx** (minor changes)
   - Pass `images` to agent history
   - Pass `images` in `AgentChatOptions`

3. **types.ts** (optional, for consistency)
   - Ensure `Message` interface has `images` field (already exists)

## Summary

The vision/OCR system is **architecturally complete** but has a **critical integration gap** in Agent Mode. Images are processed and converted to base64 correctly, but they're **dropped on the floor** when entering Agent Mode because `agentChatService` doesn't accept or forward them to the AI providers.

The fix is straightforward: **add image support to the agent chat service** by mirroring the implementation from `aiService.ts`. This will make vision/OCR work consistently across both Normal and Agent modes.

## Why Your Suggestion Makes Sense

Your idea to "treat image analysis and OCR like tool calls" is architecturally sound because:

1. **Consistency**: Agent mode is built around tool calling
2. **Explicit Control**: The AI explicitly decides when to analyze images
3. **Logging**: Tool calls are logged and visible in the agent log
4. **Flexibility**: Can add different vision tasks (OCR, object detection, etc.)

However, it requires more implementation work and changes the UX (users would need to explicitly ask for image analysis). The recommended approach (Option 1) is more natural and consistent with how Normal Mode works.

Choose based on your priorities:
- **Option 1**: Faster to implement, more natural UX, consistent with Normal Mode
- **Option 3**: More explicit, better logging, fits agent architecture, but requires more work
