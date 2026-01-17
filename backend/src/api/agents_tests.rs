//! Tests for agent API

#[cfg(test)]
mod tests {
    use super::super::*;
    
    #[test]
    fn test_agent_state_serialization() {
        let states = vec![
            (AgentState::On, "\"on\""),
            (AgentState::Off, "\"off\""),
            (AgentState::Sleeping, "\"sleeping\""),
            (AgentState::Failing, "\"failing\""),
        ];
        
        for (state, expected_json) in states {
            let json = serde_json::to_string(&state).unwrap();
            assert_eq!(json, expected_json);
            
            let deserialized: AgentState = serde_json::from_str(&json).unwrap();
            assert_eq!(deserialized, state);
        }
    }
    
    #[test]
    fn test_trigger_config_keyword_serialization() {
        let trigger = TriggerConfig::Keyword {
            keywords: vec!["test".to_string(), "demo".to_string()],
            auto_activate: true,
        };
        
        let json = serde_json::to_string(&trigger).unwrap();
        let deserialized: TriggerConfig = serde_json::from_str(&json).unwrap();
        
        match deserialized {
            TriggerConfig::Keyword { keywords, auto_activate } => {
                assert_eq!(keywords, vec!["test".to_string(), "demo".to_string()]);
                assert_eq!(auto_activate, true);
            }
            _ => panic!("Wrong trigger type"),
        }
    }
    
    #[test]
    fn test_trigger_config_file_event_serialization() {
        let trigger = TriggerConfig::FileEvent {
            patterns: vec!["*.rs".to_string(), "*.toml".to_string()],
            auto_activate: false,
        };
        
        let json = serde_json::to_string(&trigger).unwrap();
        let deserialized: TriggerConfig = serde_json::from_str(&json).unwrap();
        
        match deserialized {
            TriggerConfig::FileEvent { patterns, auto_activate } => {
                assert_eq!(patterns, vec!["*.rs".to_string(), "*.toml".to_string()]);
                assert_eq!(auto_activate, false);
            }
            _ => panic!("Wrong trigger type"),
        }
    }
    
    #[test]
    fn test_trigger_config_manual_serialization() {
        let trigger = TriggerConfig::Manual;
        
        let json = serde_json::to_string(&trigger).unwrap();
        assert!(json.contains("\"type\":\"manual\""));
        
        let deserialized: TriggerConfig = serde_json::from_str(&json).unwrap();
        matches!(deserialized, TriggerConfig::Manual);
    }
    
    #[test]
    fn test_agent_config_default() {
        let config = AgentConfig::default();
        
        assert_eq!(config.max_concurrent_executions, 1);
        assert_eq!(config.timeout_seconds, 300);
        assert_eq!(config.retry_on_failure, false);
        assert_eq!(config.notify_on_complete, true);
    }
    
    #[test]
    fn test_agent_serialization() {
        let agent = Agent {
            id: "test-agent-1".to_string(),
            name: "Test Agent".to_string(),
            description: "A test agent".to_string(),
            tags: vec!["test".to_string(), "demo".to_string()],
            master_prompt: "You are a test agent".to_string(),
            workflows: vec!["workflow-1".to_string()],
            allowed_tools: vec!["read_file".to_string(), "write_file".to_string()],
            allowed_workflows: vec!["workflow-1".to_string()],
            trigger: Some(TriggerConfig::Manual),
            state: AgentState::On,
            is_default: false,
            created_at: 1234567890,
            updated_at: 1234567890,
            last_used_at: None,
            usage_count: 0,
            config: AgentConfig::default(),
        };
        
        let json = serde_json::to_string(&agent).unwrap();
        let deserialized: Agent = serde_json::from_str(&json).unwrap();
        
        assert_eq!(deserialized.id, agent.id);
        assert_eq!(deserialized.name, agent.name);
        assert_eq!(deserialized.state, agent.state);
        assert_eq!(deserialized.tags, agent.tags);
    }
    
    #[test]
    fn test_execution_status_serialization() {
        let statuses = vec![
            (ExecutionStatus::Running, "\"running\""),
            (ExecutionStatus::Completed, "\"completed\""),
            (ExecutionStatus::Failed, "\"failed\""),
            (ExecutionStatus::Cancelled, "\"cancelled\""),
        ];
        
        for (status, expected_json) in statuses {
            let json = serde_json::to_string(&status).unwrap();
            assert_eq!(json, expected_json);
            
            let deserialized: ExecutionStatus = serde_json::from_str(&json).unwrap();
            assert_eq!(deserialized, status);
        }
    }
    
    #[test]
    fn test_create_agent_request_validation() {
        // Valid request
        let valid_request = CreateAgentRequest {
            name: "Test Agent".to_string(),
            description: "Test description".to_string(),
            tags: vec![],
            master_prompt: "Test prompt".to_string(),
            workflows: vec![],
            allowed_tools: vec![],
            allowed_workflows: vec![],
            trigger: None,
            config: AgentConfig::default(),
        };
        
        assert!(!valid_request.name.trim().is_empty());
        assert!(!valid_request.master_prompt.trim().is_empty());
        
        // Invalid request - empty name
        let invalid_name = CreateAgentRequest {
            name: "   ".to_string(),
            description: "Test".to_string(),
            tags: vec![],
            master_prompt: "Test prompt".to_string(),
            workflows: vec![],
            allowed_tools: vec![],
            allowed_workflows: vec![],
            trigger: None,
            config: AgentConfig::default(),
        };
        
        assert!(invalid_name.name.trim().is_empty());
        
        // Invalid request - empty master prompt
        let invalid_prompt = CreateAgentRequest {
            name: "Test".to_string(),
            description: "Test".to_string(),
            tags: vec![],
            master_prompt: "   ".to_string(),
            workflows: vec![],
            allowed_tools: vec![],
            allowed_workflows: vec![],
            trigger: None,
            config: AgentConfig::default(),
        };
        
        assert!(invalid_prompt.master_prompt.trim().is_empty());
    }
    
    #[tokio::test]
    async fn test_agent_storage_save_and_load() {
        let storage = AgentStorage::new().unwrap();
        
        let agent = Agent {
            id: format!("test-{}", uuid::Uuid::new_v4()),
            name: "Test Agent".to_string(),
            description: "Test description".to_string(),
            tags: vec!["test".to_string()],
            master_prompt: "Test prompt".to_string(),
            workflows: vec![],
            allowed_tools: vec![],
            allowed_workflows: vec![],
            trigger: None,
            state: AgentState::On,
            is_default: false,
            created_at: chrono::Utc::now().timestamp(),
            updated_at: chrono::Utc::now().timestamp(),
            last_used_at: None,
            usage_count: 0,
            config: AgentConfig::default(),
        };
        
        // Save agent
        storage.save(&agent).await.unwrap();
        
        // Load agent
        let loaded = storage.load(&agent.id).await.unwrap();
        assert_eq!(loaded.id, agent.id);
        assert_eq!(loaded.name, agent.name);
        
        // Cleanup
        storage.delete(&agent.id).await.unwrap();
    }
    
    #[tokio::test]
    async fn test_agent_storage_list() {
        let storage = AgentStorage::new().unwrap();
        
        let agent1 = Agent {
            id: format!("test-1-{}", uuid::Uuid::new_v4()),
            name: "Test Agent 1".to_string(),
            description: "Test 1".to_string(),
            tags: vec![],
            master_prompt: "Test".to_string(),
            workflows: vec![],
            allowed_tools: vec![],
            allowed_workflows: vec![],
            trigger: None,
            state: AgentState::On,
            is_default: false,
            created_at: chrono::Utc::now().timestamp(),
            updated_at: chrono::Utc::now().timestamp(),
            last_used_at: None,
            usage_count: 0,
            config: AgentConfig::default(),
        };
        
        let agent2 = Agent {
            id: format!("test-2-{}", uuid::Uuid::new_v4()),
            name: "Test Agent 2".to_string(),
            description: "Test 2".to_string(),
            tags: vec![],
            master_prompt: "Test".to_string(),
            workflows: vec![],
            allowed_tools: vec![],
            allowed_workflows: vec![],
            trigger: None,
            state: AgentState::Off,
            is_default: false,
            created_at: chrono::Utc::now().timestamp(),
            updated_at: chrono::Utc::now().timestamp(),
            last_used_at: None,
            usage_count: 0,
            config: AgentConfig::default(),
        };
        
        // Save agents
        storage.save(&agent1).await.unwrap();
        storage.save(&agent2).await.unwrap();
        
        // List agents
        let agents = storage.list().await.unwrap();
        assert!(agents.iter().any(|a| a.id == agent1.id));
        assert!(agents.iter().any(|a| a.id == agent2.id));
        
        // Cleanup
        storage.delete(&agent1.id).await.unwrap();
        storage.delete(&agent2.id).await.unwrap();
    }
    
    #[tokio::test]
    async fn test_agent_storage_delete() {
        let storage = AgentStorage::new().unwrap();
        
        let agent = Agent {
            id: format!("test-delete-{}", uuid::Uuid::new_v4()),
            name: "Test Delete".to_string(),
            description: "Test".to_string(),
            tags: vec![],
            master_prompt: "Test".to_string(),
            workflows: vec![],
            allowed_tools: vec![],
            allowed_workflows: vec![],
            trigger: None,
            state: AgentState::On,
            is_default: false,
            created_at: chrono::Utc::now().timestamp(),
            updated_at: chrono::Utc::now().timestamp(),
            last_used_at: None,
            usage_count: 0,
            config: AgentConfig::default(),
        };
        
        // Save and delete
        storage.save(&agent).await.unwrap();
        storage.delete(&agent.id).await.unwrap();
        
        // Verify deleted
        let result = storage.load(&agent.id).await;
        assert!(result.is_err());
    }
    
    #[tokio::test]
    async fn test_agent_storage_execution() {
        let storage = AgentStorage::new().unwrap();
        
        let execution = AgentExecution {
            id: format!("exec-{}", uuid::Uuid::new_v4()),
            agent_id: "test-agent".to_string(),
            status: ExecutionStatus::Running,
            started_at: chrono::Utc::now().timestamp(),
            completed_at: None,
            current_workflow_id: Some("workflow-1".to_string()),
            context: std::collections::HashMap::new(),
            messages: vec![],
            error: None,
        };
        
        // Save execution
        storage.save_execution(&execution).await.unwrap();
        
        // Load execution
        let loaded = storage.get_execution(&execution.id).await.unwrap();
        assert_eq!(loaded.id, execution.id);
        assert_eq!(loaded.agent_id, execution.agent_id);
        assert_eq!(loaded.status, ExecutionStatus::Running);
    }
}
