/**
 * Recent Files Service
 * 
 * Manages a unified list of recently interacted files from:
 * 1. Skhoot internal actions (searched, opened, edited, created)
 * 2. System-wide actions (downloads, recently moved/cloned)
 */

import { backendApi } from './backendApi';

export type FileActionType = 'SEARCHED' | 'OPENED' | 'EDITED' | 'CREATED' | 'DOWNLOADED' | 'MENTIONED';

export interface RecentFile {
  id: string;
  name: string;
  path: string;
  action: FileActionType;
  timestamp: number;
  size?: number;
  isDir: boolean;
  sourceLabel?: string;
}

const STORAGE_KEY = 'skhoot_recent_files_v2';
const MAX_RECENT_FILES = 50;

class RecentFilesService {
  private recentFiles: RecentFile[] = [];
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Log a file interaction within Skhoot
   */
  logAction(path: string, action: FileActionType, isDir: boolean = false): void {
    const name = path.split(/[/\\]/).pop() || path;
    
    // Ignore common temp/build noise
    if (this.shouldIgnore(name, path)) return;

    const newFile: RecentFile = {
      id: `${path}-${action}`,
      name,
      path,
      action,
      timestamp: Date.now(),
      isDir
    };

    this.addFile(newFile);
  }

  /**
   * Fetch system-recent files and merge with internal list
   */
  async getUnifiedRecents(): Promise<RecentFile[]> {
    try {
      // 1. Fetch from system backend
      const response = await fetch('http://localhost:3001/api/v1/recent/system?hours=24&limit=15');
      if (response.ok) {
        const systemFiles = await response.json();
        systemFiles.forEach((f: any) => {
          this.addFile({
            id: f.path,
            name: f.name,
            path: f.path,
            action: 'DOWNLOADED', // Default label for system-found files
            timestamp: f.modified * 1000,
            size: f.size,
            isDir: f.is_dir,
            sourceLabel: f.source
          }, false); // Add without triggering storage save for every item
        });
      }
    } catch (e) {
      console.warn('[RecentFilesService] System scan failed:', e);
    }

    this.saveToStorage();
    return [...this.recentFiles].sort((a, b) => b.timestamp - a.timestamp);
  }

  private addFile(file: RecentFile, triggerSave: boolean = true): void {
    // Deduplicate: remove existing entry for same path
    // We prioritize the most recent action
    this.recentFiles = this.recentFiles.filter(f => f.path !== file.path);
    
    this.recentFiles.unshift(file);
    
    if (this.recentFiles.length > MAX_RECENT_FILES) {
      this.recentFiles = this.recentFiles.slice(0, MAX_RECENT_FILES);
    }

    if (triggerSave) {
      this.saveToStorage();
      this.notify();
    }
  }

  private shouldIgnore(name: string, path: string): boolean {
    const lowerName = name.toLowerCase();
    const ignoreExts = ['.tmp', '.crdownload', '.part', '.log', '.lock', '.DS_Store'];
    const ignorePaths = ['node_modules', 'target', '.git', '.next', 'dist', 'build'];

    if (ignoreExts.some(ext => lowerName.endsWith(ext))) return true;
    if (ignorePaths.some(p => path.includes(p))) return true;
    if (name.startsWith('~')) return true; // Autosave files
    
    return false;
  }

  private loadFromStorage(): void {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        this.recentFiles = JSON.parse(data);
      }
    } catch (e) {
      console.error('[RecentFilesService] Load failed:', e);
    }
  }

  private saveToStorage(): void {
    try {
      // Only save Skhoot-internal actions to permanent storage
      // System-scanned files are re-fetched every time
      const internalOnly = this.recentFiles.filter(f => f.action !== 'DOWNLOADED');
      localStorage.setItem(STORAGE_KEY, JSON.stringify(internalOnly));
    } catch (e) {
      console.error('[RecentFilesService] Save failed:', e);
    }
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach(l => l());
  }
}

export const recentFilesService = new RecentFilesService();
