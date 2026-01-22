import React, { forwardRef, useRef, useEffect, useState, useCallback, memo } from 'react';
import { Search, Bot, Workflow, Terminal, X, FileText } from 'lucide-react';
import { QUICK_ACTIONS } from '../../src/constants';
import SynthesisVisualizer from '../ui/SynthesisVisualizer';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useSettings } from '../../src/contexts/SettingsContext';
import { QuickActionButton } from './QuickActionButton';
import { RecordButton } from './RecordButton';
import { SendButton } from './SendButton';
import { AddFileButton } from './AddFileButton';
import { FileChip, MultiFileChip } from './FileChip';
import { FileAttachmentModal, AttachedFile } from './FileAttachmentModal';
import { TokenDisplay } from './TokenDisplay';
import { ToolCallDropdown, type ToolDefinition } from './ToolCallDropdown';

// Icon mapping for quick actions - memoized outside component to prevent recreation
const QUICK_ACTION_ICONS: Record<string, (props: { size: number }) => React.ReactNode> = {
  Files: ({ size }) => <Search size={size} />,
  Agents: ({ size }) => <Bot size={size} />,
  Workflows: ({ size }) => <Workflow size={size} />,
  Terminal: ({ size }) => <Terminal size={size} />,
};

interface PromptAreaProps {
  input: string;
  isLoading: boolean;
  isRecording: boolean;
  hasPendingVoiceMessage: boolean;
  activeMode: string | null;
  activeColor: string;
  audioLevels: number[];
  audioStream: MediaStream | null;
  onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onSend: () => void;
  onStop?: () => void;
  onMicClick: () => void;
  onQuickAction: (mode: string, placeholder: string) => void;
  disabled?: boolean;
  isTerminalOpen?: boolean;
  onToggleTerminal?: () => void;
  onToolCallSelected?: (tool: ToolDefinition) => void;
  waitingForInput?: boolean;
}

export const PromptArea = memo(forwardRef<HTMLTextAreaElement, PromptAreaProps>(({
  input,
  isLoading,
  isRecording,
  hasPendingVoiceMessage,
  activeMode,
  audioLevels,
  audioStream,
  onInputChange,
  onKeyDown,
  onSend,
  onStop,
  onMicClick,
  onQuickAction,
  disabled = false,
  isTerminalOpen = false,
  onToggleTerminal,
  onToolCallSelected,
  waitingForInput = false,
}, ref) => {
  const { resolvedTheme } = useTheme();
  const { illumination } = useSettings();
  const isDarkMode = resolvedTheme === 'dark';
  
  const hasContent = input.trim().length > 0;
  const showQuickActions = !isRecording && !hasPendingVoiceMessage && !waitingForInput;
  const placeholder = isTerminalOpen
    ? "Type command and press Enter..."
    : waitingForInput
      ? "Enter your response here..."
      : hasPendingVoiceMessage 
        ? "Send your message?" 
        : "Ask me anything... (Type / for quick actions)";
  
  // Handle terminal command sending
  const handleTerminalKeyDown = (e: React.KeyboardEvent) => {
    // Don't handle Enter if dropdown is open (let dropdown handle it)
    if (showToolDropdown && (e.key === 'Enter' || e.key === 'Tab')) {
      return;
    }
    
    if (isTerminalOpen && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const command = (e.target as HTMLTextAreaElement).value;
      if (command.trim() && (window as any).__terminalSendCommand) {
        (window as any).__terminalSendCommand(command);
        (e.target as HTMLTextAreaElement).value = '';
        // Trigger onChange to clear the input state
        const event = new Event('input', { bubbles: true });
        (e.target as HTMLTextAreaElement).dispatchEvent(event);
      }
    } else if (!isTerminalOpen) {
      onKeyDown(e);
    }
  };
  
  // Detect Opera browser for notification (disabled in demo mode)
  const isOpera = navigator.userAgent.indexOf('OPR') !== -1 || navigator.userAgent.indexOf('Opera') !== -1;
  const isDemoMode = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('demo') === 'true';
  
  const quickActionsRef = useRef<HTMLDivElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const [showOperaNotification, setShowOperaNotification] = useState(false);
  const [fileReferences, setFileReferences] = useState<AttachedFile[]>([]);
  const [isFileModalOpen, setIsFileModalOpen] = useState(false);
  const [showToolDropdown, setShowToolDropdown] = useState(false);
  const [toolSearchQuery, setToolSearchQuery] = useState('');
  
  // Tool definitions - matches AGENT_TOOLS from agentChatService.ts
  const availableTools: ToolDefinition[] = [
    {
      name: 'create_terminal',
      description: 'Create a new terminal session for executing commands',
      parameters: {
        type: 'object',
        properties: {
          workspaceRoot: { type: 'string', description: 'Optional workspace root directory' },
          type: { type: 'string', description: "Type: 'shell' or 'codex'" },
        },
        required: [],
      },
    },
    {
      name: 'execute_command',
      description: 'Execute a command in a terminal session',
      parameters: {
        type: 'object',
        properties: {
          sessionId: { type: 'string', description: 'Terminal session ID' },
          command: { type: 'string', description: 'Command to execute' },
        },
        required: ['sessionId', 'command'],
      },
    },
    {
      name: 'read_output',
      description: 'Read output from a terminal session',
      parameters: {
        type: 'object',
        properties: {
          sessionId: { type: 'string', description: 'Terminal session ID' },
        },
        required: ['sessionId'],
      },
    },
    {
      name: 'list_terminals',
      description: 'List all active terminal sessions',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    {
      name: 'inspect_terminal',
      description: 'Get detailed terminal session information',
      parameters: {
        type: 'object',
        properties: {
          sessionId: { type: 'string', description: 'Terminal session ID' },
        },
        required: ['sessionId'],
      },
    },
    {
      name: 'shell',
      description: 'Execute a shell command and return output',
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'Shell command to execute' },
          workdir: { type: 'string', description: 'Working directory' },
          timeout_ms: { type: 'number', description: 'Timeout in milliseconds' },
        },
        required: ['command'],
      },
    },
    {
      name: 'read_file',
      description: 'Read file contents',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File path' },
          start_line: { type: 'number', description: 'Starting line number' },
          end_line: { type: 'number', description: 'Ending line number' },
        },
        required: ['path'],
      },
    },
    {
      name: 'write_file',
      description: 'Write content to a file',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File path' },
          content: { type: 'string', description: 'Content to write' },
          mode: { type: 'string', description: "Mode: 'overwrite' or 'append'" },
        },
        required: ['path', 'content'],
      },
    },
    {
      name: 'list_directory',
      description: 'List directory contents',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Directory path' },
          depth: { type: 'number', description: 'Maximum depth' },
          include_hidden: { type: 'boolean', description: 'Include hidden files' },
        },
        required: ['path'],
      },
    },
    {
      name: 'search_files',
      description: 'Search for files by name or content',
      parameters: {
        type: 'object',
        properties: {
          pattern: { type: 'string', description: 'Search pattern' },
          path: { type: 'string', description: 'Directory to search' },
          search_type: { type: 'string', description: "Type: 'filename' or 'content'" },
          max_results: { type: 'number', description: 'Maximum results' },
        },
        required: ['pattern'],
      },
    },
    {
      name: 'web_search',
      description: 'Search the web for information',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
          num_results: { type: 'number', description: 'Number of results (max 10)' },
          search_type: { type: 'string', description: "Type: 'general', 'news', or 'docs'", enum: ['general', 'news', 'docs'] },
        },
        required: ['query'],
      },
    },
    {
      name: 'invoke_agent',
      description: 'Invoke a specialized agent',
      parameters: {
        type: 'object',
        properties: {
          agent_id: { type: 'string', description: 'Agent ID' },
          message: { type: 'string', description: 'Message for the agent' },
          context: { type: 'object', description: 'Additional context' },
        },
        required: ['agent_id', 'message'],
      },
    },
    {
      name: 'list_agents',
      description: 'List available agents',
      parameters: {
        type: 'object',
        properties: {
          state: { type: 'string', description: "Filter by state: 'on', 'off', 'sleeping', 'failing'" },
          tags: { type: 'array', items: { type: 'string' }, description: 'Filter by tags' },
        },
        required: [],
      },
    },
    {
      name: 'create_agent',
      description: 'Create a new agent',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Agent name' },
          description: { type: 'string', description: 'Agent description' },
          master_prompt: { type: 'string', description: 'Master prompt' },
          workflows: { type: 'array', items: { type: 'string' }, description: 'Workflow IDs' },
          allowed_tools: { type: 'array', items: { type: 'string' }, description: 'Allowed tools' },
          trigger: { type: 'object', description: 'Trigger configuration' },
        },
        required: ['name', 'description', 'master_prompt'],
      },
    },
  ];
  
  // Detect "/" at start of input to show tool dropdown
  useEffect(() => {
    if (input.startsWith('/') && !isRecording && !hasPendingVoiceMessage) {
      const query = input.slice(1); // Remove the "/"
      
      // Check if user typed space after a complete tool name
      if (query.includes(' ')) {
        const toolName = query.split(' ')[0];
        const matchedTool = availableTools.find(t => t.name === toolName);
        
        if (matchedTool) {
          // Auto-select the tool and close dropdown
          setShowToolDropdown(false);
          setToolSearchQuery('');
          if (onToolCallSelected) {
            onToolCallSelected(matchedTool);
          }
          // Clear the input
          const event = new Event('input', { bubbles: true });
          if (textAreaRef.current) {
            textAreaRef.current.value = '';
            textAreaRef.current.dispatchEvent(event);
          }
          return;
        }
      }
      
      setToolSearchQuery(query);
      setShowToolDropdown(true);
    } else {
      setShowToolDropdown(false);
      setToolSearchQuery('');
    }
  }, [input, isRecording, hasPendingVoiceMessage, availableTools, onToolCallSelected]);
  
  // Handle tool selection
  const handleToolSelect = useCallback((tool: ToolDefinition) => {
    setShowToolDropdown(false);
    if (onToolCallSelected) {
      onToolCallSelected(tool);
    }
  }, [onToolCallSelected]);
  
  // Listen for file reference additions from FileExplorerPanel
  useEffect(() => {
    const handleAddFileReference = (event: CustomEvent<{ fileName: string; filePath: string }>) => {
      const { fileName, filePath } = event.detail;
      setFileReferences(prev => {
        // Don't add duplicates
        if (prev.some(ref => ref.fileName === fileName)) {
          return prev;
        }
        return [...prev, { fileName, filePath }];
      });
    };
    
    window.addEventListener('add-file-reference', handleAddFileReference as EventListener);
    return () => {
      window.removeEventListener('add-file-reference', handleAddFileReference as EventListener);
    };
  }, []);
  
  // Update global file references map when fileReferences changes
  useEffect(() => {
    if (!(window as any).__chatFileReferences) {
      (window as any).__chatFileReferences = new Map();
    }
    const map = (window as any).__chatFileReferences as Map<string, string>;
    map.clear();
    fileReferences.forEach(ref => {
      map.set(ref.fileName, ref.filePath);
    });
  }, [fileReferences]);
  
  // Clear file references after sending a message
  useEffect(() => {
    const handleMessageSent = () => {
      setFileReferences([]);
    };
    
    window.addEventListener('chat-message-sent', handleMessageSent);
    return () => {
      window.removeEventListener('chat-message-sent', handleMessageSent);
    };
  }, []);
  
  // Add a file reference
  const addFileReference = useCallback((file: AttachedFile) => {
    setFileReferences(prev => {
      if (prev.some(ref => ref.fileName === file.fileName)) {
        return prev;
      }
      return [...prev, file];
    });
  }, []);
  
  // Remove a file reference
  const removeFileReference = useCallback((fileName: string) => {
    setFileReferences(prev => prev.filter(ref => ref.fileName !== fileName));
  }, []);
  
  // Clear all file references
  const clearAllFileReferences = useCallback(() => {
    setFileReferences([]);
  }, []);
  
  // Handle + button click
  const handleAddFileClick = useCallback(() => {
    setIsFileModalOpen(true);
  }, []);
  
  // Show Opera notification briefly when component mounts (skip in demo mode)
  useEffect(() => {
    if (isOpera && !isDemoMode && !localStorage.getItem('opera-voice-notification-shown')) {
      setShowOperaNotification(true);
      localStorage.setItem('opera-voice-notification-shown', 'true');
      setTimeout(() => setShowOperaNotification(false), 4000);
    }
  }, [isOpera, isDemoMode]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textAreaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const max = parseFloat(getComputedStyle(el).maxHeight || '0');
    const next = Math.min(el.scrollHeight, max || el.scrollHeight);
    el.style.height = `${next}px`;
  }, [input]);

  const smoothEasing = 'cubic-bezier(0.22, 1, 0.36, 1)';

  // Calculate illumination based on active button and settings
  const activeAction = activeMode ? QUICK_ACTIONS.find(a => a.id === activeMode) : null;
  
  const showIllumination = illumination.enabled && activeAction;
  const intensityHex = Math.round(illumination.intensity * 2.55).toString(16).padStart(2, '0');
  const intensityMidHex = Math.round(illumination.intensity * 1.27).toString(16).padStart(2, '0');
  const intensityLowHex = Math.round(illumination.intensity * 0.5).toString(16).padStart(2, '0');
  const diffusionStop1 = Math.round(illumination.diffusion * 0.35);
  const diffusionStop2 = Math.round(illumination.diffusion * 0.6);
  const diffusionStop3 = Math.round(illumination.diffusion * 0.9);

  return (
    <div
      className="absolute bottom-0 left-0 right-0 pointer-events-none z-20"
      style={{
        paddingLeft: 'var(--prompt-area-x)',
        paddingRight: 'var(--prompt-area-x)',
        paddingTop: 'var(--prompt-area-y)',
        paddingBottom: 'var(--prompt-area-x)',
        transform: 'translateY(calc(-1 * var(--prompt-panel-bottom-offset)))',
      }}
    >
      {/* Tool Call Dropdown */}
      {showToolDropdown && (
        <ToolCallDropdown
          searchQuery={toolSearchQuery}
          onSelectTool={handleToolSelect}
          onClose={() => setShowToolDropdown(false)}
          tools={availableTools}
        />
      )}
      
      <div 
        className="prompt-panel flex flex-col shadow-2xl pointer-events-auto glass-elevated relative overflow-hidden"
        style={{ 
          background: showIllumination
            ? `${activeAction.color}${isDarkMode ? '08' : '12'}`
            : undefined,
          transition: `background 0.5s ${smoothEasing}, border-color 0.5s ${smoothEasing}, box-shadow 0.5s ${smoothEasing}`,
          padding: 'var(--prompt-panel-padding)',
          borderRadius: 'var(--prompt-panel-radius)',
        }}
      >
        {/* Illumination overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: showIllumination
              ? `radial-gradient(circle at 12.5% 25%, ${activeAction.color}${intensityHex} 0%, ${activeAction.color}${intensityMidHex} ${diffusionStop1}%, ${activeAction.color}${intensityLowHex} ${diffusionStop2}%, transparent ${diffusionStop3}%)`
              : 'none',
            opacity: showIllumination ? 1 : 0,
            transition: `opacity 0.4s ${smoothEasing}, background 0.4s ${smoothEasing}`,
            borderRadius: 'inherit',
          }}
        />

        {/* Quick Actions */}
        <div 
          style={{
            display: 'grid',
            gridTemplateRows: showQuickActions ? '1fr' : '0fr',
            transition: `grid-template-rows 0.5s ${smoothEasing}`,
          }}
        >
          <div style={{ overflow: 'hidden' }}>
            <div 
              ref={quickActionsRef}
              style={{
                opacity: showQuickActions ? 1 : 0,
                transform: showQuickActions ? 'translateY(0)' : 'translateY(8px)',
                transition: `opacity 0.4s ${smoothEasing}, transform 0.5s ${smoothEasing}`,
                paddingBottom: 12,
              }}
            >
              <div
                className="quick-action-grid grid grid-cols-4"
                style={{
                  gap: 'calc(var(--scale-space-2) * var(--spacing-scale))',
                  paddingLeft: 'calc(var(--scale-space-2) * var(--spacing-scale))',
                  paddingRight: 'calc(var(--scale-space-2) * var(--spacing-scale))',
                  paddingTop: 'calc(var(--scale-space-1) * var(--spacing-scale))',
                  paddingBottom: 'calc(var(--scale-space-2) * var(--spacing-scale))',
                }}
              >
                {QUICK_ACTIONS.map((action, index) => {
                  const isActive = activeMode === action.id;
                  return (
                    <QuickActionButton
                      key={action.id}
                      id={action.id}
                      color={action.color}
                      activeColor={action.activeColor}
                      icon={QUICK_ACTION_ICONS[action.id]({ size: 14 })}
                      isActive={isActive}
                      onClick={() => onQuickAction(action.id, action.placeholder)}
                      style={{
                        opacity: showQuickActions ? 1 : 0,
                        transform: showQuickActions ? 'scale(1)' : 'scale(0.92)',
                        transition: `opacity 0.35s ${smoothEasing} ${showQuickActions ? index * 0.04 : (QUICK_ACTIONS.length - 1 - index) * 0.02}s, transform 0.4s ${smoothEasing} ${showQuickActions ? index * 0.04 : 0}s`,
                        fontSize: 'calc(var(--scale-font-sm) * var(--text-scale))',
                        padding: 'calc(8px * var(--component-scale) * var(--scale)) calc(12px * var(--component-scale) * var(--scale))',
                        borderRadius: 'calc(12px * var(--component-scale) * var(--scale))',
                      }}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        
        {/* Input Row */}
        <div className="flex items-center gap-2">
          {/* Add File Button */}
          <div
            style={{
              paddingLeft: 'calc(var(--scale-space-1) * var(--spacing-scale))',
            }}
          >
            <AddFileButton 
              onClick={handleAddFileClick} 
              fileCount={fileReferences.length}
            />
          </div>
          
          {/* File Chips - shown to the right of + button */}
          {fileReferences.length > 0 && (
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {fileReferences.length === 1 ? (
                <FileChip
                  fileName={fileReferences[0].fileName}
                  filePath={fileReferences[0].filePath}
                  onRemove={() => removeFileReference(fileReferences[0].fileName)}
                />
              ) : (
                <MultiFileChip
                  fileCount={fileReferences.length}
                  onClick={handleAddFileClick}
                  attachedFiles={fileReferences}
                />
              )}
            </div>
          )}
          
          <div
            className="flex-1 relative"
            style={{
              paddingLeft: 'calc(var(--scale-space-2) * var(--spacing-scale))',
              minHeight: 'calc(40px * var(--component-scale) * var(--scale))',
              transform: 'translateY(5px)',
            }}
          >
            {/* SoundWave when recording */}
            <div
              style={{
                opacity: isRecording ? 1 : 0,
                transform: isRecording ? 'scale(1)' : 'scale(0.98)',
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                pointerEvents: isRecording ? 'auto' : 'none',
                transition: `opacity 0.4s ${smoothEasing}, transform 0.5s ${smoothEasing}`,
              }}
            >
              <SynthesisVisualizer 
                audioStream={audioStream}
                lineColor={isDarkMode ? '#ffffff' : '#fbd0d0'}
                isDarkMode={isDarkMode}
              />
            </div>
            
            {/* Text input */}
            <div
              style={{
                opacity: isRecording ? 0 : 1,
                transform: isRecording ? 'scale(0.98)' : 'scale(1)',
                pointerEvents: isRecording ? 'none' : 'auto',
                transition: `opacity 0.4s ${smoothEasing}, transform 0.5s ${smoothEasing}`,
              }}
            >
              <textarea 
                ref={(node) => {
                  textAreaRef.current = node;
                  if (typeof ref === 'function') ref(node);
                  else if (ref) (ref as React.RefObject<HTMLTextAreaElement | null>).current = node;
                }}
                rows={1}
                value={input}
                onChange={onInputChange}
                onKeyDown={handleTerminalKeyDown}
                placeholder={placeholder}
                disabled={disabled}
                className="w-full bg-transparent border-none outline-none font-semibold placeholder:text-text-secondary placeholder:font-medium font-jakarta text-text-primary resize-none disabled:cursor-default file-mention-input"
                style={{
                  fontSize: 'var(--prompt-input-font)',
                  paddingTop: 'calc(var(--scale-space-1) * var(--spacing-scale))',
                  paddingBottom: 'calc(var(--scale-space-1) * var(--spacing-scale))',
                  maxHeight: 'calc(140px * var(--component-scale) * var(--scale))',
                  overflowY: 'auto',
                }}
              />
            </div>
          </div>
          
          {/* Token Display - shows usage stats */}
          <TokenDisplay className="flex-shrink-0 mr-2" />
          
          {/* Action Buttons */}
          <div
            className="flex items-center"
            style={{
              gap: 'calc(var(--scale-space-2) * var(--spacing-scale))',
              paddingRight: 'calc(var(--scale-space-1) * var(--spacing-scale))',
            }}
          >
            <RecordButton isRecording={isRecording} onClick={onMicClick} />
            <SendButton
              isLoading={isLoading}
              isRecording={isRecording}
              hasContent={hasContent}
              hasPendingVoiceMessage={hasPendingVoiceMessage}
              onClick={onSend}
              onStop={onStop}
            />
          </div>
        </div>
      </div>
      
      {/* Opera Voice Input Notification */}
      {showOperaNotification && (
        <div 
          className="absolute bottom-full left-4 right-4 mb-2 p-3 rounded-2xl border border-amber-200 dark:border-amber-600 animate-in fade-in slide-in-from-bottom-2 duration-300 glass-subtle"
        >
          <div className="flex items-start gap-2">
            <div className="w-5 h-5 rounded-full bg-amber-400 dark:bg-amber-500 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-[10px] font-bold text-white dark:text-amber-900">!</span>
            </div>
            <div>
              <p className="text-[11px] font-bold text-amber-700 font-jakarta">
                Opera Browser Detected
              </p>
              <p className="text-[10px] font-medium text-amber-600 font-jakarta leading-relaxed mt-1">
                Voice input isn't supported in Opera. Click the mic button for a text input fallback.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* File Attachment Modal */}
      <FileAttachmentModal
        isOpen={isFileModalOpen}
        onClose={() => setIsFileModalOpen(false)}
        attachedFiles={fileReferences}
        onAddFile={addFileReference}
        onRemoveFile={removeFileReference}
        onClearAll={clearAllFileReferences}
      />
    </div>
  );
}));

PromptArea.displayName = 'PromptArea';
