// Main Content Extractor
// Extracts article text while removing boilerplate using readability-style heuristics

use scraper::{Html, Selector, ElementRef};
use std::collections::HashMap;
use std::time::Instant;

use crate::content_extraction::ExtractionMethod;

/// Result from content extraction
#[derive(Debug, Clone)]
pub struct ContentExtraction {
    /// Extracted main article text
    pub text: String,
    
    /// Word count of extracted text
    pub word_count: usize,
    
    /// Confidence score (0.0-1.0)
    pub confidence: f32,
    
    /// Method used for extraction
    pub method: ExtractionMethod,
    
    /// Time taken to extract (milliseconds)
    pub extraction_time_ms: u64,
}

/// Main Content Extractor
/// 
/// Extracts article text while removing boilerplate using:
/// - Boilerplate element removal (script, style, nav, etc.)
/// - Paragraph density heuristics
/// - Structured text extraction with paragraph preservation
/// - Confidence scoring based on word count and text/HTML ratio
pub struct MainContentExtractor;

impl MainContentExtractor {
    /// Extracts main content with confidence scoring
    pub fn extract(html: &str) -> ContentExtraction {
        let start_time = Instant::now();
        
        let document = Html::parse_document(html);
        
        // Remove boilerplate and get content elements
        let content_elements = Self::remove_boilerplate(&document);
        
        // Calculate paragraph density for containers
        let densities = Self::calculate_density(&content_elements, &document);
        
        // Select primary content container
        let primary_container = Self::select_primary_container(densities, &document);
        
        // Extract structured text
        let text = if let Some(container) = primary_container {
            Self::extract_structured_text(container)
        } else {
            // Fallback: extract from all content elements
            Self::extract_from_elements(&content_elements)
        };
        
        let word_count = text.split_whitespace().count();
        let html_size = html.len();
        let confidence = Self::calculate_confidence(word_count, text.len(), html_size);
        
        let extraction_time_ms = start_time.elapsed().as_millis() as u64;
        
        ContentExtraction {
            text,
            word_count,
            confidence,
            method: ExtractionMethod::DensityHeuristic,
            extraction_time_ms,
        }
    }

    /// Removes boilerplate elements and returns content elements
    fn remove_boilerplate(document: &Html) -> Vec<String> {
        let mut content_elements = Vec::new();
        
        // Selectors for content elements
        let content_selectors = vec!["p", "h1", "h2", "h3", "li"];
        
        for selector_str in content_selectors {
            if let Ok(selector) = Selector::parse(selector_str) {
                for element in document.select(&selector) {
                    // Check if element is inside boilerplate
                    if Self::is_in_boilerplate(&element) {
                        continue;
                    }
                    
                    let text = element.text().collect::<Vec<_>>().join(" ");
                    let text = text.trim();
                    
                    if !text.is_empty() {
                        content_elements.push(text.to_string());
                    }
                }
            }
        }
        
        content_elements
    }

    /// Checks if an element is inside boilerplate
    fn is_in_boilerplate(element: &ElementRef) -> bool {
        let boilerplate_tags = vec!["script", "style", "nav", "footer", "header", "aside", "form", "svg"];
        
        // Check ancestors
        let mut current = Some(*element);
        while let Some(elem) = current {
            let tag_name = elem.value().name();
            if boilerplate_tags.contains(&tag_name) {
                return true;
            }
            current = elem.parent().and_then(|p| ElementRef::wrap(p));
        }
        
        false
    }

    /// Calculates paragraph density for each container element
    fn calculate_density(content_elements: &[String], document: &Html) -> HashMap<String, f32> {
        let mut densities = HashMap::new();
        
        // Find all potential container elements
        let container_selectors = vec!["article", "main", "div", "section"];
        
        for selector_str in container_selectors {
            if let Ok(selector) = Selector::parse(selector_str) {
                for (idx, element) in document.select(&selector).enumerate() {
                    if Self::is_in_boilerplate(&element) {
                        continue;
                    }
                    
                    // Count words in this container
                    let text = element.text().collect::<Vec<_>>().join(" ");
                    let word_count = text.split_whitespace().count();
                    
                    // Calculate density (words per character)
                    let char_count = text.len().max(1);
                    let density = word_count as f32 / char_count as f32;
                    
                    // Use a unique key for this container
                    let key = format!("{}_{}", selector_str, idx);
                    densities.insert(key, density * word_count as f32);
                }
            }
        }
        
        densities
    }

    /// Selects the primary content container based on density
    fn select_primary_container(
        densities: HashMap<String, f32>,
        document: &Html,
    ) -> Option<ElementRef> {
        if densities.is_empty() {
            return None;
        }
        
        // Find container with highest density score
        let best_key = densities
            .iter()
            .max_by(|a, b| a.1.partial_cmp(b.1).unwrap_or(std::cmp::Ordering::Equal))
            .map(|(k, _)| k)?;
        
        // Parse the key to get selector and index
        let parts: Vec<&str> = best_key.split('_').collect();
        if parts.len() < 2 {
            return None;
        }
        
        let selector_str = parts[0];
        let idx: usize = parts[1].parse().ok()?;
        
        // Get the element
        if let Ok(selector) = Selector::parse(selector_str) {
            document.select(&selector).nth(idx)
        } else {
            None
        }
    }

    /// Extracts structured text from a container element
    fn extract_structured_text(container: ElementRef) -> String {
        let mut paragraphs = Vec::new();
        
        // Extract paragraphs and headings
        let content_selectors = vec!["p", "h1", "h2", "h3", "li"];
        
        for selector_str in content_selectors {
            if let Ok(selector) = Selector::parse(selector_str) {
                for element in container.select(&selector) {
                    let text = element.text().collect::<Vec<_>>().join(" ");
                    let text = Self::normalize_whitespace(&text);
                    
                    if !text.is_empty() && text.split_whitespace().count() > 3 {
                        paragraphs.push(text);
                    }
                }
            }
        }
        
        // Join with double newlines to preserve paragraph structure
        paragraphs.join("\n\n")
    }

    /// Extracts text from a list of content elements
    fn extract_from_elements(elements: &[String]) -> String {
        elements
            .iter()
            .filter(|e| e.split_whitespace().count() > 3)
            .map(|e| Self::normalize_whitespace(e))
            .collect::<Vec<_>>()
            .join("\n\n")
    }

    /// Normalizes whitespace in text
    fn normalize_whitespace(text: &str) -> String {
        text.split_whitespace()
            .collect::<Vec<_>>()
            .join(" ")
            .trim()
            .to_string()
    }

    /// Calculates confidence score based on word count and text/HTML ratio
    fn calculate_confidence(word_count: usize, text_size: usize, html_size: usize) -> f32 {
        // Base score from word count
        let word_score = if word_count > 800 {
            0.9
        } else if word_count >= 300 {
            0.7 + (word_count - 300) as f32 / 500.0 * 0.2
        } else if word_count >= 120 {
            0.5 + (word_count - 120) as f32 / 180.0 * 0.2
        } else {
            (word_count as f32 / 120.0) * 0.5
        };
        
        // Adjust based on text/HTML ratio
        let ratio = text_size as f32 / html_size.max(1) as f32;
        let ratio_adjustment = if ratio > 0.3 {
            0.1
        } else if ratio < 0.1 {
            -0.1
        } else {
            0.0
        };
        
        (word_score + ratio_adjustment).clamp(0.0, 1.0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_simple_article() {
        let html = r#"
            <html>
                <body>
                    <article>
                        <h1>Test Article</h1>
                        <p>This is the first paragraph with some content.</p>
                        <p>This is the second paragraph with more content.</p>
                        <p>This is the third paragraph with even more content.</p>
                    </article>
                </body>
            </html>
        "#;

        let extraction = MainContentExtractor::extract(html);
        
        assert!(extraction.text.contains("Test Article"));
        assert!(extraction.text.contains("first paragraph"));
        assert!(extraction.text.contains("second paragraph"));
        assert!(extraction.word_count > 0);
    }

    #[test]
    fn test_remove_boilerplate() {
        let html = r#"
            <html>
                <head>
                    <script>console.log('test');</script>
                    <style>body { color: red; }</style>
                </head>
                <body>
                    <nav><p>Navigation item</p></nav>
                    <article>
                        <p>This is the main content that should be extracted.</p>
                    </article>
                    <footer><p>Footer content</p></footer>
                </body>
            </html>
        "#;

        let extraction = MainContentExtractor::extract(html);
        
        assert!(extraction.text.contains("main content"));
        assert!(!extraction.text.contains("Navigation"));
        assert!(!extraction.text.contains("Footer"));
        assert!(!extraction.text.contains("console.log"));
    }

    #[test]
    fn test_confidence_scoring_high() {
        let html = format!(
            "<html><body><article>{}</article></body></html>",
            "<p>Word ".repeat(900) + "</p>"
        );

        let extraction = MainContentExtractor::extract(&html);
        
        assert!(extraction.word_count > 800);
        assert!(extraction.confidence >= 0.9, "Confidence was {}", extraction.confidence);
    }

    #[test]
    fn test_confidence_scoring_medium() {
        let html = format!(
            "<html><body><article>{}</article></body></html>",
            "<p>Word ".repeat(400) + "</p>"
        );

        let extraction = MainContentExtractor::extract(&html);
        
        assert!(extraction.word_count >= 300 && extraction.word_count <= 800);
        assert!(extraction.confidence >= 0.7 && extraction.confidence < 0.9);
    }

    #[test]
    fn test_confidence_scoring_low() {
        let html = r#"
            <html>
                <body>
                    <article>
                        <p>Short content.</p>
                    </article>
                </body>
            </html>
        "#;

        let extraction = MainContentExtractor::extract(html);
        
        assert!(extraction.word_count < 120);
        assert!(extraction.confidence < 0.5);
    }

    #[test]
    fn test_paragraph_structure_preservation() {
        let html = r#"
            <html>
                <body>
                    <article>
                        <p>First paragraph here.</p>
                        <p>Second paragraph here.</p>
                        <p>Third paragraph here.</p>
                    </article>
                </body>
            </html>
        "#;

        let extraction = MainContentExtractor::extract(html);
        
        // Should have double newlines between paragraphs
        assert!(extraction.text.contains("\n\n"));
    }

    #[test]
    fn test_empty_html() {
        let html = "<html><body></body></html>";
        let extraction = MainContentExtractor::extract(html);
        
        assert_eq!(extraction.word_count, 0);
        assert_eq!(extraction.confidence, 0.0);
    }

    #[test]
    fn test_normalize_whitespace() {
        let text = "  Multiple   spaces   and\n\nnewlines  ";
        let normalized = MainContentExtractor::normalize_whitespace(text);
        
        assert_eq!(normalized, "Multiple spaces and newlines");
    }
}
