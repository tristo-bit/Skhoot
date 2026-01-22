
import { backendApi } from '../backendApi';

// ============================================================================
// OS/System Integration Tool Definitions
// ============================================================================

export const osToolDefinitions = [
  {
    name: 'open_file_explorer',
    description: 'Open the system file explorer (Finder, Explorer, etc.) at a specific path. Use this when the user asks to "show me the file" or "open the folder".',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'The file or directory path to reveal' },
      },
      required: ['path'],
    },
  },
  {
    name: 'trigger_indexing',
    description: 'Manually trigger a re-indexing of the file system. Use this if the user complains that search results are outdated or missing new files.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
];

// ============================================================================
// Tool Execution Handler
// ============================================================================

export async function executeOsTool(
  name: string,
  args: any
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    switch (name) {
      case 'open_file_explorer':
        if (!args.path) throw new Error('path is required');
        const result = await backendApi.openFileLocation(args.path);
        if (result.success) {
          return { success: true, data: `Opened file explorer at: ${args.path}` };
        } else {
          return { success: false, error: result.message || 'Failed to open file location' };
        }

      case 'trigger_indexing':
        await backendApi.startIndexing();
        return { success: true, data: 'Indexing triggered successfully' };

      default:
        return { success: false, error: `Unknown OS tool: ${name}` };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
