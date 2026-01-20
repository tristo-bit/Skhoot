// Metadata Extractor
// Extracts structured metadata from HTML using multiple sources

use scraper::{Html, Selector};
use serde_json::Value as JsonValue;

use crate::content_extraction::Metadata;

/// Partial metadata from a single source
#[derive(Debug, Default)]
struct PartialMetadata {
    title: Option<String>,
    description: Option<String>,
    author: Option<String>,
    published_date: Option<String>,
    canonical_url: Option<String>,
    primary_image: Option<String>,
    images: Vec<String>,
}

/// Metadata Extractor
/// 
/// Extracts structured metadata from HTML using multiple sources:
/// 1. Open Graph tags (highest priority)
/// 2. JSON-LD structured data
/// 3. Standard meta tags (lowest priority)
pub struct MetadataExtractor;

impl MetadataExtractor {
    /// Extracts all available metadata from HTML
    /// 
    /// This method combines metadata from multiple sources with priority:
    /// Open Graph > JSON-LD > meta tags
    pub fn extract(html: &str) -> Metadata {
        let document = Html::parse_document(html);

        // Extract from all sources
        let og_metadata = Self::extract_open_graph(&document);
        let jsonld_metadata = Self::extract_jsonld(&document);
        let meta_metadata = Self::extract_meta_tags(&document);

        // Merge with priority
        Self::merge_with_priority(vec![og_metadata, jsonld_metadata, meta_metadata])
    }

    /// Extracts metadata from Open Graph tags
    /// 
    /// Open Graph tags are the highest priority source for metadata.
    fn extract_open_graph(document: &Html) -> PartialMetadata {
        let mut metadata = PartialMetadata::default();

        // Helper to get meta property content
        let get_property = |property: &str| -> Option<String> {
            let selector = Selector::parse(&format!("meta[property='{}']", property)).ok()?;
            document
                .select(&selector)
                .next()
                .and_then(|el| el.value().attr("content"))
                .map(|s| s.to_string())
        };

        metadata.title = get_property("og:title");
        metadata.description = get_property("og:description");
        metadata.primary_image = get_property("og:image");
        metadata.canonical_url = get_property("og:url");

        // Article-specific tags
        if let Some(date) = get_property("article:published_time") {
            metadata.published_date = Some(date);
        }
        if let Some(author) = get_property("article:author") {
            metadata.author = Some(author);
        }

        // Collect all og:image tags
        if let Ok(selector) = Selector::parse("meta[property='og:image']") {
            for element in document.select(&selector) {
                if let Some(content) = element.value().attr("content") {
                    if !metadata.images.contains(&content.to_string()) {
                        metadata.images.push(content.to_string());
                    }
                }
            }
        }

        metadata
    }

    /// Extracts metadata from JSON-LD structured data
    /// 
    /// JSON-LD is the second-highest priority source for metadata.
    fn extract_jsonld(document: &Html) -> PartialMetadata {
        let mut metadata = PartialMetadata::default();

        // Find all JSON-LD script tags
        let selector = match Selector::parse("script[type='application/ld+json']") {
            Ok(s) => s,
            Err(_) => return metadata,
        };

        for script_element in document.select(&selector) {
            let json_text = script_element.inner_html();
            
            // Parse JSON
            let json: JsonValue = match serde_json::from_str(&json_text) {
                Ok(j) => j,
                Err(_) => continue,
            };

            // Extract metadata from JSON-LD
            Self::extract_from_jsonld_value(&json, &mut metadata);
        }

        metadata
    }

    /// Recursively extracts metadata from JSON-LD value
    /// 
    /// Handles arrays, @graph structures, and nested objects.
    fn extract_from_jsonld_value(json: &JsonValue, metadata: &mut PartialMetadata) {
        match json {
            JsonValue::Object(obj) => {
                // Handle @graph array
                if let Some(JsonValue::Array(graph)) = obj.get("@graph") {
                    for item in graph {
                        Self::extract_from_jsonld_value(item, metadata);
                    }
                    return;
                }

                // Extract fields
                if let Some(JsonValue::String(date)) = obj.get("datePublished") {
                    if metadata.published_date.is_none() {
                        metadata.published_date = Some(date.clone());
                    }
                }

                if let Some(JsonValue::String(headline)) = obj.get("headline") {
                    if metadata.title.is_none() {
                        metadata.title = Some(headline.clone());
                    }
                }

                if let Some(JsonValue::String(name)) = obj.get("name") {
                    if metadata.title.is_none() {
                        metadata.title = Some(name.clone());
                    }
                }

                // Author can be string or object
                if let Some(author_value) = obj.get("author") {
                    if metadata.author.is_none() {
                        match author_value {
                            JsonValue::String(s) => {
                                metadata.author = Some(s.clone());
                            }
                            JsonValue::Object(author_obj) => {
                                if let Some(JsonValue::String(name)) = author_obj.get("name") {
                                    metadata.author = Some(name.clone());
                                }
                            }
                            JsonValue::Array(authors) => {
                                // Take first author
                                if let Some(first_author) = authors.first() {
                                    if let JsonValue::String(s) = first_author {
                                        metadata.author = Some(s.clone());
                                    } else if let JsonValue::Object(author_obj) = first_author {
                                        if let Some(JsonValue::String(name)) = author_obj.get("name") {
                                            metadata.author = Some(name.clone());
                                        }
                                    }
                                }
                            }
                            _ => {}
                        }
                    }
                }

                // Image can be string, object, or array
                if let Some(image_value) = obj.get("image") {
                    match image_value {
                        JsonValue::String(s) => {
                            if metadata.primary_image.is_none() {
                                metadata.primary_image = Some(s.clone());
                            }
                            if !metadata.images.contains(s) {
                                metadata.images.push(s.clone());
                            }
                        }
                        JsonValue::Object(img_obj) => {
                            if let Some(JsonValue::String(url)) = img_obj.get("url") {
                                if metadata.primary_image.is_none() {
                                    metadata.primary_image = Some(url.clone());
                                }
                                if !metadata.images.contains(url) {
                                    metadata.images.push(url.clone());
                                }
                            }
                        }
                        JsonValue::Array(images) => {
                            for img in images {
                                if let JsonValue::String(url) = img {
                                    if metadata.primary_image.is_none() {
                                        metadata.primary_image = Some(url.clone());
                                    }
                                    if !metadata.images.contains(url) {
                                        metadata.images.push(url.clone());
                                    }
                                }
                            }
                        }
                        _ => {}
                    }
                }
            }
            JsonValue::Array(arr) => {
                // Process each item in array
                for item in arr {
                    Self::extract_from_jsonld_value(item, metadata);
                }
            }
            _ => {}
        }
    }

    /// Extracts metadata from standard meta tags
    /// 
    /// Standard meta tags are the lowest priority source for metadata.
    fn extract_meta_tags(document: &Html) -> PartialMetadata {
        let mut metadata = PartialMetadata::default();

        // Helper to get meta name content
        let get_meta = |name: &str| -> Option<String> {
            let selector = Selector::parse(&format!("meta[name='{}']", name)).ok()?;
            document
                .select(&selector)
                .next()
                .and_then(|el| el.value().attr("content"))
                .map(|s| s.to_string())
        };

        // Extract title from <title> tag
        if let Ok(selector) = Selector::parse("title") {
            if let Some(title_element) = document.select(&selector).next() {
                metadata.title = Some(title_element.inner_html());
            }
        }

        // Extract from meta tags
        metadata.description = get_meta("description");
        metadata.author = get_meta("author");
        
        // Try various date meta tags
        if metadata.published_date.is_none() {
            metadata.published_date = get_meta("date")
                .or_else(|| get_meta("publish_date"))
                .or_else(|| get_meta("publication_date"));
        }

        // Extract canonical URL
        if let Ok(selector) = Selector::parse("link[rel='canonical']") {
            if let Some(link_element) = document.select(&selector).next() {
                metadata.canonical_url = link_element
                    .value()
                    .attr("href")
                    .map(|s| s.to_string());
            }
        }

        metadata
    }

    /// Merges metadata from multiple sources with priority
    /// 
    /// Priority order: first source > second source > third source
    /// (typically: Open Graph > JSON-LD > meta tags)
    fn merge_with_priority(sources: Vec<PartialMetadata>) -> Metadata {
        let mut result = Metadata::default();

        // Merge in reverse order so higher priority sources overwrite
        for source in sources.iter().rev() {
            if let Some(ref title) = source.title {
                result.title = Some(title.clone());
            }
            if let Some(ref description) = source.description {
                result.description = Some(description.clone());
            }
            if let Some(ref author) = source.author {
                result.author = Some(author.clone());
            }
            if let Some(ref date) = source.published_date {
                result.published_date = Some(date.clone());
            }
            if let Some(ref url) = source.canonical_url {
                result.canonical_url = Some(url.clone());
            }
            if let Some(ref image) = source.primary_image {
                result.primary_image = Some(image.clone());
            }

            // Merge images (deduplicate)
            for image in &source.images {
                if !result.images.contains(image) {
                    result.images.push(image.clone());
                }
            }
        }

        result
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_open_graph() {
        let html = r#"
            <html>
                <head>
                    <meta property="og:title" content="Test Title">
                    <meta property="og:description" content="Test Description">
                    <meta property="og:image" content="https://example.com/image.jpg">
                    <meta property="og:url" content="https://example.com/article">
                    <meta property="article:published_time" content="2024-01-01">
                    <meta property="article:author" content="John Doe">
                </head>
            </html>
        "#;

        let metadata = MetadataExtractor::extract(html);

        assert_eq!(metadata.title, Some("Test Title".to_string()));
        assert_eq!(metadata.description, Some("Test Description".to_string()));
        assert_eq!(metadata.primary_image, Some("https://example.com/image.jpg".to_string()));
        assert_eq!(metadata.canonical_url, Some("https://example.com/article".to_string()));
        assert_eq!(metadata.published_date, Some("2024-01-01".to_string()));
        assert_eq!(metadata.author, Some("John Doe".to_string()));
    }

    #[test]
    fn test_extract_jsonld() {
        let html = r#"
            <html>
                <head>
                    <script type="application/ld+json">
                    {
                        "@type": "Article",
                        "headline": "JSON-LD Title",
                        "datePublished": "2024-01-01",
                        "author": {
                            "name": "Jane Smith"
                        },
                        "image": "https://example.com/jsonld-image.jpg"
                    }
                    </script>
                </head>
            </html>
        "#;

        let metadata = MetadataExtractor::extract(html);

        assert_eq!(metadata.title, Some("JSON-LD Title".to_string()));
        assert_eq!(metadata.published_date, Some("2024-01-01".to_string()));
        assert_eq!(metadata.author, Some("Jane Smith".to_string()));
        assert_eq!(metadata.primary_image, Some("https://example.com/jsonld-image.jpg".to_string()));
    }

    #[test]
    fn test_extract_meta_tags() {
        let html = r#"
            <html>
                <head>
                    <title>Meta Title</title>
                    <meta name="description" content="Meta Description">
                    <meta name="author" content="Meta Author">
                    <meta name="date" content="2024-01-01">
                    <link rel="canonical" href="https://example.com/canonical">
                </head>
            </html>
        "#;

        let metadata = MetadataExtractor::extract(html);

        assert_eq!(metadata.title, Some("Meta Title".to_string()));
        assert_eq!(metadata.description, Some("Meta Description".to_string()));
        assert_eq!(metadata.author, Some("Meta Author".to_string()));
        assert_eq!(metadata.published_date, Some("2024-01-01".to_string()));
        assert_eq!(metadata.canonical_url, Some("https://example.com/canonical".to_string()));
    }

    #[test]
    fn test_priority_open_graph_over_meta() {
        let html = r#"
            <html>
                <head>
                    <title>Meta Title</title>
                    <meta property="og:title" content="OG Title">
                    <meta name="description" content="Meta Description">
                    <meta property="og:description" content="OG Description">
                </head>
            </html>
        "#;

        let metadata = MetadataExtractor::extract(html);

        // Open Graph should take priority
        assert_eq!(metadata.title, Some("OG Title".to_string()));
        assert_eq!(metadata.description, Some("OG Description".to_string()));
    }

    #[test]
    fn test_jsonld_with_graph() {
        let html = r#"
            <html>
                <head>
                    <script type="application/ld+json">
                    {
                        "@graph": [
                            {
                                "@type": "Article",
                                "headline": "Graph Title",
                                "author": "Graph Author"
                            }
                        ]
                    }
                    </script>
                </head>
            </html>
        "#;

        let metadata = MetadataExtractor::extract(html);

        assert_eq!(metadata.title, Some("Graph Title".to_string()));
        assert_eq!(metadata.author, Some("Graph Author".to_string()));
    }

    #[test]
    fn test_empty_html() {
        let html = "<html><head></head><body></body></html>";
        let metadata = MetadataExtractor::extract(html);

        assert!(metadata.title.is_none());
        assert!(metadata.description.is_none());
        assert!(metadata.author.is_none());
    }
}
