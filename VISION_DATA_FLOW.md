# Vision/OCR Data Flow Diagram

## Current Implementation

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER ATTACHES IMAGE                          │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│              FileAttachmentModal.tsx (File Selection)                │
│  - User selects image file                                           │
│  - File info stored in global __chatFileReferences map              │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│         ChatInterface.tsx: processAttachedFiles() Function           │
│  - Detects image files by extension (.jpg, .png, etc.)              │
│  - Reads file via Tauri API or backend endpoint                     │
│  - Converts to base64 string                                         │
│  - Creates imageFiles array:                                         │
│    [{ fileName, base64, mimeType }]                                  │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
                    ┌────────┴────────┐
                    │  MODE CHECK     │
                    └────────┬────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
              ▼                             ▼
    ┌─────────────────┐         ┌─────────────────┐
    │  NORMAL MODE    │         │  AGENT MODE     │
    │  (Working ✅)   │         │  (Broken ❌)    │
    └────────┬────────┘         └────────┬────────┘
             │                           │
             ▼                           ▼
┌────────────────────────┐   ┌────────────────────────┐
│ aiService.chat()       │   │ agentChatService       │
│                        │   │ .executeWithTools()    │
│ Parameters:            │   │                        │
│ - message ✅           │   │ Parameters:            │
│ - history ✅           │   │ - message ✅           │
│ - onStatusUpdate ✅    │   │ - history ✅           │
│ - images ✅ ← HERE!    │   │ - options ✅           │
│                        │   │ - images ❌ MISSING!   │
└────────┬───────────────┘   └────────┬───────────────┘
         │                            │
         ▼                            ▼
┌────────────────────────┐   ┌────────────────────────┐
│ Provider Handler       │   │ agentChatService       │
│ - chatWithOpenAI()     │   │ .chat()                │
│ - chatWithGoogle()     │   │                        │
│ - chatWithAnthropic()  │   │ Parameters:            │
│                        │   │ - message ✅           │
│ Converts images to     │   │ - history ✅           │
│ provider format:       │   │ - options ✅           │
│                        │   │ - images ❌ MISSING!   │
│ OpenAI:                │   └────────┬───────────────┘
│   image_url with       │            │
│   base64 data          │            ▼
│                        │   ┌────────────────────────┐
│ Gemini:                │   │ chatOpenAIFormat()     │
│   inlineData with      │   │ chatGoogleFormat()     │
│   mimeType + base64    │   │ chatAnthropicFormat()  │
│                        │   │                        │
│ Claude:                │   │ NO image handling!     │
│   image source with    │   │ NO images in messages! │
│   base64 data          │   │ NO vision in prompt!   │
└────────┬───────────────┘   └────────┬───────────────┘
         │                            │
         ▼                            ▼
┌────────────────────────┐   ┌────────────────────────┐
│ API Request            │   │ API Request            │
│                        │   │                        │
│ POST /chat/completions │   │ POST /chat/completions │
│                        │   │                        │
│ Body includes:         │   │ Body includes:         │
│ {                      │   │ {                      │
│   messages: [          │   │   messages: [          │
│     {                  │   │     {                  │
│       role: "user",    │   │       role: "user",    │
│       content: [       │   │       content: "..."   │
│         {              │   │     }                  │
│           type: "text",│   │   ]                    │
│           text: "..."  │   │   tools: [...]         │
│         },             │   │ }                      │
│         {              │   │                        │
│           type:        │   │ ❌ NO IMAGES!          │
│             "image_url"│   │                        │
│           image_url: { │   │                        │
│             url:       │   │                        │
│             "data:...  │   │                        │
│               base64"  │   │                        │
│           }            │   │                        │
│         }              │   │                        │
│       ]                │   │                        │
│     }                  │   │                        │
│   ]                    │   │                        │
│ }                      │   │                        │
│                        │   │                        │
│ ✅ Images included!    │   │                        │
└────────┬───────────────┘   └────────┬───────────────┘
         │                            │
         ▼                            ▼
┌────────────────────────┐   ┌────────────────────────┐
│ AI Provider Response   │   │ AI Provider Response   │
│                        │   │                        │
│ ✅ Analyzes image      │   │ ❌ No image to analyze │
│ ✅ Performs OCR        │   │ ❌ Cannot perform OCR  │
│ ✅ Describes content   │   │                        │
│                        │   │ Response:              │
│ Response:              │   │ "I am sorry, I cannot  │
│ "I can see a           │   │  process images..."    │
│  screenshot with..."   │   │                        │
└────────────────────────┘   └────────────────────────┘
```

## The Problem in Code

### ChatInterface.tsx (Line ~586-750)

```typescript
// Images are processed correctly
const imageFiles = await processAttachedFiles(files);
// imageFiles = [{ fileName: "screenshot.png", base64: "iVBORw0KG...", mimeType: "image/png" }]

// ✅ NORMAL MODE - Images passed correctly
if (!isAgentMode) {
  const result = await aiService.chat(
    processedMessage,
    history,
    (status) => { setSearchStatus(status); },
    imageFiles  // ← Images go here! ✅
  );
}

// ❌ AGENT MODE - Images lost!
if (isAgentMode) {
  const result = await agentChatService.executeWithTools(
    processedMessage,
    agentHistory,
    {
      sessionId: currentSessionId,
      onToolStart: (toolCall) => { ... },
      onToolComplete: (result) => { ... },
      onStatusUpdate: (status) => { ... },
      // ← Where are the images?! ❌
    }
  );
}
```

### aiService.ts (Working) ✅

```typescript
async chat(
  message: string,
  history: AIMessage[],
  onStatusUpdate?: (status: string) => void,
  images?: Array<{ fileName: string; base64: string; mimeType: string }>  // ← Has images parameter
): Promise<AIResponse> {
  // ...
  if (images && images.length > 0) {
    console.log('[aiService] Adding images to message:', images.length, 'images');
    // Convert images to provider format and include in API request
  }
}
```

### agentChatService.ts (Broken) ❌

```typescript
async executeWithTools(
  message: string,
  history: AgentChatMessage[],
  options: AgentChatOptions
  // ← NO images parameter! ❌
): Promise<{ content: string; toolResults: ToolResult[] }> {
  // ...
  const response = await this.chat(message, currentHistory, options);
  // Images never reach here
}

async chat(
  message: string,
  history: AgentChatMessage[],
  options: AgentChatOptions
  // ← NO images parameter! ❌
): Promise<AgentChatResponse> {
  // ...
  return await this.chatWithFormat(
    apiFormat,
    baseUrl,
    apiKey,
    message,
    history,  // ← History has no images
    model,
    provider,
    modelInfo?.capabilities,
    options  // ← Options has no images
  );
}

private async chatOpenAIFormat(
  baseUrl: string,
  apiKey: string,
  message: string,
  history: AgentChatMessage[],  // ← No images in history
  model: string,
  provider: string,
  capabilities: ModelCapabilities | undefined,
  options: AgentChatOptions  // ← No images in options
): Promise<AgentChatResponse> {
  const messages = [
    { role: 'system', content: getAgentSystemPrompt(...) },
    ...this.convertHistoryToOpenAI(history),  // ← No images converted
  ];

  if (message) {
    messages.push({ role: 'user', content: message });  // ← Just text, no images!
  }

  // API request sent WITHOUT images ❌
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages,  // ← No images in messages!
      tools: toOpenAITools(),
    }),
  });
}
```

## The Fix

### Add images to AgentChatMessage

```typescript
export interface AgentChatMessage {
  role: 'user' | 'assistant' | 'tool' | 'system';
  content: string;
  toolCalls?: AgentToolCall[];
  toolCallId?: string;
  toolResults?: ToolResult[];
  images?: Array<{ fileName: string; base64: string; mimeType: string }>;  // ← ADD THIS
}
```

### Add images to AgentChatOptions

```typescript
export interface AgentChatOptions {
  sessionId: string;
  provider?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  customEndpoint?: string;
  images?: Array<{ fileName: string; base64: string; mimeType: string }>;  // ← ADD THIS
  onToolStart?: (toolCall: AgentToolCall) => void;
  onToolComplete?: (result: ToolResult) => void;
  onStatusUpdate?: (status: string) => void;
}
```

### Update ChatInterface.tsx

```typescript
// Pass images in agent history
const agentHistory = messages.map(m => ({
  role: m.role as 'user' | 'assistant',
  content: m.content,
  toolCalls: m.toolCalls,
  toolResults: m.toolResults,
  images: m.images,  // ← ADD THIS
}));

// Pass images in options
const result = await agentChatService.executeWithTools(
  processedMessage,
  agentHistory,
  {
    sessionId: currentSessionId,
    images: imageFiles,  // ← ADD THIS
    onToolStart: (toolCall) => { ... },
    onToolComplete: (result) => { ... },
    onStatusUpdate: (status) => { ... },
  }
);
```

### Update agentChatService.ts provider methods

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
  const messages = [
    { role: 'system', content: getAgentSystemPrompt(...) },
    ...this.convertHistoryToOpenAI(history),  // ← This will now handle images
  ];

  // Add current message with images
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

### Update history converter

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
    }
    // ... handle other roles
  }

  return messages;
}
```

## Result After Fix

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER ATTACHES IMAGE                          │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
                    [Image Processing]
                             │
                             ▼
              ┌──────────────┴──────────────┐
              │                             │
              ▼                             ▼
    ┌─────────────────┐         ┌─────────────────┐
    │  NORMAL MODE    │         │  AGENT MODE     │
    │  (Working ✅)   │         │  (Fixed ✅)     │
    └────────┬────────┘         └────────┬────────┘
             │                           │
             ▼                           ▼
┌────────────────────────┐   ┌────────────────────────┐
│ aiService.chat()       │   │ agentChatService       │
│ + images ✅            │   │ .executeWithTools()    │
│                        │   │ + images ✅            │
└────────┬───────────────┘   └────────┬───────────────┘
         │                            │
         ▼                            ▼
┌────────────────────────┐   ┌────────────────────────┐
│ Vision API ✅          │   │ Vision API ✅          │
│ "I can see..."         │   │ "I can see..."         │
└────────────────────────┘   └────────────────────────┘
```

## Summary

The vision/OCR system is **fully functional** in Normal Mode but **completely non-functional** in Agent Mode because:

1. Images are processed correctly (base64 conversion works)
2. Images are passed to `aiService.chat()` in Normal Mode ✅
3. Images are **NOT passed** to `agentChatService` in Agent Mode ❌
4. The agent service has **no image handling code** at all
5. The AI receives **no images** and correctly responds "I cannot process images"

The fix is to **add image support to agentChatService** by mirroring the implementation from aiService.
