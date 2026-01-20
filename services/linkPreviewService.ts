/**
 * Link Preview Service
 * 
 * Fetches and caches metadata for hyperlink previews including:
 * - URL and domain information
 * - Page title
 * - Description/snippet
 * - Favicon
 * 
 * Uses in-memory caching to avoid repeated fetches.
 */

export interface PreviewData {
  url: string;
  title: string;
  description?: string;
  domain: string;
  favicon?: string;
}

class LinkPreviewService {
  private cache: Map<string, PreviewData> = new Map();

  /**
   * Fetch preview data for a URL
   * Returns cached data if available, otherwise generates basic preview
   * 
   * @param url - The URL to fetch preview data for
   * @returns Promise resolving to preview data
   */
  async fetchPreview(url: string): Promise<PreviewData> {
    // Check cache first
    if (this.cache.has(url)) {
      console.log('[LinkPreview] Cache hit for:', url);
      return this.cache.get(url)!;
    }

    try {
      console.log('[LinkPreview] Fetching preview for:', url);
      
      // Parse URL to extract domain
      const urlObj = new URL(url);
      const domain = urlObj.hostname.replace('www.', '');
      
      // Generate favicon URL using Google's favicon service
      const favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
      
      // For now, use basic metadata
      // Future enhancement: Could fetch Open Graph data via backend
      const preview: PreviewData = {
        url,
        title: this.generateTitleFromDomain(domain),
        domain,
        favicon,
        description: undefined, // Could be populated from Open Graph in future
      };
      
      // Cache the result
      this.cache.set(url, preview);
      console.log('[LinkPreview] Cached preview for:', url);
      
      return preview;
    } catch (error) {
      console.error('[LinkPreview] Failed to fetch preview:', error);
      throw new Error('Failed to fetch preview');
    }
  }

  /**
   * Clear all cached preview data
   */
  clearCache(): void {
    console.log('[LinkPreview] Clearing cache');
    this.cache.clear();
  }

  /**
   * Generate a readable title from a domain name
   * Example: "github.com" -> "GitHub"
   * 
   * @param domain - The domain name
   * @returns Formatted title
   */
  private generateTitleFromDomain(domain: string): string {
    // Remove TLD
    const parts = domain.split('.');
    const name = parts.length > 1 ? parts[0] : domain;
    
    // Capitalize first letter
    return name.charAt(0).toUpperCase() + name.slice(1);
  }
}

// Export singleton instance
export const linkPreviewService = new LinkPreviewService();
