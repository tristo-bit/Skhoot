import { forwardRef } from 'react';
import { Message } from '../../types';
import { MessageBubble, LoadingIndicator, SearchingIndicator } from '../conversations';
import { VoiceMessage } from '../conversations/VoiceMessage';
import { ScrollbarStyles } from '../ui';
import { WelcomeMessage } from './WelcomeMessage';

interface MainAreaProps {
  messages: Message[];
  isLoading: boolean;
  searchType: 'files' | 'messages' | 'disk' | 'cleanup' | null;
  isRecording: boolean;
  hasPendingVoiceMessage: boolean;
  voiceTranscript: string;
  pendingVoiceText: string;
  welcomeMessage: string;
  isEmptyStateVisible: boolean;
  isEmptyStateExiting: boolean;
  activeMode: string | null;
  promptKey?: number;
  onSendVoice: () => void;
  onDiscardVoice: () => void;
}

/**
 * Main content area that displays messages, empty state, and voice messages
 * Previously named Conversations
 */
export const MainArea = forwardRef<HTMLDivElement, MainAreaProps>(({
  messages,
  isLoading,
  searchType,
  isRecording,
  hasPendingVoiceMessage,
  voiceTranscript,
  pendingVoiceText,
  welcomeMessage,
  isEmptyStateVisible,
  isEmptyStateExiting,
  activeMode,
  promptKey = 0,
  onSendVoice,
  onDiscardVoice,
}, ref) => {
  const hasMessages = messages.length > 0;
  const showEmptyState = isEmptyStateVisible && !hasMessages && !isLoading && !hasPendingVoiceMessage && !isRecording;

  return (
    <div className="flex-1 min-h-0">
      <ScrollbarStyles />
      <div 
        ref={ref}
        className={`overflow-y-auto px-6 pt-4 space-y-6 custom-scrollbar ${
          showEmptyState ? 'flex flex-col items-center justify-center' : ''
        }`}
        style={{
          height: 'calc(100% - var(--prompt-area-height))',
          paddingBottom: 'calc(var(--scale-space-4) * var(--spacing-scale))',
        }}
      >
        {/* Empty State with Welcome Message */}
        {showEmptyState && (
          <WelcomeMessage 
            welcomeMessage={welcomeMessage} 
            isExiting={isEmptyStateExiting}
            activeMode={activeMode}
            promptKey={promptKey}
          />
        )}
        
        {/* Messages */}
        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
      
        {/* Voice Message */}
        {(isRecording || hasPendingVoiceMessage) && (voiceTranscript || pendingVoiceText) && (
          <VoiceMessage 
            transcript={voiceTranscript}
            pendingText={pendingVoiceText}
            onSend={onSendVoice}
            onDiscard={onDiscardVoice}
            isRecording={isRecording}
            isPending={hasPendingVoiceMessage}
          />
        )}
        
        {/* Search/Loading indicator */}
        {isLoading && (
          searchType ? <SearchingIndicator type={searchType} /> : <LoadingIndicator />
        )}
      </div>
    </div>
  );
});

MainArea.displayName = 'MainArea';
