import { memo } from 'react';
import { Message } from '../../types';
import { MarkdownRenderer } from '../ui';
import { FileList } from './FileList';
import { MessageList } from './MessageList';
import { DiskUsage } from './DiskUsage';
import { CleanupList } from './CleanupList';
import { AgentAction } from './AgentAction';
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
          {message.type === 'agent_action' && message.toolCalls && message.toolCalls.map((toolCall, index) => {
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

          {/* Inline tool calls in regular messages */}
          {message.toolCalls && message.type !== 'agent_action' && message.toolCalls.map((toolCall, index) => {
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
        
        <p className="text-[13px] leading-relaxed font-semibold font-jakarta text-text-primary">
          {message.content}
        </p>
      </div>
    </div>
  );
});

MessageBubble.displayName = 'MessageBubble';
