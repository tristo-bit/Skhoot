/**
 * File operations service - handles file management operations via backend API
 */

const BACKEND_URL = 'http://localhost:3001/api/v1';

export const fileOperations = {
  /**
   * Open a file with its default application
   */
  open: async (filePath: string): Promise<boolean> => {
    try {
      const response = await fetch(`${BACKEND_URL}/files/open`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: filePath }),
      });
      
      if (response.ok) {
        const result = await response.json();
        return result.success === true;
      }
      return false;
    } catch (error) {
      console.error('[FileOperations] Open failed:', error);
      return false;
    }
  },

  /**
   * Reveal file in system file explorer (select the file)
   */
  reveal: async (filePath: string): Promise<boolean> => {
    try {
      const response = await fetch(`${BACKEND_URL}/files/reveal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: filePath }),
      });
      
      if (response.ok) {
        const result = await response.json();
        return result.success === true;
      }
      return false;
    } catch (error) {
      console.error('[FileOperations] Reveal failed:', error);
      return false;
    }
  },

  /**
   * Show file properties dialog (Windows/macOS/Linux)
   */
  showProperties: async (filePath: string): Promise<boolean> => {
    try {
      const response = await fetch(`${BACKEND_URL}/files/properties`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: filePath }),
      });
      
      if (response.ok) {
        const result = await response.json();
        return result.success === true;
      }
      return false;
    } catch (error) {
      console.error('[FileOperations] Properties failed:', error);
      return false;
    }
  },

  /**
   * Open "Open with" dialog (Windows/macOS/Linux)
   */
  openWith: async (filePath: string): Promise<boolean> => {
    try {
      const response = await fetch(`${BACKEND_URL}/files/open-with`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: filePath }),
      });
      
      if (response.ok) {
        const result = await response.json();
        return result.success === true;
      }
      return false;
    } catch (error) {
      console.error('[FileOperations] Open with failed:', error);
      return false;
    }
  },

  /**
   * Delete a file
   */
  delete: async (filePath: string): Promise<boolean> => {
    try {
      const response = await fetch(`${BACKEND_URL}/files/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: filePath }),
      });
      
      if (response.ok) {
        const result = await response.json();
        return result.success === true;
      }
      return false;
    } catch (error) {
      console.error('[FileOperations] Delete failed:', error);
      return false;
    }
  },

  /**
   * Compress file/folder to ZIP
   */
  compress: async (filePath: string): Promise<{ success: boolean; zipPath?: string }> => {
    try {
      const response = await fetch(`${BACKEND_URL}/files/compress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: filePath }),
      });
      
      if (response.ok) {
        const result = await response.json();
        return { success: result.success === true, zipPath: result.zipPath };
      }
      return { success: false };
    } catch (error) {
      console.error('[FileOperations] Compress failed:', error);
      return { success: false };
    }
  },

  /**
   * Get file information
   */
  getInfo: async (filePath: string): Promise<any> => {
    try {
      const response = await fetch(`${BACKEND_URL}/files/info?path=${encodeURIComponent(filePath)}`);
      
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('[FileOperations] Get info failed:', error);
      return null;
    }
  },

  /**
   * Download a file - reads file content and triggers browser download
   */
  download: async (filePath: string, fileName: string): Promise<boolean> => {
    try {
      // Use the read endpoint to get file content
      const response = await fetch(`${BACKEND_URL}/files/read?path=${encodeURIComponent(filePath)}`);
      
      if (!response.ok) {
        console.error('[FileOperations] Download failed: HTTP', response.status);
        return false;
      }

      const result = await response.json();
      
      if (!result.success || !result.content) {
        console.error('[FileOperations] Download failed: Invalid response');
        return false;
      }

      // Create a blob from the content
      const blob = new Blob([result.content], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      
      // Create download link and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log('[FileOperations] Download successful:', fileName);
      return true;
    } catch (error) {
      console.error('[FileOperations] Download failed:', error);
      return false;
    }
  },
};
