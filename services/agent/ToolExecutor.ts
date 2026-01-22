
import { AgentToolCall, ToolResult, AgentChatOptions } from './types';
import { backendApi } from '../backendApi';
import * as terminalTools from '../agentTools/terminalTools';
import * as agentTools from '../agentTools/agentTools';

// Import specific tool execution handlers
import { executeWorkflowTool } from '../agentTools/workflowTools';
import { executeBackupTool } from '../agentTools/backupTools';
import { executeSystemTool } from '../agentTools/systemTools';
import { executeMemoryTool } from '../agentTools/memoryTools';
import { executeBookmarkTool } from '../agentTools/bookmarkTools';
import { executeOsTool } from '../agentTools/osTools';

interface HyperlinkResult {
  term: string;
  url: string;
  title: string;
  snippet: string;
  linkType: 'learning' | 'source';
}

export class ToolExecutor {
  /**
   * Execute a single tool call
   */
  async execute(
    toolCall: AgentToolCall,
    options: AgentChatOptions
  ): Promise<ToolResult> {
    const startTime = Date.now();
    try {
      let output: string;
      let success = true;

      // Check specific handlers first
      let result: ToolResult;

      if (this.isWorkflowTool(toolCall.name)) {
        const workflowResult = await executeWorkflowTool(toolCall.name, toolCall.arguments);
        result = this.formatResult(toolCall, workflowResult.success, workflowResult.data, workflowResult.error);
        return { ...result, durationMs: Date.now() - startTime };
      }

      if (this.isBackupTool(toolCall.name)) {
        const backupResult = await executeBackupTool(toolCall.name, toolCall.arguments);
        result = this.formatResult(toolCall, backupResult.success, backupResult.data, backupResult.error);
        return { ...result, durationMs: Date.now() - startTime };
      }

      if (this.isSystemTool(toolCall.name)) {
        const systemResult = await executeSystemTool(toolCall.name, toolCall.arguments);
        result = this.formatResult(toolCall, systemResult.success, systemResult.data, systemResult.error);
        return { ...result, durationMs: Date.now() - startTime };
      }

      if (this.isMemoryTool(toolCall.name)) {
        const memoryResult = await executeMemoryTool(toolCall.name, toolCall.arguments, options.sessionId);
        result = this.formatResult(toolCall, memoryResult.success, memoryResult.data, memoryResult.error);
        return { ...result, durationMs: Date.now() - startTime };
      }

      if (this.isBookmarkTool(toolCall.name)) {
        const bookmarkResult = await executeBookmarkTool(toolCall.name, toolCall.arguments, options.sessionId);
        result = this.formatResult(toolCall, bookmarkResult.success, bookmarkResult.data, bookmarkResult.error);
        return { ...result, durationMs: Date.now() - startTime };
      }

      if (this.isOsTool(toolCall.name)) {
        const osResult = await executeOsTool(toolCall.name, toolCall.arguments);
        result = this.formatResult(toolCall, osResult.success, osResult.data, osResult.error);
        return { ...result, durationMs: Date.now() - startTime };
      }

      // Handle Core Tools
      switch (toolCall.name) {
        // Terminal tools
        case 'create_terminal':
        case 'execute_command':
        case 'read_output':
        case 'list_terminals':
        case 'inspect_terminal':
          const terminalResult = await terminalTools.executeTerminalTool(
            toolCall.name,
            toolCall.arguments,
            options.sessionId
          );
          return this.formatResult(toolCall, terminalResult.success, terminalResult.data, terminalResult.error);

        // File and shell tools
        case 'shell':
          const shellResult = await backendApi.executeShellCommand(
            toolCall.arguments.command,
            toolCall.arguments.workdir,
            toolCall.arguments.timeout_ms
          );
          output = JSON.stringify(shellResult, null, 2);
          success = true;
          break;

        case 'read_file':
          const fileContent = await backendApi.readFile(
            toolCall.arguments.path,
            toolCall.arguments.start_line,
            toolCall.arguments.end_line
          );
          output = fileContent;
          success = true;
          break;

        case 'write_file':
          await backendApi.writeFile(
            toolCall.arguments.path,
            toolCall.arguments.content,
            toolCall.arguments.mode === 'append'
          );
          output = `File written successfully: ${toolCall.arguments.path}`;
          success = true;
          break;

        case 'list_directory':
          const dirContents = await backendApi.listDirectory(
            toolCall.arguments.path,
            toolCall.arguments.depth,
            toolCall.arguments.include_hidden
          );
          output = JSON.stringify(dirContents, null, 2);
          success = true;
          break;

        case 'search_files':
          const searchResults = await backendApi.aiFileSearch(
            toolCall.arguments.pattern,
            {
              search_path: toolCall.arguments.path,
              max_results: toolCall.arguments.max_results,
              file_types: toolCall.arguments.search_type === 'filename' ? undefined : toolCall.arguments.pattern,
            }
          );
          output = JSON.stringify(searchResults, null, 2);
          success = true;
          break;

        case 'web_search':
          const webSearchResults = await backendApi.webSearch(
            toolCall.arguments.query,
            {
              depth: toolCall.arguments.depth,
              num_results: toolCall.arguments.num_results,
              search_type: toolCall.arguments.search_type
            }
          );
          output = JSON.stringify(webSearchResults, null, 2);
          success = true;
          
          // Store images for display if available
          if ('images' in webSearchResults && webSearchResults.images && webSearchResults.images.length > 0) {
            (toolCall as any)._webSearchImages = webSearchResults.images;
          }
          if ('gathered_pages' in webSearchResults) {
            (toolCall as any)._gatheredPages = webSearchResults.gathered_pages;
          }
          break;

        case 'browse':
          const browseResult = await backendApi.browse(
            toolCall.arguments.url,
            toolCall.arguments.render
          );
          output = JSON.stringify(browseResult, null, 2);
          success = true;
          (toolCall as any)._browseResult = browseResult;
          break;

        case 'hidden_web_search':
          const hiddenResults = await this.executeHiddenWebSearch(
            toolCall.arguments.queries,
            toolCall.arguments.link_type
          );
          output = JSON.stringify(hiddenResults, null, 2);
          success = true;
          (toolCall as any)._hidden = true;
          break;

        // Agent tools
        case 'invoke_agent':
          const invokeResult = await agentTools.invokeAgent(toolCall.arguments);
          output = JSON.stringify(invokeResult, null, 2);
          success = invokeResult.success;
          break;

        case 'list_agents':
          const listResult = await agentTools.listAgents(toolCall.arguments);
          output = JSON.stringify(listResult, null, 2);
          success = listResult.success;
          break;

        case 'create_agent':
          const createResult = await agentTools.createAgent(toolCall.arguments);
          output = JSON.stringify(createResult, null, 2);
          success = createResult.success;
          break;

        case 'message_search':
          const searchQuery = toolCall.arguments.query;
          const searchLimit = toolCall.arguments.limit || 10;
          const { bookmarkService } = await import('../../services/bookmarkService');
          const bookmarks = await bookmarkService.search(searchQuery, searchLimit);
          output = JSON.stringify({
            query: searchQuery,
            results: bookmarks,
            total_results: bookmarks.length,
          }, null, 2);
          success = true;
          break;

        case 'memory_search':
          const memoryQuery = toolCall.arguments.query;
          const memoryLimit = toolCall.arguments.limit || 5;
          const { memoryService } = await import('../../services/memoryService');
          const memories = await memoryService.search(memoryQuery, memoryLimit, options.sessionId);
          output = JSON.stringify({
            query: memoryQuery,
            results: memories,
            total_results: memories.length,
          }, null, 2);
          success = true;
          break;

        default:
          output = `Unknown tool: ${toolCall.name}`;
          success = false;
      }

      return {
        toolCallId: toolCall.id,
        toolCallName: toolCall.name,
        success,
        output,
        durationMs: Date.now() - startTime
      };
    } catch (error) {
      return {
        toolCallId: toolCall.id,
        toolCallName: toolCall.name,
        success: false,
        output: '',
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - startTime
      };
    }
  }

  // --- Helper Methods ---

  private formatResult(toolCall: AgentToolCall, success: boolean, data: any, error?: string): ToolResult {
    // Note: duration is not available here as it's measured in execute()
    // However, execute() calls this helper inside the try/catch block where startTime is available if we passed it.
    // But since execute() wraps the return of this helper, we should actually calculate duration in execute() and attach it.
    // Or we modify formatResult to take duration.
    // Actually, I should update execute() to attach duration after getting result from formatResult.
    // BUT formatResult returns ToolResult.
    
    // Let's refactor execute to calculate duration at the end.
    return {
      toolCallId: toolCall.id,
      toolCallName: toolCall.name,
      success,
      output: data ? (typeof data === 'string' ? data : JSON.stringify(data, null, 2)) : (error || 'No output'),
      error
    };
  }

  private isWorkflowTool(name: string): boolean {
    return ['create_workflow', 'execute_workflow', 'list_workflows', 'get_workflow', 'update_workflow', 'delete_workflow'].includes(name);
  }

  private isBackupTool(name: string): boolean {
    return ['list_backups', 'restore_backup', 'delete_backup', 'create_backup'].includes(name);
  }

  private isSystemTool(name: string): boolean {
    return ['analyze_disk_usage', 'get_cleanup_suggestions', 'get_system_info', 'get_storage_breakdown'].includes(name);
  }

  private isMemoryTool(name: string): boolean {
    return ['add_memory', 'delete_memory', 'update_memory', 'list_recent_memories'].includes(name);
  }

  private isBookmarkTool(name: string): boolean {
    return ['create_bookmark', 'list_bookmarks', 'delete_bookmark'].includes(name);
  }

  private isOsTool(name: string): boolean {
    return ['open_file_explorer', 'trigger_indexing'].includes(name);
  }

  private async executeHiddenWebSearch(queries: string[], linkType: 'learning' | 'source'): Promise<HyperlinkResult[]> {
    const results: HyperlinkResult[] = [];
    try {
      console.log('[HiddenWebSearch] Executing for queries:', queries, 'type:', linkType);
      
      for (const query of queries) {
        try {
          const searchResults = await backendApi.webSearch(query, { depth: 1, search_type: 'general' });
          let resultsList: any[] = [];
          
          if ('results' in searchResults) {
            resultsList = searchResults.results;
          } else if ('search_results' in searchResults) {
            resultsList = searchResults.search_results;
          }

          if (resultsList && resultsList.length > 0) {
            const topResult = resultsList[0];
            results.push({
              term: query,
              url: topResult.url,
              title: topResult.title,
              snippet: topResult.snippet || '',
              linkType,
            });
          }
        } catch (error) {
          console.warn('[HiddenWebSearch] Failed to search for:', query, error);
        }
      }
      return results;
    } catch (error) {
      console.error('[HiddenWebSearch] Error:', error);
      return results;
    }
  }
}
