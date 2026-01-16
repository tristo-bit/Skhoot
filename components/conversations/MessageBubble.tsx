import { memo } from 'react';
import { Message } from '../../types';
import { MarkdownRenderer } from '../ui';
import { FileList } from './FileList';
import { MessageList } from './MessageList';
import { DiskUsage } from './DiskUsage';
import { CleanupList } from './CleanupList';
import { AgentAction } from './AgentAction';
import { MiniTerminalView } from './MiniTerminalView';
import { Button } from '../buttonFormat';
import { ArrowRight, FileText, Paperclip } from 'lucide-react';

// Check if message is the "No AI provider configured" warning
const isApiConfigWarning = (content: string): boolean => {
  return content.includes('No AI provider configured') && content.includes('API Configuration');
};

// Handle navigation to API Configuration
const handleGoToApiConfig = () => {
  window.dispatchEvent(new CustomEvent('open-api-config'));
};

export const MessageBubble = memo<{ message: Message }>(({ message }) => {
  const isUser = message.role === 'user';
  const showApiConfigButton = !isUser && isApiConfigWarning(message.content);
  
  if (!isUser) {
    // AI message - no bubble, markdown rendered with theme colors
    return (
      <div 
        className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-300 contain-content"
        data-message-id={message.id}
      >
        <div className="max-w-[95%] py-2 px-1">
          <MarkdownRenderer content={message.content} />
          
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
      className="flex justify-end animate-in fade-in slide-in-from-bottom-2 duration-300 contain-content"
      data-message-id={message.id}
    >
      <div 
        className="max-w-[90%] p-4 rounded-3xl rounded-tr-none border-glass-border glass-subtle"
        style={{
          boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.15), inset 0 1px 2px rgba(0, 0, 0, 0.1)',
        }}
      >
        {/* Attached Files Indicator */}
        {message.attachedFiles && message.attachedFiles.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2 pb-2 border-b border-glass-border">
            <div className="flex items-center gap-1 text-emerald-500 text-[10px] font-medium">
              <Paperclip size={10} />
              <span>{message.attachedFiles.length} file{message.attachedFiles.length !== 1 ? 's' : ''} attached:</span>
            </div>
            {message.attachedFiles.map((file) => (
              <div
                key={file.fileName}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-medium"
                title={file.filePath}
              >
                <FileText size={10} />
                <span className="truncate max-w-[80px]">{file.fileName}</span>
              </div>
            ))}
          </div>
        )}
        
        <p className="text-[13px] leading-relaxed font-semibold font-jakarta text-text-primary">
          {message.content}
        </p>
      </div>
    </div>
  );
});

MessageBubble.displayName = 'MessageBubble';
