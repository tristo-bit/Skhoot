
import { bookmarkService } from '../bookmarkService';

// ============================================================================
// Bookmark Tool Definitions
// ============================================================================

export const bookmarkToolDefinitions = [
  {
    name: 'create_bookmark',
    description: 'Create a new bookmark for a note, snippet, or important piece of information. Use this when the user asks to "bookmark this" or "save this note".',
    parameters: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'The content to bookmark' },
        tags: { type: 'string', description: 'Comma-separated tags for organization' },
        notes: { type: 'string', description: 'Additional notes about the bookmark' },
      },
      required: ['content'],
    },
  },
  {
    name: 'list_bookmarks',
    description: 'List recent bookmarks or filter by search query. Use this to browse saved items.',
    parameters: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Number of bookmarks to return (default: 10)' },
      },
      required: [],
    },
  },
  {
    name: 'delete_bookmark',
    description: 'Delete a bookmark by its ID.',
    parameters: {
      type: 'object',
      properties: {
        bookmarkId: { type: 'string', description: 'The ID of the bookmark to delete' },
      },
      required: ['bookmarkId'],
    },
  },
];

// ============================================================================
// Tool Execution Handler
// ============================================================================

export async function executeBookmarkTool(
  name: string,
  args: any,
  sessionId?: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    switch (name) {
      case 'create_bookmark':
        // Generate a pseudo message-id since creating via tool doesn't link to a chat message
        const pseudoMessageId = `tool_gen_${Date.now()}`;
        const bookmark = await bookmarkService.create({
          message_id: pseudoMessageId,
          session_id: sessionId || null,
          content: args.content,
          role: 'assistant', // Assumed assistant role for tool-created bookmarks
          tags: args.tags,
          notes: args.notes,
        });
        return { success: true, data: `Bookmark created with ID: ${bookmark.id}` };

      case 'list_bookmarks':
        const bookmarks = await bookmarkService.list(sessionId, args.limit || 10);
        return { success: true, data: bookmarks };

      case 'delete_bookmark':
        if (!args.bookmarkId) throw new Error('bookmarkId is required');
        await bookmarkService.delete(args.bookmarkId);
        return { success: true, data: `Bookmark ${args.bookmarkId} deleted successfully` };

      default:
        return { success: false, error: `Unknown bookmark tool: ${name}` };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
