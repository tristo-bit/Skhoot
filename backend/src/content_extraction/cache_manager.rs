// Cache Manager
// Caches extracted content to improve performance and reduce external requests

use std::collections::HashMap;
use std::time::{Duration, Instant};
use sha2::{Sha256, Digest};

use crate::content_extraction::PageExtract;

/// Cache entry with metadata
#[derive(Debug, Clone)]
struct CacheEntry {
    extract: PageExtract,
    cached_at: Instant,
    size_bytes: usize,
}

/// Cache Manager
/// 
/// Manages in-memory cache of extracted page content with:
/// - TTL-based expiration (60 minutes default)
/// - Size-based eviction (100MB max)
/// - LRU eviction when size limit exceeded
/// - URL hashing for cache keys
pub struct CacheManager {
    cache: HashMap<String, CacheEntry>,
    max_size_bytes: usize,
    ttl: Duration,
    current_size_bytes: usize,
}

impl CacheManager {
    /// Creates a new CacheManager with default settings
    /// 
    /// Defaults:
    /// - max_size_bytes: 100MB
    /// - ttl: 60 minutes
    pub fn new() -> Self {
        Self {
            cache: HashMap::new(),
            max_size_bytes: 100 * 1024 * 1024, // 100MB
            ttl: Duration::from_secs(60 * 60), // 60 minutes
            current_size_bytes: 0,
        }
    }

    /// Creates a CacheManager with custom settings
    pub fn with_settings(max_size_bytes: usize, ttl: Duration) -> Self {
        Self {
            cache: HashMap::new(),
            max_size_bytes,
            ttl,
            current_size_bytes: 0,
        }
    }

    /// Gets cached PageExtract if valid
    /// 
    /// Returns None if:
    /// - URL not in cache
    /// - Cache entry expired
    pub fn get(&mut self, url: &str) -> Option<PageExtract> {
        // Evict expired entries first
        self.evict_expired();

        let key = Self::hash_url(url);
        
        if let Some(entry) = self.cache.get(&key) {
            // Check if expired
            if entry.cached_at.elapsed() < self.ttl {
                return Some(entry.extract.clone());
            } else {
                // Remove expired entry
                self.cache.remove(&key);
                self.recalculate_size();
            }
        }

        None
    }

    /// Stores PageExtract in cache
    /// 
    /// This method:
    /// 1. Calculates entry size
    /// 2. Evicts LRU entries if needed to make space
    /// 3. Stores the entry
    pub fn put(&mut self, url: &str, extract: PageExtract) {
        let key = Self::hash_url(url);
        let size_bytes = Self::estimate_size(&extract);

        // Check if adding this entry would exceed max size
        if size_bytes > self.max_size_bytes {
            // Entry too large to cache
            return;
        }

        // Evict expired entries first
        self.evict_expired();

        // Evict LRU entries if needed
        while self.current_size_bytes + size_bytes > self.max_size_bytes && !self.cache.is_empty() {
            self.evict_lru();
        }

        // Store entry
        let entry = CacheEntry {
            extract,
            cached_at: Instant::now(),
            size_bytes,
        };

        // Remove old entry if exists
        if let Some(old_entry) = self.cache.remove(&key) {
            self.current_size_bytes = self.current_size_bytes.saturating_sub(old_entry.size_bytes);
        }

        self.current_size_bytes += size_bytes;
        self.cache.insert(key, entry);
    }

    /// Evicts expired entries
    fn evict_expired(&mut self) {
        let now = Instant::now();
        let ttl = self.ttl;

        self.cache.retain(|_, entry| {
            let is_valid = entry.cached_at.elapsed() < ttl;
            if !is_valid {
                self.current_size_bytes = self.current_size_bytes.saturating_sub(entry.size_bytes);
            }
            is_valid
        });
    }

    /// Evicts oldest entry (LRU)
    fn evict_lru(&mut self) {
        if self.cache.is_empty() {
            return;
        }

        // Find oldest entry
        let oldest_key = self
            .cache
            .iter()
            .min_by_key(|(_, entry)| entry.cached_at)
            .map(|(key, _)| key.clone());

        if let Some(key) = oldest_key {
            if let Some(entry) = self.cache.remove(&key) {
                self.current_size_bytes = self.current_size_bytes.saturating_sub(entry.size_bytes);
            }
        }
    }

    /// Recalculates total cache size
    fn recalculate_size(&mut self) {
        self.current_size_bytes = self.cache.values().map(|e| e.size_bytes).sum();
    }

    /// Calculates URL hash for cache key
    fn hash_url(url: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(url.as_bytes());
        format!("{:x}", hasher.finalize())
    }

    /// Estimates size of PageExtract in bytes
    fn estimate_size(extract: &PageExtract) -> usize {
        let mut size = 0;

        // Text content
        size += extract.text.len();

        // Metadata strings
        size += extract.final_url.len();
        size += extract.title.as_ref().map(|s| s.len()).unwrap_or(0);
        size += extract.description.as_ref().map(|s| s.len()).unwrap_or(0);
        size += extract.author.as_ref().map(|s| s.len()).unwrap_or(0);
        size += extract.published_date.as_ref().map(|s| s.len()).unwrap_or(0);
        size += extract.canonical_url.as_ref().map(|s| s.len()).unwrap_or(0);
        size += extract.primary_image.as_ref().map(|s| s.len()).unwrap_or(0);
        size += extract.content_type.as_ref().map(|s| s.len()).unwrap_or(0);

        // Images and links
        size += extract.images.iter().map(|s| s.len()).sum::<usize>();
        size += extract.links.iter().map(|s| s.len()).sum::<usize>();

        // Add overhead for struct fields
        size += 128;

        size
    }

    /// Returns current cache statistics
    pub fn stats(&self) -> CacheStats {
        CacheStats {
            entries: self.cache.len(),
            size_bytes: self.current_size_bytes,
            max_size_bytes: self.max_size_bytes,
        }
    }

    /// Clears all cache entries
    pub fn clear(&mut self) {
        self.cache.clear();
        self.current_size_bytes = 0;
    }
}

impl Default for CacheManager {
    fn default() -> Self {
        Self::new()
    }
}

/// Cache statistics
#[derive(Debug, Clone)]
pub struct CacheStats {
    pub entries: usize,
    pub size_bytes: usize,
    pub max_size_bytes: usize,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::content_extraction::ExtractionMethod;

    fn create_test_extract(text: &str, url: &str) -> PageExtract {
        PageExtract {
            text: text.to_string(),
            word_count: text.split_whitespace().count(),
            final_url: url.to_string(),
            title: Some("Test Title".to_string()),
            description: None,
            author: None,
            published_date: None,
            canonical_url: None,
            primary_image: None,
            images: Vec::new(),
            links: Vec::new(),
            confidence: 0.9,
            extraction_method: ExtractionMethod::DensityHeuristic,
            fetch_time_ms: 100,
            extraction_time_ms: 50,
            total_time_ms: 150,
            status: 200,
            content_type: Some("text/html".to_string()),
        }
    }

    #[test]
    fn test_cache_manager_creation() {
        let cache = CacheManager::new();
        assert_eq!(cache.max_size_bytes, 100 * 1024 * 1024);
        assert_eq!(cache.ttl, Duration::from_secs(60 * 60));
        assert_eq!(cache.current_size_bytes, 0);
    }

    #[test]
    fn test_cache_put_and_get() {
        let mut cache = CacheManager::new();
        let extract = create_test_extract("Test content", "https://example.com");

        cache.put("https://example.com", extract.clone());

        let retrieved = cache.get("https://example.com");
        assert!(retrieved.is_some());
        assert_eq!(retrieved.unwrap().text, "Test content");
    }

    #[test]
    fn test_cache_miss() {
        let mut cache = CacheManager::new();
        let retrieved = cache.get("https://example.com");
        assert!(retrieved.is_none());
    }

    #[test]
    fn test_cache_expiration() {
        let mut cache = CacheManager::with_settings(
            100 * 1024 * 1024,
            Duration::from_millis(100), // 100ms TTL
        );

        let extract = create_test_extract("Test content", "https://example.com");
        cache.put("https://example.com", extract);

        // Should be in cache immediately
        assert!(cache.get("https://example.com").is_some());

        // Wait for expiration
        std::thread::sleep(Duration::from_millis(150));

        // Should be expired now
        assert!(cache.get("https://example.com").is_none());
    }

    #[test]
    fn test_cache_lru_eviction() {
        // Create cache with very small size limit
        let mut cache = CacheManager::with_settings(
            1000, // 1KB
            Duration::from_secs(60),
        );

        // Add multiple entries
        for i in 0..10 {
            let url = format!("https://example.com/{}", i);
            let text = "x".repeat(200); // ~200 bytes each
            let extract = create_test_extract(&text, &url);
            cache.put(&url, extract);
        }

        // Cache should have evicted older entries
        let stats = cache.stats();
        assert!(stats.size_bytes <= 1000);
        assert!(stats.entries < 10);
    }

    #[test]
    fn test_cache_url_hashing() {
        let hash1 = CacheManager::hash_url("https://example.com");
        let hash2 = CacheManager::hash_url("https://example.com");
        let hash3 = CacheManager::hash_url("https://different.com");

        assert_eq!(hash1, hash2);
        assert_ne!(hash1, hash3);
        assert_eq!(hash1.len(), 64); // SHA-256 produces 64 hex chars
    }

    #[test]
    fn test_cache_stats() {
        let mut cache = CacheManager::new();
        let extract = create_test_extract("Test content", "https://example.com");

        cache.put("https://example.com", extract);

        let stats = cache.stats();
        assert_eq!(stats.entries, 1);
        assert!(stats.size_bytes > 0);
        assert_eq!(stats.max_size_bytes, 100 * 1024 * 1024);
    }

    #[test]
    fn test_cache_clear() {
        let mut cache = CacheManager::new();
        let extract = create_test_extract("Test content", "https://example.com");

        cache.put("https://example.com", extract);
        assert_eq!(cache.stats().entries, 1);

        cache.clear();
        assert_eq!(cache.stats().entries, 0);
        assert_eq!(cache.stats().size_bytes, 0);
    }

    #[test]
    fn test_cache_update_existing() {
        let mut cache = CacheManager::new();
        let extract1 = create_test_extract("First content", "https://example.com");
        let extract2 = create_test_extract("Second content", "https://example.com");

        cache.put("https://example.com", extract1);
        cache.put("https://example.com", extract2);

        let retrieved = cache.get("https://example.com");
        assert!(retrieved.is_some());
        assert_eq!(retrieved.unwrap().text, "Second content");
        assert_eq!(cache.stats().entries, 1);
    }
}
