# Skhoot Workflow Engine: Next-Level Architecture Plan

## 1. Executive Summary
The current Workflow implementation functions primarily as a "Chat Scripter," relying on the React UI to simulate user input and drive execution. This design prevents background operations, clutters the interface with intermediate steps, and creates a fragile dependency on the view layer.

The **Next-Gen Workflow Engine** will move execution logic into the Service layer, creating a truly autonomous system. Crucially, the UI will shift to a **"Single Message Paradigm,"** where the entire lifecycle of a workflow—progress, user input, and results—is contained within a single, dynamic chat bubble, keeping the conversation clean and efficient.

## 2. Analysis: Design Intention vs. Application

| Feature | Design Intention | Current Flaws |
| :--- | :--- | :--- |
| **Execution Engine** | Robust, independent service. | **UI-Bound**: Relies on `ChatInterface` to execute. Fails if UI is closed. |
| **User Experience** | Automated assistance. | **Chat Spam**: Simulates user typing for every step, flooding history. |
| **Interactions** | Seamless branching. | **Disjointed**: User inputs appear as separate, disconnected messages. |
| **Background Tasks** | Silent operation. | **Broken**: Logic explicitly prevents background runs because the UI can't handle them. |

## 3. Architecture Overview

### 3.1 Service Layer: The Headless Engine
*   **`WorkflowExecutor`**: A new class in `services/` responsible for the state machine (Step -> AI -> Decision -> Next Step). It runs independently of React.
*   **Direct AI Integration**: Calls `agentChatService` directly, bypassing the UI message simulation.
*   **Event Bus**: Emits rich events (`step_start`, `step_wait_input`, `workflow_complete`) that the UI subscribes to.

### 3.2 UI Layer: The Single Message Paradigm
*   **`UnifiedWorkflowMessage`**: A single React component that renders the entire workflow state.
*   **Dynamic Updates**: Instead of appending new messages, `ChatInterface` finds this specific message ID and updates its props in place.
*   **Embedded Interaction**: When the workflow needs input, the form renders *inside* the message card.

## 4. The UI Concept: "The Stacked Layout"

A single workflow execution message is composed of 5 vertical sections, rendered only if relevant. This ensures the chat history tells a coherent story in one place.

```text
+---------------------------------------------------------------+
| [1] Introductory Text                                         |
| "I will run the 'Code Analysis' workflow to check for bugs."   |
+---------------------------------------------------------------+
| [2] Unified Workflow Card                                     |
| +-----------------------------------------------------------+ |
| | [Status Icon] Workflow Name                     [Cancel]  | |
| +-----------------------------------------------------------+ |
| | > Step 1: Scanning Files... (Completed)                   | |
| | > Step 2: Analyzing Logic... (Running)                    | |
| +-----------------------------------------------------------+ |
+---------------------------------------------------------------+
| [3] Input Zone (Conditional)                                  |
| (Appears only when status is 'waiting_for_input')             |
| "Please select the directory to scan:"                        |
| [ ./src/components/  v ]  [ Confirm ]                         |
+---------------------------------------------------------------+
| [4] Output Text                                               |
| "I have finished the analysis. No critical bugs found."        |
+---------------------------------------------------------------+
| [5] Artifacts / Data Object                                   |
| [ File: report.md (2kb) ]                                     |
| [ File: summary.json (500b) ]                                 |
+---------------------------------------------------------------+
```

### Data Structure for Message
To support this, the `Message` type will need to store these distinct parts:
```typescript
interface WorkflowMessage extends Message {
  content: string; // [1] Intro Text
  workflowExecution: {
     // ... execution state for [2]
  };
  inputRequest?: {
     prompt: string;
     schema: any; // for [3]
  };
  completion?: {
     text: string; // [4] Output Text
     artifacts: any[]; // [5] Output Object
  };
}
```

## 5. Requirements

### Functional
1.  **Headless Execution**: Workflows must run to completion even if the user navigates away or minimizes the window.
2.  **Message Stability**: The main chat history must gain exactly *one* message object per workflow execution.
3.  **Input Interception**: The Engine must be able to pause, request input via event, and resume upon receiving data.
4.  **Artifact Collection**: All file paths and results generated during the run must be aggregated into the final result object.

### Non-Functional
1.  **Responsiveness**: UI updates must happen in <100ms of state change.
2.  **Persistence**: If the app restarts, the UI should be able to reconstruct the card state from the saved execution history.

## 6. Implementation Stories

### Phase 1: The Headless Engine (Backend)

#### Story 1: Create WorkflowExecutor Class
**As a** Developer
**I want** a dedicated class for executing workflow steps
**So that** logic is decoupled from the React View.

*   **Task**: Create `services/WorkflowExecutor.ts`.
*   **Task**: Move `executeStep` logic from `ChatInterface` to this class.
*   **Task**: Implement the `while (nextStep)` loop logic with state management.
*   **Acceptance**: A unit test runs a mock workflow to completion without rendering React.

#### Story 2: Integrate Direct AI Execution
**As a** System
**I want** the Executor to call the LLM directly
**So that** we don't need to simulate user chat messages.

*   **Task**: Inject `AgentChatService` into `WorkflowExecutor`.
*   **Task**: Implement `executeStepWithAI` to use `agentChatService.executeWithTools` with a clean context window.

### Phase 2: The Unified UI (Frontend)

#### Story 3: The Unified Workflow Message Component
**As a** User
**I want** to see the workflow progress, inputs, and results in a single stacked message
**So that** I can see the full context without scrolling through multiple bubbles.

*   **Task**: Update `Message` type in `types.ts` to support `inputRequest` and `completion` fields.
*   **Task**: Create `components/chat/UnifiedWorkflowMessage.tsx` implementing the 5-part stack layout.
*   **Task**: Implement the "Input Zone" which only renders when `workflowExecution.status === 'waiting'`.
*   **Task**: Implement the "Artifacts Tray" to display `completion.artifacts`.

#### Story 4: Event-Driven UI Updates
**As a** User
**I want** the card to update in real-time
**So that** I know exactly what the agent is doing.

*   **Task**: Update `ChatInterface` to listen for `workflow_update` events.
*   **Task**: Implement logic to find the existing message by `executionId` and update it in place using `setMessages`.
*   **Task**: Ensure "Intro Text" is set on initialization and "Output Text" is set on completion.

#### Story 5: Embedded Input Interaction
**As a** User
**I want** to answer the agent's questions directly in the card
**So that** I don't have to use the main chat input which might be ambiguous.

*   **Task**: Create `WorkflowInputForm` component.
*   **Task**: Connect the form submit to `workflowService.resumeExecution(id, input)`.
*   **Task**: Upon submission, the Input Zone should disappear (or become read-only) and the Workflow Card should resume "Running" state.

### Phase 3: Advanced Logic

#### Story 6: Robust Decision Engine
**As a** Developer
**I want** reliable branching logic
**So that** workflows don't fail due to "chatty" AI responses.

*   **Task**: Refactor Decision steps to use a strictly typed `submit_decision` tool or JSON schema.
*   **Task**: Update Executor to validate decision outputs before branching.

#### Story 7: Background & Hook Support
**As a** Power User
**I want** specific workflows to run silently
**So that** system maintenance can happen without interrupting my work.

*   **Task**: Implement `background: true` flag handling.
*   **Task**: If background, UI shows a small status indicator (toast) instead of a full chat card.
