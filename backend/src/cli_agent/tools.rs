//! Tool definitions for the CLI Agent
//!
//! Defines the tools available to the agent for interacting with the system.
//! Based on codex-main's tool architecture but simplified for Skhoot.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Tool definition with JSON schema for parameters
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolDefinition {
    pub name: String,
    pub description: String,
    pub parameters: ToolParameters,
}

/// JSON Schema-like parameter definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolParameters {
    #[serde(rename = "type")]
    pub param_type: String,
    pub properties: HashMap<String, ParameterProperty>,
    #[serde(default)]
    pub required: Vec<String>,
}

/// Individual parameter property
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParameterProperty {
    #[serde(rename = "type")]
    pub prop_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub default: Option<serde_json::Value>,
}

/// A tool call from the AI model
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolCall {
    pub id: String,
    pub name: String,
    pub arguments: serde_json::Value,
}

/// Result of executing a tool
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolResult {
    pub tool_call_id: String,
    pub success: bool,
    pub output: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<ToolResultMetadata>,
}

/// Additional metadata for tool results
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolResultMetadata {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub exit_code: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub duration_ms: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub working_directory: Option<String>,
}

/// Available tool types
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Tool {
    Shell,
    ReadFile,
    WriteFile,
    ListDirectory,
    SearchFiles,
    ApplyPatch,
}

impl Tool {
    /// Get all available tools
    pub fn all() -> Vec<Tool> {
        vec![
            Tool::Shell,
            Tool::ReadFile,
            Tool::WriteFile,
            Tool::ListDirectory,
            Tool::SearchFiles,
            Tool::ApplyPatch,
        ]
    }

    /// Get the tool name as used in API calls
    pub fn name(&self) -> &'static str {
        match self {
            Tool::Shell => "shell",
            Tool::ReadFile => "read_file",
            Tool::WriteFile => "write_file",
            Tool::ListDirectory => "list_directory",
            Tool::SearchFiles => "search_files",
            Tool::ApplyPatch => "apply_patch",
        }
    }

    /// Get the tool definition for API registration
    pub fn definition(&self) -> ToolDefinition {
        match self {
            Tool::Shell => Self::shell_definition(),
            Tool::ReadFile => Self::read_file_definition(),
            Tool::WriteFile => Self::write_file_definition(),
            Tool::ListDirectory => Self::list_directory_definition(),
            Tool::SearchFiles => Self::search_files_definition(),
            Tool::ApplyPatch => Self::apply_patch_definition(),
        }
    }
}

impl Tool {
    fn apply_patch_definition() -> ToolDefinition {
        let mut properties = HashMap::new();

        properties.insert(
            "patch".to_string(),
            ParameterProperty {
                prop_type: "string".to_string(),
                description: Some("The patch content to apply in unified diff format".to_string()),
                default: None,
            },
        );

        ToolDefinition {
            name: "apply_patch".to_string(),
            description: "Apply a unified diff patch to modify files. Use this for precise code modifications.".to_string(),
            parameters: ToolParameters {
                param_type: "object".to_string(),
                properties,
                required: vec!["patch".to_string()],
            },
        }
    }

    fn shell_definition() -> ToolDefinition {
        let mut properties = HashMap::new();

        properties.insert(
            "command".to_string(),
            ParameterProperty {
                prop_type: "string".to_string(),
                description: Some("The shell command to execute".to_string()),
                default: None,
            },
        );

        properties.insert(
            "workdir".to_string(),
            ParameterProperty {
                prop_type: "string".to_string(),
                description: Some(
                    "Working directory for command execution. Defaults to current directory."
                        .to_string(),
                ),
                default: None,
            },
        );

        properties.insert(
            "timeout_ms".to_string(),
            ParameterProperty {
                prop_type: "number".to_string(),
                description: Some(
                    "Timeout in milliseconds. Defaults to 30000 (30 seconds).".to_string(),
                ),
                default: Some(serde_json::json!(30000)),
            },
        );

        ToolDefinition {
            name: "shell".to_string(),
            description: "Execute a shell command and return its output. Use this for running terminal commands, scripts, or system operations.".to_string(),
            parameters: ToolParameters {
                param_type: "object".to_string(),
                properties,
                required: vec!["command".to_string()],
            },
        }
    }

    fn read_file_definition() -> ToolDefinition {
        let mut properties = HashMap::new();

        properties.insert(
            "path".to_string(),
            ParameterProperty {
                prop_type: "string".to_string(),
                description: Some(
                    "Path to the file to read (absolute or relative to working directory)"
                        .to_string(),
                ),
                default: None,
            },
        );

        properties.insert(
            "start_line".to_string(),
            ParameterProperty {
                prop_type: "number".to_string(),
                description: Some("Starting line number (1-indexed). Defaults to 1.".to_string()),
                default: Some(serde_json::json!(1)),
            },
        );

        properties.insert(
            "end_line".to_string(),
            ParameterProperty {
                prop_type: "number".to_string(),
                description: Some(
                    "Ending line number (inclusive). Defaults to end of file.".to_string(),
                ),
                default: None,
            },
        );

        ToolDefinition {
            name: "read_file".to_string(),
            description:
                "Read the contents of a file. Can read entire file or specific line ranges."
                    .to_string(),
            parameters: ToolParameters {
                param_type: "object".to_string(),
                properties,
                required: vec!["path".to_string()],
            },
        }
    }

    fn write_file_definition() -> ToolDefinition {
        let mut properties = HashMap::new();

        properties.insert(
            "path".to_string(),
            ParameterProperty {
                prop_type: "string".to_string(),
                description: Some(
                    "Path to the file to write (absolute or relative to working directory)"
                        .to_string(),
                ),
                default: None,
            },
        );

        properties.insert(
            "content".to_string(),
            ParameterProperty {
                prop_type: "string".to_string(),
                description: Some("Content to write to the file".to_string()),
                default: None,
            },
        );

        properties.insert(
            "mode".to_string(),
            ParameterProperty {
                prop_type: "string".to_string(),
                description: Some("Write mode: 'overwrite' (default) or 'append'".to_string()),
                default: Some(serde_json::json!("overwrite")),
            },
        );

        ToolDefinition {
            name: "write_file".to_string(),
            description: "Write content to a file. Can overwrite or append to existing files."
                .to_string(),
            parameters: ToolParameters {
                param_type: "object".to_string(),
                properties,
                required: vec!["path".to_string(), "content".to_string()],
            },
        }
    }

    fn list_directory_definition() -> ToolDefinition {
        let mut properties = HashMap::new();

        properties.insert(
            "path".to_string(),
            ParameterProperty {
                prop_type: "string".to_string(),
                description: Some(
                    "Path to the directory to list (absolute or relative)".to_string(),
                ),
                default: None,
            },
        );

        properties.insert(
            "depth".to_string(),
            ParameterProperty {
                prop_type: "number".to_string(),
                description: Some(
                    "Maximum depth to traverse. Defaults to 1 (immediate children only)."
                        .to_string(),
                ),
                default: Some(serde_json::json!(1)),
            },
        );

        properties.insert(
            "include_hidden".to_string(),
            ParameterProperty {
                prop_type: "boolean".to_string(),
                description: Some(
                    "Include hidden files (starting with '.'). Defaults to false.".to_string(),
                ),
                default: Some(serde_json::json!(false)),
            },
        );

        ToolDefinition {
            name: "list_directory".to_string(),
            description: "List contents of a directory with file types and sizes.".to_string(),
            parameters: ToolParameters {
                param_type: "object".to_string(),
                properties,
                required: vec!["path".to_string()],
            },
        }
    }

    fn search_files_definition() -> ToolDefinition {
        let mut properties = HashMap::new();

        properties.insert(
            "pattern".to_string(),
            ParameterProperty {
                prop_type: "string".to_string(),
                description: Some(
                    "Search pattern (glob pattern for filenames or regex for content)".to_string(),
                ),
                default: None,
            },
        );

        properties.insert(
            "path".to_string(),
            ParameterProperty {
                prop_type: "string".to_string(),
                description: Some(
                    "Directory to search in. Defaults to current directory.".to_string(),
                ),
                default: Some(serde_json::json!(".")),
            },
        );

        properties.insert("search_type".to_string(), ParameterProperty {
            prop_type: "string".to_string(),
            description: Some("Type of search: 'filename' (glob) or 'content' (regex). Defaults to 'filename'.".to_string()),
            default: Some(serde_json::json!("filename")),
        });

        properties.insert(
            "max_results".to_string(),
            ParameterProperty {
                prop_type: "number".to_string(),
                description: Some(
                    "Maximum number of results to return. Defaults to 100.".to_string(),
                ),
                default: Some(serde_json::json!(100)),
            },
        );

        ToolDefinition {
            name: "search_files".to_string(),
            description:
                "Search for files by name pattern or content. Returns matching file paths."
                    .to_string(),
            parameters: ToolParameters {
                param_type: "object".to_string(),
                properties,
                required: vec!["pattern".to_string()],
            },
        }
    }
}

/// Registry of available tools
#[derive(Debug, Clone)]
pub struct ToolRegistry {
    tools: HashMap<String, ToolDefinition>,
    enabled: Vec<Tool>,
}

impl ToolRegistry {
    /// Create a new registry with all tools enabled
    pub fn new() -> Self {
        Self::with_tools(Tool::all())
    }

    /// Create a registry with specific tools enabled
    pub fn with_tools(tools: Vec<Tool>) -> Self {
        let mut registry = HashMap::new();
        for tool in &tools {
            let def = tool.definition();
            registry.insert(def.name.clone(), def);
        }
        Self {
            tools: registry,
            enabled: tools,
        }
    }

    /// Get a tool definition by name
    pub fn get(&self, name: &str) -> Option<&ToolDefinition> {
        self.tools.get(name)
    }

    /// Get all tool definitions
    pub fn definitions(&self) -> Vec<&ToolDefinition> {
        self.tools.values().collect()
    }

    /// Get all enabled tools
    pub fn enabled_tools(&self) -> &[Tool] {
        &self.enabled
    }

    /// Check if a tool is enabled
    pub fn is_enabled(&self, name: &str) -> bool {
        self.tools.contains_key(name)
    }

    /// Convert to OpenAI function calling format
    pub fn to_openai_tools(&self) -> Vec<serde_json::Value> {
        self.tools
            .values()
            .map(|def| {
                serde_json::json!({
                    "type": "function",
                    "function": {
                        "name": def.name,
                        "description": def.description,
                        "parameters": {
                            "type": def.parameters.param_type,
                            "properties": def.parameters.properties,
                            "required": def.parameters.required,
                        }
                    }
                })
            })
            .collect()
    }

    /// Convert to Anthropic tool use format
    pub fn to_anthropic_tools(&self) -> Vec<serde_json::Value> {
        self.tools
            .values()
            .map(|def| {
                serde_json::json!({
                    "name": def.name,
                    "description": def.description,
                    "input_schema": {
                        "type": def.parameters.param_type,
                        "properties": def.parameters.properties,
                        "required": def.parameters.required,
                    }
                })
            })
            .collect()
    }

    /// Convert to Google/Gemini function calling format
    pub fn to_gemini_tools(&self) -> Vec<serde_json::Value> {
        vec![serde_json::json!({
            "function_declarations": self.tools.values().map(|def| {
                serde_json::json!({
                    "name": def.name,
                    "description": def.description,
                    "parameters": {
                        "type": def.parameters.param_type,
                        "properties": def.parameters.properties,
                        "required": def.parameters.required,
                    }
                })
            }).collect::<Vec<_>>()
        })]
    }
}

impl Default for ToolRegistry {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tool_definitions() {
        for tool in Tool::all() {
            let def = tool.definition();
            assert!(!def.name.is_empty());
            assert!(!def.description.is_empty());
            assert_eq!(def.parameters.param_type, "object");
        }
    }

    #[test]
    fn test_registry_creation() {
        let registry = ToolRegistry::new();
        assert_eq!(registry.enabled_tools().len(), 5);
        assert!(registry.is_enabled("shell"));
        assert!(registry.is_enabled("read_file"));
    }

    #[test]
    fn test_openai_format() {
        let registry = ToolRegistry::new();
        let tools = registry.to_openai_tools();
        assert_eq!(tools.len(), 5);

        for tool in &tools {
            assert_eq!(tool["type"], "function");
            assert!(tool["function"]["name"].is_string());
        }
    }
}
