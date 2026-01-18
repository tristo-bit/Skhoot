import { memo, useState, useCallback } from 'react';
import { Message } from '../../types';
import { MarkdownRenderer } from '../ui';
import { FileList } from './FileList';
import { MessageList } from './MessageList';
import { DiskUsage } from './DiskUsage';
import { CleanupList } from './CleanupList';
import { AgentAction } from './AgentAction';
import { MiniTerminalView } from './MiniTerminalView';
import { WorkflowExecution } from './WorkflowExecution';
import { ToolCallDisplay } from '../chat/ToolCallDisplay';
import { ImageGallery } from './ImageGallery';
import { Button } from '../buttonFormat';
import { ArrowRight, FileText, Paperclip, Edit2, Check, X } from 'lucide-react';
import { workflowService } from '../../services/workflowService';

// Check if message is the "No AI provider configured" warning
const isApiConfigWarning = (content: string): boolean => {
  return content.includes('No AI provider configured') && content.includes('API Configuration');
};

// Handle navigation to API Configuration
const handleGoToApiConfig = () => {
  window.dispatchEvent(new CustomEvent('open-api-config'));
};

export const MessageBubble = memo<{ 
  message: Message;
  onEdit?: (messageId: string, newContent: string) => void;
  onRegenerateFrom?: (messageId: string, newContent: string) => void;
  onSendPrompt?: (prompt: string) => Promise<string>;
  hasAgentMode?: boolean;
}>(({ message, onEdit, onRegenerateFrom, onSendPrompt, hasAgentMode = false }) => {
  const isUser = message.role === 'user';
  const showApiConfigButton = !isUser && isApiConfigWarning(message.content);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(message.content);
  
  // Handle workflow prompt sending
  const handleWorkflowPrompt = useCallback(async (prompt: string): Promise<string> => {
    if (onSendPrompt) {
      return onSendPrompt(prompt);
    }
    // Fallback: dispatch event for ChatInterface to handle
    return new Promise((resolve) => {
      const handler = (e: CustomEvent) => {
        window.removeEventListener('workflow-response' as any, handler);
        resolve(e.detail.response);
      };
      window.addEventListener('workflow-response' as any, handler);
      window.dispatchEvent(new CustomEvent('workflow-prompt', { detail: { prompt } }));
    });
  }, [onSendPrompt]);
  
  if (!isUser) {
    // AI message - no bubble, markdown rendered with theme colors
    return (
      <div 
        className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-300 contain-content"
        data-message-id={message.id}
      >
        <div className="max-w-[95%] py-2 px-1">
          <MarkdownRenderer content={message.content} />
          
          {/* Display Images - AI web search or other images */}
          {message.displayImages && message.displayImages.length > 0 && (
            <div className="mt-3">
              <ImageGallery images={message.displayImages} maxDisplay={6} />
            </div>
          )}
          
          {/* Go to API Configuration button - Embossed style */}
          {showApiConfigButton && (
            <Button
              onClick={handleGoToApiConfig}
              variant="secondary"
              size="sm"
              icon={<ArrowRight size={16} />}
              iconPosition="right"
              className="mt-3 border border-glass-border"
              style={{
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04), inset 0 1px 1px rgba(255, 255, 255, 0.2)'
              }}
            >
              Go to API Configuration
            </Button>
          )}

          {message.type === 'file_list' && message.data && (
            <FileList 
              files={message.data} 
              searchInfo={(message as any).searchInfo}
            />
          )}

          {message.type === 'message_list' && message.data && (
            <MessageList messages={message.data} />
          )}

          {message.type === 'disk_usage' && message.data && (
            <DiskUsage items={message.data} />
          )}

          {message.type === 'cleanup' && message.data && (
            <CleanupList items={message.data} />
          )}

          {/* Workflow Execution */}
          {message.type === 'workflow' && message.workflowExecution && (() => {
            const workflow = workflowService.getWorkflowSync(message.workflowExecution.workflowId);
            if (!workflow) return null;
            
            return (
              <WorkflowExecution
                executionId={message.workflowExecution.executionId}
                workflow={workflow}
                onSendPrompt={handleWorkflowPrompt}
                hasAgentMode={hasAgentMode}
              />
            );
          })()}

          {/* Agent Actions - Tool Calls */}
          {message.type === 'agent_action' && message.toolCalls && (() => {
            // Group terminal commands together, show other tools separately
            const terminalCalls = message.toolCalls.filter(tc => 
              ['create_terminal', 'execute_command'].includes(tc.name)
            );
            const otherCalls = message.toolCalls.filter(tc => 
              !['create_terminal', 'execute_command', 'read_output', 'list_terminals', 'inspect_terminal'].includes(tc.name)
            );
            
            return (
              <>
                {/* Show single MiniTerminalView for all terminal commands */}
                {terminalCalls.length > 0 && (() => {
                  console.log('[MessageBubble] Processing terminal calls:', terminalCalls);
                  
                  // Get the last execute_command to extract sessionId
                  const lastExecute = [...terminalCalls].reverse().find(tc => tc.name === 'execute_command');
                  if (!lastExecute) {
                    console.log('[MessageBubble] No execute_command found');
                    return null;
                  }
                  
                  console.log('[MessageBubble] Last execute:', lastExecute);
                  
                  const result = message.toolResults?.find(r => r.toolCallId === lastExecute.id);
                  console.log('[MessageBubble] Found result:', result);
                  
                  if (!result || !result.output) {
                    console.log('[MessageBubble] No result or output');
                    return null;
                  }
                  
                  // Extract sessionId
                  let sessionId = '';
                  try {
                    const parsed = JSON.parse(result.output);
                    console.log('[MessageBubble] Parsed output:', parsed);
                    sessionId = parsed.data?.sessionId || parsed.sessionId || '';
                  } catch (e) {
                    console.error('[MessageBubble] Failed to parse terminal result:', e);
                    const match = result.output.match(/sessionId['":\s]+([a-f0-9-]+)/i);
                    sessionId = match ? match[1] : '';
                  }
                  
                  console.log('[MessageBubble] Extracted sessionId:', sessionId);
                  
                  if (!sessionId) {
                    console.warn('[MessageBubble] No sessionId found in terminal result');
                    return null;
                  }
                  
                  // Get all commands
                  const commands = terminalCalls
                    .filter(tc => tc.name === 'execute_command')
                    .map(tc => tc.arguments?.command)
                    .filter(Boolean);
                  
                  console.log('[MessageBubble] Commands:', commands);
                  
                  return (
                    <MiniTerminalView
                      key={`terminal-${sessionId}`}
                      sessionId={sessionId}
                      command={commands.join(' && ')}
                      maxLines={10}
                    />
                  );
                })()}
                
                {/* Show other tool calls with their UI */}
                {otherCalls.map((toolCall, index) => {
                  const result = message.toolResults?.find(r => r.toolCallId === toolCall.id);
                  return (
                    <AgentAction
                      key={toolCall.id || index}
                      toolCall={toolCall}
                      result={result}
                      isExecuting={!result}
                    />
                  );
                })}
              </>
            );
          })()}

          {/* Inline tool calls in regular messages */}
          {message.toolCalls && message.type !== 'agent_action' && (() => {
            // Group terminal commands together, show other tools separately
            const terminalCalls = message.toolCalls.filter(tc => 
              ['create_terminal', 'execute_command'].includes(tc.name)
            );
            const otherCalls = message.toolCalls.filter(tc => 
              !['create_terminal', 'execute_command', 'read_output', 'list_terminals', 'inspect_terminal'].includes(tc.name)
            );
            
            return (
              <>
                {/* Show single MiniTerminalView for all terminal commands */}
                {terminalCalls.length > 0 && (() => {
                  // Get the last execute_command to extract sessionId
                  const lastExecute = [...terminalCalls].reverse().find(tc => tc.name === 'execute_command');
                  if (!lastExecute) return null;
                  
                  const result = message.toolResults?.find(r => r.toolCallId === lastExecute.id);
                  if (!result || !result.output) return null;
                  
                  // Extract sessionId
                  let sessionId = '';
                  try {
                    const parsed = JSON.parse(result.output);
                    sessionId = parsed.data?.sessionId || parsed.sessionId || '';
                  } catch (e) {
                    console.error('[MessageBubble] Failed to parse terminal result:', e);
                    const match = result.output.match(/sessionId['":\s]+([a-f0-9-]+)/i);
                    sessionId = match ? match[1] : '';
                  }
                  
                  if (!sessionId) {
                    console.warn('[MessageBubble] No sessionId found in terminal result');
                    return null;
                  }
                  
                  // Get all commands
                  const commands = terminalCalls
                    .filter(tc => tc.name === 'execute_command')
                    .map(tc => tc.arguments?.command)
                    .filter(Boolean);
                  
                  return (
                    <MiniTerminalView
                      key={`terminal-inline-${sessionId}`}
                      sessionId={sessionId}
                      command={commands.join(' && ')}
                      maxLines={10}
                    />
                  );
                })()}
                
                {/* Show other tool calls with their UI */}
                {otherCalls.map((toolCall, index) => {
                  const result = message.toolResults?.find(r => r.toolCallId === toolCall.id);
                  return (
                    <AgentAction
                      key={toolCall.id || index}
                      toolCall={toolCall}
                      result={result}
                      isExecuting={!result}
                    />
                  );
                })}
              </>
            );
          })()}
        </div>
      </div>
    );
  }

  // User message - embossed bubble
  return (
    <div 
      className="flex justify-end animate-in fade-in slide-in-from-bottom-2 duration-300 contain-content group"
      data-message-id={message.id}
    >
      <div 
        className="max-w-[90%] p-4 rounded-3xl rounded-tr-none border-glass-border glass-subtle relative"
        style={{
          boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.15), inset 0 1px 2px rgba(0, 0, 0, 0.1)',
        }}
      >
        {/* Edit button - shows on hover */}
        {!isEditing && onEdit && (
          <button
            onClick={() => setIsEditing(true)}
            className="absolute top-2 right-2 p-1.5 rounded-lg glass-subtle hover:glass-elevated opacity-0 group-hover:opacity-100 transition-opacity"
            title="Edit message"
          >
            <Edit2 size={12} className="text-text-secondary" />
          </button>
        )}

        {/* Attached Files Indicator */}
        {message.attachedFiles && message.attachedFiles.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2 pb-2 border-b border-glass-border">
            <div className="flex items-center gap-1 text-text-secondary text-[10px] font-medium">
              <Paperclip size={10} />
              <span>{message.attachedFiles.length} file{message.attachedFiles.length !== 1 ? 's' : ''} attached:</span>
            </div>
            {message.attachedFiles.map((file) => {
              // Get file type info for color
              const getFileExtension = (fileName: string): string => {
                const parts = fileName.split('.');
                return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
              };
              
              const getFileColor = (fileName: string): string => {
                const ext = getFileExtension(fileName);
                
                // Images - violet
                if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'ico'].includes(ext)) {
                  return '#c0b7c9';
                }
                // Videos - pink
                if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm'].includes(ext)) {
                  return '#ec4899';
                }
                // Audio - blue
                if (['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac'].includes(ext)) {
                  return '#3b82f6';
                }
                // Code - cyan
                if (['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'h', 'css', 'html', 'json', 'xml', 'yaml', 'yml', 'sh', 'bash'].includes(ext)) {
                  return '#06b6d4';
                }
                // Archives - orange
                if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(ext)) {
                  return '#f97316';
                }
                // Documents - emerald (default)
                return '#10b981';
              };
              
              const fileColor = getFileColor(file.fileName);
              
              return (
                <div
                  key={file.fileName}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                  style={{
                    backgroundColor: `${fileColor}20`,
                    color: fileColor,
                  }}
                  title={file.filePath}
                >
                  <FileText size={10} />
                  <span className="truncate max-w-[80px]">{file.fileName}</span>
                </div>
              );
            })}
          </div>
        )}
        
        {/* Display Images - User attached images */}
        {message.displayImages && message.displayImages.length > 0 && (
          <div className="mb-3">
            <ImageGallery images={message.displayImages} maxDisplay={6} />
          </div>
        )}
        
        {/* Message content - editable or display */}
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="w-full p-2 rounded-lg glass-subtle text-[13px] leading-relaxed font-semibold font-jakarta text-text-primary resize-none focus:outline-none focus:ring-2"
              style={{ borderColor: '#c0b7c9' }}
              rows={3}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                  e.preventDefault();
                  if (onEdit && editedContent.trim()) {
                    onEdit(message.id, editedContent.trim());
                    setIsEditing(false);
                    // Trigger regeneration from this point with new content
                    if (onRegenerateFrom) {
                      onRegenerateFrom(message.id, editedContent.trim());
                    }
                  }
                } else if (e.key === 'Escape') {
                  setEditedContent(message.content);
                  setIsEditing(false);
                }
              }}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setEditedContent(message.content);
                  setIsEditing(false);
                }}
                className="px-3 py-1.5 rounded-lg glass-subtle hover:glass-elevated text-[11px] font-medium text-text-secondary transition-colors flex items-center gap-1"
              >
                <X size={12} />
                Cancel
              </button>
              <button
                onClick={() => {
                  if (onEdit && editedContent.trim()) {
                    onEdit(message.id, editedContent.trim());
                    setIsEditing(false);
                    // Trigger regeneration from this point with new content
                    if (onRegenerateFrom) {
                      onRegenerateFrom(message.id, editedContent.trim());
                    }
                  }
                }}
                disabled={!editedContent.trim() || editedContent === message.content}
                className="px-3 py-1.5 rounded-lg text-white text-[11px] font-medium transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#c0b7c9' }}
                onMouseEnter={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.backgroundColor = '#b0a7b9';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.backgroundColor = '#c0b7c9';
                  }
                }}
              >
                <Check size={12} />
                Save
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Show tool calls if present */}
            {message.toolCalls && message.toolCalls.length > 0 && (
              <div className="space-y-2 mb-3">
                {message.toolCalls.map((toolCall, index) => (
                  <ToolCallDisplay
                    key={toolCall.id || index}
                    toolName={toolCall.name}
                    parameters={toolCall.arguments}
                    defaultExpanded={false}
                  />
                ))}
              </div>
            )}
            
            {/* Regular message content */}
            {message.content && !message.content.startsWith('Executing tool:') && (
              <p className="text-[13px] leading-relaxed font-semibold font-jakarta text-text-primary">
                {message.content}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
});

MessageBubble.displayName = 'MessageBubble';
