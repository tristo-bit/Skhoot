
import { backendApi } from '../backendApi';

// ============================================================================
// System Tool Definitions
// ============================================================================

export const systemToolDefinitions = [
  {
    name: 'analyze_disk_usage',
    description: 'Analyze disk usage to find space consumers. Returns detailed analysis of file and directory sizes, helpful for cleaning up disk space.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to analyze (default: current directory)' },
        max_depth: { type: 'number', description: 'Maximum depth to traverse (default: 2)' },
        top_n: { type: 'number', description: 'Number of top consumers to return (default: 10)' },
      },
      required: [],
    },
  },
  {
    name: 'get_cleanup_suggestions',
    description: 'Get AI-powered suggestions for cleaning up disk space. Identifies cache files, temporary directories, and large unused files.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_system_info',
    description: 'Get comprehensive system information including disk space, memory usage, and OS details.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_storage_breakdown',
    description: 'Get storage usage broken down by category (e.g., Documents, Images, Code, etc.).',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to analyze (default: current directory)' },
      },
      required: [],
    },
  },
];

// ============================================================================
// Tool Execution Handler
// ============================================================================

export async function executeSystemTool(
  name: string,
  args: any
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    switch (name) {
      case 'analyze_disk_usage':
        const analysis = await backendApi.analyzeDisk({
          path: args.path,
          max_depth: args.max_depth,
          top_n: args.top_n
        });
        return { success: true, data: analysis };

      case 'get_cleanup_suggestions':
        const suggestions = await backendApi.getCleanupSuggestions();
        return { success: true, data: suggestions };

      case 'get_system_info':
        // Combine disk info with other system info if available
        const diskInfo = await backendApi.getDiskInfo();
        // We can add memory/cpu info here if we add endpoints for them later
        // For now, disk info is the most "system" related structured data we have
        return { success: true, data: { disks: diskInfo } };

      case 'get_storage_breakdown':
        const breakdown = await backendApi.getStorageCategories({
          path: args.path
        });
        return { success: true, data: breakdown };

      default:
        return { success: false, error: `Unknown system tool: ${name}` };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
