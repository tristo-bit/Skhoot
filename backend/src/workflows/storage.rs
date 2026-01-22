//! Workflow storage and persistence
//!
//! Handles workflow CRUD operations and persistence.

use super::types::*;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

/// Workflow storage manager
pub struct WorkflowStorage {
    workflows: Arc<RwLock<HashMap<String, Workflow>>>,
}

impl WorkflowStorage {
    pub fn new() -> Self {
        let storage = Self {
            workflows: Arc::new(RwLock::new(HashMap::new())),
        };
        
        // Initialize with default workflows synchronously
        // The actual initialization happens in init_defaults
        storage
    }

    /// Initialize default workflows
    pub async fn init_defaults(&self) {
        let defaults = Self::create_default_workflows();
        let mut workflows = self.workflows.write().await;
        for workflow in defaults {
            workflows.insert(workflow.id.clone(), workflow);
        }
    }

    /// Create default workflows
    fn create_default_workflows() -> Vec<Workflow> {
        vec![
            Self::create_steering_file_workflow(),
            Self::create_auto_workflow_workflow(),
            Self::create_error_search_workflow(),
            Self::create_agent_gatherer_workflow(),
            Self::create_agent_designer_workflow(),
            Self::create_agent_builder_workflow(),
            Self::create_healthy_meal_planner_workflow(),
        ]
    }

    fn create_steering_file_workflow() -> Workflow {
        let mut workflow = Workflow::new(
            "Create Agent Steering File".to_string(),
            WorkflowType::Process,
        );
        workflow.id = "default-steering-file".to_string();
        workflow.category = "default".to_string();
        workflow.description = "Create a structured steering file for agent behavior configuration".to_string();
        workflow.intent = Some("create steering file, agent configuration, behavior rules".to_string());
        workflow.steps = vec![
            WorkflowStep {
                id: "s1".to_string(),
                name: "Analyze Context".to_string(),
                prompt: "Analyze the current project structure and identify the purpose and context for the steering file. What behaviors should the agent follow?".to_string(),
                order: 1,
                decision: None,
                next_step: Some("s2".to_string()),
                output_format: Some("markdown".to_string()),
                requires_confirmation: false,
                timeout_secs: Some(60),
            },
            WorkflowStep {
                id: "s2".to_string(),
                name: "Define Rules".to_string(),
                prompt: "Based on the analysis, define specific rules and guidelines for the agent. Include coding standards, file organization, and interaction patterns.".to_string(),
                order: 2,
                decision: None,
                next_step: Some("s3".to_string()),
                output_format: Some("yaml".to_string()),
                requires_confirmation: true,
                timeout_secs: Some(120),
            },
            WorkflowStep {
                id: "s3".to_string(),
                name: "Generate File".to_string(),
                prompt: "Generate the complete steering file in the proper format. Save it to .kiro/steering/ directory.".to_string(),
                order: 3,
                decision: None,
                next_step: None,
                output_format: Some("file".to_string()),
                requires_confirmation: false,
                timeout_secs: Some(30),
            },
        ];
        workflow.output_settings = OutputSettings {
            folder: Some(".kiro/steering".to_string()),
            file_pattern: Some("{name}.md".to_string()),
            format_description: Some("Markdown file with YAML frontmatter".to_string()),
            append_mode: false,
            timestamped: false,
        };
        workflow
    }

    fn create_auto_workflow_workflow() -> Workflow {
        let mut workflow = Workflow::new(
            "Create Workflow from Conversation".to_string(),
            WorkflowType::Hook,
        );
        workflow.id = "default-auto-workflow".to_string();
        workflow.category = "default".to_string();
        workflow.description = "Automatically detect and create workflows from conversation patterns".to_string();
        workflow.intent = Some("create workflow, automate task, save as workflow".to_string());
        workflow.trigger = Some(TriggerType::OnAIDetection {
            intent_patterns: vec![
                "create a workflow".to_string(),
                "save this as a workflow".to_string(),
                "automate this".to_string(),
                "make this repeatable".to_string(),
            ],
        });
        workflow.steps = vec![
            WorkflowStep {
                id: "s1".to_string(),
                name: "Extract Pattern".to_string(),
                prompt: "Analyze the conversation history and extract the repeatable pattern. Identify the key steps, inputs, and expected outputs.".to_string(),
                order: 1,
                decision: Some(DecisionNode {
                    id: "d1".to_string(),
                    condition: "Is this a valid workflow pattern?".to_string(),
                    true_branch: Some("s2".to_string()),
                    false_branch: Some("s_invalid".to_string()),
                }),
                next_step: None,
                output_format: Some("json".to_string()),
                requires_confirmation: false,
                timeout_secs: Some(60),
            },
            WorkflowStep {
                id: "s_invalid".to_string(),
                name: "Invalid Pattern".to_string(),
                prompt: "Explain why this cannot be converted to a workflow and suggest alternatives.".to_string(),
                order: 2,
                decision: None,
                next_step: None,
                output_format: None,
                requires_confirmation: false,
                timeout_secs: Some(30),
            },
            WorkflowStep {
                id: "s2".to_string(),
                name: "Define Workflow".to_string(),
                prompt: "Create the workflow definition with proper steps, triggers, and output settings. Ask the user for workflow name and type.".to_string(),
                order: 3,
                decision: None,
                next_step: Some("s3".to_string()),
                output_format: Some("json".to_string()),
                requires_confirmation: true,
                timeout_secs: Some(120),
            },
            WorkflowStep {
                id: "s3".to_string(),
                name: "Save Workflow".to_string(),
                prompt: "Save the workflow using the create_workflow tool and confirm creation to the user.".to_string(),
                order: 4,
                decision: None,
                next_step: None,
                output_format: None,
                requires_confirmation: false,
                timeout_secs: Some(30),
            },
        ];
        workflow.behavior.as_toolcall = true;
        workflow
    }

    fn create_error_search_workflow() -> Workflow {
        let mut workflow = Workflow::new(
            "Search for Errors and Logic Enhancements".to_string(),
            WorkflowType::Manual,
        );
        workflow.id = "default-error-search".to_string();
        workflow.category = "default".to_string();
        workflow.description = "Analyze codebase for errors, bugs, and potential logic improvements".to_string();
        workflow.intent = Some("find errors, search bugs, logic enhancement, code review".to_string());
        workflow.steps = vec![
            WorkflowStep {
                id: "s1".to_string(),
                name: "Scan Codebase".to_string(),
                prompt: "Scan the codebase for potential errors, type issues, and common bug patterns. Focus on the most critical files first.".to_string(),
                order: 1,
                decision: None,
                next_step: Some("s2".to_string()),
                output_format: Some("json".to_string()),
                requires_confirmation: false,
                timeout_secs: Some(180),
            },
            WorkflowStep {
                id: "s2".to_string(),
                name: "Analyze Logic".to_string(),
                prompt: "Analyze the code logic for potential improvements, edge cases, and optimization opportunities.".to_string(),
                order: 2,
                decision: Some(DecisionNode {
                    id: "d1".to_string(),
                    condition: "Are there critical issues that need immediate attention?".to_string(),
                    true_branch: Some("s3_critical".to_string()),
                    false_branch: Some("s3_normal".to_string()),
                }),
                next_step: None,
                output_format: Some("markdown".to_string()),
                requires_confirmation: false,
                timeout_secs: Some(120),
            },
            WorkflowStep {
                id: "s3_critical".to_string(),
                name: "Critical Issues Report".to_string(),
                prompt: "Generate a prioritized report of critical issues with suggested fixes. Highlight security vulnerabilities and data integrity risks.".to_string(),
                order: 3,
                decision: None,
                next_step: Some("s4".to_string()),
                output_format: Some("markdown".to_string()),
                requires_confirmation: true,
                timeout_secs: Some(60),
            },
            WorkflowStep {
                id: "s3_normal".to_string(),
                name: "Enhancement Report".to_string(),
                prompt: "Generate a report of suggested enhancements and optimizations, organized by priority and effort required.".to_string(),
                order: 3,
                decision: None,
                next_step: Some("s4".to_string()),
                output_format: Some("markdown".to_string()),
                requires_confirmation: false,
                timeout_secs: Some(60),
            },
            WorkflowStep {
                id: "s4".to_string(),
                name: "Summary".to_string(),
                prompt: "Provide an executive summary of findings with actionable next steps.".to_string(),
                order: 4,
                decision: None,
                next_step: None,
                output_format: Some("markdown".to_string()),
                requires_confirmation: false,
                timeout_secs: Some(30),
            },
        ];
        workflow.output_settings = OutputSettings {
            folder: Some("reports".to_string()),
            file_pattern: Some("code-analysis-{timestamp}.md".to_string()),
            format_description: Some("Markdown report with findings and recommendations".to_string()),
            append_mode: false,
            timestamped: true,
        };
        workflow
    }

    fn create_agent_gatherer_workflow() -> Workflow {
        let mut workflow = Workflow::new(
            "Agent Gatherer".to_string(),
            WorkflowType::Process,
        );
        workflow.id = "agent-gatherer-workflow".to_string();
        workflow.category = "agent-builder".to_string();
        workflow.description = "Discovers agent requirements through interactive questions".to_string();
        workflow.intent = Some("gather agent requirements, discover needs, agent questions".to_string());
        workflow.steps = vec![
            WorkflowStep {
                id: "g1".to_string(),
                name: "Greet & Understand".to_string(),
                prompt: "You are the Agent Gatherer, the first step in creating a new agent.\n\nYour goal is to understand what the user wants the agent to do. Ask clear, focused questions:\n\n1. \"What should this agent do?\" - Get the main purpose\n2. \"What triggers should activate it?\" - Understand when it should run\n3. \"What tools should it have access to?\" - Determine capabilities\n\nBe conversational and helpful. One question at a time. Wait for the user's response before asking the next question.\n\nStart by greeting the user and asking the first question.".to_string(),
                order: 1,
                decision: None,
                next_step: Some("g2".to_string()),
                output_format: Some("text".to_string()),
                requires_confirmation: false,
                timeout_secs: Some(300),
            },
            WorkflowStep {
                id: "g2".to_string(),
                name: "Gather Constraints".to_string(),
                prompt: "Now gather information about constraints and preferences:\n\nAsk these questions (one at a time, wait for responses):\n1. \"Any limitations or restrictions for this agent?\"\n2. \"How should it handle errors?\"\n3. \"Should it notify you when complete?\"\n4. \"Any specific workflows it should use?\"\n\nBe patient and clarify if the user seems unsure.".to_string(),
                order: 2,
                decision: None,
                next_step: Some("g3".to_string()),
                output_format: Some("text".to_string()),
                requires_confirmation: false,
                timeout_secs: Some(300),
            },
            WorkflowStep {
                id: "g3".to_string(),
                name: "Create Discovery Document".to_string(),
                prompt: "Create a discovery document with all gathered information.\n\nUse the write_file tool to save to: .skhoot/agent-discovery/{timestamp}-needs.md\n\nFormat the document as:\n# Agent Discovery: [Agent Name]\n\n## Purpose\n[What the agent does]\n\n## Triggers\n[When it activates]\n\n## Capabilities\n### Tools\n- [List of tools]\n\n### Workflows\n- [List of workflows]\n\n## Constraints\n[Any limitations]\n\n## Error Handling\n[How to handle errors]\n\n## Notifications\n[Notification preferences]\n\n## Additional Notes\n[Any other relevant information]\n\nAfter creating the file, confirm to the user and provide the file path.".to_string(),
                order: 3,
                decision: None,
                next_step: None,
                output_format: Some("file".to_string()),
                requires_confirmation: false,
                timeout_secs: Some(60),
            },
        ];
        workflow.output_settings = OutputSettings {
            folder: Some(".skhoot/agent-discovery".to_string()),
            file_pattern: Some("{timestamp}-needs.md".to_string()),
            format_description: Some("Markdown discovery document".to_string()),
            append_mode: false,
            timestamped: true,
        };
        workflow
    }

    fn create_agent_designer_workflow() -> Workflow {
        let mut workflow = Workflow::new(
            "Agent Designer".to_string(),
            WorkflowType::Process,
        );
        workflow.id = "agent-designer-workflow".to_string();
        workflow.category = "agent-builder".to_string();
        workflow.description = "Designs automation strategy from discovery document".to_string();
        workflow.intent = Some("design agent automation, create agent strategy".to_string());
        workflow.steps = vec![
            WorkflowStep {
                id: "d1".to_string(),
                name: "Read Discovery Document".to_string(),
                prompt: "You are the Agent Designer. Your job is to design the automation strategy.\n\nFirst, read the discovery document that was created by the Agent Gatherer.\nUse the read_file tool to load the most recent file from .skhoot/agent-discovery/\n\nParse the requirements and constraints carefully.".to_string(),
                order: 1,
                decision: None,
                next_step: Some("d2".to_string()),
                output_format: Some("text".to_string()),
                requires_confirmation: false,
                timeout_secs: Some(60),
            },
            WorkflowStep {
                id: "d2".to_string(),
                name: "Design Workflows".to_string(),
                prompt: "Based on the discovery document, design the workflows this agent needs.\n\nFor each workflow, define:\n1. Workflow name and purpose\n2. Steps in the workflow\n3. Tools required for each step\n4. Decision points (if any)\n5. Expected outputs\n\nThink about:\n- What sequence of actions achieves the goal?\n- What tools are needed at each step?\n- Where might the agent need to make decisions?\n- How should errors be handled?\n\nOutput your workflow design in a structured format.".to_string(),
                order: 2,
                decision: None,
                next_step: Some("d3".to_string()),
                output_format: Some("markdown".to_string()),
                requires_confirmation: false,
                timeout_secs: Some(180),
            },
            WorkflowStep {
                id: "d3".to_string(),
                name: "Create Master Prompt".to_string(),
                prompt: "Create the master prompt that defines the agent's behavior and personality.\n\nThe master prompt should:\n1. Define the agent's role and purpose\n2. Specify behavior guidelines\n3. Include success criteria\n4. Define how to interact with users\n5. Specify error handling approach\n\nMake it clear, concise, and actionable. The agent will use this as its core instruction set.\n\nExample format:\n\"You are [Agent Name], responsible for [purpose].\n\nYour primary goals are:\n1. [Goal 1]\n2. [Goal 2]\n\nWhen executing tasks:\n- [Guideline 1]\n- [Guideline 2]\n\nSuccess means: [Success criteria]\n\nIf errors occur: [Error handling]\"".to_string(),
                order: 3,
                decision: None,
                next_step: Some("d4".to_string()),
                output_format: Some("text".to_string()),
                requires_confirmation: false,
                timeout_secs: Some(120),
            },
            WorkflowStep {
                id: "d4".to_string(),
                name: "Update Document".to_string(),
                prompt: "Update the discovery document with the automation design.\n\nUse write_file tool to append to the existing discovery document:\n\n## Automation Design\n\n### Master Prompt\n[The master prompt you created]\n\n### Workflows\n[The workflow designs]\n\n### Required Tools\n[List of all tools needed]\n\n### Implementation Notes\n[Any additional notes for the builder]\n\nConfirm the update to the user.".to_string(),
                order: 4,
                decision: None,
                next_step: None,
                output_format: Some("file".to_string()),
                requires_confirmation: true,
                timeout_secs: Some(60),
            },
        ];
        workflow.output_settings = OutputSettings {
            folder: Some(".skhoot/agent-discovery".to_string()),
            file_pattern: None,
            format_description: Some("Updated discovery document with automation design".to_string()),
            append_mode: false,
            timestamped: false,
        };
        workflow
    }

    fn create_agent_builder_workflow() -> Workflow {
        let mut workflow = Workflow::new(
            "Agent Builder".to_string(),
            WorkflowType::Process,
        );
        workflow.id = "agent-builder-workflow".to_string();
        workflow.category = "agent-builder".to_string();
        workflow.description = "Creates agent via backend API from discovery document".to_string();
        workflow.intent = Some("build agent, create agent from design".to_string());
        workflow.steps = vec![
            WorkflowStep {
                id: "b1".to_string(),
                name: "Read Final Document".to_string(),
                prompt: "You are the Agent Builder. Your job is to create the actual agent.\n\nRead the complete discovery document with the automation design.\nUse read_file tool to load it from .skhoot/agent-discovery/\n\nExtract all the information needed to create the agent:\n- Name\n- Description\n- Master prompt\n- Workflows\n- Tools\n- Trigger configuration".to_string(),
                order: 1,
                decision: None,
                next_step: Some("b2".to_string()),
                output_format: Some("text".to_string()),
                requires_confirmation: false,
                timeout_secs: Some(60),
            },
            WorkflowStep {
                id: "b2".to_string(),
                name: "Validate Configuration".to_string(),
                prompt: "Validate the agent configuration before creating it.\n\nCheck:\n1. Name is not empty\n2. Master prompt is clear and actionable\n3. Tool names are valid (read_file, write_file, search_files, shell, etc.)\n4. Workflow references exist (if any)\n5. Trigger configuration is valid\n\nIf anything is missing or invalid, explain what needs to be fixed.\nIf everything is valid, confirm you're ready to create the agent.".to_string(),
                order: 2,
                decision: Some(DecisionNode {
                    id: "b_decision".to_string(),
                    condition: "Is the configuration valid?".to_string(),
                    true_branch: Some("b3".to_string()),
                    false_branch: Some("b_invalid".to_string()),
                }),
                next_step: None,
                output_format: Some("text".to_string()),
                requires_confirmation: false,
                timeout_secs: Some(60),
            },
            WorkflowStep {
                id: "b_invalid".to_string(),
                name: "Report Validation Errors".to_string(),
                prompt: "The configuration has validation errors. Report them clearly to the user.\n\nExplain:\n1. What's wrong\n2. What needs to be fixed\n3. How to fix it\n\nThe user will need to restart the agent creation process with corrections.".to_string(),
                order: 3,
                decision: None,
                next_step: None,
                output_format: Some("text".to_string()),
                requires_confirmation: false,
                timeout_secs: Some(30),
            },
            WorkflowStep {
                id: "b3".to_string(),
                name: "Create Agent".to_string(),
                prompt: "Create the agent using the create_agent tool.\n\nCall create_agent with:\n{\n  \"name\": \"[agent name]\",\n  \"description\": \"[agent description]\",\n  \"master_prompt\": \"[the master prompt]\",\n  \"workflows\": [\"workflow-id-1\", \"workflow-id-2\"],\n  \"allowed_tools\": [\"tool1\", \"tool2\", \"tool3\"],\n  \"trigger\": {\n    \"type\": \"keyword\",\n    \"keywords\": [\"trigger1\", \"trigger2\"],\n    \"autoActivate\": true\n  }\n}\n\nAfter creation, confirm success and provide the agent ID.".to_string(),
                order: 4,
                decision: None,
                next_step: Some("b4".to_string()),
                output_format: Some("text".to_string()),
                requires_confirmation: false,
                timeout_secs: Some(60),
            },
            WorkflowStep {
                id: "b4".to_string(),
                name: "Confirm Creation".to_string(),
                prompt: "Congratulations! The agent has been created successfully.\n\nProvide the user with:\n1. Agent ID\n2. Agent name\n3. How to use it (trigger keywords or manual invocation)\n4. Next steps (test it, modify it, etc.)\n\nEncourage them to try it out!".to_string(),
                order: 5,
                decision: None,
                next_step: None,
                output_format: Some("text".to_string()),
                requires_confirmation: false,
                timeout_secs: Some(30),
            },
        ];
        workflow.output_settings = OutputSettings {
            folder: None,
            file_pattern: None,
            format_description: Some("Agent creation confirmation".to_string()),
            append_mode: false,
            timestamped: false,
        };
        workflow
    }

    fn create_healthy_meal_planner_workflow() -> Workflow {
        let mut workflow = Workflow::new(
            "Healthy Meal Planner".to_string(),
            WorkflowType::Manual,
        );
        workflow.id = "demo-meal-planner".to_string();
        workflow.category = "demo".to_string();
        workflow.description = "Plans a healthy week of meals with recipes, prices, and budget".to_string();
        workflow.steps = vec![
            WorkflowStep {
                id: "s1".to_string(),
                name: "Find Recipes".to_string(),
                prompt: "Search the web for 10 healthy recipes that are nutritious and easy to make. List them with their main ingredients.".to_string(),
                order: 1,
                decision: None,
                next_step: Some("s2".to_string()),
                output_format: None,
                requires_confirmation: false,
                timeout_secs: Some(120),
            },
            WorkflowStep {
                id: "s2".to_string(),
                name: "Check Prices".to_string(),
                prompt: "Based on the recipes found, search for the current prices of the main ingredients for 2 people. Calculate approximate costs.".to_string(),
                order: 2,
                decision: None,
                next_step: Some("s3".to_string()),
                output_format: None,
                requires_confirmation: false,
                timeout_secs: Some(180),
            },
            WorkflowStep {
                id: "s3".to_string(),
                name: "Create Plan".to_string(),
                prompt: "Create a 7-day meal plan for 2 people using the recipes and prices found. Calculate the total budget. Ensure it is balanced.".to_string(),
                order: 3,
                decision: None,
                next_step: Some("s4".to_string()),
                output_format: None,
                requires_confirmation: false,
                timeout_secs: Some(120),
            },
            WorkflowStep {
                id: "s4".to_string(),
                name: "Generate HTML".to_string(),
                prompt: "Create a beautiful HTML file displaying the meal plan, recipes, and budget. Save it to \"meal_plan.html\" using the write_file tool.".to_string(),
                order: 4,
                decision: None,
                next_step: None,
                output_format: Some("file".to_string()),
                requires_confirmation: false,
                timeout_secs: Some(60),
            },
        ];
        workflow.output_settings = OutputSettings {
            folder: Some("outputs".to_string()),
            file_pattern: Some("meal_plan.html".to_string()),
            format_description: Some("HTML Meal Plan".to_string()),
            append_mode: false,
            timestamped: false,
        };
        workflow.behavior.as_toolcall = true;
        workflow
    }

    /// Get a workflow by ID
    pub async fn get(&self, id: &str) -> Option<Workflow> {
        self.workflows.read().await.get(id).cloned()
    }

    /// List all workflows
    pub async fn list(&self) -> Vec<Workflow> {
        self.workflows.read().await.values().cloned().collect()
    }

    /// List workflows by category
    pub async fn list_by_category(&self, category: &str) -> Vec<Workflow> {
        self.workflows.read().await
            .values()
            .filter(|w| w.category == category)
            .cloned()
            .collect()
    }

    /// List workflows by type
    pub async fn list_by_type(&self, workflow_type: WorkflowType) -> Vec<Workflow> {
        self.workflows.read().await
            .values()
            .filter(|w| w.workflow_type == workflow_type)
            .cloned()
            .collect()
    }

    /// Create a new workflow
    pub async fn create(&self, request: CreateWorkflowRequest) -> Workflow {
        let now = chrono::Utc::now().timestamp();
        let workflow = Workflow {
            id: uuid::Uuid::new_v4().to_string(),
            name: request.name,
            description: request.description,
            category: request.category.unwrap_or_else(|| "custom".to_string()),
            workflow_type: request.workflow_type,
            steps: request.steps,
            intent: request.intent,
            trigger: request.trigger,
            output_settings: request.output_settings,
            behavior: request.behavior,
            created_at: now,
            updated_at: now,
            run_count: 0,
            last_run: None,
            status: WorkflowStatus::Idle,
            variables: HashMap::new(),
        };

        self.workflows.write().await.insert(workflow.id.clone(), workflow.clone());
        workflow
    }

    /// Update a workflow
    pub async fn update(&self, id: &str, workflow: Workflow) -> Option<Workflow> {
        let mut workflows = self.workflows.write().await;
        if workflows.contains_key(id) {
            let mut updated = workflow;
            updated.updated_at = chrono::Utc::now().timestamp();
            workflows.insert(id.to_string(), updated.clone());
            Some(updated)
        } else {
            None
        }
    }

    /// Delete a workflow
    pub async fn delete(&self, id: &str) -> bool {
        self.workflows.write().await.remove(id).is_some()
    }

    /// Update workflow status
    pub async fn update_status(&self, id: &str, status: WorkflowStatus) {
        if let Some(workflow) = self.workflows.write().await.get_mut(id) {
            workflow.status = status;
            workflow.updated_at = chrono::Utc::now().timestamp();
        }
    }

    /// Increment run count
    pub async fn increment_run_count(&self, id: &str) {
        if let Some(workflow) = self.workflows.write().await.get_mut(id) {
            workflow.run_count += 1;
            workflow.last_run = Some(chrono::Utc::now().timestamp());
            workflow.updated_at = chrono::Utc::now().timestamp();
        }
    }

    /// Get workflows that can be used as tool calls
    pub async fn get_toolcall_workflows(&self) -> Vec<Workflow> {
        self.workflows.read().await
            .values()
            .filter(|w| w.behavior.as_toolcall)
            .cloned()
            .collect()
    }
}

impl Default for WorkflowStorage {
    fn default() -> Self {
        Self::new()
    }
}
