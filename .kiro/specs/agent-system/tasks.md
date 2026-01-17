# Agent System - Implementation Tasks

## Phase 1: Backend Foundation (Week 1)

### Task 1.1: Rust Backend API Structure
**Priority**: High  
**Estimated Time**: 4 hours

- [ ] Create `backend/src/api/agents.rs`
- [ ] Define Agent struct with serde serialization
- [ ] Define AgentExecution struct
- [ ] Define TriggerConfig struct
- [ ] Add error types for agent operations
- [ ] Export module in `backend/src/api/mod.rs`

**Acceptance Criteria**:
- All structs compile without errors
- Serde serialization/deserialization works
- Error types cover all failure cases

---

### Task 1.2: Agent Storage Layer
**Priority**: High  
**Estimated Time**: 6 hours

- [ ] Create `AgentStorage` struct
- [ ] Implement `save()` method
- [ ] Implement `load()` method
- [ ] Implement `list()` method
- [ ] Implement `delete()` method
- [ ] Add file locking for concurrent access
- [ ] Create `.skhoot/agents/` directory on init
- [ ] Add error handling for file operations

**Acceptance Criteria**:
- Agents persist to JSON files
- Concurrent access doesn't corrupt data
- Directory created automatically
- All errors handled gracefully

---

### Task 1.3: Agent API Endpoints
**Priority**: High  
**Estimated Time**: 8 hours

- [ ] Implement `POST /api/agents` (create)
- [ ] Implement `GET /api/agents` (list with filters)
- [ ] Implement `GET /api/agents/:id` (get details)
- [ ] Implement `PUT /api/agents/:id` (update)
- [ ] Implement `DELETE /api/agents/:id` (delete)
- [ ] Implement `POST /api/agents/:id/execute` (execute)
- [ ] Add request validation
- [ ] Add response formatting
- [ ] Register routes in main.rs

**Acceptance Criteria**:
- All endpoints return correct status codes
- Request validation catches invalid data
- Responses match defined schema
- Routes accessible via HTTP

---

### Task 1.4: Backend Tests
**Priority**: Medium  
**Estimated Time**: 4 hours

- [ ] Create `backend/src/api/agents_tests.rs`
- [ ] Test agent creation
- [ ] Test agent retrieval
- [ ] Test agent updates
- [ ] Test agent deletion
- [ ] Test storage operations
- [ ] Test error cases
- [ ] Add property-based tests with proptest

**Acceptance Criteria**:
- All tests pass
- Code coverage >80%
- Edge cases covered
- Property tests validate invariants

---

## Phase 2: Frontend Service (Week 1-2)

### Task 2.1: Agent Service Structure
**Priority**: High  
**Estimated Time**: 6 hours

- [ ] Create `services/agentService.ts`
- [ ] Define Agent interface
- [ ] Define AgentExecution interface
- [ ] Define TriggerConfig interface
- [ ] Create AgentService class
- [ ] Add in-memory storage (Map)
- [ ] Add event system
- [ ] Export singleton instance

**Acceptance Criteria**:
- All interfaces match backend schema
- Service instantiates correctly
- Event system functional
- TypeScript types are strict

---

### Task 2.2: Agent CRUD Operations
**Priority**: High  
**Estimated Time**: 6 hours

- [ ] Implement `list()` method
- [ ] Implement `get()` method
- [ ] Implement `create()` method
- [ ] Implement `update()` method
- [ ] Implement `delete()` method
- [ ] Add backend API integration
- [ ] Add error handling
- [ ] Add loading states
- [ ] Emit events on changes

**Acceptance Criteria**:
- All methods call backend correctly
- Errors handled and reported
- Events emitted on state changes
- Loading states tracked

---

### Task 2.3: Agent Execution System
**Priority**: High  
**Estimated Time**: 8 hours

- [ ] Implement `execute()` method
- [ ] Implement `cancelExecution()` method
- [ ] Implement `getActiveExecutions()` method
- [ ] Add workflow integration
- [ ] Add tool execution
- [ ] Add message sending to chat
- [ ] Add execution state tracking
- [ ] Add timeout handling
- [ ] Add retry logic

**Acceptance Criteria**:
- Agents execute workflows correctly
- Tools are called with proper permissions
- Messages appear in chat
- Timeouts work correctly
- Retries happen on failure

---

### Task 2.4: Trigger System
**Priority**: Medium  
**Estimated Time**: 4 hours

- [ ] Implement `checkMessageTriggers()` method
- [ ] Implement `checkFileTriggers()` method
- [ ] Add keyword matching
- [ ] Add file pattern matching
- [ ] Add trigger event listeners
- [ ] Integrate with chat system
- [ ] Integrate with file system events

**Acceptance Criteria**:
- Keyword triggers activate agents
- File triggers activate agents
- Multiple agents can trigger
- No false positives

---

### Task 2.5: Tool Integration
**Priority**: High  
**Estimated Time**: 6 hours

- [ ] Define agent toolcall schemas
- [ ] Implement `invoke_agent` toolcall
- [ ] Implement `create_agent` toolcall
- [ ] Add tool permission checking
- [ ] Add tool execution tracking
- [ ] Integrate with agentChatService
- [ ] Add error handling for tool failures

**Acceptance Criteria**:
- Chat AI can invoke agents
- Agent Builder can create agents
- Permissions enforced
- Tool errors handled gracefully

---

## Phase 3: UI Components (Week 2)

### Task 3.1: AgentsPanel Component
**Priority**: High  
**Estimated Time**: 8 hours

- [ ] Create `components/panels/AgentsPanel.tsx`
- [ ] Use SecondaryPanel component
- [ ] Add 3 tabs (Agents, Running, Create)
- [ ] Add split view (list + detail)
- [ ] Add search/filter bar
- [ ] Add state management with useState
- [ ] Add event listeners for service events
- [ ] Style with embossed design system

**Acceptance Criteria**:
- Panel opens/closes smoothly
- Tabs switch correctly
- Split view responsive
- Matches design system
- No layout shifts

---

### Task 3.2: Agent List View
**Priority**: High  
**Estimated Time**: 6 hours

- [ ] Create `AgentList` component
- [ ] Create `AgentListItem` component
- [ ] Add state indicators
- [ ] Add quick actions (run, edit, delete)
- [ ] Add grouping by category
- [ ] Add search functionality
- [ ] Add filter by state
- [ ] Add empty state

**Acceptance Criteria**:
- All agents displayed
- State indicators accurate
- Quick actions work
- Search filters correctly
- Empty state shows when no agents

---

### Task 3.3: Agent Detail View
**Priority**: High  
**Estimated Time**: 8 hours

- [ ] Create `AgentDetail` component
- [ ] Add edit mode toggle
- [ ] Add collapsible sections
- [ ] Add master prompt editor
- [ ] Add workflow selector
- [ ] Add tool selector
- [ ] Add trigger configuration
- [ ] Add config options
- [ ] Add save/cancel buttons

**Acceptance Criteria**:
- All fields editable
- Changes save correctly
- Validation works
- UI responsive
- No data loss on cancel

---

### Task 3.4: Agent Creator
**Priority**: High  
**Estimated Time**: 6 hours

- [ ] Create `AgentCreator` component
- [ ] Add form fields for all properties
- [ ] Add workflow multi-select
- [ ] Add tool multi-select
- [ ] Add trigger configuration UI
- [ ] Add validation
- [ ] Add preview mode
- [ ] Add create/cancel buttons

**Acceptance Criteria**:
- All fields functional
- Validation prevents invalid agents
- Preview shows final config
- Create button calls service
- Cancel resets form

---

### Task 3.5: Running Executions View
**Priority**: Medium  
**Estimated Time**: 4 hours

- [ ] Create `RunningExecutions` component
- [ ] Create `ExecutionItem` component
- [ ] Add progress indicators
- [ ] Add current workflow display
- [ ] Add cancel button
- [ ] Add execution logs
- [ ] Add empty state

**Acceptance Criteria**:
- Active executions displayed
- Progress updates in real-time
- Cancel works correctly
- Logs show execution steps
- Empty state when no executions

---

### Task 3.6: App Integration
**Priority**: High  
**Estimated Time**: 3 hours

- [ ] Add `isAgentsPanelOpen` state to App.tsx
- [ ] Add `toggleAgentsPanel` handler
- [ ] Add `closeAgentsPanel` handler
- [ ] Wire up "Agents" quick action button
- [ ] Add panel to render tree
- [ ] Add keyboard shortcut (Ctrl+Shift+A)
- [ ] Close other panels when opening agents

**Acceptance Criteria**:
- Agents button opens panel
- Panel closes correctly
- Only one panel open at a time
- Keyboard shortcut works
- State persists during session

---

## Phase 4: Agent Builder (Week 2-3)

### Task 4.1: Agent Gatherer Workflow
**Priority**: High  
**Estimated Time**: 6 hours

- [ ] Create workflow definition
- [ ] Add step 1: Greet & Understand
- [ ] Add step 2: Gather Constraints
- [ ] Add step 3: Create Discovery Document
- [ ] Add prompts for each step
- [ ] Add file writing logic
- [ ] Test workflow execution

**Acceptance Criteria**:
- Workflow asks appropriate questions
- Responses captured correctly
- Discovery document created
- Document format correct
- Workflow completes successfully

---

### Task 4.2: Agent Designer Workflow
**Priority**: High  
**Estimated Time**: 6 hours

- [ ] Create workflow definition
- [ ] Add step 1: Read Discovery Document
- [ ] Add step 2: Design Workflows
- [ ] Add step 3: Create Master Prompt
- [ ] Add step 4: Update Document
- [ ] Add file reading logic
- [ ] Add file updating logic
- [ ] Test workflow execution

**Acceptance Criteria**:
- Workflow reads document correctly
- Design is logical and complete
- Master prompt is well-formed
- Document updated correctly
- Workflow completes successfully

---

### Task 4.3: Agent Builder Workflow
**Priority**: High  
**Estimated Time**: 6 hours

- [ ] Create workflow definition
- [ ] Add step 1: Read Final Document
- [ ] Add step 2: Validate Configuration
- [ ] Add step 3: Call Backend API
- [ ] Add step 4: Confirm Creation
- [ ] Add validation logic
- [ ] Add API call logic
- [ ] Add error handling
- [ ] Test workflow execution

**Acceptance Criteria**:
- Workflow reads document correctly
- Validation catches errors
- API call succeeds
- New agent created
- User notified of success

---

### Task 4.4: Agent Builder Agent
**Priority**: High  
**Estimated Time**: 4 hours

- [ ] Create default agent definition
- [ ] Link all 3 workflows
- [ ] Add master prompt
- [ ] Add trigger configuration
- [ ] Add to default agents list
- [ ] Test end-to-end flow
- [ ] Add to agent service initialization

**Acceptance Criteria**:
- Agent appears in list
- Triggers on keywords
- Executes all workflows
- Creates functional agents
- Error handling works

---

### Task 4.5: Create Agent Toolcall
**Priority**: High  
**Estimated Time**: 4 hours

- [ ] Define toolcall schema
- [ ] Implement toolcall handler
- [ ] Add to agentChatService
- [ ] Add permission check (only Agent Builder)
- [ ] Add validation
- [ ] Add error handling
- [ ] Test with Agent Builder

**Acceptance Criteria**:
- Toolcall schema correct
- Handler creates agents
- Only Agent Builder can use it
- Validation prevents bad data
- Errors reported clearly

---

## Phase 5: Multi-Participant Chat (Week 3)

### Task 5.1: Message Structure Update
**Priority**: High  
**Estimated Time**: 4 hours

- [ ] Update Message interface
- [ ] Add participant field
- [ ] Add participant types (user, ai, agent)
- [ ] Add agent metadata
- [ ] Update message creation
- [ ] Update message storage
- [ ] Migrate existing messages

**Acceptance Criteria**:
- New messages have participant info
- Old messages still render
- No data loss
- TypeScript types updated

---

### Task 5.2: Message Rendering
**Priority**: High  
**Estimated Time**: 6 hours

- [ ] Update MessageBubble component
- [ ] Add participant header
- [ ] Add participant icons
- [ ] Add color coding by type
- [ ] Add agent execution badge
- [ ] Style for each participant type
- [ ] Test with all types

**Acceptance Criteria**:
- User messages styled correctly
- AI messages styled correctly
- Agent messages styled correctly
- Icons display properly
- Colors match design system

---

### Task 5.3: Agent Message Sending
**Priority**: High  
**Estimated Time**: 4 hours

- [ ] Add `sendMessage()` to agentService
- [ ] Dispatch message events
- [ ] Update chat interface to listen
- [ ] Add message to conversation
- [ ] Update UI immediately
- [ ] Test with multiple agents

**Acceptance Criteria**:
- Agents can send messages
- Messages appear in chat
- Participant info correct
- No duplicate messages
- Order preserved

---

### Task 5.4: Conversation Context
**Priority**: Medium  
**Estimated Time**: 4 hours

- [ ] Add conversation history to agent context
- [ ] Filter by participant type
- [ ] Add message threading
- [ ] Add context limits
- [ ] Test with long conversations

**Acceptance Criteria**:
- Agents see conversation history
- Context doesn't exceed limits
- Threading works correctly
- Performance acceptable

---

## Phase 6: Polish & Testing (Week 3-4)

### Task 6.1: Error Handling
**Priority**: High  
**Estimated Time**: 6 hours

- [ ] Add error boundaries
- [ ] Add error notifications
- [ ] Add retry mechanisms
- [ ] Add error recovery
- [ ] Add error logging
- [ ] Test all error paths

**Acceptance Criteria**:
- No unhandled errors
- User sees clear error messages
- Retries work correctly
- App doesn't crash
- Errors logged for debugging

---

### Task 6.2: Performance Optimization
**Priority**: Medium  
**Estimated Time**: 6 hours

- [ ] Add React.memo to list items
- [ ] Add useMemo for expensive computations
- [ ] Add useCallback for handlers
- [ ] Add virtual scrolling if needed
- [ ] Profile and optimize
- [ ] Test with 100+ agents

**Acceptance Criteria**:
- Panel opens in <100ms
- List scrolls smoothly
- No unnecessary re-renders
- Memory usage acceptable
- Works with 100+ agents

---

### Task 6.3: Integration Testing
**Priority**: High  
**Estimated Time**: 8 hours

- [ ] Test agent creation via UI
- [ ] Test agent creation via natural language
- [ ] Test agent execution
- [ ] Test workflow integration
- [ ] Test tool integration
- [ ] Test multi-participant chat
- [ ] Test error scenarios
- [ ] Test edge cases

**Acceptance Criteria**:
- All flows work end-to-end
- No regressions
- Edge cases handled
- Performance acceptable

---

### Task 6.4: Documentation
**Priority**: Medium  
**Estimated Time**: 6 hours

- [ ] Write user guide
- [ ] Write developer docs
- [ ] Add JSDoc comments
- [ ] Create architecture diagram
- [ ] Add troubleshooting guide
- [ ] Add examples
- [ ] Update README

**Acceptance Criteria**:
- All public APIs documented
- User guide complete
- Examples work
- Diagrams accurate
- README updated

---

### Task 6.5: User Testing
**Priority**: Medium  
**Estimated Time**: 4 hours

- [ ] Create test scenarios
- [ ] Recruit test users
- [ ] Conduct testing sessions
- [ ] Gather feedback
- [ ] Prioritize improvements
- [ ] Implement critical fixes

**Acceptance Criteria**:
- 5+ users tested
- Feedback documented
- Critical issues fixed
- UX improvements identified

---

## Summary

**Total Estimated Time**: ~160 hours (4 weeks)

**Critical Path**:
1. Backend API (Tasks 1.1-1.3)
2. Frontend Service (Tasks 2.1-2.3)
3. UI Components (Tasks 3.1-3.6)
4. Agent Builder (Tasks 4.1-4.5)
5. Integration & Testing (Task 6.3)

**Dependencies**:
- Phase 2 depends on Phase 1
- Phase 3 depends on Phase 2
- Phase 4 depends on Phases 2 & 3
- Phase 5 depends on Phases 2 & 3
- Phase 6 depends on all previous phases

**Risk Mitigation**:
- Start with backend to validate architecture
- Build UI incrementally with frequent testing
- Test Agent Builder early and often
- Keep multi-participant chat simple initially
- Budget extra time for integration issues
