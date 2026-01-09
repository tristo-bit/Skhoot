import React, { forwardRef, memo } from 'react';
import { COLORS, GLASS_STYLES } from '../constants';
import { Message } from '../types';
import { MessageBubble, LoadingIndicator, SearchingIndicator } from './Messages';
import { VoiceMessage } from './VoiceMessage';
import { TypewriterText, ScrollbarStyles } from './shared';

// Memoized logo component
const SkhootLogo = memo(({ size = 64 }: { size?: number }) => (
  <img 
    src="/skhoot-purple.svg" 
    alt="Skhoot" 
    width={size} 
    height={size}
    style={{ filter: 'drop-shadow(1px 2px 2px rgba(0,0,0,0.25)) drop-shadow(-1px -1px 1px rgba(255,255,255,0.4))' }}
  />
));
SkhootLogo.displayName = 'SkhootLogo';

interface EmptyStateProps {
  welcomeMessage: string;
  isExiting?: boolean;
}

export const EmptyState = memo<EmptyStateProps>(({ welcomeMessage, isExiting = false }) => (
  <div 
    className={`text-center max-w-[340px] transition-all duration-600 ease-out ${
      isExiting ? 'empty-state-exit' : 'animate-in fade-in zoom-in duration-700'
    }`}
    style={{
      opacity: isExiting ? 0 : 1,
      transform: isExiting ? 'scale(0.8) translateY(-30px)' : 'scale(1) translateY(0)',
      filter: isExiting ? 'blur(8px)' : 'blur(0px)',
      transition: 'opacity 500ms cubic-bezier(0.4, 0, 0.2, 1), transform 600ms cubic-bezier(0.4, 0, 0.2, 1), filter 400ms ease-out',
    }}
  >
    <div 
      className="w-28 h-28 rounded-[2.5rem] mb-10 mx-auto flex items-center justify-center rotate-[-4deg] transition-all hover:rotate-0 duration-500 border border-black/5 origin-center" 
      style={{ 
        backgroundColor: `${COLORS.orchidTint}B0`,
        ...GLASS_STYLES.base,
        boxShadow: '0 2px 4px -1px rgba(0,0,0,0.1), 0 1px 2px rgba(255,255,255,0.5), inset 0 2px 4px rgba(255,255,255,0.3), inset 0 -2px 4px rgba(0,0,0,0.1)',
        transform: isExiting ? 'rotate(12deg) scale(0.6)' : undefined,
        transition: 'transform 600ms cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <SkhootLogo size={64} />
    </div>
    <h2 
      className="text-2xl font-bold tracking-tight font-jakarta" 
      style={{ 
        color: '#1e1e1e',
        transform: isExiting ? 'translateY(20px)' : 'translateY(0)',
        opacity: isExiting ? 0 : 1,
        transition: 'transform 400ms cubic-bezier(0.4, 0, 0.2, 1), opacity 300ms ease-out',
      }}
    >
      <TypewriterText text={welcomeMessage} />
    </h2>
  </div>
));
EmptyState.displayName = 'EmptyState';

interface ConversationsProps {
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
  onSendVoice: () => void;
  onDiscardVoice: () => void;
}

export const Conversations = forwardRef<HTMLDivElement, ConversationsProps>(({
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
        className={`h-full overflow-y-auto px-6 pt-4 pb-36 space-y-6 custom-scrollbar ${
          showEmptyState ? 'flex flex-col items-center justify-center' : ''
        }`}
      >
        {/* Empty State */}
        {showEmptyState && (
          <EmptyState 
            welcomeMessage={welcomeMessage} 
            isExiting={isEmptyStateExiting}
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
Conversations.displayName = 'Conversations';
