/**
 * Image Storage Service
 * Manages images from user attachments and AI web searches
 * Stores in localStorage with metadata for the Images tab
 */

export interface StoredImage {
  id: string;
  url: string;
  thumbnailUrl?: string;
  fileName?: string;
  alt?: string;
  source: 'user' | 'web_search';
  timestamp: number;
  messageId?: string;
  searchQuery?: string;
  size?: number;
}

export interface ImageFilter {
  source?: 'user' | 'web_search' | 'all';
  searchQuery?: string;
  dateFrom?: number;
  dateTo?: number;
}

export type ImageSortOrder = 'recent' | 'oldest' | 'name' | 'source';

const STORAGE_KEY = 'skhoot_chat_images';
const MAX_IMAGES = 500; // Limit to prevent localStorage overflow

class ImageStorageService {
  private images: StoredImage[] = [];
  private initialized = false;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.images = JSON.parse(stored);
      }
      this.initialized = true;
    } catch (error) {
      console.error('[ImageStorage] Failed to load from storage:', error);
      this.images = [];
      this.initialized = true;
    }
  }

  private saveToStorage() {
    try {
      // Keep only the most recent MAX_IMAGES
      if (this.images.length > MAX_IMAGES) {
        this.images = this.images
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, MAX_IMAGES);
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.images));
    } catch (error) {
      console.error('[ImageStorage] Failed to save to storage:', error);
    }
  }

  /**
   * Add a single image
   */
  addImage(image: Omit<StoredImage, 'id' | 'timestamp'>): StoredImage {
    const newImage: StoredImage = {
      ...image,
      id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };

    this.images.unshift(newImage); // Add to beginning (most recent first)
    this.saveToStorage();
    return newImage;
  }

  /**
   * Add multiple images at once
   */
  addImages(images: Omit<StoredImage, 'id' | 'timestamp'>[]): StoredImage[] {
    const newImages = images.map(img => ({
      ...img,
      id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    }));

    this.images.unshift(...newImages);
    this.saveToStorage();
    return newImages;
  }

  /**
   * Get all images with optional filtering and sorting
   */
  getImages(filter?: ImageFilter, sortOrder: ImageSortOrder = 'recent'): StoredImage[] {
    let filtered = [...this.images];

    // Apply filters
    if (filter) {
      if (filter.source && filter.source !== 'all') {
        filtered = filtered.filter(img => img.source === filter.source);
      }

      if (filter.searchQuery) {
        const query = filter.searchQuery.toLowerCase();
        filtered = filtered.filter(img => 
          img.fileName?.toLowerCase().includes(query) ||
          img.alt?.toLowerCase().includes(query) ||
          img.searchQuery?.toLowerCase().includes(query)
        );
      }

      if (filter.dateFrom) {
        filtered = filtered.filter(img => img.timestamp >= filter.dateFrom!);
      }

      if (filter.dateTo) {
        filtered = filtered.filter(img => img.timestamp <= filter.dateTo!);
      }
    }

    // Apply sorting
    switch (sortOrder) {
      case 'recent':
        filtered.sort((a, b) => b.timestamp - a.timestamp);
        break;
      case 'oldest':
        filtered.sort((a, b) => a.timestamp - b.timestamp);
        break;
      case 'name':
        filtered.sort((a, b) => {
          const nameA = a.fileName || a.alt || '';
          const nameB = b.fileName || b.alt || '';
          return nameA.localeCompare(nameB);
        });
        break;
      case 'source':
        filtered.sort((a, b) => {
          if (a.source === b.source) {
            return b.timestamp - a.timestamp;
          }
          return a.source.localeCompare(b.source);
        });
        break;
    }

    return filtered;
  }

  /**
   * Get a single image by ID
   */
  getImage(id: string): StoredImage | undefined {
    return this.images.find(img => img.id === id);
  }

  /**
   * Delete an image
   */
  deleteImage(id: string): boolean {
    const index = this.images.findIndex(img => img.id === id);
    if (index !== -1) {
      this.images.splice(index, 1);
      this.saveToStorage();
      return true;
    }
    return false;
  }

  /**
   * Delete multiple images
   */
  deleteImages(ids: string[]): number {
    const idsSet = new Set(ids);
    const initialLength = this.images.length;
    this.images = this.images.filter(img => !idsSet.has(img.id));
    const deletedCount = initialLength - this.images.length;
    
    if (deletedCount > 0) {
      this.saveToStorage();
    }
    
    return deletedCount;
  }

  /**
   * Clear all images
   */
  clearAll(): void {
    this.images = [];
    this.saveToStorage();
  }

  /**
   * Get statistics
   */
  getStats(): {
    total: number;
    userImages: number;
    webSearchImages: number;
    totalSize: number;
  } {
    const userImages = this.images.filter(img => img.source === 'user').length;
    const webSearchImages = this.images.filter(img => img.source === 'web_search').length;
    const totalSize = this.images.reduce((sum, img) => sum + (img.size || 0), 0);

    return {
      total: this.images.length,
      userImages,
      webSearchImages,
      totalSize,
    };
  }
}

// Export singleton instance
export const imageStorage = new ImageStorageService();
