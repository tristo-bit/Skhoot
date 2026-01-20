// Content Extraction System
// Provides ChatGPT-style web browsing with content extraction capabilities

pub mod types;
pub mod ssrf_validator;
pub mod http_fetcher;
pub mod metadata_extractor;
pub mod content_extractor;
pub mod cache_manager;
pub mod system;
pub mod tauri_bridge;

#[cfg(test)]
mod integration_tests;

pub use types::{
    PageExtract, ContentExtractionError, ExtractionMethod,
    Metadata, SearchGatherResponse, WebSearchResult,
    RenderJob, RenderResult, RenderWait,
};
pub use ssrf_validator::SsrfValidator;
pub use http_fetcher::HttpFetcher;
pub use metadata_extractor::MetadataExtractor;
pub use content_extractor::MainContentExtractor;
pub use cache_manager::CacheManager;
pub use system::ContentExtractionSystem;
pub use tauri_bridge::TauriBridge;
