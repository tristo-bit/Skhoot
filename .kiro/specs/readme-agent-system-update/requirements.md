# Requirements Document

## Introduction

This specification defines the requirements for updating the README.md file to document recent major improvements to the agent system architecture. The recent commit "feat(agent-system): implement safe autonomous agent with structured execution" introduced significant enhancements that transform Skhoot from an interactive co-pilot to a safe autonomous agent with advanced execution controls, deterministic patching capabilities, and comprehensive safety features.

## Glossary

- **Agent_System**: The autonomous AI agent subsystem that executes tools and commands with safety controls
- **Apply_Patch_Tool**: A specialized tool for deterministic file patching using unified diff format
- **Working_Directory**: The file system directory context in which agent commands execute
- **Tool_Approval_Workflow**: The user interaction flow for reviewing and approving agent tool executions
- **Execution_Policy**: The framework for classifying and controlling command safety levels
- **CommandSpec**: An abstraction for command execution parameters including working directory, environment, and timeout
- **Structured_Output_Streams**: Separate stdout/stderr handling to prevent race conditions in command execution
- **README**: The main documentation file (README.md) that provides project overview and feature documentation
- **Safe_Autonomous_Agent**: An agent architecture that operates independently while maintaining safety controls

## Requirements

### Requirement 1: Document Safe Autonomous Agent Architecture

**User Story:** As a developer or user reading the README, I want to understand the safe autonomous agent architecture, so that I know how Skhoot's agent system differs from traditional interactive co-pilots.

#### Acceptance Criteria

1. WHEN a user reads the agent mode section, THE README SHALL explain the transition from interactive co-pilot to safe autonomous agent
2. WHEN describing the architecture, THE README SHALL highlight the key safety controls and execution policies
3. THE README SHALL describe how the agent operates autonomously while maintaining user control
4. WHEN explaining agent capabilities, THE README SHALL reference the structured execution framework
5. THE README SHALL include information about the comprehensive test suite that validates agent operations

### Requirement 2: Document Apply_Patch Tool

**User Story:** As a developer using Skhoot's agent mode, I want to understand the apply_patch tool capabilities, so that I can leverage deterministic file patching in my workflows.

#### Acceptance Criteria

1. WHEN a user reads about agent tools, THE README SHALL list apply_patch as one of the available tools
2. THE README SHALL explain that apply_patch uses unified diff format for deterministic patching
3. WHEN describing apply_patch, THE README SHALL mention the standalone executable implementation
4. THE README SHALL explain the benefits of deterministic patching over traditional file modification approaches
5. WHEN listing tool capabilities, THE README SHALL include apply_patch alongside shell, read_file, write_file, list_directory, and search_files

### Requirement 3: Document Working Directory Selection

**User Story:** As a user of Skhoot, I want to understand how to set the working directory for agent operations, so that I can control the file system context for command execution.

#### Acceptance Criteria

1. WHEN a user reads about agent features, THE README SHALL describe the working directory selection UI
2. THE README SHALL explain that working directory can be set from both the sidebar and chat interface
3. WHEN describing working directory, THE README SHALL explain how it affects command execution context
4. THE README SHALL mention that the working directory is displayed in the sidebar with a folder icon
5. THE README SHALL explain that working directory selection uses native file picker dialogs

### Requirement 4: Document Tool Approval Workflow

**User Story:** As a user concerned about safety, I want to understand the tool approval workflow, so that I know how I maintain control over agent actions.

#### Acceptance Criteria

1. WHEN a user reads about agent safety, THE README SHALL describe the tool approval workflow
2. THE README SHALL explain how users can review tool calls before execution
3. WHEN describing the approval process, THE README SHALL mention the visual UI for tool call review
4. THE README SHALL explain that users can approve, reject, or modify tool calls
5. THE README SHALL describe how the approval workflow integrates with the agent execution loop

### Requirement 5: Document Enhanced Safety Controls

**User Story:** As a security-conscious user, I want to understand the safety controls in the agent system, so that I can trust the agent to operate on my system.

#### Acceptance Criteria

1. WHEN a user reads about agent mode, THE README SHALL describe the execution policy framework
2. THE README SHALL explain how commands are classified by safety level
3. WHEN describing safety features, THE README SHALL mention structured output streams that prevent race conditions
4. THE README SHALL explain the CommandSpec abstraction for execution parameters
5. THE README SHALL describe timeout controls and environment isolation features

### Requirement 6: Update Agent Tools List

**User Story:** As a developer integrating with Skhoot, I want an accurate list of available agent tools, so that I know what capabilities the agent has.

#### Acceptance Criteria

1. WHEN a user reads the agent tools section, THE README SHALL list all 6 available tools
2. THE README SHALL include apply_patch in the tools list with a description
3. WHEN listing tools, THE README SHALL maintain consistent formatting with existing tool descriptions
4. THE README SHALL update any code examples that reference the tools list
5. THE README SHALL ensure the tools list matches the actual implementation in the codebase

### Requirement 7: Update Architecture Overview

**User Story:** As a technical reader, I want the architecture overview to reflect the current agent system design, so that I understand the system's technical foundation.

#### Acceptance Criteria

1. WHEN a user reads the architecture section, THE README SHALL mention the safe autonomous agent architecture
2. THE README SHALL reference the execution policy framework in the architecture description
3. WHEN describing the backend, THE README SHALL mention the apply_patch module
4. THE README SHALL update any architecture diagrams or descriptions to reflect the new agent system
5. THE README SHALL ensure consistency between the architecture description and the actual implementation

### Requirement 8: Maintain Existing Documentation Quality

**User Story:** As a reader of the README, I want the updated documentation to maintain the same quality and style as existing content, so that the document remains cohesive and professional.

#### Acceptance Criteria

1. WHEN updating the README, THE System SHALL preserve the existing markdown formatting and structure
2. THE System SHALL maintain the embossed glassmorphic design system references and style
3. WHEN adding new content, THE System SHALL follow the existing collapsible details pattern for feature descriptions
4. THE System SHALL ensure all links and references remain valid after updates
5. THE System SHALL maintain the existing tone and writing style throughout the document
