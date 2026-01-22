import { backendApi, FileSearchMatch } from './backendApi';

export interface BackupFile {
  id: string;
  name: string;
  path: string;
  originalPath: string;
  size: string;
  archivedDate: string;
}

/**
 * Backup service - handles backup and restore operations using real filesystem
 */
export const backupService = {
  /**
   * List all available backups (files ending in .backup, .backup.zst, or .backup.gz)
   */
  list: async (): Promise<BackupFile[]> => {
    try {
      // Search for .backup files
      // We use the AI search which is robust
      const results = await backendApi.aiFileSearch('.backup', {
        mode: 'auto',
        max_results: 100
      });

      if (!results.file_results?.matches) {
        return [];
      }

      const validExtensions = ['.backup', '.backup.zst', '.backup.gz'];

      return results.file_results.matches
        .filter(match => validExtensions.some(ext => match.file_name.endsWith(ext)))
        .map(match => {
          let originalPath = match.path;
          let name = match.file_name;

          if (match.file_name.endsWith('.backup.zst')) {
            originalPath = match.path.replace(/\.backup\.zst$/, '');
            name = match.file_name.replace(/\.backup\.zst$/, '');
          } else if (match.file_name.endsWith('.backup.gz')) {
            originalPath = match.path.replace(/\.backup\.gz$/, '');
            name = match.file_name.replace(/\.backup\.gz$/, '');
          } else {
            originalPath = match.path.replace(/\.backup$/, '');
            name = match.file_name.replace(/\.backup$/, '');
          }
          
          return {
            id: match.path, // Use full path as ID
            name: name,
            path: match.path,
            originalPath: originalPath,
            size: formatSize(match.file_size || 0),
            archivedDate: match.modified ? new Date(match.modified).toLocaleString() : 'Unknown'
          };
        });
    } catch (error) {
      console.error('[BackupService] Failed to list backups:', error);
      return [];
    }
  },

  /**
   * Restore a file from backup by copying it over the original
   */
  restore: async (backupPath: string): Promise<boolean> => {
    console.log(`[BackupService] Restoring file ${backupPath}...`);
    
    try {
      let command = '';
      let originalPath = '';

      if (backupPath.endsWith('.backup.zst')) {
        originalPath = backupPath.replace(/\.backup\.zst$/, '');
        command = `zstd -d -f "${backupPath}" -o "${originalPath}"`;
      } else if (backupPath.endsWith('.backup.gz')) {
        originalPath = backupPath.replace(/\.backup\.gz$/, '');
        command = `gunzip -c "${backupPath}" > "${originalPath}"`;
      } else {
        originalPath = backupPath.replace(/\.backup$/, '');
        command = `cp "${backupPath}" "${originalPath}"`;
      }
      
      const result = await backendApi.executeShellCommand(command);
      
      if (result.success) {
        console.log(`[BackupService] File restored successfully to ${originalPath}`);
        return true;
      } else {
        console.error(`[BackupService] Restore failed: ${result.error || result.stderr}`);
        return false;
      }
    } catch (error) {
      console.error('[BackupService] Restore operation error:', error);
      return false;
    }
  },
  
  /**
   * Delete a backup file
   */
  delete: async (backupPath: string): Promise<boolean> => {
    try {
      const command = `rm "${backupPath}"`;
      const result = await backendApi.executeShellCommand(command);
      return result.success;
    } catch (error) {
      console.error('[BackupService] Delete operation error:', error);
      return false;
    }
  }
};

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
