// Disk Analyzer Module
// Provides disk space analysis functionality with directory scanning,
// file categorization, and cleanup candidate identification

mod analyzer;
mod types;

#[cfg(test)]
mod tests;

pub use analyzer::DiskAnalyzer;
pub use types::*;
