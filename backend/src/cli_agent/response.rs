//! Response Parsing and Formatting
//!
//! Handles parsing AI provider responses and formatting tool results
//! for display in the Skhoot conversation UI.

use serde::{Deserialize, Serialize};

use super::tools::{ToolCall, ToolResult};

/// Parsed response from AI provider
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentResponse {
    /// Text content of the response
    pub content: String,
    /// Tool calls requested by the model
    pub tool_calls: Vec<ToolCall>,
    /// Whether the response is complete
    pub is_complete: bool,
    /// Finish reason (if complete)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub finish_reason: Option<FinishReason>,
    /// Token usage information
    #[serde(skip_serializing_if = "Option::is_none")]
    pub usage: Option<TokenUsage>,
}

impl AgentResponse {
    /// Create an empty response
    pub fn empty() -> Self {
        Self {
            content: String::new(),
            tool_calls: Vec::new(),
            is_complete: false,
            finish_reason: None,
            usage: None,
        }
    }

    /// Create a text-only response
    pub fn text(content: String) -> Self {
        Self {
            content,
            tool_calls: Vec::new(),
            is_complete: true,
            finish_reason: Some(FinishReason::Stop),
            usage: None,
        }
    }

    /// Create a response with tool calls
    pub fn with_tool_calls(content: String, tool_calls: Vec<ToolCall>) -> Self {
        Self {
            content,
            tool_calls,
            is_complete: true,
            finish_reason: Some(FinishReason::ToolCalls),
            usage: None,
        }
    }

    /// Check if response has tool calls
    pub fn has_tool_calls(&self) -> bool {
        !self.tool_calls.is_empty()
    }

    /// Append content (for streaming)
    pub fn append_content(&mut self, text: &str) {
        self.content.push_str(text);
    }

    /// Add a tool call
    pub fn add_tool_call(&mut self, tool_call: ToolCall) {
        self.tool_calls.push(tool_call);
    }

    /// Mark as complete
    pub fn complete(&mut self, reason: FinishReason) {
        self.is_complete = true;
        self.finish_reason = Some(reason);
    }
}

/// Reason for response completion
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum FinishReason {
    /// Natural stop
    Stop,
    /// Model wants to call tools
    ToolCalls,
    /// Hit max tokens limit
    MaxTokens,
    /// Content was filtered
    ContentFilter,
    /// Error occurred
    Error,
}

/// Token usage information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenUsage {
    pub prompt_tokens: u32,
    pub completion_tokens: u32,
    pub total_tokens: u32,
}

/// Result of a tool call for UI display
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolCallResult {
    /// The original tool call
    pub tool_call: ToolCall,
    /// The result
    pub result: ToolResult,
    /// Formatted display for UI
    pub display: ToolCallDisplay,
}

/// Display format for tool call in UI
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolCallDisplay {
    /// Tool name for display
    pub tool_name: String,
    /// Human-readable description of what was done
    pub description: String,
    /// Status (pending, running, success, error)
    pub status: ToolCallStatus,
    /// Formatted output for display
    pub output: String,
    /// Whether output is truncated
    pub is_truncated: bool,
    /// Duration in milliseconds
    #[serde(skip_serializing_if = "Option::is_none")]
    pub duration_ms: Option<u64>,
}

/// Tool call status
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ToolCallStatus {
    Pending,
    Running,
    Success,
    Error,
}

impl ToolCallResult {
    /// Create a new tool call result
    pub fn new(tool_call: ToolCall, result: ToolResult) -> Self {
        let display = Self::format_display(&tool_call, &result);
        Self {
            tool_call,
            result,
            display,
        }
    }

    /// Format the display for UI
    fn format_display(tool_call: &ToolCall, result: &ToolResult) -> ToolCallDisplay {
        let tool_name = format_tool_name(&tool_call.name);
        let description = format_tool_description(tool_call);
        let status = if result.success {
            ToolCallStatus::Success
        } else {
            ToolCallStatus::Error
        };

        let (output, is_truncated) = format_output(&result.output, 1000);
        let duration_ms = result.metadata.as_ref().and_then(|m| m.duration_ms);

        ToolCallDisplay {
            tool_name,
            description,
            status,
            output,
            is_truncated,
            duration_ms,
        }
    }
}

/// Format tool name for display
fn format_tool_name(name: &str) -> String {
    match name {
        "shell" => "Shell Command".to_string(),
        "read_file" => "Read File".to_string(),
        "write_file" => "Write File".to_string(),
        "list_directory" => "List Directory".to_string(),
        "search_files" => "Search Files".to_string(),
        _ => name.replace('_', " ").to_string(),
    }
}

/// Format tool description based on arguments
fn format_tool_description(tool_call: &ToolCall) -> String {
    let args = &tool_call.arguments;
    
    match tool_call.name.as_str() {
        "shell" => {
            let cmd = args.get("command")
                .and_then(|v| v.as_str())
                .unwrap_or("unknown command");
            format!("Executing: {}", truncate_string(cmd, 50))
        }
        "read_file" => {
            let path = args.get("path")
                .and_then(|v| v.as_str())
                .unwrap_or("unknown file");
            format!("Reading: {}", path)
        }
        "write_file" => {
            let path = args.get("path")
                .and_then(|v| v.as_str())
                .unwrap_or("unknown file");
            let mode = args.get("mode")
                .and_then(|v| v.as_str())
                .unwrap_or("overwrite");
            format!("Writing to {} ({})", path, mode)
        }
        "list_directory" => {
            let path = args.get("path")
                .and_then(|v| v.as_str())
                .unwrap_or(".");
            format!("Listing: {}", path)
        }
        "search_files" => {
            let pattern = args.get("pattern")
                .and_then(|v| v.as_str())
                .unwrap_or("*");
            let search_type = args.get("search_type")
                .and_then(|v| v.as_str())
                .unwrap_or("filename");
            format!("Searching for '{}' ({})", pattern, search_type)
        }
        _ => format!("Calling {}", tool_call.name),
    }
}

/// Format output with truncation
fn format_output(output: &str, max_len: usize) -> (String, bool) {
    if output.len() <= max_len {
        (output.to_string(), false)
    } else {
        let truncated = &output[..max_len];
        // Try to truncate at a line boundary
        let truncated = truncated.rfind('\n')
            .map(|i| &truncated[..i])
            .unwrap_or(truncated);
        (format!("{}...", truncated), true)
    }
}

/// Truncate a string with ellipsis
fn truncate_string(s: &str, max_len: usize) -> String {
    if s.len() <= max_len {
        s.to_string()
    } else {
        format!("{}...", &s[..max_len.saturating_sub(3)])
    }
}

/// Response parser for different AI providers
pub struct ResponseParser;

impl ResponseParser {
    /// Parse OpenAI response format
    pub fn parse_openai(response: &serde_json::Value) -> Result<AgentResponse, ParseError> {
        let choices = response.get("choices")
            .and_then(|v| v.as_array())
            .ok_or(ParseError::MissingField("choices"))?;

        if choices.is_empty() {
            return Err(ParseError::EmptyResponse);
        }

        let choice = &choices[0];
        let message = choice.get("message")
            .ok_or(ParseError::MissingField("message"))?;

        let content = message.get("content")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();

        let tool_calls = Self::parse_openai_tool_calls(message)?;

        let finish_reason = choice.get("finish_reason")
            .and_then(|v| v.as_str())
            .map(|r| match r {
                "stop" => FinishReason::Stop,
                "tool_calls" => FinishReason::ToolCalls,
                "length" => FinishReason::MaxTokens,
                "content_filter" => FinishReason::ContentFilter,
                _ => FinishReason::Stop,
            });

        let usage = response.get("usage").map(|u| TokenUsage {
            prompt_tokens: u.get("prompt_tokens").and_then(|v| v.as_u64()).unwrap_or(0) as u32,
            completion_tokens: u.get("completion_tokens").and_then(|v| v.as_u64()).unwrap_or(0) as u32,
            total_tokens: u.get("total_tokens").and_then(|v| v.as_u64()).unwrap_or(0) as u32,
        });

        Ok(AgentResponse {
            content,
            tool_calls,
            is_complete: true,
            finish_reason,
            usage,
        })
    }

    /// Parse OpenAI tool calls
    fn parse_openai_tool_calls(message: &serde_json::Value) -> Result<Vec<ToolCall>, ParseError> {
        let Some(tool_calls) = message.get("tool_calls").and_then(|v| v.as_array()) else {
            return Ok(Vec::new());
        };

        let mut parsed = Vec::new();
        for tc in tool_calls {
            let id = tc.get("id")
                .and_then(|v| v.as_str())
                .ok_or(ParseError::MissingField("tool_call.id"))?
                .to_string();

            let function = tc.get("function")
                .ok_or(ParseError::MissingField("tool_call.function"))?;

            let name = function.get("name")
                .and_then(|v| v.as_str())
                .ok_or(ParseError::MissingField("tool_call.function.name"))?
                .to_string();

            let arguments_str = function.get("arguments")
                .and_then(|v| v.as_str())
                .ok_or(ParseError::MissingField("tool_call.function.arguments"))?;

            let arguments: serde_json::Value = serde_json::from_str(arguments_str)
                .map_err(|e| ParseError::InvalidJson(e.to_string()))?;

            parsed.push(ToolCall { id, name, arguments });
        }

        Ok(parsed)
    }

    /// Parse Anthropic response format
    pub fn parse_anthropic(response: &serde_json::Value) -> Result<AgentResponse, ParseError> {
        let content_blocks = response.get("content")
            .and_then(|v| v.as_array())
            .ok_or(ParseError::MissingField("content"))?;

        let mut text_content = String::new();
        let mut tool_calls = Vec::new();

        for block in content_blocks {
            let block_type = block.get("type").and_then(|v| v.as_str()).unwrap_or("");
            
            match block_type {
                "text" => {
                    if let Some(text) = block.get("text").and_then(|v| v.as_str()) {
                        text_content.push_str(text);
                    }
                }
                "tool_use" => {
                    let id = block.get("id")
                        .and_then(|v| v.as_str())
                        .ok_or(ParseError::MissingField("tool_use.id"))?
                        .to_string();
                    
                    let name = block.get("name")
                        .and_then(|v| v.as_str())
                        .ok_or(ParseError::MissingField("tool_use.name"))?
                        .to_string();
                    
                    let arguments = block.get("input")
                        .cloned()
                        .unwrap_or(serde_json::json!({}));

                    tool_calls.push(ToolCall { id, name, arguments });
                }
                _ => {}
            }
        }

        let stop_reason = response.get("stop_reason")
            .and_then(|v| v.as_str())
            .map(|r| match r {
                "end_turn" => FinishReason::Stop,
                "tool_use" => FinishReason::ToolCalls,
                "max_tokens" => FinishReason::MaxTokens,
                _ => FinishReason::Stop,
            });

        let usage = response.get("usage").map(|u| TokenUsage {
            prompt_tokens: u.get("input_tokens").and_then(|v| v.as_u64()).unwrap_or(0) as u32,
            completion_tokens: u.get("output_tokens").and_then(|v| v.as_u64()).unwrap_or(0) as u32,
            total_tokens: 0, // Anthropic doesn't provide total
        });

        Ok(AgentResponse {
            content: text_content,
            tool_calls,
            is_complete: true,
            finish_reason: stop_reason,
            usage,
        })
    }

    /// Parse Google/Gemini response format
    pub fn parse_gemini(response: &serde_json::Value) -> Result<AgentResponse, ParseError> {
        let candidates = response.get("candidates")
            .and_then(|v| v.as_array())
            .ok_or(ParseError::MissingField("candidates"))?;

        if candidates.is_empty() {
            return Err(ParseError::EmptyResponse);
        }

        let candidate = &candidates[0];
        let content = candidate.get("content")
            .ok_or(ParseError::MissingField("content"))?;

        let parts = content.get("parts")
            .and_then(|v| v.as_array())
            .ok_or(ParseError::MissingField("parts"))?;

        let mut text_content = String::new();
        let mut tool_calls = Vec::new();

        for part in parts {
            if let Some(text) = part.get("text").and_then(|v| v.as_str()) {
                text_content.push_str(text);
            }
            
            if let Some(function_call) = part.get("functionCall") {
                let name = function_call.get("name")
                    .and_then(|v| v.as_str())
                    .ok_or(ParseError::MissingField("functionCall.name"))?
                    .to_string();
                
                let arguments = function_call.get("args")
                    .cloned()
                    .unwrap_or(serde_json::json!({}));

                // Gemini doesn't provide IDs, generate one
                let id = format!("gemini-{}", tool_calls.len());

                tool_calls.push(ToolCall { id, name, arguments });
            }
        }

        let finish_reason = candidate.get("finishReason")
            .and_then(|v| v.as_str())
            .map(|r| match r {
                "STOP" => FinishReason::Stop,
                "MAX_TOKENS" => FinishReason::MaxTokens,
                "SAFETY" => FinishReason::ContentFilter,
                _ => FinishReason::Stop,
            });

        let usage = response.get("usageMetadata").map(|u| TokenUsage {
            prompt_tokens: u.get("promptTokenCount").and_then(|v| v.as_u64()).unwrap_or(0) as u32,
            completion_tokens: u.get("candidatesTokenCount").and_then(|v| v.as_u64()).unwrap_or(0) as u32,
            total_tokens: u.get("totalTokenCount").and_then(|v| v.as_u64()).unwrap_or(0) as u32,
        });

        Ok(AgentResponse {
            content: text_content,
            tool_calls,
            is_complete: true,
            finish_reason,
            usage,
        })
    }

    /// Parse response based on provider
    pub fn parse(provider: &str, response: &serde_json::Value) -> Result<AgentResponse, ParseError> {
        match provider {
            "openai" => Self::parse_openai(response),
            "anthropic" => Self::parse_anthropic(response),
            "google" | "gemini" => Self::parse_gemini(response),
            _ => Err(ParseError::UnsupportedProvider(provider.to_string())),
        }
    }
}

/// Parse errors
#[derive(Debug, thiserror::Error)]
pub enum ParseError {
    #[error("Missing field: {0}")]
    MissingField(&'static str),
    
    #[error("Empty response")]
    EmptyResponse,
    
    #[error("Invalid JSON: {0}")]
    InvalidJson(String),
    
    #[error("Unsupported provider: {0}")]
    UnsupportedProvider(String),
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_agent_response_creation() {
        let response = AgentResponse::text("Hello".to_string());
        assert_eq!(response.content, "Hello");
        assert!(response.is_complete);
        assert!(!response.has_tool_calls());
    }

    #[test]
    fn test_tool_call_display() {
        let tool_call = ToolCall {
            id: "call-1".to_string(),
            name: "shell".to_string(),
            arguments: serde_json::json!({"command": "echo hello"}),
        };
        
        let result = ToolResult {
            tool_call_id: "call-1".to_string(),
            success: true,
            output: "hello".to_string(),
            error: None,
            metadata: None,
        };

        let display = ToolCallResult::new(tool_call, result);
        assert_eq!(display.display.tool_name, "Shell Command");
        assert_eq!(display.display.status, ToolCallStatus::Success);
    }

    #[test]
    fn test_parse_openai_response() {
        let response = serde_json::json!({
            "choices": [{
                "message": {
                    "content": "Hello!",
                    "role": "assistant"
                },
                "finish_reason": "stop"
            }],
            "usage": {
                "prompt_tokens": 10,
                "completion_tokens": 5,
                "total_tokens": 15
            }
        });

        let parsed = ResponseParser::parse_openai(&response).unwrap();
        assert_eq!(parsed.content, "Hello!");
        assert!(parsed.tool_calls.is_empty());
        assert_eq!(parsed.finish_reason, Some(FinishReason::Stop));
    }

    #[test]
    fn test_truncate_string() {
        assert_eq!(truncate_string("hello", 10), "hello");
        assert_eq!(truncate_string("hello world", 8), "hello...");
    }
}
