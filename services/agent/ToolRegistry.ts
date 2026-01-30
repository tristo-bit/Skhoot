
import { APIFormat } from '../providerRegistry';
import { ToolDefinition } from './types';

// Import definitions from specific toolsets
import { workflowToolDefinitions } from '../agentTools/workflowTools';
import { backupToolDefinitions } from '../agentTools/backupTools';
import { systemToolDefinitions } from '../agentTools/systemTools';
import { memoryToolDefinitions } from '../agentTools/memoryTools';
import { bookmarkToolDefinitions } from '../agentTools/bookmarkTools';
import { osToolDefinitions } from '../agentTools/osTools';

// ============================================================================
// Central Tool Registry
// ============================================================================

export const CORE_TOOLS: ToolDefinition[] = [
  {
    name: 'create_terminal',
    description: 'Create a new terminal session for executing commands. Returns a session ID that can be used to execute commands and read output. Use this when you need to run multiple commands in the same terminal context or maintain state across commands.',
    parameters: {
      type: 'object',
      properties: {
        workspaceRoot: { type: 'string', description: 'Optional workspace root directory for the terminal session. Commands will execute relative to this directory.' },
        type: { type: 'string', description: "Type of terminal to create: 'shell' (default) or 'codex'" },
      },
      required: [],
    },
  },
  {
    name: 'execute_command',
    description: 'Execute a command in a specific terminal session. The command will be sent to the terminal and executed asynchronously. Use read_output to get the results.',
    parameters: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', description: 'The session ID of the terminal to execute the command in (from create_terminal)' },
        command: { type: 'string', description: 'The command to execute (newline will be automatically appended)' },
      },
      required: ['sessionId', 'command'],
    },
  },
  {
    name: 'read_output',
    description: 'Read output from a terminal session. Returns all output since the last read, including stdout and stderr.',
    parameters: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', description: 'The session ID of the terminal to read from' },
      },
      required: ['sessionId'],
    },
  },
  {
    name: 'list_terminals',
    description: 'List all active terminal sessions with their current states. Useful for discovering available terminals.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'inspect_terminal',
    description: 'Get detailed state information about a specific terminal session, including command history and current output.',
    parameters: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', description: 'The session ID of the terminal to inspect' },
      },
      required: ['sessionId'],
    },
  },
  {
    name: 'shell',
    description: 'Execute a shell command and return its output. Use for running terminal commands, scripts, or system operations.',
    parameters: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'The shell command to execute' },
        workdir: { type: 'string', description: 'Working directory for command execution' },
        timeout_ms: { type: 'number', description: 'Timeout in milliseconds (default: 30000)' },
      },
      required: ['command'],
    },
  },
  {
    name: 'read_file',
    description: 'Read the contents of a file. Can read entire file or specific line ranges.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to the file to read' },
        start_line: { type: 'number', description: 'Starting line number (1-indexed)' },
        end_line: { type: 'number', description: 'Ending line number (inclusive)' },
      },
      required: ['path'],
    },
  },
  {
    name: 'write_file',
    description: 'Write content to a file. Can overwrite or append to existing files.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to the file to write' },
        content: { type: 'string', description: 'Content to write to the file' },
        mode: { type: 'string', description: "Write mode: 'overwrite' (default) or 'append'" },
      },
      required: ['path', 'content'],
    },
  },
  {
    name: 'list_directory',
    description: 'List contents of a directory with file types and sizes.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to the directory to list' },
        depth: { type: 'number', description: 'Maximum depth to traverse (default: 1)' },
        include_hidden: { type: 'boolean', description: 'Include hidden files (default: false)' },
      },
      required: ['path'],
    },
  },
  {
    name: 'search_files',
    description: 'Search for files by name pattern or content.',
    parameters: {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: 'Search pattern (glob for filenames, regex for content)' },
        path: { type: 'string', description: 'Directory to search in (default: current directory)' },
        search_type: { type: 'string', description: "Type of search: 'filename' or 'content'" },
        max_results: { type: 'number', description: 'Maximum results to return (default: 100)' },
        unrestricted: { type: 'boolean', description: 'Enable deep search (hidden files, ignore .gitignore). Use if normal search fails.' },
      },
      required: ['pattern'],
    },
  },
  {
    name: 'web_search',
    description: `Search the web with adaptive depth control. The search returns both textual results and relevant images. Use this for general knowledge, news, or when you need to find visual representations of things.`,
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The search query. Be specific and use relevant keywords.' },
        depth: { type: 'number', description: 'Search depth from 0-10. Default: 5', minimum: 0, maximum: 10 },
        num_results: { type: 'number', description: 'Number of search results to return (default: 5, max: 10)' },
        search_type: { type: 'string', description: 'Type of search: "general", "news", "docs"', enum: ['general', 'news', 'docs'] },
      },
      required: ['query'],
    },
  },
  {
    name: 'browse',
    description: `Extract full content from a specific URL. Use this when you need to read a particular article, documentation page, or website in detail.`,
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL to browse and extract content from.' },
        render: { type: 'boolean', description: 'Enable WebView rendering for JavaScript-heavy pages. Default: false' }
      },
      required: ['url'],
    },
  },
  {
    name: 'hidden_web_search',
    description: 'Search the web for hyperlink URLs without displaying UI. Use this to enrich your responses with contextual links for complex terms or source citations.',
    parameters: {
      type: 'object',
      properties: {
        queries: { type: 'array', items: { type: 'string' }, description: 'Array of search queries for terms needing hyperlinks.' },
        link_type: { type: 'string', enum: ['learning', 'source'], description: 'Type of hyperlinks: "learning" or "source"' },
      },
      required: ['queries', 'link_type'],
    },
  },
  {
    name: 'invoke_agent',
    description: 'Invoke a specialized agent to handle a specific task. Agents are autonomous entities with specific capabilities and workflows.',
    parameters: {
      type: 'object',
      properties: {
        agent_id: { type: 'string', description: 'ID of the agent to invoke' },
        message: { type: 'string', description: 'Message or task for the agent' },
        context: { type: 'object', description: 'Additional context for the agent (optional)' },
      },
      required: ['agent_id', 'message'],
    },
  },
  {
    name: 'list_agents',
    description: 'List all available agents with their capabilities and current status.',
    parameters: {
      type: 'object',
      properties: {
        state: { type: 'string', description: "Filter by state: 'on', 'off', 'sleeping', 'failing' (optional)" },
        tags: { type: 'array', items: { type: 'string' }, description: 'Filter by tags (optional)' },
      },
      required: [],
    },
  },
  {
    name: 'message_search',
    description: 'Search through bookmarked messages to retrieve context from previous conversations.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query to find in bookmarked messages.' },
        limit: { type: 'number', description: 'Maximum number of results to return (default: 10, max: 50)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'memory_search',
    description: 'Search through your long-term memories to retrieve important context from past conversations.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query to find in long-term memories.' },
        limit: { type: 'number', description: 'Maximum number of results to return (default: 5, max: 20)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'create_agent',
    description: 'Create a new agent with specified capabilities. This is a restricted tool only available to the Agent Builder agent.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Name of the agent' },
        description: { type: 'string', description: 'Description of what the agent does' },
        master_prompt: { type: 'string', description: 'Master prompt defining agent behavior and personality' },
        workflows: { type: 'array', items: { type: 'string' }, description: 'Workflow IDs the agent can execute' },
        allowed_tools: { type: 'array', items: { type: 'string' }, description: 'Tools the agent is allowed to use' },
        trigger: { type: 'object', description: 'Trigger configuration for automatic activation' },
      },
      required: ['name', 'description', 'master_prompt'],
    },
  },
];

// Combine all tools
export const AGENT_TOOLS: ToolDefinition[] = [
  ...CORE_TOOLS,
  ...workflowToolDefinitions as ToolDefinition[],
  ...backupToolDefinitions as ToolDefinition[],
  ...systemToolDefinitions as ToolDefinition[],
  ...memoryToolDefinitions as ToolDefinition[],
  ...bookmarkToolDefinitions as ToolDefinition[],
  ...osToolDefinitions as ToolDefinition[],
];

// ============================================================================
// Tool Formatting Adapters
// ============================================================================

export class ToolRegistry {
  static getToolsForFormat(format: APIFormat, allowedTools?: string[]) {
    // 1. Filter tools first
    let tools = AGENT_TOOLS;
    if (allowedTools && allowedTools.length > 0) {
      tools = tools.filter(tool => allowedTools.includes(tool.name));
    }

    // 2. Convert to specific format
    switch (format) {
      case 'anthropic':
        return tools.map(tool => ({
          name: tool.name,
          description: tool.description,
          input_schema: tool.parameters,
        }));

      case 'google':
        return [{
          function_declarations: tools.map(tool => ({
            name: tool.name,
            description: tool.description,
            parameters: {
              type: 'OBJECT',
              properties: Object.fromEntries(
                Object.entries(tool.parameters.properties).map(([key, value]: [string, any]) => {
                  const prop: any = { 
                    type: value.type.toUpperCase(), 
                    description: value.description 
                  };
                  // Preserve items for array types (required by Gemini)
                  if (value.items) {
                    prop.items = {
                      type: value.items.type.toUpperCase()
                    };
                  }
                  return [key, prop];
                })
              ),
              required: tool.parameters.required,
            },
          })),
        }];

      case 'openai':
      case 'ollama':
      default:
        return tools.map(tool => ({
          type: 'function',
          function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters,
          },
        }));
    }
  }
}
