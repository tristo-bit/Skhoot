# AI Agent Awareness - System Prompt Documentation

**Last Updated**: January 17, 2026

## Overview

The AI (Skhoot Agent) is now fully aware of the agent system and can guide users to create and use specialized agents.

---

## What the AI Knows

### 1. Agent Tools Available

The AI knows it has access to these agent-related tools:

```typescript
- list_agents: See all available agents and their capabilities
- invoke_agent: Delegate tasks to specialized agents  
- create_agent: Create new agents (via Agent Builder)
```

### 2. Default Agents

The AI knows about these pre-installed agents:

**Agent Builder**
- Purpose: Creates new agents through guided conversation
- Triggers: "create agent", "new agent", "build agent"
- Process: 3-step workflow (gather → design → create)
- Example: "create an agent that reviews pull requests"

**Code Reviewer**
- Purpose: Reviews code for bugs, security, and best practices
- Triggers: "review code", "code review", "check for errors"
- Capabilities: Bug detection, security analysis, performance optimization
- Example: "review the authentication code"

### 3. Agent Creation Process

The AI understands the agent creation workflow:

```
User Request → Agent Builder Triggered → 3 Workflows:
1. Agent Gatherer: Asks questions about requirements
2. Agent Designer: Designs automation strategy
3. Agent Builder: Creates and activates the agent
```

### 4. How to Guide Users

The AI knows to:
- Recognize agent creation requests
- Explain the Agent Builder process
- Use `invoke_agent` tool to trigger Agent Builder
- Be enthusiastic about agent capabilities
- Provide examples of useful agents

---

## Example Interactions

### Creating an Agent

**User**: "Create a very useful agent"

**AI Response** (expected):
```
I can help you create a specialized agent! The Agent Builder will guide you 
through a 3-step process:

1. Gather Requirements - What should the agent do?
2. Design Automation - How should it work?
3. Create Agent - Build and activate it

Some useful agent ideas:
- Log Monitor: Watches log files for errors
- PR Reviewer: Reviews pull requests automatically
- Test Runner: Runs tests before commits
- Documentation Agent: Keeps docs up to date

Would you like to create one? Just tell me what you need!
```

### Using an Existing Agent

**User**: "Review my authentication code"

**AI Response** (expected):
```
I'll invoke the Code Reviewer agent to analyze your authentication code.
[Uses invoke_agent tool with Code Reviewer]
```

### Listing Agents

**User**: "What agents do I have?"

**AI Response** (expected):
```
[Uses list_agents tool]

You have these agents available:
1. Agent Builder - Creates new agents
2. Code Reviewer - Reviews code quality and security
[... any custom agents ...]
```

---

## System Prompt Excerpt

```
AGENT SYSTEM:
You have access to a powerful agent system that allows you to create 
specialized AI agents for specific tasks.

Available Agent Tools:
1. 'list_agents' - See all available agents and their capabilities
2. 'invoke_agent' - Delegate tasks to specialized agents
3. 'create_agent' - Create new agents (via Agent Builder)

Default Agents Available:
- Agent Builder: Creates new agents through guided conversation
  * Trigger: Say "create agent", "new agent", or "build agent"
  * Process: Asks questions → Designs automation → Creates agent
  * Example: "create an agent that reviews pull requests"
  
- Code Reviewer: Reviews code for bugs, security, and best practices
  * Trigger: Say "review code", "code review", or "check for errors"
  * Analyzes code quality, security vulnerabilities, performance issues
  * Example: "review the authentication code"

How to Create Agents:
When a user asks you to create an agent, you can:
1. Use the 'invoke_agent' tool to trigger the Agent Builder
2. Or simply mention keywords like "create agent" and the Agent Builder 
   will activate
3. The Agent Builder will guide the user through a 3-step process:
   - Gather requirements (what should the agent do?)
   - Design automation (how should it work?)
   - Create the agent (build and activate it)

Agent Creation Examples:
- "Create an agent that monitors log files for errors"
- "Build an agent to review pull requests"
- "Make an agent that runs tests before commits"
- "Create a documentation agent"

When users ask about agents or want to create one, be enthusiastic and 
explain the process!
```

---

## Testing Checklist

Test these interactions to verify AI awareness:

- [ ] User: "Create an agent" → AI explains process and offers help
- [ ] User: "What can you do?" → AI mentions agent creation capability
- [ ] User: "Review my code" → Code Reviewer agent activates
- [ ] User: "What agents do I have?" → AI uses list_agents tool
- [ ] User: "Create a log monitoring agent" → Agent Builder activates
- [ ] User: "How do I create an agent?" → AI explains the 3-step process

---

## Benefits

1. **Discoverability**: Users learn about agents naturally through conversation
2. **Guidance**: AI can explain the agent creation process
3. **Automation**: Keyword triggers activate agents automatically
4. **Flexibility**: Users can create custom agents for any task
5. **Delegation**: AI can invoke specialized agents for specific tasks

---

## Future Enhancements

- [ ] AI suggests relevant agents based on user tasks
- [ ] AI recommends creating agents for repetitive tasks
- [ ] AI explains agent capabilities in more detail
- [ ] AI helps users modify existing agents
- [ ] AI suggests agent combinations for complex workflows

---

## Conclusion

The AI is now fully equipped to:
✅ Explain the agent system
✅ Guide users through agent creation
✅ Invoke specialized agents
✅ List available agents
✅ Recommend useful agent ideas

**The AI is ready to create agents for users!** 🚀
