# Toolcall Creation Protocol

This document provides a comprehensive guide for adding new toolcalls to the Skhoot AI agent system. It covers the architecture, implementation patterns, and step-by-step instructions for creating new tools.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Tool Definition Structure](#tool-definition-structure)
3. [Implementation Locations](#implementation-locations)
4. [Step-by-Step Guide](#step-by-step-guide)
5. [Example: web_search Tool](#example-web_search-tool)
6. [Testing Your Tool](#testing-your-tool)
7. [Best Practices](#best-practices)

---

## Architecture Overview

The Skhoot agent system uses a **universal tool calling architecture** that supports multiple AI providers (OpenAI, Anthropic, Google/Gemini, Ollama, etc.). Tools are defined once in a universal format and automatically converted to provider-specific formats.

### Key Components

1. **Tool Definitions** (`services/agentChatService.ts`)
   - Universal tool schema (name, description, parameters)
   - Stored in `AGENT_TOOLS` array

2. **Tool Format Converters** (`services/agentChatService.ts`)
   - `toOpenAITools()` - OpenAI/Ollama format
   - `toAnthropicTools()` - Anthropic Claude format
   - `toGeminiTools()` - Google Gemini format

3. **Tool Execution** (`services/agentChatService.ts`)
   - `executeWithTools()` - Main execution loop
   - Switch statement routing tool calls to handlers

4. **Tool Handlers** (various locations)
   - `services/agentTools/` - Agent-specific tools
   - `services/backendApi.ts` - Backend API calls
   - Custom handlers for new tools

### Data Flow

```
User Message
    ↓
AI Provider (with tool definitions)
    ↓
Tool Call Response
    ↓
Tool Execution (switch statement)
    ↓
Tool Handler (implementation)
    ↓
Tool Result
    ↓
AI Provider (with result)
    ↓
Final Response
```

---

## Tool Definition Structure

Tools are defined using a universal schema that works across all providers:

```typescript
{
  name: 'tool_name',
  description: 'Clear description of what the tool does and when to use it',
  parameters: {
    type: 'object',
    properties: {
      param1: { 
        type: 'string', 
        description: 'Description of parameter 1' 
      },
      param2: { 
        type: 'number', 
        description: 'Description of parameter 2' 
      },
      // ... more parameters
    },
    required: ['param1'], // Array of required parameter names
  },
}
```

### Parameter Types

- `string` - Text values
- `number` - Numeric values
- `boolean` - True/false values
- `object` - Nested objects
- `array` - Lists (use `items` to specify element type)

### Parameter Properties

- `type` - Data type (required)
- `description` - Clear explanation for the AI (required)
- `enum` - Array of allowed values (optional)
- `default` - Default value (optional)
- `items` - For arrays, specifies element schema (optional)

---

## Implementation Locations

### 1. Tool Definition
**File:** `services/agentChatService.ts`
**Location:** `AGENT_TOOLS` array (around line 70)

Add your tool definition to this array.

### 2. Tool Execution
**File:** `services/agentChatService.ts`
**Location:** `executeWithTools()` method, switch statement (around line 620)

Add a case for your tool name and call the appropriate handler.

### 3. Tool Handler
**Options:**
- **Backend API:** `services/backendApi.ts` - For tools that need backend services
- **Agent Tools:** `services/agentTools/` - For agent-specific functionality
- **Inline:** In the switch statement - For simple tools

### 4. Backend Implementation (if needed)
**File:** `backend/src/main.rs` or relevant backend file
**Location:** API routes and handlers

Implement the backend endpoint if your tool requires server-side processing.

---

## Step-by-Step Guide

### Step 1: Define the Tool

Add your tool definition to the `AGENT_TOOLS` array in `services/agentChatService.ts`:

```typescript
const AGENT_TOOLS = [
  // ... existing tools ...
  {
    name: 'your_tool_name',
    description: 'Detailed description of what your tool does. Include when to use it and what it returns.',
    parameters: {
      type: 'object',
      properties: {
        required_param: { 
          type: 'string', 
          description: 'Description of this required parameter' 
        },
        optional_param: { 
          type: 'number', 
          description: 'Description of this optional parameter' 
        },
      },
      required: ['required_param'],
    },
  },
];
```

### Step 2: Add Backend API Method (if needed)

If your tool needs backend functionality, add a method to `services/backendApi.ts`:

```typescript
export const backendApi = {
  // ... existing methods ...
  
  async yourToolMethod(param1: string, param2?: number): Promise<YourResultType> {
    const params = new URLSearchParams({ param1 });
    if (param2) params.append('param2', param2.toString());
    
    const response = await fetch(`${BACKEND_URL}/api/v1/your-endpoint?${params}`);
    if (!response.ok) {
      throw new Error(`Your tool failed: ${response.statusText}`);
    }
    
    return response.json();
  },
};
```

### Step 3: Add Tool Execution Handler

In `services/agentChatService.ts`, add a case to the switch statement in `executeWithTools()`:

```typescript
switch (toolCall.name) {
  // ... existing cases ...
  
  case 'your_tool_name':
    const yourResult = await backendApi.yourToolMethod(
      toolCall.arguments.required_param,
      toolCall.arguments.optional_param
    );
    output = JSON.stringify(yourResult, null, 2);
    success = true;
    break;
}
```

### Step 4: Implement Backend Endpoint (if needed)

In your backend (e.g., `backend/src/main.rs`), add the API endpoint:

```rust
#[get("/api/v1/your-endpoint")]
async fn your_endpoint(
    query: web::Query<YourParams>,
) -> Result<HttpResponse, Error> {
    // Implementation
    Ok(HttpResponse::Ok().json(result))
}
```

### Step 5: Test Your Tool

1. Start the backend server
2. Start the frontend
3. Send a message that should trigger your tool
4. Verify the tool is called and returns expected results

---

## Example: web_search Tool

Let's implement a `web_search` tool that allows the AI to search the web for current information.

### Step 1: Define the Tool

```typescript
// In services/agentChatService.ts, AGENT_TOOLS array
{
  name: 'web_search',
  description: 'Search the web for current information, news, documentation, or answers to questions. Use this when you need up-to-date information that may not be in your training data. Returns search results with titles, URLs, snippets, and relevance scores.',
  parameters: {
    type: 'object',
    properties: {
      query: { 
        type: 'string', 
        description: 'The search query. Be specific and use relevant keywords.' 
      },
      num_results: { 
        type: 'number', 
        description: 'Number of results to return (default: 5, max: 10)' 
      },
      search_type: {
        type: 'string',
        description: 'Type of search: "general" for web search, "news" for recent news, "docs" for documentation',
        enum: ['general', 'news', 'docs'],
      },
    },
    required: ['query'],
  },
}
```

### Step 2: Add Backend API Method

```typescript
// In services/backendApi.ts

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  published_date?: string;
  relevance_score: number;
}

export interface WebSearchResponse {
  query: string;
  results: WebSearchResult[];
  total_results: number;
  search_time_ms: number;
}

export const backendApi = {
  // ... existing methods ...
  
  /**
   * Search the web for information
   */
  async webSearch(
    query: string, 
    numResults?: number, 
    searchType?: 'general' | 'news' | 'docs'
  ): Promise<WebSearchResponse> {
    const params = new URLSearchParams({ 
      q: query,
      num_results: (numResults || 5).toString(),
      search_type: searchType || 'general'
    });
    
    const response = await fetch(`${BACKEND_URL}/api/v1/search/web?${params}`);
    if (!response.ok) {
      throw new Error(`Web search failed: ${response.statusText}`);
    }
    
    return response.json();
  },
};
```

### Step 3: Add Tool Execution Handler

```typescript
// In services/agentChatService.ts, executeWithTools() method

switch (toolCall.name) {
  // ... existing cases ...
  
  case 'web_search':
    const searchResults = await backendApi.webSearch(
      toolCall.arguments.query,
      toolCall.arguments.num_results,
      toolCall.arguments.search_type
    );
    output = JSON.stringify(searchResults, null, 2);
    success = true;
    break;
}
```

### Step 4: Implement Backend Endpoint

```rust
// In backend/src/main.rs or backend/src/routes/search.rs

use serde::{Deserialize, Serialize};
use actix_web::{get, web, HttpResponse, Error};

#[derive(Deserialize)]
struct WebSearchQuery {
    q: String,
    num_results: Option<u32>,
    search_type: Option<String>,
}

#[derive(Serialize)]
struct WebSearchResult {
    title: String,
    url: String,
    snippet: String,
    published_date: Option<String>,
    relevance_score: f32,
}

#[derive(Serialize)]
struct WebSearchResponse {
    query: String,
    results: Vec<WebSearchResult>,
    total_results: usize,
    search_time_ms: u64,
}

#[get("/api/v1/search/web")]
async fn web_search(
    query: web::Query<WebSearchQuery>,
) -> Result<HttpResponse, Error> {
    let start_time = std::time::Instant::now();
    let num_results = query.num_results.unwrap_or(5).min(10);
    let search_type = query.search_type.as_deref().unwrap_or("general");
    
    // TODO: Implement actual web search using a search API
    // For example: DuckDuckGo API, Google Custom Search, Bing API, etc.
    
    // Example implementation (replace with actual search):
    let results = vec![
        WebSearchResult {
            title: "Example Result".to_string(),
            url: "https://example.com".to_string(),
            snippet: "This is an example search result...".to_string(),
            published_date: Some("2024-01-15".to_string()),
            relevance_score: 0.95,
        },
    ];
    
    let response = WebSearchResponse {
        query: query.q.clone(),
        results,
        total_results: 1,
        search_time_ms: start_time.elapsed().as_millis() as u64,
    };
    
    Ok(HttpResponse::Ok().json(response))
}

// Don't forget to register the route in your app configuration:
// .service(web_search)
```

### Step 5: Update System Prompt (Optional)

If your tool is important enough to mention in the system prompt, update `getAgentSystemPrompt()` in `services/agentChatService.ts`:

```typescript
CAPABILITIES:
- Execute ANY shell command using the 'shell' tool
- Read file contents using 'read_file'
- Write/modify files using 'write_file'
- Search the web for current information using 'web_search' (NEW!)
- ... other capabilities
```

---

## Testing Your Tool

### Manual Testing

1. **Start Backend:**
   ```bash
   cd backend
   cargo run
   ```

2. **Start Frontend:**
   ```bash
   npm run dev
   ```

3. **Test in Chat:**
   - Send a message that should trigger the tool
   - Example: "Search the web for the latest news about AI"
   - Verify the tool is called and results are displayed

### Automated Testing

Create a test file in `services/agentTools/__tests__/`:

```typescript
// services/agentTools/__tests__/webSearch.test.ts

import { describe, it, expect, vi } from 'vitest';
import { backendApi } from '../../backendApi';

describe('web_search tool', () => {
  it('should search the web successfully', async () => {
    const result = await backendApi.webSearch('test query', 5, 'general');
    
    expect(result).toHaveProperty('query');
    expect(result).toHaveProperty('results');
    expect(result.results).toBeInstanceOf(Array);
  });
  
  it('should handle errors gracefully', async () => {
    // Mock fetch to return error
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      statusText: 'Internal Server Error',
    });
    
    await expect(
      backendApi.webSearch('test', 5, 'general')
    ).rejects.toThrow('Web search failed');
  });
});
```

Run tests:
```bash
npm test
```

---

## Best Practices

### 1. Tool Naming
- Use **snake_case** for tool names (e.g., `web_search`, `read_file`)
- Be descriptive but concise
- Avoid ambiguous names

### 2. Descriptions
- Write clear, detailed descriptions
- Explain **when** to use the tool
- Describe **what** the tool returns
- Include examples if helpful

### 3. Parameters
- Mark parameters as required only if truly necessary
- Provide sensible defaults for optional parameters
- Use enums for parameters with limited valid values
- Write detailed parameter descriptions

### 4. Error Handling
- Always handle errors gracefully
- Return meaningful error messages
- Set `success: false` on errors
- Include error details in the output

### 5. Output Format
- Return structured data (JSON) when possible
- Include metadata (timestamps, counts, etc.)
- Keep output concise but informative
- Format large outputs for readability

### 6. Performance
- Set reasonable timeouts
- Limit result counts
- Cache results when appropriate
- Use async/await properly

### 7. Security
- Validate all inputs
- Sanitize user-provided data
- Don't expose sensitive information
- Use environment variables for API keys

### 8. Documentation
- Document your tool in this file
- Add inline comments for complex logic
- Update the system prompt if needed
- Create examples for common use cases

---

## Tool Categories

Tools in the Skhoot system are organized into categories:

### File Operations
- `read_file` - Read file contents
- `write_file` - Write/modify files
- `list_directory` - List directory contents
- `search_files` - Search for files

### Shell Operations
- `shell` - Execute shell commands
- `create_terminal` - Create terminal sessions
- `execute_command` - Execute in terminal
- `read_output` - Read terminal output

### Agent Operations
- `invoke_agent` - Invoke specialized agents
- `list_agents` - List available agents
- `create_agent` - Create new agents

### Workflow Operations
- `create_workflow` - Create workflows
- `execute_workflow` - Run workflows
- `list_workflows` - List workflows

### Web Operations (Example)
- `web_search` - Search the web

---

## Common Patterns

### Pattern 1: Simple Backend Call

```typescript
case 'your_tool':
  const result = await backendApi.yourMethod(toolCall.arguments.param);
  output = JSON.stringify(result, null, 2);
  success = true;
  break;
```

### Pattern 2: Complex Handler with Validation

```typescript
case 'your_tool':
  try {
    // Validate inputs
    if (!toolCall.arguments.required_param) {
      throw new Error('Missing required parameter');
    }
    
    // Execute
    const result = await backendApi.yourMethod(
      toolCall.arguments.required_param,
      toolCall.arguments.optional_param
    );
    
    // Format output
    output = `Success: ${result.message}\nData: ${JSON.stringify(result.data)}`;
    success = true;
  } catch (error) {
    output = `Error: ${error.message}`;
    success = false;
  }
  break;
```

### Pattern 3: Delegated Handler

```typescript
case 'your_tool':
  const toolResult = await yourToolHandler(
    toolCall.arguments,
    options.sessionId
  );
  output = toolResult.data 
    ? JSON.stringify(toolResult.data, null, 2)
    : (toolResult.error || 'No output');
  success = toolResult.success;
  break;
```

---

## Troubleshooting

### Tool Not Being Called
1. Check tool definition is in `AGENT_TOOLS` array
2. Verify tool name matches exactly in switch statement
3. Check system prompt mentions the tool capability
4. Test with explicit tool request: "Use the [tool_name] tool to..."

### Tool Execution Fails
1. Check backend endpoint is running
2. Verify API URL is correct
3. Check parameter types match definition
4. Look for errors in browser console and backend logs

### Tool Returns Wrong Data
1. Verify backend implementation
2. Check data transformation/formatting
3. Test backend endpoint directly (curl/Postman)
4. Add logging to track data flow

### Provider-Specific Issues
1. Check tool format conversion functions
2. Verify provider supports tool calling
3. Test with different providers
4. Check provider-specific documentation

---

## Advanced Topics

### Custom Tool Handlers

For complex tools, create a dedicated handler file:

```typescript
// services/agentTools/yourTool.ts

export interface YourToolResult {
  success: boolean;
  data?: any;
  error?: string;
}

export async function handleYourTool(
  args: { param1: string; param2?: number },
  sessionId: string
): Promise<YourToolResult> {
  try {
    // Implementation
    return {
      success: true,
      data: { /* result */ },
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}
```

### Tool Filtering

Tools can be filtered per agent using `allowedTools`:

```typescript
const options: AgentChatOptions = {
  sessionId: 'session-123',
  allowedTools: ['read_file', 'write_file', 'web_search'],
};
```

### Tool Chaining

Tools can call other tools by returning tool call suggestions:

```typescript
// In your tool handler
return {
  success: true,
  data: result,
  suggestedNextTool: {
    name: 'another_tool',
    arguments: { /* ... */ },
  },
};
```

---

## Conclusion

This protocol provides everything you need to add new toolcalls to the Skhoot agent system. Follow the patterns, test thoroughly, and maintain consistency with existing tools.

For questions or issues, refer to:
- Existing tool implementations in `services/agentTools/`
- Backend API patterns in `services/backendApi.ts`
- Tool execution logic in `services/agentChatService.ts`

Happy tool building! 🛠️
