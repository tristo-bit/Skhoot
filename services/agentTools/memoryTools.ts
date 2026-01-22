
import { memoryService } from '../memoryService';

// ============================================================================
// Memory Tool Definitions
// ============================================================================

export const memoryToolDefinitions = [
  {
    name: 'add_memory',
    description: 'Explicitly store a fact, preference, or piece of information in long-term memory. Use this when the user says "Remember that..." or shares critical information that should persist.',
    parameters: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'The information to remember' },
        category: { type: 'string', description: 'Category for the memory (e.g., "user_preference", "project_details", "decision")' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Tags to help categorize and retrieve the memory' },
        importance: { type: 'string', enum: ['low', 'medium', 'high'], description: 'Importance level of the memory' },
      },
      required: ['content'],
    },
  },
  {
    name: 'delete_memory',
    description: 'Delete a specific memory by its ID. Use this when information becomes obsolete or incorrect.',
    parameters: {
      type: 'object',
      properties: {
        memoryId: { type: 'string', description: 'The ID of the memory to delete' },
      },
      required: ['memoryId'],
    },
  },
  {
    name: 'update_memory',
    description: 'Update an existing memory with new content or metadata.',
    parameters: {
      type: 'object',
      properties: {
        memoryId: { type: 'string', description: 'The ID of the memory to update' },
        content: { type: 'string', description: 'New content for the memory (optional)' },
        category: { type: 'string', description: 'New category (optional)' },
        notes: { type: 'string', description: 'Additional notes (optional)' },
      },
      required: ['memoryId'],
    },
  },
  {
    name: 'list_recent_memories',
    description: 'List the most recently created memories. Useful for reviewing what was just learned.',
    parameters: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Number of memories to return (default: 10)' },
      },
      required: [],
    },
  },
];

// ============================================================================
// Tool Execution Handler
// ============================================================================

export async function executeMemoryTool(
  name: string,
  args: any,
  sessionId?: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    switch (name) {
      case 'add_memory':
        const memory = await memoryService.create({
          content: args.content,
          role: 'assistant', // Memories created by tool are from assistant's perspective
          session_id: sessionId || null,
          metadata: {
            category: args.category,
            tags: args.tags,
            importance: args.importance,
            source: 'agent'
          }
        });
        return { success: true, data: `Memory added with ID: ${memory.id}` };

      case 'delete_memory':
        if (!args.memoryId) throw new Error('memoryId is required');
        await memoryService.delete(args.memoryId);
        return { success: true, data: `Memory ${args.memoryId} deleted successfully` };

      case 'update_memory':
        if (!args.memoryId) throw new Error('memoryId is required');
        const updated = await memoryService.update(args.memoryId, {
          content: args.content,
          metadata: { category: args.category },
          notes: args.notes
        });
        if (updated) {
          return { success: true, data: `Memory ${args.memoryId} updated successfully` };
        } else {
          return { success: false, error: `Memory ${args.memoryId} not found` };
        }

      case 'list_recent_memories':
        const recents = await memoryService.recent(args.limit || 10, sessionId);
        return { success: true, data: recents };

      default:
        return { success: false, error: `Unknown memory tool: ${name}` };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
