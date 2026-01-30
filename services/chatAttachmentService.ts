/**
 * Chat Attachment Service
 * 
 * Provides a unified way to add files and images to the chat from various UI components.
 * Dispatches the 'add-file-reference' event that PromptArea listens for.
 */

export interface AttachmentDetails {
  fileName: string;
  filePath: string; // Can be a local path or a data URL (base64)
  source?: 'user' | 'web_search' | 'file_system';
}

export interface ProcessedAttachments {
  fileContents: string[];
  attachedFileNames: string[];
  imageFiles: Array<{ fileName: string; base64: string; mimeType: string }>;
}

class ChatAttachmentService {
  /**
   * Add a file or image reference to the chat context
   */
  addToChat(details: AttachmentDetails): void {
    const { fileName, filePath } = details;
    
    console.log(`[ChatAttachmentService] Adding to chat: ${fileName} (${filePath.startsWith('data:') ? 'data-url' : filePath})`);
    
    // Dispatch custom event for PromptArea to handle
    const event = new CustomEvent('add-file-reference', {
      detail: { fileName, filePath }
    });
    window.dispatchEvent(event);
    
    // Attempt to focus the chat input
    this.focusChatInput();
  }

  /**
   * Helper to focus the main chat input textarea
   */
  private focusChatInput(): void {
    const textarea = document.querySelector('textarea.file-mention-input') as HTMLTextAreaElement;
    if (textarea) {
      textarea.focus();
    }
  }

  /**
   * Check if a file path is actually a data URL
   */
  isDataUrl(path: string): boolean {
    return path.startsWith('data:');
  }

  /**
   * Extract base64 data and mime type from a data URL
   */
  parseDataUrl(dataUrl: string): { base64: string; mimeType: string } | null {
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      return {
        mimeType: match[1],
        base64: match[2]
      };
    }
    return null;
  }

  /**
   * Process attached files - load their contents or convert images to base64
   */
  async processAttachedFiles(files: Array<{ fileName: string; filePath: string }>): Promise<ProcessedAttachments> {
    const fileContents: string[] = [];
    const attachedFileNames: string[] = [];
    const imageFiles: Array<{ fileName: string; base64: string; mimeType: string }> = [];
    
    for (const file of files) {
      if (this.isImageFile(file.fileName)) {
        try {
          // Check if it's already a data URL
          if (this.isDataUrl(file.filePath)) {
            const parsed = this.parseDataUrl(file.filePath);
            if (parsed) {
              console.log(`[ChatAttachmentService] Using data URL for image: ${file.fileName}`);
              imageFiles.push({
                fileName: file.fileName,
                base64: parsed.base64,
                mimeType: parsed.mimeType
              });
              attachedFileNames.push(file.fileName);
              continue;
            }
          }

          console.log(`[ChatAttachmentService] Loading image from path: ${file.fileName} (${file.filePath})`);
          
          // Try Tauri API first
          const tauriBytes = await this.readFileWithTauri(file.filePath);
          
          if (tauriBytes) {
            const base64 = this.uint8ArrayToBase64(tauriBytes);
            imageFiles.push({
              fileName: file.fileName,
              base64,
              mimeType: this.getMimeType(file.fileName)
            });
            attachedFileNames.push(file.fileName);
          } else {
            // Fallback to backend API
            const response = await fetch(`http://127.0.0.1:3001/api/v1/files/image?path=${encodeURIComponent(file.filePath)}`);
            if (response.ok) {
              const blob = await response.blob();
              const base64 = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                  const result = reader.result as string;
                  const base64Data = result.split(',')[1] || result;
                  resolve(base64Data);
                };
                reader.readAsDataURL(blob);
              });
              
              imageFiles.push({
                fileName: file.fileName,
                base64,
                mimeType: this.getMimeType(file.fileName)
              });
              attachedFileNames.push(file.fileName);
            }
          }
        } catch (error) {
          console.error(`[ChatAttachmentService] Error reading image ${file.filePath}:`, error);
          fileContents.push(`\n\n[Note: Error reading image ${file.fileName}: ${error instanceof Error ? error.message : 'Unknown error'}]`);
        }
      } else if (this.isBinaryFile(file.fileName)) {
        attachedFileNames.push(file.fileName);
        fileContents.push(`\n\n[Note: ${file.fileName} is a binary file and cannot be read as text]`);
      } else {
        // Handle text files
        try {
          const response = await fetch(`http://127.0.0.1:3001/api/v1/files/read?path=${encodeURIComponent(file.filePath)}`);
          if (response.ok) {
            const data = await response.json();
            const content = data.content || '';
            fileContents.push(`\n\n--- File: ${file.fileName} (${file.filePath}) ---\n${content}\n--- End of ${file.fileName} ---`);
            attachedFileNames.push(file.fileName);
          }
        } catch (error) {
          console.error(`[ChatAttachmentService] Error reading file ${file.filePath}:`, error);
          fileContents.push(`\n\n[Note: Error reading file ${file.fileName}: ${error instanceof Error ? error.message : 'Unknown error'}]`);
        }
      }
    }
    
    return { fileContents, attachedFileNames, imageFiles };
  }

  // Helpers
  private isImageFile(fileName: string): boolean {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext);
  }

  private getMimeType(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    const mimeTypes: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'bmp': 'image/bmp',
      'webp': 'image/webp'
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  private isBinaryFile(fileName: string): boolean {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    return ['pdf', 'zip', 'rar', '7z', 'tar', 'gz', 'exe', 'dll', 'so', 'dylib'].includes(ext);
  }

  private async readFileWithTauri(filePath: string): Promise<Uint8Array | null> {
    try {
      if (typeof window !== 'undefined' && (window as any).__TAURI__) {
        const { readFile } = await import(/* @vite-ignore */ '@tauri-apps/plugin-fs');
        return await readFile(filePath);
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  private uint8ArrayToBase64(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}

export const chatAttachmentService = new ChatAttachmentService();
