
import { backendApi } from '../backendApi';
import { backupService } from '../backupService';

// ============================================================================
// Backup Tool Definitions
// ============================================================================

export const backupToolDefinitions = [
  {
    name: 'list_backups',
    description: 'List all available backup files. Returns a list of backups with their original paths, sizes, and archive dates. Use this to see what files can be restored.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'restore_backup',
    description: 'Restore a file from a backup. This will overwrite the current file with the backup version. Use list_backups first to find the correct backup ID.',
    parameters: {
      type: 'object',
      properties: {
        backupId: { type: 'string', description: 'The ID of the backup to restore (usually the full path to the backup file)' },
      },
      required: ['backupId'],
    },
  },
  {
    name: 'delete_backup',
    description: 'Delete a backup file. Use this to free up space or remove old backups.',
    parameters: {
      type: 'object',
      properties: {
        backupId: { type: 'string', description: 'The ID of the backup to delete' },
      },
      required: ['backupId'],
    },
  },
  {
    name: 'create_backup',
    description: 'Create a backup of a file immediately. Supports compression (zstd/gzip) for efficient storage.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to the file to backup' },
      },
      required: ['path'],
    },
  },
];

// ============================================================================
// Tool Execution Handler
// ============================================================================

export async function executeBackupTool(
  name: string,
  args: any
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    switch (name) {
      case 'list_backups':
        const backups = await backupService.list();
        return { success: true, data: backups };

      case 'restore_backup':
        if (!args.backupId) throw new Error('backupId is required');
        const restoreSuccess = await backupService.restore(args.backupId);
        if (restoreSuccess) {
          return { success: true, data: `Successfully restored backup: ${args.backupId}` };
        } else {
          return { success: false, error: `Failed to restore backup: ${args.backupId}` };
        }

      case 'delete_backup':
        if (!args.backupId) throw new Error('backupId is required');
        const deleteSuccess = await backupService.delete(args.backupId);
        if (deleteSuccess) {
          return { success: true, data: `Successfully deleted backup: ${args.backupId}` };
        } else {
          return { success: false, error: `Failed to delete backup: ${args.backupId}` };
        }

      case 'create_backup':
        if (!args.path) throw new Error('path is required');
        
        // Use backend shell command to execute the compression logic manually
        // since we don't have a direct "backup_file" API endpoint yet, 
        // but we want to expose this capability to the agent.
        // We replicate the logic from the backend's file_operations.rs
        
        const sourcePath = args.path;
        const zstdDest = `${sourcePath}.backup.zst`;
        const gzipDest = `${sourcePath}.backup.gz`;
        const cpDest = `${sourcePath}.backup`;
        
        // Try zstd
        let result = await backendApi.executeShellCommand(`zstd -q -f "${sourcePath}" -o "${zstdDest}"`);
        if (result.success) return { success: true, data: `Backup created: ${zstdDest} (zstd compressed)` };
        
        // Try gzip
        result = await backendApi.executeShellCommand(`gzip -c "${sourcePath}" > "${gzipDest}"`);
        if (result.success) return { success: true, data: `Backup created: ${gzipDest} (gzip compressed)` };
        
        // Fallback to copy
        result = await backendApi.executeShellCommand(`cp "${sourcePath}" "${cpDest}"`);
        if (result.success) return { success: true, data: `Backup created: ${cpDest} (uncompressed)` };
        
        return { success: false, error: `Failed to create backup for ${sourcePath}: ${result.stderr}` };

      default:
        return { success: false, error: `Unknown backup tool: ${name}` };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
