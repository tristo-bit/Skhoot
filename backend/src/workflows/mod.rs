//! Workflow Engine Module
//!
//! Provides a tree-of-decision based workflow system for Skhoot.
//! Workflows are groups of prompts with structured outcomes and decision management.
//!
//! ## Workflow Types
//! - `hook`: Automatically triggered based on conditions
//! - `process`: Step-by-step structured output generation
//! - `manual`: User-triggered workflows

pub mod types;
pub mod engine;
pub mod storage;
pub mod triggers;

pub use types::*;
pub use engine::WorkflowEngine;
pub use storage::WorkflowStorage;
pub use triggers::TriggerManager;
