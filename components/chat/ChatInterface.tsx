import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { COLORS, WELCOME_MESSAGES, QUICK_ACTIONS } from '../../src/constants';
import { Message, AgentToolCallData, AgentToolResultData } from '../../types';
import { aiService, type AIMessage } from '../../services/aiService';
import { agentService } from '../../services/agentService';
import { agentChatService } from '../../services/agentChatService';
import { workflowService, WorkflowStep, ExecutionContext } from '../../services/workflowService';
import { activityLogger } from '../../services/activityLogger';
import { nativeNotifications } from '../../services/nativeNotifications';
import { imageStorage } from '../../services/imageStorage';
import { aiSettingsService } from '../../services/aiSettingsService';
import { MainArea } from '../main-area';
import { PromptArea } from './PromptArea';
import { ToolCallInput } from './ToolCallInput';
import { UnifiedWorkflowMessage } from './UnifiedWorkflowMessage';
import { TerminalView } from '../terminal';
import { FileExplorerPanel } from '../panels/FileExplorerPanel';
import { WorkflowsPanel } from '../panels/WorkflowsPanel';
import { useVoiceRecording } from './hooks';
import { useAgentLogTab } from '../../hooks';

interface ChatInterfaceProps {
  chatId: string | null;
  getPendingChatId?: () => string | null;
  initialMessages: Message[];
  onMessagesChange: (messages: Message[]) => void;
  onActiveModeChange?: (mode: string | null) => void;
  isTerminalOpen?: boolean;
  onToggleTerminal?: () => void;
  isFileExplorerOpen?: boolean;
  onToggleFileExplorer?: () => void;
  isWorkflowsOpen?: boolean;
  onToggleWorkflows?: () => void;
  isAgentsOpen?: boolean;
  onToggleAgents?: () => void;
  /** Callback when agent mode changes */
  onAgentModeChange?: (isAgentMode: boolean) => void;
  workingDirectory?: string;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  chatId,
  getPendingChatId,
  initialMessages, 
  onMessagesChange, 
  onActiveModeChange,
  isTerminalOpen = false,
  onToggleTerminal,
  isFileExplorerOpen = false,
  onToggleFileExplorer,
  isWorkflowsOpen = false,
  onToggleWorkflows,
  isAgentsOpen = false,
  onToggleAgents,
  onAgentModeChange,
  workingDirectory = '~',
}) => {
  // State
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchType, setSearchType] = useState<'files' | 'messages' | 'disk' | 'cleanup' | null>(null);
  const [searchStatus, setSearchStatus] = useState<string>('');
  const [activeMode, setActiveMode] = useState<string | null>(null);
  const [turnCount, setTurnCount] = useState(0);
  const [promptKey, setPromptKey] = useState(0);
  const [welcomeMessage] = useState(() => 
    WELCOME_MESSAGES[Math.floor(Math.random() * WELCOME_MESSAGES.length)]
  );
  const [isEmptyStateVisible, setIsEmptyStateVisible] = useState(initialMessages.length === 0);
  const [isEmptyStateExiting, setIsEmptyStateExiting] = useState(false);
  const [queuedMessage, setQueuedMessage] = useState<string | null>(null);
  const [selectedToolCall, setSelectedToolCall] = useState<any | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [waitingForInput, setWaitingForInput] = useState<{ executionId: string; stepId: string; mode?: 'input' | 'confirmation' } | null>(null);
  const isProcessingStep = useRef(false);
  
  // Refs
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const partialResponseRef = useRef<string>('');

  // Voice recording hook
  const {
    isRecording,
    voiceTranscript,
    pendingVoiceText,
    hasPendingVoiceMessage,
    audioLevels,
    audioStream,
    handleMicClick,
    stopRecording,
    discardVoice,
    editVoiceTranscript,
  } = useVoiceRecording(inputRef);

  // Agent mode hook
  const {
    isAgentMode,
    agentSessionId,
    shouldShowAgentLog,
    isCreatingSession: isAgentLoading,
    error: agentError,
    toggleAgentMode,
    closeAgentSession,
    getSessionId,
  } = useAgentLogTab({
    conversationId: chatId,
    onAgentModeChange: (isAgent) => {
      onAgentModeChange?.(isAgent);
    },
  });

  // Debug: Log agent mode state changes
  useEffect(() => {
    console.log('[ChatInterface] Agent state:', { isAgentMode, agentSessionId, isAgentLoading, agentError });
  }, [isAgentMode, agentSessionId, isAgentLoading, agentError]);

  // Computed values
  const activeColor = useMemo(() => {
    const action = QUICK_ACTIONS.find(a => a.id === activeMode);
    return action?.color ?? COLORS.almostAqua;
  }, [activeMode]);

  const hasMessages = messages.length > 0;
  const hasVoiceContent = voiceTranscript.length > 0 || pendingVoiceText.length > 0;

  // Notify parent when activeMode changes
  useEffect(() => {
    onActiveModeChange?.(activeMode);
  }, [activeMode, onActiveModeChange]);

  // Reset activeMode when panels are closed
  useEffect(() => {
    // If a panel-opening mode is active but all panels are closed, reset the mode
    if (activeMode === 'Files' && !isFileExplorerOpen) {
      setActiveMode(null);
    } else if (activeMode === 'Workflows' && !isWorkflowsOpen) {
      setActiveMode(null);
    } else if (activeMode === 'Agents' && !isAgentsOpen) {
      setActiveMode(null);
    }
  }, [isFileExplorerOpen, isWorkflowsOpen, isAgentsOpen, activeMode]);

  // Keyboard shortcut for agent mode toggle (Ctrl+Shift+A)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        toggleAgentMode();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleAgentMode]);

  // Listen for highlight-message event (from ActivityPanel navigation)
  useEffect(() => {
    const handleHighlightMessage = (event: CustomEvent) => {
      const { messageId } = event.detail;
      console.log('[ChatInterface] Highlight message event received:', messageId);
      console.log('[ChatInterface] Current messages:', messages.map(m => m.id));
      
      if (messageId) {
        // Set highlighted state immediately
        console.log('[ChatInterface] Setting highlightedMessageId to:', messageId);
        setHighlightedMessageId(messageId);
        
        // Try multiple times to find and scroll to the message - optimized for speed
        let attempts = 0;
        const maxAttempts = 15; // Increased attempts but faster intervals
        
        const tryScroll = () => {
          attempts++;
          const messageElement = document.getElementById(`message-${messageId}`);
          console.log(`[ChatInterface] Attempt ${attempts}: Looking for message-${messageId}`, messageElement);
          
          if (messageElement) {
            console.log('[ChatInterface] ✅ Message element found! Scrolling...');
            messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Remove highlight after 3.5 seconds
            setTimeout(() => {
              console.log('[ChatInterface] Removing highlight');
              setHighlightedMessageId(null);
            }, 3500);
          } else if (attempts < maxAttempts) {
            console.log(`[ChatInterface] ⏳ Message not found yet, retrying in 50ms...`);
            setTimeout(tryScroll, 50); // Reduced from 100ms to 50ms
          } else {
            console.error('[ChatInterface] ❌ Message element not found after', maxAttempts, 'attempts');
            console.log('[ChatInterface] Available message elements:', 
              Array.from(document.querySelectorAll('[id^="message-"]')).map(el => el.id)
            );
            // Still remove highlight even if scroll failed
            setTimeout(() => {
              setHighlightedMessageId(null);
            }, 3500);
          }
        };
        
        // Start trying immediately - no initial delay
        tryScroll();
      }
    };

    window.addEventListener('highlight-message', handleHighlightMessage as EventListener);
    return () => {
      window.removeEventListener('highlight-message', handleHighlightMessage as EventListener);
    };
  }, [messages]);

  // Notify parent when messages change
  useEffect(() => {
    if (messages.length > 0) {
      onMessagesChange(messages);
    }
  }, [messages, onMessagesChange]);

  // Helper to get effective chatId (current or pending)
  const getEffectiveChatId = useCallback((): string | undefined => {
    const effectiveId = chatId || getPendingChatId?.() || undefined;
    return effectiveId || undefined;
  }, [chatId, getPendingChatId]);

  // Demo event listener
  useEffect(() => {
    const createUserMessage = (content: string): Message => ({
      id: Date.now().toString(),
      role: 'user',
      content,
      type: 'text',
      timestamp: new Date()
    });

    const createAssistantMessage = (content: string, msgType: Message['type'], msgData?: any): Message => ({
      id: (Date.now() + Math.random()).toString(),
      role: 'assistant',
      content,
      type: msgType,
      data: msgData,
      timestamp: new Date()
    });

    const hideEmptyState = () => {
      if (isEmptyStateVisible) {
        setIsEmptyStateExiting(true);
        setTimeout(() => {
          setIsEmptyStateVisible(false);
          setIsEmptyStateExiting(false);
        }, 100);
      }
    };

    const handleDemoEvent = (event: CustomEvent) => {
      const { type, data } = event.detail;

      switch (type) {
        // AI sends a message (no user input)
        case 'ai-message': {
          hideEmptyState();
          setMessages(prev => [...prev, createAssistantMessage(data.content, 'text')]);
          break;
        }

        // Typing animation in input field
        case 'demo-typing': {
          const text = data?.text || '';
          setInput('');
          let i = 0;
          const typeChar = () => {
            if (i < text.length) {
              const char = text[i];
              setInput(prev => prev + char);
              i++;
              setTimeout(typeChar, 50 + Math.random() * 30);
            }
          };
          setTimeout(typeChar, 100);
          break;
        }

        // Visual click on send button
        case 'click-send': {
          const sendBtn = document.querySelector('[data-send-button]');
          if (sendBtn) {
            sendBtn.classList.add('demo-click');
            setTimeout(() => sendBtn.classList.remove('demo-click'), 300);
          }
          break;
        }

        // File search demo
        case 'search-files': {
          hideEmptyState();
          const currentInput = document.querySelector('textarea')?.value || 'Find my files';
          setMessages(prev => [...prev, createUserMessage(currentInput)]);
          setInput('');
          setIsLoading(true);
          setSearchType('files');
          
          setTimeout(() => {
            setSearchType(null);
            setIsLoading(false);
            setMessages(prev => [...prev, createAssistantMessage(
              `I found ${data.results.length} files matching your search:`,
              'file_list',
              data.results
            )]);
          }, 2000);
          break;
        }

        // Disk analysis demo
        case 'analyze-disk': {
          hideEmptyState();
          const currentInput = document.querySelector('textarea')?.value || 'Analyze disk';
          setMessages(prev => [...prev, createUserMessage(currentInput)]);
          setInput('');
          setIsLoading(true);
          setSearchType('disk');
          
          setTimeout(() => {
            setSearchType(null);
            setIsLoading(false);
            setMessages(prev => [...prev, createAssistantMessage(
              'Here\'s your disk usage analysis:',
              'disk_usage',
              data.results
            )]);
          }, 2500);
          break;
        }

        // Cleanup demo
        case 'cleanup': {
          hideEmptyState();
          const currentInput = document.querySelector('textarea')?.value || 'Help me clean up';
          setMessages(prev => [...prev, createUserMessage(currentInput)]);
          setInput('');
          setIsLoading(true);
          setSearchType('cleanup');
          
          setTimeout(() => {
            setSearchType(null);
            setIsLoading(false);
            setMessages(prev => [...prev, createAssistantMessage(
              'I\'ve scanned your system and found some items that could be cleaned up:',
              'cleanup',
              data.results
            )]);
          }, 3000);
          break;
        }

        // Open sidebar
        case 'open-sidebar': {
          const menuBtn = document.querySelector('[data-sidebar-toggle]');
          if (menuBtn) {
            menuBtn.classList.add('demo-click');
            setTimeout(() => {
              menuBtn.classList.remove('demo-click');
              (menuBtn as HTMLElement).click();
            }, 300);
          }
          break;
        }

        // Click new chat in sidebar
        case 'click-new-chat': {
          const newChatBtn = document.querySelector('[data-new-chat]');
          if (newChatBtn) {
            newChatBtn.classList.add('demo-click');
            setTimeout(() => {
              newChatBtn.classList.remove('demo-click');
              (newChatBtn as HTMLElement).click();
            }, 300);
          }
          break;
        }
      }
    };

    // Demo reset handler (for looping)
    const handleDemoReset = () => {
      setMessages([]);
      setInput('');
      setIsEmptyStateVisible(true);
      setIsEmptyStateExiting(false);
      // Close sidebar if open
      const sidebar = document.querySelector('[data-sidebar]');
      if (sidebar?.classList.contains('translate-x-0')) {
        const menuBtn = document.querySelector('[data-sidebar-toggle]');
        (menuBtn as HTMLElement)?.click();
      }
    };

    window.addEventListener('skhoot-demo', handleDemoEvent as EventListener);
    window.addEventListener('skhoot-demo-reset', handleDemoReset as EventListener);
    
    return () => {
      window.removeEventListener('skhoot-demo', handleDemoEvent as EventListener);
      window.removeEventListener('skhoot-demo-reset', handleDemoReset as EventListener);
    };
  }, [isEmptyStateVisible]);

  // Handle workflow prompts - sends to AI and returns response
  // Uses agent mode if available for tool access (file operations, terminal, etc.)
  const handleWorkflowPromptExtended = useCallback(async (prompt: string): Promise<{ content: string; toolResults?: any[] }> => {
    // Load AI settings
    const aiSettings = aiSettingsService.loadSettings();
    
    try {
      // Always use agent chat service for workflows to ensure tool access (terminal, files, etc.)
      // If agent mode is not explicitly enabled, use a temporary session ID
      const effectiveSessionId = agentSessionId || `workflow-${Date.now()}`;
      const isTemporarySession = !agentSessionId;
      
      console.log(`[ChatInterface] Workflow execution using ${isTemporarySession ? 'temporary' : 'active'} agent session:`, effectiveSessionId);
      
      // Convert history to agent chat format
      const agentHistory = messages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
        toolCalls: m.toolCalls,
        toolResults: m.toolResults,
      }));

      const result = await agentChatService.executeWithTools(
        prompt,
        agentHistory,
        {
          sessionId: effectiveSessionId,
          workspaceRoot: workingDirectory,
          temperature: aiSettings.temperature,
          maxTokens: aiSettings.maxTokens,
          topP: aiSettings.topP,
          frequencyPenalty: aiSettings.frequencyPenalty,
          presencePenalty: aiSettings.presencePenalty,
          systemPrompt: aiSettings.userInstructions,
          onStatusUpdate: (status) => {
            setSearchStatus(status);
          },
        }
      );

      return {
        content: result.content || 'No response',
        toolResults: result.toolResults
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('[ChatInterface] Workflow prompt failed:', errorMsg);
      return {
        content: `Error: ${errorMsg}`
      };
    }
  }, [messages, isAgentMode, agentSessionId]);

  const handleWorkflowPrompt = useCallback(async (prompt: string): Promise<string> => {
    const result = await handleWorkflowPromptExtended(prompt);
    return result.content;
  }, [handleWorkflowPromptExtended]);

  // Workflow execution handler
  const executeWorkflowStep = useCallback(async (
    executionId: string, 
    step: WorkflowStep, 
    context: ExecutionContext
  ) => {
    // Prevent overlapping step executions
    if (isProcessingStep.current) {
      console.warn('[ChatInterface] Already processing a step, queueing or ignoring...');
      return; 
    }
    
    isProcessingStep.current = true;
    console.log('[ChatInterface] Executing workflow step:', step.name);
    
    try {
      // 1. Substitute variables in prompt
      let prompt = step.prompt;
      if (context.variables) {
        Object.entries(context.variables).forEach(([key, value]) => {
          prompt = prompt.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
        });
      }

      // 2. Add user message FIRST and wait for UI to update
      // We use a functional update to ensure we have the latest state
      setMessages(prev => [...prev, {
        id: `step-prompt-${Date.now()}-${step.id}`,
        role: 'user',
        content: prompt, 
        type: 'text',
        timestamp: new Date()
      }]);

      // Small delay to ensure the user message is rendered before we start processing
      // This gives the visual cue that "User sent X" -> "AI is thinking"
      await new Promise(resolve => setTimeout(resolve, 500));

      // 2.5 Check for Input Request (Interactive Step)
        if (step.inputRequest?.enabled) {
          // Provide natural context and ask for input
          setMessages(prev => [...prev, {
            id: `step-input-${Date.now()}`,
            role: 'assistant',
            content: step.prompt || step.inputRequest?.placeholder || `I need some input for the step "${step.name}". Please provide it below.`,
            type: 'text',
            timestamp: new Date()
          }]);
          
          setWaitingForInput({ executionId, stepId: step.id, mode: 'input' });
          setIsLoading(false); // Stop loading indicator while waiting for input
          isProcessingStep.current = false; // Release lock
          return; // Stop execution loop (will resume via handleSend)
        }

      // 3. Execute prompt via AI
      // We await this fully, ensuring strict sequential execution
      const { content: resultText, toolResults } = await handleWorkflowPromptExtended(prompt);

      // Display the output message for each step
      setMessages(prev => [...prev, {
        id: `step-output-${Date.now()}-${step.id}`,
        role: 'assistant',
        content: resultText,
        type: 'text',
        timestamp: new Date()
      }]);

      // 4. Determine decision result (if applicable)
      // ... decision logic ...
      let decisionResult: boolean | undefined = undefined;
      if (step.decision) {
        // Check if output is JSON and has boolean fields
        let jsonDecision = false;
        try {
          const jsonMatch = resultText.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
          if (jsonMatch) {
             const parsed = JSON.parse(jsonMatch[0]);
             // Check for common boolean flags in JSON
             if (typeof parsed.isValid === 'boolean') {
               decisionResult = parsed.isValid;
               jsonDecision = true;
             } else if (typeof parsed.approved === 'boolean') {
               decisionResult = parsed.approved;
               jsonDecision = true;
             } else if (typeof parsed.decision === 'boolean') {
               decisionResult = parsed.decision;
               jsonDecision = true;
             }
          }
        } catch (e) {
          // invalid json, ignore
        }

        if (!jsonDecision) {
          // Fallback to text analysis
          const lower = resultText.toLowerCase();
          if (lower.includes('yes') || lower.includes('true') || lower.includes('confirmed')) {
            decisionResult = true;
          } else {
            decisionResult = false;
          }
        }
        
        console.log(`[ChatInterface] Step Decision: ${decisionResult} (JSON: ${jsonDecision})`);
      }

      // 5. Report completion to service
      // If the step expected a file output, try to find it in tool results
      let finalOutput = resultText;
      let generatedFiles: string[] = [];
      
      if (step.outputFormat === 'file' && toolResults) {
         const writeTool = toolResults.find(r => r.success && r.toolCallName === 'write_file');
         if (writeTool) {
            // Heuristic: the result of write_file usually contains the path
            // In our service it's "File written successfully: path"
            const match = writeTool.output.match(/File written successfully: (.*)/);
            if (match) {
               finalOutput = match[1];
               generatedFiles.push(finalOutput);
            }
         }
      }

      // This call will trigger 'workflow-step-next' if there is a next step
      await workflowService.executeStep(executionId, finalOutput, decisionResult, generatedFiles);
      
    } catch (error) {
      console.error('[ChatInterface] Step execution failed:', error);
      setMessages(prev => [...prev, {
        id: `step-error-${Date.now()}`,
        role: 'assistant',
        content: `❌ Step failed: ${error instanceof Error ? error.message : String(error)}`,
        type: 'text',
        timestamp: new Date()
      }]);
      // Should likely fail execution here
    } finally {
      isProcessingStep.current = false;
    }
  }, [handleWorkflowPromptExtended]);

  // Workflow execution event listener
  useEffect(() => {
    const handleWorkflowExecute = (event: CustomEvent) => {
      const { executionId, workflow, context, currentStep } = event.detail;
      
      // Skip if it's a background/silent workflow
      if (workflow.behavior?.background || workflow.workflowType === 'hook') {
        // Show silent notification
        nativeNotifications.success(
            'Background Workflow Started',
            `Workflow "${workflow.name}" has started running in the background.`,
        );
        return;
      }

      // Hide empty state
      if (isEmptyStateVisible) {
        setIsEmptyStateExiting(true);
        setTimeout(() => {
          setIsEmptyStateVisible(false);
          setIsEmptyStateExiting(false);
        }, 100);
      }
      
      // Initial natural text introduction
      setMessages(prev => [...prev, {
        id: `wf-start-text-${executionId}`,
        role: 'assistant',
        content: `I will run the **${workflow.name}** workflow for you.`,
        type: 'text',
        timestamp: new Date()
      }]);

      // Create the persistent progress card
      const workflowMsg: Message = {
        id: `workflow-${executionId}`,
        role: 'assistant',
        content: '',
        type: 'workflow',
        workflowExecution: {
          executionId,
          workflowId: workflow.id,
          workflowName: workflow.name,
          currentStep: currentStep,
          status: 'running',
          totalSteps: workflow.steps.length
        },
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, workflowMsg]);

      // Start the first step if available
      if (currentStep) {
        executeWorkflowStep(executionId, currentStep, context);
      }
    };

    const handleWorkflowStepNext = (event: CustomEvent) => {
      const { executionId, currentStep, context, previousResult, workflow } = event.detail;
      
      // Update the existing workflow message to reflect progress
      setMessages(prev => prev.map(msg => {
        if (msg.type === 'workflow' && msg.workflowExecution?.executionId === executionId) {
           return {
             ...msg,
             workflowExecution: {
               ...msg.workflowExecution,
               currentStep: currentStep || msg.workflowExecution.currentStep,
               status: currentStep ? 'running' : 'completed'
             }
           };
        }
        return msg;
      }));

      // Check if previous step required confirmation
      if (previousResult) {
         const prevStepDef = workflow.steps.find((s: WorkflowStep) => s.id === previousResult.stepId);
         if (prevStepDef && prevStepDef.requiresConfirmation) {
            // Update status to waiting
            setMessages(prev => prev.map(msg => {
              if (msg.type === 'workflow' && msg.workflowExecution?.executionId === executionId) {
                 return { ...msg, workflowExecution: { ...msg.workflowExecution!, status: 'waiting' } };
              }
              return msg;
            }));

            setMessages(prev => [...prev, {
               id: `wf-confirm-${Date.now()}`,
               role: 'assistant',
               content: `I've completed the **${prevStepDef.name}** step. Please review the results above.\n\nDo you want me to proceed with the next step?`,
               type: 'text',
               timestamp: new Date()
            }]);
            
            if (currentStep) {
               setWaitingForInput({ executionId, stepId: currentStep.id, mode: 'confirmation' });
               setIsLoading(false); // Stop loading indicator while waiting for confirmation
            }
            return;
         }
      }

      if (currentStep) {
        executeWorkflowStep(executionId, currentStep, context);
      }
    };

    const handleWorkflowCompleted = (event: CustomEvent) => {
      const { workflow, executionId, context } = event.detail;
      
      // Update status to completed
      setMessages(prev => prev.map(msg => {
        if (msg.type === 'workflow' && msg.workflowExecution?.executionId === executionId) {
            return {
              ...msg,
              workflowExecution: {
                ...msg.workflowExecution!,
                currentStep: undefined,
                status: 'completed'
              }
            };
        }
        return msg;
      }));
      
      // Don't show success message for background workflows
      if (workflow.behavior?.background || workflow.workflowType === 'hook') {
        // Show silent notification
        nativeNotifications.success(
            'Background Workflow Completed',
            `Workflow "${workflow.name}" has completed successfully.`,
        );
        return;
      }

      // Check if the workflow produced any files
      const filesGenerated: Array<{ fileName: string; filePath: string }> = [];
      
      // Iterate through all steps to find file-format outputs
      workflow.steps.forEach((s: WorkflowStep) => {
        const result = context.stepResults[s.id];
        if (s.outputFormat === 'file' && result && result.output) {
          // Simple heuristic: if output looks like a path or just a filename
          const path = result.output.trim();
          const fileName = path.split(/[/\\]/).pop() || 'Generated File';
          filesGenerated.push({ fileName, filePath: path });
        }
      });

      if (filesGenerated.length > 0) {
        setMessages(prev => [...prev, {
          id: `wf-files-${Date.now()}`,
          role: 'assistant',
          content: 'I have generated the following files:',
          type: 'file_list',
          data: filesGenerated.map(f => ({
            id: f.fileName,
            name: f.fileName,
            path: f.filePath,
            size: 'Unknown',
            category: 'Document',
            safeToRemove: false,
            lastUsed: new Date().toISOString()
          })),
          timestamp: new Date()
        }]);
      }

      // Find the most relevant output to display as the "result"
      const lastStepId = context.currentStepId || workflow.steps[workflow.steps.length - 1].id;
      const lastResult = context.stepResults[lastStepId];
      const resultOutput = lastResult?.output || '';

      // Generate natural language summary using AI
      const generateSummary = async () => {
        // Construct context for summary
        const summaryContext = {
           workflowName: workflow.name,
           steps: workflow.steps.map((s: WorkflowStep) => ({
              name: s.name,
              output: context.stepResults[s.id]?.output,
              success: context.stepResults[s.id]?.success
           })),
           finalOutput: resultOutput
        };
        
        try {
           const aiSettings = aiSettingsService.loadSettings();
           const summaryPrompt = `The workflow "${workflow.name}" has completed. 
           
 Context:
 ${JSON.stringify(summaryContext, null, 2)}
 
 Please provide a natural language conclusion for the user. Summarize what was done and the result. Be concise and helpful.`;
 
           // Use agentChatService
           const response = await agentChatService.executeWithTools(
              summaryPrompt,
              [], 
              {
                 sessionId: agentSessionId || `summary-${Date.now()}`,
                 temperature: 0.7,
                 maxTokens: 500,
                 onStatusUpdate: (status) => setSearchStatus(status)
              }
           );
           
           setMessages(prev => [...prev, {
              id: `wf-summary-${Date.now()}`,
              role: 'assistant',
              content: response.content,
              type: 'text',
              timestamp: new Date()
           }]);
           setSearchStatus('');
           
        } catch (e) {
           console.error('Failed to generate workflow summary', e);
           // Fallback to static message
           setMessages(prev => [...prev, {
             id: `wf-complete-${Date.now()}`,
             role: 'assistant',
             content: resultOutput || `✅ Workflow **"${workflow.name}"** completed successfully.`,
             type: 'text',
             timestamp: new Date()
           }]);
        }
      };

      generateSummary();
    };

    window.addEventListener('workflow-execute', handleWorkflowExecute as EventListener);
    window.addEventListener('workflow-step-next', handleWorkflowStepNext as EventListener);
    window.addEventListener('workflow-completed', handleWorkflowCompleted as EventListener);
    
    return () => {
      window.removeEventListener('workflow-execute', handleWorkflowExecute as EventListener);
      window.removeEventListener('workflow-step-next', handleWorkflowStepNext as EventListener);
      window.removeEventListener('workflow-completed', handleWorkflowCompleted as EventListener);
    };
  }, [isEmptyStateVisible, executeWorkflowStep]);

  // Empty state visibility
  useEffect(() => {
    const shouldHide = hasMessages || (isRecording && hasVoiceContent);
    
    if (shouldHide && isEmptyStateVisible && !isEmptyStateExiting) {
      setIsEmptyStateExiting(true);
      const timer = setTimeout(() => {
        setIsEmptyStateVisible(false);
        setIsEmptyStateExiting(false);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [hasMessages, isRecording, hasVoiceContent, isEmptyStateVisible, isEmptyStateExiting]);

  // Smooth auto-scroll (disabled when highlighting a specific message)
  useEffect(() => {
    // Don't auto-scroll if we're highlighting a specific message
    if (highlightedMessageId) {
      return;
    }
    
    if (scrollRef.current) {
      const scrollElement = scrollRef.current;
      const targetScroll = scrollElement.scrollHeight;
      const currentScroll = scrollElement.scrollTop;
      const distance = targetScroll - currentScroll - scrollElement.clientHeight;
      
      if (distance > 0) {
        const startTime = performance.now();
        const duration = Math.min(600, Math.max(300, distance * 0.5));
        
        const animateScroll = (currentTime: number) => {
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const easeOut = 1 - Math.pow(1 - progress, 3);
          
          scrollElement.scrollTop = currentScroll + (distance + scrollElement.clientHeight) * easeOut;
          
          if (progress < 1) {
            requestAnimationFrame(animateScroll);
          }
        };
        
        requestAnimationFrame(animateScroll);
      }
    }
  }, [messages, voiceTranscript, pendingVoiceText, hasPendingVoiceMessage, highlightedMessageId]);

  // Determine search type from message - supports English and French keywords
  const getSearchType = (text: string): typeof searchType => {
    const lower = text.toLowerCase();
    
    // File search keywords (EN + FR)
    const fileKeywords = [
      // English
      'file', 'files', 'find', 'search', 'locate', 'look for', 'looking for',
      'where is', 'where are', 'show me', 'open', 'document', 'documents',
      // French
      'fichier', 'fichiers', 'trouve', 'trouver', 'cherche', 'chercher', 
      'recherche', 'rechercher', 'localise', 'localiser', 'où est', 'où sont',
      'montre', 'montrer', 'ouvre', 'ouvrir', 'document', 'documents',
      'dossier', 'dossiers'
    ];
    
    // Disk/storage keywords (EN + FR)
    const diskKeywords = [
      // English
      'disk', 'storage', 'space', 'memory', 'drive', 'capacity', 'size',
      // French
      'disque', 'stockage', 'espace', 'mémoire', 'capacité', 'taille'
    ];
    
    // Cleanup keywords (EN + FR)
    const cleanupKeywords = [
      // English
      'cleanup', 'clean up', 'clean', 'delete', 'remove', 'clear', 'free up',
      // French
      'nettoyer', 'nettoyage', 'supprimer', 'effacer', 'libérer', 'vider'
    ];
    
    // Message/conversation keywords (EN + FR)
    const messageKeywords = [
      // English
      'message', 'messages', 'conversation', 'conversations', 'chat', 'history',
      // French
      'message', 'messages', 'conversation', 'conversations', 'historique'
    ];
    
    // Check for cleanup first (more specific)
    if (cleanupKeywords.some(kw => lower.includes(kw))) return 'cleanup';
    
    // Check for disk/storage
    if (diskKeywords.some(kw => lower.includes(kw))) return 'disk';
    
    // Check for messages
    if (messageKeywords.some(kw => lower.includes(kw))) return 'messages';
    
    // Check for file search
    if (fileKeywords.some(kw => lower.includes(kw))) return 'files';
    
    return null;
  };

  // Stop the current AI generation and optionally send queued message
  const handleStop = useCallback(() => {
    // If a workflow is waiting for input, cancel it
    if (waitingForInput) {
      workflowService.cancelExecution(waitingForInput.executionId);
      setWaitingForInput(null);
      setMessages(prev => [...prev, {
        id: `wf-cancelled-${Date.now()}`,
        role: 'assistant',
        content: 'Workflow execution cancelled by user.',
        type: 'text',
        timestamp: new Date()
      }]);
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
      setSearchType(null);
      setSearchStatus('');
      
      // If there's a queued message, we'll handle it with the interrupt flow
      if (queuedMessage) {
        // Add partial response if any (marked as interrupted)
        if (partialResponseRef.current) {
          setMessages(prev => [...prev, {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: partialResponseRef.current + '\n\n⏹️ *[Interrupted by new message]*',
            type: 'text',
            timestamp: new Date()
          }]);
        }
        partialResponseRef.current = '';
        
        // The queued message will be sent via handleSendQueuedNow
      } else {
        // No queued message - just show stopped indicator
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: '⏹️ Generation stopped.',
          type: 'text',
          timestamp: new Date()
        }]);
        partialResponseRef.current = '';
      }
    }
  }, [queuedMessage]);

  // Send queued message immediately (interrupts current AI response)
  const handleSendQueuedNow = useCallback(() => {
    if (!queuedMessage) return;
    
    const messageToSend = queuedMessage;
    setQueuedMessage(null);
    
    // Stop current generation if running
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      
      // Add partial response if any
      if (partialResponseRef.current) {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: partialResponseRef.current + '\n\n⏹️ *[Interrupted - adapting to new input]*',
          type: 'text',
          timestamp: new Date()
        }]);
      }
      partialResponseRef.current = '';
    }
    
    setIsLoading(false);
    setSearchType(null);
    setSearchStatus('');
    
    // Set the message as input and trigger send
    setInput(messageToSend);
    setTimeout(() => {
      const sendBtn = document.querySelector('[data-send-button]') as HTMLButtonElement;
      if (sendBtn) sendBtn.click();
    }, 50);
  }, [queuedMessage]);

  // Discard queued message
  const handleDiscardQueued = useCallback(() => {
    setQueuedMessage(null);
  }, []);

  // Edit queued message
  const handleEditQueued = useCallback((newText: string) => {
    setQueuedMessage(newText);
  }, []);

  const handleSend = useCallback(async () => {
    const messageText = voiceTranscript.trim() || input.trim();
    
    // If already loading, queue the message instead
    if (isLoading && messageText) {
      setQueuedMessage(messageText);
      setInput('');
      // Clear voice if that was the source
      if (voiceTranscript.trim()) {
        discardVoice();
      }
      return;
    }
    
    if (!messageText) return;

    // Check if waiting for workflow input
    if (waitingForInput) {
      const userMsg: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: messageText,
        type: 'text',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, userMsg]);
      setInput('');
      
      if (isRecording) stopRecording();
      if (voiceTranscript) discardVoice();

      if (waitingForInput.mode === 'confirmation') {
         // Handle confirmation
         const lower = messageText.toLowerCase();
         if (lower === 'no' || lower === 'cancel') {
            setMessages(prev => [...prev, {
               id: `wf-cancelled-${Date.now()}`,
               role: 'assistant',
               content: 'Workflow execution cancelled.',
               type: 'text',
               timestamp: new Date()
            }]);
            workflowService.cancelExecution(waitingForInput.executionId);
            setWaitingForInput(null);
            return;
          }
       }
       
       // Resume execution with the input
       await workflowService.resumeExecution(waitingForInput.executionId, messageText);
       setWaitingForInput(null);
       return;
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      type: 'text',
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    window.dispatchEvent(new Event('chat-message-sent'));

    if (isRecording) stopRecording();
    if (voiceTranscript) discardVoice();
    
    // Check for search types
    const detectedSearchType = getSearchType(messageText);
    if (detectedSearchType) {
        setSearchType(detectedSearchType);
    }
    
    try {
        let responseContent = '';
        let responseType: Message['type'] = 'text';
        let responseData = undefined;
        
        if (isAgentMode && agentSessionId) {
             const agentHistory = messages.map(m => ({
                role: m.role as 'user' | 'assistant',
                content: m.content
             }));
             agentHistory.push({ role: 'user', content: messageText });

             const response = await agentChatService.chat(
                messageText,
                agentHistory,
                { 
                    sessionId: agentSessionId,
                    onStatusUpdate: (status) => setSearchStatus(status)
                }
             );
             responseContent = response.content;
        } else {
             const history: AIMessage[] = messages.map(m => ({
                 role: m.role as 'user' | 'assistant',
                 content: m.content
             }));
             
             const response = await aiService.chat(
                 messageText,
                 history,
                 (status) => setSearchStatus(status),
                 undefined,
                 chatId || undefined
             );
             
             responseContent = response.text;
             responseType = response.type as Message['type'];
             responseData = response.data;
        }
        
        setMessages(prev => [...prev, {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: responseContent,
            type: responseType,
            data: responseData,
            timestamp: new Date()
        }]);

    } catch (error) {
       console.error('[ChatInterface] Error sending message:', error);
       setMessages(prev => [...prev, {
           id: (Date.now() + 1).toString(),
           role: 'assistant',
           content: `❌ Error: ${error instanceof Error ? error.message : String(error)}`,
           type: 'text',
           timestamp: new Date()
       }]);
    } finally {
       setIsLoading(false);
       setSearchType(null);
       setSearchStatus('');
    }
  }, [input, voiceTranscript, waitingForInput, isRecording, agentSessionId, messages, isAgentMode, chatId, discardVoice, stopRecording]);

  const handleQuickAction = useCallback((mode: string) => {
    // Pre-refresh data if it's the Files panel
    if (mode === 'Files') {
        window.dispatchEvent(new CustomEvent('preload-recent-files'));
    }

    // Set active mode and open corresponding panel
    setActiveMode(mode);
    
    // Close other panels and open the target one
    if (mode === 'Files') {
      if (!isFileExplorerOpen) onToggleFileExplorer?.();
      if (isWorkflowsOpen) onToggleWorkflows?.();
      if (isAgentsOpen) onToggleAgents?.();
      if (isTerminalOpen) onToggleTerminal?.();
    } else if (mode === 'Workflows') {
      if (!isWorkflowsOpen) onToggleWorkflows?.();
      if (isFileExplorerOpen) onToggleFileExplorer?.();
      if (isAgentsOpen) onToggleAgents?.();
      if (isTerminalOpen) onToggleTerminal?.();
    } else if (mode === 'Agents') {
      if (!isAgentsOpen) onToggleAgents?.();
      if (isFileExplorerOpen) onToggleFileExplorer?.();
      if (isWorkflowsOpen) onToggleWorkflows?.();
      if (isTerminalOpen) onToggleTerminal?.();
    } else if (mode === 'Terminal') {
      if (!isTerminalOpen) onToggleTerminal?.();
      // Don't necessarily close others for terminal
    }
    
    // Focus input after selecting a quick action
    inputRef.current?.focus();
  }, [activeMode, isFileExplorerOpen, isWorkflowsOpen, isAgentsOpen, isTerminalOpen, onToggleFileExplorer, onToggleWorkflows, onToggleAgents, onToggleTerminal]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (activeMode && !e.target.value) setActiveMode(null);
  }, [activeMode]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);
  
  // Handle tool call execution
  const handleToolCallExecute = useCallback(async (toolName: string, parameters: Record<string, any>) => {
    console.log('[ChatInterface] Executing tool:', toolName, parameters);
    
    // Add user message showing the tool call with metadata
    const toolCallMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: `Executing tool: ${toolName}`,
      type: 'text',
      timestamp: new Date(),
      toolCalls: [{
        id: `tool-${Date.now()}`,
        name: toolName as any,
        arguments: parameters,
      }],
    };
    
    setMessages(prev => [...prev, toolCallMessage]);
    setSelectedToolCall(null);
    setIsLoading(true);
    
    // Dispatch event to notify that a message was sent
    window.dispatchEvent(new Event('chat-message-sent'));
    
    try {
      if (isAgentMode && agentSessionId) {
        // Use agent chat service with direct tool call
        const agentHistory = messages.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }));
        
        const response = await agentChatService.chat(
          `Executing tool: ${toolName}`,
          agentHistory,
          {
            sessionId: agentSessionId,
            workspaceRoot: undefined, // Let the backend determine the workspace root
            directToolCall: {
              name: toolName,
              arguments: parameters,
            },
          }
        );
        
        // Add AI response
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.content,
          type: 'text',
          timestamp: new Date()
        }]);
      } else {
        // Fallback: show error that tool calls require agent mode
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: '⚠️ Tool calls require Agent Mode to be enabled. Please enable Agent Mode (Ctrl+Shift+A) to execute tools directly.',
          type: 'text',
          timestamp: new Date()
        }]);
      }
    } catch (error) {
      console.error('[ChatInterface] Tool execution error:', error);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `❌ Error executing tool: ${error instanceof Error ? error.message : String(error)}`,
        type: 'text',
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, isAgentMode, agentSessionId]);
  
  // Handle tool call selection from dropdown
  const handleToolCallSelected = useCallback((tool: any) => {
    console.log('[ChatInterface] Tool selected:', tool);
    // Clear the "/" from input
    setInput('');
    
    // Instead of showing a form, send a message to the AI asking it to execute the tool
    // The AI will ask for any required parameters conversationally
    const toolRequestMessage = `Please execute the ${tool.name} tool. If you need any parameters, ask me for them in a natural way.`;
    
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: toolRequestMessage,
      type: 'text',
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    
    // Send to AI
    if (isAgentMode && agentSessionId) {
      const agentHistory = [...messages, userMessage].map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));
      
      agentChatService.chat(
        toolRequestMessage,
        agentHistory,
        {
          sessionId: agentSessionId,
          workspaceRoot: undefined,
        }
      ).then(response => {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.content,
          type: 'text',
          timestamp: new Date(),
          toolCalls: response.toolCalls as AgentToolCallData[] | undefined,
        }]);
      }).catch(error => {
        console.error('[ChatInterface] Error:', error);
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `❌ Error: ${error instanceof Error ? error.message : String(error)}`,
          type: 'text',
          timestamp: new Date(),
        }]);
      }).finally(() => {
        setIsLoading(false);
      });
    } else {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '⚠️ Agent Mode is required to execute tools. Please enable Agent Mode (Ctrl+Shift+A).',
        type: 'text',
        timestamp: new Date(),
      }]);
      setIsLoading(false);
    }
  }, [handleToolCallExecute, messages, isAgentMode, agentSessionId]);
  
  // Handle tool call cancellation
  const handleToolCallCancel = useCallback(() => {
    setSelectedToolCall(null);
    setInput('');
  }, []);

  // Helper function to process attached files (text and images)
  const processAttachedFiles = useCallback(async (files: Array<{ fileName: string; filePath: string }>) => {
    const fileContents: string[] = [];
    const attachedFileNames: string[] = [];
    const imageFiles: Array<{ fileName: string; base64: string; mimeType: string }> = [];
    
    // Helper to check if file is an image
    const isImageFile = (fileName: string): boolean => {
      const ext = fileName.split('.').pop()?.toLowerCase() || '';
      const isImage = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext);
      console.log(`[ChatInterface] Checking if "${fileName}" is image: ext="${ext}", isImage=${isImage}`);
      return isImage;
    };
    
    // Helper to get MIME type
    const getMimeType = (fileName: string): string => {
      const ext = fileName.split('.').pop()?.toLowerCase() || '';
      const mimeTypes: Record<string, string> = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'bmp': 'image/bmp',
        'webp': 'image/webp'
      };
      return mimeTypes[ext] || 'application/octet-stream';
    };
    
    // Helper to check if file is binary (non-text)
    const isBinaryFile = (fileName: string): boolean => {
      const ext = fileName.split('.').pop()?.toLowerCase() || '';
      return ['pdf', 'zip', 'rar', '7z', 'tar', 'gz', 'exe', 'dll', 'so', 'dylib'].includes(ext);
    };
    
    // Helper to read file using Tauri API
    const readFileWithTauri = async (filePath: string): Promise<Uint8Array | null> => {
      try {
        // Check if we're in Tauri environment
        if (typeof window !== 'undefined' && (window as any).__TAURI__) {
          const { readFile } = await import(/* @vite-ignore */ '@tauri-apps/plugin-fs');
          console.log(`[ChatInterface] Reading file with Tauri: ${filePath}`);
          const contents = await readFile(filePath);
          return contents;
        }
        return null;
      } catch (error) {
        console.error(`[ChatInterface] Tauri file read failed:`, error);
        return null;
      }
    };
    
    // Helper to convert Uint8Array to base64
    const uint8ArrayToBase64 = (bytes: Uint8Array): string => {
      let binary = '';
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
    };
    
    for (const file of files) {
      if (isImageFile(file.fileName)) {
        // Handle image files - try Tauri first, then backend
        try {
          console.log(`[ChatInterface] Loading image: ${file.fileName} from ${file.filePath}`);
          
          // Try Tauri API first (works in desktop app)
          const tauriBytes = await readFileWithTauri(file.filePath);
          
          if (tauriBytes) {
            // Successfully read with Tauri
            const base64 = uint8ArrayToBase64(tauriBytes);
            console.log(`[ChatInterface] ✅ Loaded image via Tauri: ${file.fileName}, base64 length: ${base64.length}`);
            
            imageFiles.push({
              fileName: file.fileName,
              base64,
              mimeType: getMimeType(file.fileName)
            });
            attachedFileNames.push(file.fileName);
          } else {
            // Fallback to backend API (for web version or if Tauri fails)
            console.log(`[ChatInterface] Falling back to backend API for: ${file.fileName}`);
            const response = await fetch(`http://localhost:3001/api/v1/files/image?path=${encodeURIComponent(file.filePath)}`);
            console.log(`[ChatInterface] Image fetch response:`, { 
              ok: response.ok, 
              status: response.status, 
              statusText: response.statusText,
              contentType: response.headers.get('content-type')
            });
            
            if (response.ok) {
              const blob = await response.blob();
              console.log(`[ChatInterface] Image blob size: ${blob.size} bytes, type: ${blob.type}`);
              
              const base64 = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                  const result = reader.result as string;
                  // Extract base64 data (remove data:image/...;base64, prefix)
                  const base64Data = result.split(',')[1] || result;
                  console.log(`[ChatInterface] Base64 length: ${base64Data.length} chars`);
                  resolve(base64Data);
                };
                reader.readAsDataURL(blob);
              });
              
              imageFiles.push({
                fileName: file.fileName,
                base64,
                mimeType: getMimeType(file.fileName)
              });
              attachedFileNames.push(file.fileName);
              console.log(`[ChatInterface] ✅ Successfully loaded image file: ${file.fileName}`);
            } else {
              const errorText = await response.text();
              console.error(`[ChatInterface] ❌ Failed to read image: ${file.filePath}`, {
                status: response.status,
                statusText: response.statusText,
                error: errorText
              });
              fileContents.push(`\n\n[Note: Could not read image ${file.fileName} - ${response.statusText}]`);
            }
          }
        } catch (error) {
          console.error(`[ChatInterface] ❌ Error reading image ${file.filePath}:`, error);
          fileContents.push(`\n\n[Note: Error reading image ${file.fileName}: ${error instanceof Error ? error.message : 'Unknown error'}]`);
        }
      } else if (isBinaryFile(file.fileName)) {
        // Skip other binary files
        console.log(`[ChatInterface] Skipping binary file: ${file.fileName}`);
        attachedFileNames.push(file.fileName);
        fileContents.push(`\n\n[Note: ${file.fileName} is a binary file and cannot be read as text]`);
      } else {
        // Handle text files
        try {
          console.log(`[ChatInterface] Loading text file: ${file.fileName} from ${file.filePath}`);
          const response = await fetch(`http://localhost:3001/api/v1/files/read?path=${encodeURIComponent(file.filePath)}`);
          if (response.ok) {
            const data = await response.json();
            const content = data.content || '';
            fileContents.push(`\n\n--- File: ${file.fileName} (${file.filePath}) ---\n${content}\n--- End of ${file.fileName} ---`);
            attachedFileNames.push(file.fileName);
            console.log(`[ChatInterface] ✅ Successfully loaded text file: ${file.fileName}`);
          } else {
            const errorText = await response.text();
            console.error(`[ChatInterface] ❌ Failed to read file: ${file.filePath}`, {
              status: response.status,
              statusText: response.statusText,
              error: errorText
            });
            fileContents.push(`\n\n[Note: Could not read file ${file.fileName} - ${response.statusText}]`);
          }
        } catch (error) {
          console.error(`[ChatInterface] ❌ Error reading file ${file.filePath}:`, error);
          fileContents.push(`\n\n[Note: Error reading file ${file.fileName}: ${error instanceof Error ? error.message : 'Unknown error'}]`);
        }
      }
    }
    
    return { fileContents, attachedFileNames, imageFiles };
  }, []);

  const handleEditMessage = useCallback((messageId: string, newContent: string) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, content: newContent } : msg
    ));
  }, []);

  const handleRegenerateFromMessage = useCallback(async (messageId: string, newContent: string) => {
    // First, update the message with new content
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, content: newContent } : msg
    ));

    // Wait a tick for state to update
    await new Promise(resolve => setTimeout(resolve, 0));

    // Load AI settings
    const aiSettings = aiSettingsService.loadSettings();

    // Find the index of the edited message
    const messageIndex = messages.findIndex(msg => msg.id === messageId);
    if (messageIndex === -1) return;

    // Remove all messages after the edited one (including AI responses)
    const messagesUpToEdit = messages.slice(0, messageIndex + 1);
    
    // Update the edited message content in the sliced array
    const editedMessage = { ...messagesUpToEdit[messageIndex], content: newContent };
    messagesUpToEdit[messageIndex] = editedMessage;
    
    setMessages(messagesUpToEdit);

    if (editedMessage.role !== 'user') return;

    // Process attached files from the original message
    let processedMessage = newContent;
    let imageFiles: Array<{ fileName: string; base64: string; mimeType: string }> = [];
    
    if (editedMessage.attachedFiles && editedMessage.attachedFiles.length > 0) {
      const result = await processAttachedFiles(editedMessage.attachedFiles);
      imageFiles = result.imageFiles;
      
      // Build message with file contents
      if (result.fileContents.length > 0 || result.imageFiles.length > 0) {
        const fileHeader = `\n\n[Attached files: ${result.attachedFileNames.join(', ')}]`;
        processedMessage = newContent + fileHeader + result.fileContents.join('');
        
        // Remove the note about images since we now support vision
        // Images will be sent to the AI for analysis
      }
    }

    // Prepare to regenerate the conversation from this point
    setIsLoading(true);
    setSearchType(getSearchType(newContent));

    try {
      // Get conversation history up to (but not including) the edited message
      const history: AIMessage[] = messagesUpToEdit.slice(0, messageIndex).map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
        images: m.images // Include images from message history
      }));

      // Route based on agent mode
      if (isAgentMode) {
        // Agent mode
        let currentSessionId = agentSessionId;
        
        if (!currentSessionId && isAgentLoading) {
          setSearchStatus('Waiting for agent session...');
          for (let i = 0; i < 30; i++) {
            await new Promise(resolve => setTimeout(resolve, 100));
            const sessionId = getSessionId();
            if (sessionId) {
              currentSessionId = sessionId;
              break;
            }
          }
        }
        
        if (!currentSessionId) {
          throw new Error('Agent session not ready. Please wait a moment and try again.');
        }
        
        setSearchStatus('Connecting to agent...');
        
        const agentHistory = messagesUpToEdit.slice(0, messageIndex).map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
          toolCalls: m.toolCalls,
          toolResults: m.toolResults,
          images: m.images, // Pass images from message history
        }));

        const toolCalls: AgentToolCallData[] = [];
        const toolResults: AgentToolResultData[] = [];

        const result = await agentChatService.executeWithTools(
          processedMessage, // Use processed message with file contents
          agentHistory,
          {
            sessionId: currentSessionId,
            images: imageFiles, // Pass current images for vision API
            temperature: aiSettings.temperature,
            maxTokens: aiSettings.maxTokens,
            topP: aiSettings.topP,
            frequencyPenalty: aiSettings.frequencyPenalty,
            presencePenalty: aiSettings.presencePenalty,
            onToolStart: (toolCall) => {
              // Cast to AgentToolCallData - the name will be validated at runtime
              toolCalls.push(toolCall as AgentToolCallData);
              setSearchStatus(`Executing ${toolCall.name}...`);
            },
            onToolComplete: (result) => {
              toolResults.push(result);
              setSearchStatus(result.success ? 'Tool completed' : 'Tool failed');
            },
            onStatusUpdate: (status) => {
              setSearchStatus(status);
            },
          }
        );

        setSearchType(null);
        setSearchStatus('');

        // Store web search images in image storage
        if (result.displayImages && result.displayImages.length > 0) {
          imageStorage.addImages(result.displayImages.map(img => ({
            url: img.url,
            fileName: img.fileName,
            alt: img.alt,
            source: 'web_search' as const,
            messageId: (Date.now() + 1).toString(),
          })));
        }

        const assistantMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant' as const,
          content: result.content || 'Task completed.',
          type: toolCalls.length > 0 ? 'agent_action' : 'text',
          toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
          toolResults: toolResults.length > 0 ? toolResults : undefined,
          displayImages: result.displayImages, // Add images from web search
          timestamp: new Date()
        };

        setMessages(prev => [...prev, assistantMsg]);

        activityLogger.log(
          'Agent',
          newContent.slice(0, 50) + (newContent.length > 50 ? '...' : ''),
          `Regenerated with ${toolCalls.length} tool calls`,
          'success',
          undefined,
          undefined,
          getEffectiveChatId(),
          editedMessage.id // Log the edited message ID
        );

        await nativeNotifications.success(
          'Agent Response',
          toolCalls.length > 0 
            ? `Executed ${toolCalls.length} tool(s)` 
            : 'Agent has responded',
          {
            tag: 'agent-response',
            data: { messageId: assistantMsg.id, toolCount: toolCalls.length }
          }
        );
      } else {
        // Normal mode
        const result = await aiService.chat(
          processedMessage, 
          history, 
          (status) => {
            setSearchStatus(status);
            if (status.toLowerCase().includes('search') || status.toLowerCase().includes('cherch')) {
              setSearchType(prev => prev || 'files');
            }
          }, 
          imageFiles, // Pass images for vision API
          getEffectiveChatId(), // chatId
          undefined, // messageId (not available in this context)
          {
            temperature: aiSettings.temperature,
            maxTokens: aiSettings.maxTokens,
            topP: aiSettings.topP,
            frequencyPenalty: aiSettings.frequencyPenalty,
            presencePenalty: aiSettings.presencePenalty,
          }
        );
        
        setSearchType(null);
        setSearchStatus('');
        
        const assistantMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant' as const,
          content: (result.text || 'I received your message.').trim(),
          type: (result.type as Message['type']) || 'text',
          data: result.data || undefined,
          searchInfo: result.searchInfo || undefined,
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, assistantMsg]);
        
        await nativeNotifications.success(
          'Response Received',
          'AI assistant has responded to your edited message',
          {
            tag: 'chat-response',
            data: { messageId: assistantMsg.id, type: result.type }
          }
        );
        
        if (result.type === 'text') {
          activityLogger.log(
            'AI Chat',
            newContent.slice(0, 50) + (newContent.length > 50 ? '...' : ''),
            'Regenerated response',
            'success',
            undefined,
            undefined,
            getEffectiveChatId(),
            editedMessage.id // Log the edited message ID
          );
        }
      }
    } catch (error) {
      setSearchType(null);
      setSearchStatus('');
      
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      await nativeNotifications.error(
        'Connection Failed',
        `Unable to reach ${isAgentMode ? 'agent' : 'AI'} service: ${errorMessage}`,
        {
          tag: 'chat-error',
          data: { error: errorMessage, retry: true }
        }
      );
      
      activityLogger.log(
        isAgentMode ? 'Agent' : 'AI Chat',
        newContent.slice(0, 50) + (newContent.length > 50 ? '...' : ''),
        'Error: ' + errorMessage.slice(0, 30),
        'error',
        undefined,
        undefined,
        getEffectiveChatId(),
        messageId
      );
      
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Sorry, I encountered an error: ${errorMessage}. ${isAgentMode ? 'Check the Agent Log for details.' : 'Please check your API key configuration.'}`,
        type: 'text',
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, isAgentMode, agentSessionId, isAgentLoading, getSessionId, getSearchType]);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden relative">
      <MainArea
        ref={scrollRef}
        messages={messages}
        isLoading={isLoading}
        sessionId={getEffectiveChatId()}
        searchType={searchType}
        searchStatus={searchStatus}
        isRecording={isRecording}
        hasPendingVoiceMessage={hasPendingVoiceMessage}
        voiceTranscript={voiceTranscript}
        pendingVoiceText={pendingVoiceText}
        welcomeMessage={welcomeMessage}
        isEmptyStateVisible={isEmptyStateVisible}
        isEmptyStateExiting={isEmptyStateExiting}
        activeMode={activeMode}
        promptKey={promptKey}
        queuedMessage={queuedMessage}
        hasAgentMode={isAgentMode && !!agentSessionId}
        highlightedMessageId={highlightedMessageId}
        onSendVoice={handleSend}
        onDiscardVoice={discardVoice}
        onEditVoice={editVoiceTranscript}
        onSendQueuedNow={handleSendQueuedNow}
        onDiscardQueued={handleDiscardQueued}
        onEditQueued={handleEditQueued}
        onEditMessage={handleEditMessage}
        onRegenerateFromMessage={handleRegenerateFromMessage}
        onSendPrompt={handleWorkflowPrompt}
      />
      
      {/* Tool Call Input - shows when user selects a tool from dropdown */}
      {selectedToolCall && (
        <div className="absolute bottom-0 left-0 right-0 z-30 px-4 pb-4"
          style={{
            transform: 'translateY(calc(-1 * var(--prompt-panel-bottom-offset) - 20vh - 20px))',
          }}
        >
          <ToolCallInput
            tool={selectedToolCall}
            onExecute={handleToolCallExecute}
            onCancel={handleToolCallCancel}
          />
        </div>
      )}
      
      {/* Terminal View - floats above PromptArea */}
      <TerminalView 
        isOpen={isTerminalOpen}
        onClose={onToggleTerminal || (() => {})}
        onSendCommand={useCallback((sendFn) => {
          // Store the send function to be called from PromptArea
          (window as any).__terminalSendCommand = sendFn;
        }, [])}
        autoCreateAgentLog={shouldShowAgentLog ? agentSessionId : null}
        onAgentLogCreated={useCallback((tabId: string) => {
          console.log('[ChatInterface] Agent Log tab created:', tabId);
        }, [])}
        onAgentLogClosed={useCallback(() => {
          console.log('[ChatInterface] Agent Log tab closed');
        }, [])}
      />
      
      {/* File Explorer Panel - floats above PromptArea */}
      <FileExplorerPanel 
        isOpen={isFileExplorerOpen}
        onClose={onToggleFileExplorer || (() => {})}
      />
      
      {/* Workflows Panel - floats above PromptArea */}
      <WorkflowsPanel 
        isOpen={isWorkflowsOpen}
        onClose={onToggleWorkflows || (() => {})}
      />
      
      <PromptArea
        ref={inputRef}
        input={input}
        isLoading={isLoading}
        isRecording={isRecording}
        hasPendingVoiceMessage={hasPendingVoiceMessage}
        activeMode={activeMode}
        activeColor={activeColor}
        audioLevels={audioLevels}
        audioStream={audioStream}
        onInputChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onSend={handleSend}
        onStop={handleStop}
        onMicClick={handleMicClick}
        onQuickAction={handleQuickAction}
        isTerminalOpen={isTerminalOpen}
        onToggleTerminal={onToggleTerminal}
        onToolCallSelected={handleToolCallSelected}
        waitingForInput={!!waitingForInput}
      />
    </div>
  );
};

export default ChatInterface;
