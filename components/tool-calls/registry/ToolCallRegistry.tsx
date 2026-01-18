/**
 * Tool Call Registry
 * 
 * Central registry that maps tool names to their UI components.
 * Plugins register themselves here to be discovered by the AgentAction component.
 */

import { 
  Terminal, 
  FileText, 
  FolderOpen, 
  Search, 
  Globe,
  Bot,
  Users,
  Workflow,
  Code
} from 'lucide-react';
import { ToolCallPlugin, IToolCallRegistry, ToolCategory } from './types';

// Import plugins (will be created in next steps)
import { ListDirectoryUI } from '../file-operations/ListDirectoryUI';
import { ListDirectoryLoadingUI } from '../file-operations/ListDirectoryLoadingUI';
import { SearchFilesUI } from '../file-operations/SearchFilesUI';
import { ReadFileUI } from '../file-operations/ReadFileUI';
import { WriteFileUI } from '../file-operations/WriteFileUI';
import { ShellCommandUI } from '../shell-operations/ShellCommandUI';
import { TerminalUI } from '../shell-operations/TerminalUI';
import { WebSearchUI } from '../web-operations/WebSearchUI';
import { WebSearchLoadingUI } from '../web-operations/WebSearchLoadingUI';
import { WebSearchCustomWrapper } from '../web-operations/WebSearchCustomWrapper';
import { InvokeAgentUI } from '../agent-operations/InvokeAgentUI';
import { ListAgentsUI } from '../agent-operations/ListAgentsUI';
import { CreateAgentUI } from '../agent-operations/CreateAgentUI';

// ============================================================================
// Registry Implementation
// ============================================================================

class ToolCallRegistry implements IToolCallRegistry {
  private plugins = new Map<string, ToolCallPlugin>();
  
  register(plugin: ToolCallPlugin): void {
    this.plugins.set(plugin.toolName, plugin);
  }
  
  get(toolName: string): ToolCallPlugin | undefined {
    return this.plugins.get(toolName);
  }
  
  getByCategory(category: ToolCategory): ToolCallPlugin[] {
    return Array.from(this.plugins.values())
      .filter(p => p.category === category);
  }
  
  getAll(): ToolCallPlugin[] {
    return Array.from(this.plugins.values());
  }
  
  has(toolName: string): boolean {
    return this.plugins.has(toolName);
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const toolCallRegistry = new ToolCallRegistry();

// ============================================================================
// Plugin Registration
// ============================================================================

// File Operations
toolCallRegistry.register({
  toolName: 'list_directory',
  displayName: 'List Directory',
  category: 'file',
  icon: FolderOpen,
  component: ListDirectoryUI,
  loadingComponent: ListDirectoryLoadingUI,  // Custom loading UI
  supportedLayouts: ['compact', 'expanded', 'grid'],
  description: 'List contents of a directory with file types and sizes',
  animations: {
    enter: 'animate-in fade-in slide-in-from-bottom-2 duration-400',
  },
  styling: {
    cardClassName: 'hover:scale-[1.01] transition-transform',
  },
});

toolCallRegistry.register({
  toolName: 'search_files',
  displayName: 'Search Files',
  category: 'file',
  icon: Search,
  component: SearchFilesUI,
  supportedLayouts: ['compact', 'expanded', 'grid'],
  description: 'Search for files by name pattern or content',
});

toolCallRegistry.register({
  toolName: 'read_file',
  displayName: 'Read File',
  category: 'file',
  icon: FileText,
  component: ReadFileUI,
  supportedLayouts: ['compact', 'expanded'],
  description: 'Read the contents of a file',
});

toolCallRegistry.register({
  toolName: 'write_file',
  displayName: 'Write File',
  category: 'file',
  icon: FileText,
  component: WriteFileUI,
  supportedLayouts: ['compact', 'expanded'],
  description: 'Write content to a file',
});

// Shell Operations
toolCallRegistry.register({
  toolName: 'shell',
  displayName: 'Shell Command',
  category: 'shell',
  icon: Terminal,
  component: ShellCommandUI,
  supportedLayouts: ['compact', 'expanded'],
  description: 'Execute a shell command and return its output',
});

toolCallRegistry.register({
  toolName: 'execute_command',
  displayName: 'Execute Command',
  category: 'shell',
  icon: Terminal,
  component: TerminalUI,
  supportedLayouts: ['compact', 'expanded'],
  description: 'Execute a command in a terminal session',
});

toolCallRegistry.register({
  toolName: 'create_terminal',
  displayName: 'Create Terminal',
  category: 'shell',
  icon: Terminal,
  component: TerminalUI,
  supportedLayouts: ['compact', 'expanded'],
  description: 'Create a new terminal session',
});

toolCallRegistry.register({
  toolName: 'read_output',
  displayName: 'Read Output',
  category: 'shell',
  icon: Terminal,
  component: TerminalUI,
  supportedLayouts: ['compact', 'expanded'],
  description: 'Read output from a terminal session',
});

toolCallRegistry.register({
  toolName: 'list_terminals',
  displayName: 'List Terminals',
  category: 'shell',
  icon: Terminal,
  component: TerminalUI,
  supportedLayouts: ['compact', 'expanded'],
  description: 'List all active terminal sessions',
});

toolCallRegistry.register({
  toolName: 'inspect_terminal',
  displayName: 'Inspect Terminal',
  category: 'shell',
  icon: Terminal,
  component: TerminalUI,
  supportedLayouts: ['compact', 'expanded'],
  description: 'Get detailed state information about a terminal session',
});

// Web Operations
toolCallRegistry.register({
  toolName: 'web_search',
  displayName: 'Web Search',
  category: 'web',
  icon: Globe,
  component: WebSearchUI,
  loadingComponent: WebSearchLoadingUI,      // Custom loading UI
  customWrapper: WebSearchCustomWrapper,      // Custom card wrapper
  supportedLayouts: ['compact', 'expanded'],
  description: 'Search the web for current information',
  animations: {
    enter: 'animate-in fade-in slide-in-from-left duration-500',
    loading: 'animate-pulse',
  },
});

// Agent Operations
toolCallRegistry.register({
  toolName: 'invoke_agent',
  displayName: 'Invoke Agent',
  category: 'agent',
  icon: Bot,
  component: InvokeAgentUI,
  supportedLayouts: ['compact', 'expanded'],
  description: 'Invoke a specialized agent to handle a task',
});

toolCallRegistry.register({
  toolName: 'list_agents',
  displayName: 'List Agents',
  category: 'agent',
  icon: Users,
  component: ListAgentsUI,
  supportedLayouts: ['compact', 'expanded'],
  description: 'List all available agents',
});

toolCallRegistry.register({
  toolName: 'create_agent',
  displayName: 'Create Agent',
  category: 'agent',
  icon: Workflow,
  component: CreateAgentUI,
  supportedLayouts: ['compact', 'expanded'],
  description: 'Create a new agent with specified capabilities',
});
