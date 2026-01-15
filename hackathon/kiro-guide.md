# Kiro CLI Guide

A practical guide for developers familiar with other coding assistants who want to understand Kiro's unique approach and get productive quickly.

## What Makes Kiro Different

While most modern AI coding assistants are agentic, **Kiro stands apart** with three key differentiators:

### 🎯 **Spec-Driven Development**
Kiro emphasizes planning before coding - turning ideas into clear specifications, structured requirements, and task lists. This creates traceability between intent and implementation through reviewable diffs.

### 🧠 **Persistent Project Knowledge** 
Steering documents provide consistent project context across all conversations. No need to re-explain your conventions, patterns, or standards in every chat session.

### 🤖 **Deep Agent Customization**
Build specialized agents with pre-configured tools, permissions, and context. Create workflow-specific assistants that work independently on complex, multi-step tasks.

---

## Installation & Setup

### Quick Install

**macOS:**
```bash
curl -fsSL https://cli.kiro.dev/install | bash
```

**Linux (Ubuntu):**
```bash
wget https://desktop-release.q.us-east-1.amazonaws.com/latest/kiro-cli.deb
sudo dpkg -i kiro-cli.deb
sudo apt-get install -f
```

**Windows:**
1. Install Ubuntu through WSL (Windows Subsystem for Linux):
   - Open PowerShell as Administrator
   - Run: `wsl --install`
   - Restart computer when prompted
   - Ubuntu will be installed automatically
2. Once Ubuntu is set up, use the Linux installation method above

### Authentication
```bash
kiro-cli login
```

Choose from:
- **AWS Builder ID** (recommended for individuals)
- **AWS IAM Identity Center** (enterprise)

### First Steps
```bash
# Start Kiro CLI
kiro-cli

# Optional: Skip permission prompts (security considerations apply)
/tools trust-all
```

---

## Core Concepts

### 🧠 Steering Documents
Markdown files in `.kiro/steering/` that give Kiro persistent knowledge about your project. Instead of explaining your conventions every time, steering ensures Kiro consistently follows your patterns.

<details>
<summary><strong>Deep Dive: Steering Documents</strong></summary>

#### Foundational Files

**`product.md`** - Product overview and business context
```markdown
# Product Overview
## Product Purpose
[What your product does and why it exists]

## Target Users  
[Who uses it and their needs]

## Key Features
[Main capabilities and functionality]
```

**`tech.md`** - Technology stack and constraints
```markdown
# Technical Architecture
## Technology Stack
- Primary: Python 3.11+ with FastAPI
- Database: PostgreSQL with SQLAlchemy
- Frontend: React with TypeScript

## Code Standards
- PEP 8 compliance with Black formatting
- Type hints required (mypy strict mode)
```

**`structure.md`** - File organization and patterns
```markdown
# Project Structure
## Directory Layout

project/
├── src/
├── tests/
├── docs/
└── .kiro/

## Naming Conventions
- Files: snake_case
- Classes: PascalCase
- Functions: snake_case
```

#### Custom Steering Examples

**`api-standards.md`** - REST conventions
```markdown
# API Standards
## Endpoint Patterns
- GET /api/v1/users - List users
- POST /api/v1/users - Create user
- GET /api/v1/users/{id} - Get specific user

## Error Responses
Always return consistent error format:
{
  "error": "validation_failed",
  "message": "Email is required",
  "details": {...}
}
```

**`testing-standards.md`** - Testing approach
```markdown
# Testing Standards
## Unit Tests
- Use pytest with fixtures
- Minimum 80% coverage
- Test file naming: test_*.py

## Integration Tests
- Separate integration/ directory
- Use test database
- Mock external APIs
```

</details>

### ⚡ Custom Prompts
Reusable commands stored as markdown files that you invoke with `@prompt-name`. Three types available: local prompts (project-specific), global prompts (available everywhere), and MCP prompts (from external servers).

<details>
<summary><strong>Deep Dive: Custom Prompts</strong></summary>

- **Local prompts** (`.kiro/prompts/`) - Project-specific
- **Global prompts** (`~/.kiro/prompts/`) - Available everywhere  
- **MCP prompts** - From external servers with arguments

#### Creating Prompts

```bash
# In chat session
/prompts create --name code-review --content "Review this code for security issues, performance problems, and best practices. Focus on..."

# Or create without content to open editor (prompts are just Markdown!)
/prompts create --name feature-plan
```

#### Using Prompts

```bash
# Simple usage - prompts will ask for any needed details
@code-review
@plan-feature

# List all available prompts
/prompts list

# View prompt details
/prompts details code-review
```

**Note:** Local and global prompts don't support arguments directly. They'll ask for any needed information as follow-up questions.

#### Priority System
1. **Local prompts** (highest) - Override everything
2. **Global prompts** (medium) - Override MCP
3. **MCP prompts** (lowest) - Can be overridden

</details>

### 🤖 Custom Agents
JSON configurations that define specialized AI assistants with specific tools, permissions, and context. Pre-approve trusted tools, include relevant context automatically, and create workflow-specific assistants.

<details>
<summary><strong>Deep Dive: Custom Agents</strong></summary>

**Benefits:** 
- Pre-approve trusted tools (no permission prompts)
- Include relevant context automatically
- Limit tool access for security
- Create workflow-specific assistants

#### Agent Structure

```json
{
  "name": "backend-specialist",
  "description": "Backend development and API design",
  "prompt": "You are a backend development expert specializing in Python FastAPI applications...",
  "tools": ["read", "write", "shell", "aws"],
  "allowedTools": ["read", "write", "shell:pytest", "aws:s3"],
  "resources": [
    "file://README.md",
    "file://.kiro/steering/**/*.md",
    "file://docs/api-design.md"
  ],
  "model": "claude-sonnet-4",
  "toolsSettings": {
    "read": {
      "allowedPaths": ["./src/**", "./tests/**"],
      "deniedPaths": ["./secrets/**"]
    }
  }
}
```

#### Agent Locations
- **Global:** `~/.kiro/agents/`
- **Project:** `.kiro/agents/`

#### Using Agents

```bash
# Start with specific agent
kiro-cli --agent backend-specialist

# Switch agents in chat
/agent swap frontend-expert

# List available agents
/agent list
```

</details>

---

## Essential Slash Commands
Commands you can use within chat sessions to quickly perform actions. Start with a forward slash (`/`) and provide shortcuts for context management, model selection, session management, and tool permissions.

<details>
<summary><strong>Deep Dive: Essential Slash Commands</strong></summary>

### Context Management
```bash
/context show           # View current context usage
/context add file.py    # Add temporary context
/context remove file.py # Remove from context
/context clear          # Clear all temporary context
```

### Model Selection
```bash
/model                  # Switch models interactively
/model set-current-as-default  # Save current as default
```

**Available Models:**
- **Auto** (recommended) - Smart routing, 23% cheaper than Sonnet 4
- **Claude Haiku 4.5** - Fastest, 1/3 cost of Sonnet 4
- **Claude Sonnet 4.0/4.5** - Consistent behavior, advanced coding
- **Claude Opus 4.5** - Maximum intelligence for complex tasks

### Session Management
```bash
/save path/to/file.json    # Save conversation
/load path/to/file.json    # Load conversation
/chat resume               # Resume in current directory
/clear                     # Clear display (not history)
```

### Tool Management
```bash
/tools                  # View tool permissions
/tools trust write      # Trust tool for session
/tools trust-all        # Trust all tools (use carefully)
```

</details>

---

## Advanced Features

<details>
<summary><strong>🔧 MCP (Model Context Protocol) - External Tool Integration</strong></summary>

**What it is:** Protocol for connecting external tools and services to Kiro.

**Setup via command line:**
```bash
kiro-cli mcp add \
  --name "aws-docs" \
  --command "uvx" \
  --args "awslabs.aws-documentation-mcp-server@latest" \
  --env "FASTMCP_LOG_LEVEL=ERROR"
```

**Setup via config file** (`.kiro/settings/mcp.json`):
```json
{
  "mcpServers": {
    "aws-docs": {
      "command": "uvx",
      "args": ["awslabs.aws-documentation-mcp-server@latest"],
      "env": {
        "FASTMCP_LOG_LEVEL": "ERROR"
      }
    }
  }
}
```

**Using MCP prompts with arguments:**
```bash
@aws-docs/search "lambda best practices" "detailed"
@git-server/analyze "performance" "last-week"
```

</details>

<details>
<summary><strong>🧠 Code Intelligence - LSP Integration</strong></summary>

**What it is:** Language Server Protocol integration for semantic code understanding.

**Supported Languages:**
- TypeScript/JavaScript, Rust, Python, Go, Java, Ruby, C/C++

**Setup:**
```bash
# Install language servers first
npm install -g typescript-language-server typescript  # TypeScript
rustup component add rust-analyzer                    # Rust
pip install pyright                                   # Python

# Initialize in project
/code init
```

**Usage:**
- Ask natural language questions about your code
- "Find all references to the User class"
- "Show me the definition of authenticate function"
- "What are the compilation errors in this file?"

</details>

<details>
<summary><strong>🔄 Subagents - Parallel Task Processing</strong></summary>

**What they are:** Specialized agents that handle independent subtasks in parallel.

**When to use:**
- Complex multi-step tasks
- Independent subtasks that can run simultaneously
- Avoiding context pollution in main conversation

**Usage:**
```bash
# Kiro automatically spawns subagents when appropriate
> "Use the backend agent to refactor the payment module while the frontend agent updates the UI components"
```

</details>

<details>
<summary><strong>📚 Knowledge Management (Experimental)</strong></summary>

**What it is:** Persistent knowledge base with semantic search.

**Enable:**
```bash
kiro-cli settings chat.enableKnowledge true
```

**Usage:**
```bash
/knowledge add --name "project-docs" --path ./docs --index-type Best
/knowledge show
/knowledge search "authentication flow"
```

**Benefits:**
- Store large codebases without consuming context window
- Semantic search across all content
- Persistent across sessions

</details>

<details>
<summary><strong>🎯 Tangent Mode (Experimental)</strong></summary>

**What it is:** Explore side topics without disrupting main conversation.

**Enable:**
```bash
kiro-cli settings chat.enableTangentMode true
```

**Usage:**
```bash
/tangent  # or Ctrl+T
# Explore alternative approaches
/tangent  # Return to main conversation
```

</details>

<details>
<summary><strong>📋 Checkpointing & TODO Lists (Experimental)</strong></summary>

**Checkpointing:**
```bash
kiro-cli settings chat.enableCheckpoint true
/checkpoint list
/checkpoint restore 1
```

**TODO Lists:**
```bash
kiro-cli settings chat.enableTodo true
/todo view
/todo add "Implement user authentication"
```

</details>

<details>
<summary><strong>⚡ Hooks - Workflow Automation</strong></summary>

**What they are:** Commands that run at specific lifecycle points.

**Configuration** (`.kiro/settings/hooks.json`):
```json
{
  "hooks": {
    "agentSpawn": [
      {"command": "git status"}
    ],
    "preToolUse": [
      {
        "matcher": "write",
        "command": "echo 'About to write file'"
      }
    ],
    "postToolUse": [
      {
        "matcher": "write",
        "command": "prettier --write"
      }
    ]
  }
}
```

**Hook Types:**
- `agentSpawn` - When agent starts
- `preToolUse` - Before tool execution
- `postToolUse` - After tool execution
- `userPromptSubmit` - When user sends message
- `stop` - When assistant finishes

</details>

---

## Context Management Strategies

### Three Approaches

| Approach | Context Impact | Persistence | Best For |
|----------|---------------|-------------|----------|
| **Agent Resources** | Always active | Persistent | Essential files, standards |
| **Session Context** | Always active | Current session | Temporary files |
| **Knowledge Bases** | Only when searched | Persistent | Large codebases, docs |

### Decision Tree
1. **Content > 10MB or thousands of files?** → Use Knowledge Bases
2. **Need in every conversation?** → Use Agent Resources  
3. **Temporary for current task?** → Use Session Context

### Best Practices
- **Essential files** (README, configs) → Agent Resources
- **Large datasets** → Knowledge Bases with semantic search
- **Current task files** → Session Context
- **Monitor usage** with `/context show`

---

## Hackathon-Specific Tips

### Maximize Your Score

**Kiro CLI Usage (20% of score):**
- Create custom prompts for your workflow
- Use steering documents extensively
- Show innovative use of agents and MCP
- Document your Kiro setup in your submission

**Documentation (20% of score):**
- Maintain detailed DEVLOG.md throughout development
- Use steering documents to define your approach
- Show your development process clearly

### Recommended Workflow

1. **Setup Phase:**
   ```bash
   @quickstart  # Configure your project
   @prime       # Load project context
   ```

2. **Development Phase:**
   ```bash
   @plan-feature    # Will ask what feature to plan
   @execute         # Implement systematically
   @code-review     # Maintain quality
   ```

3. **Submission Phase:**
   ```bash
   @code-review-hackathon  # Final evaluation
   ```

---

## Quick Reference

### Essential Commands
```bash
# Setup
kiro-cli login
kiro-cli
@quickstart

# Core workflow  
@prime → @plan-feature → @execute → @code-review

# Context management
/context show
/context add file.py

# Model selection
/model
/model set-current-as-default

# Prompts
/prompts list
@prompt-name

# Agents
/agent list
/agent swap agent-name

# Help & diagnostics
kiro-cli help
kiro-cli doctor
```

### Key Directories
```
project/
├── .kiro/
│   ├── steering/          # Project knowledge
│   ├── prompts/           # Custom commands
│   ├── agents/            # Custom agents
│   └── settings/          # Configuration
```

---

Use the `@quickstart` command once you have run `kiro-cli` to get started with setting up your Kiro environment for the Dynamous + Kiro Hackathon!
