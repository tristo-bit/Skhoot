import { forwardRef, useState, useEffect } from 'react';
import { Message } from '../../types';
import { MessageBubble, LoadingIndicator, SearchingIndicator } from '../conversations';
import { VoiceMessage } from '../conversations/VoiceMessage';
import { ScrollbarStyles } from '../ui';
import { WelcomeMessage } from './WelcomeMessage';
import { MessageMarkers } from './MessageMarkers';

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
  
  const [containerHeight, setContainerHeight] = useState(0);
  const [scrollHeight, setScrollHeight] = useState(0);
  const [promptAreaHeight, setPromptAreaHeight] = useState(200);
  const [firstMarkerPosition, setFirstMarkerPosition] = useState(8);

  // Track scroll container dimensions and first marker position
  useEffect(() => {
    const scrollEl = (ref as React.RefObject<HTMLDivElement>)?.current;
    if (!scrollEl) return;

    const updateDimensions = () => {
      setContainerHeight(scrollEl.clientHeight);
      setScrollHeight(scrollEl.scrollHeight);
      // Get prompt area height from CSS variable
      const computedStyle = getComputedStyle(document.documentElement);
      const promptHeight = parseFloat(computedStyle.getPropertyValue('--prompt-area-height')) || 200;
      const promptY = parseFloat(computedStyle.getPropertyValue('--prompt-area-y')) || 16;
      const promptX = parseFloat(computedStyle.getPropertyValue('--prompt-area-x')) || 16;
      setPromptAreaHeight(promptHeight + promptY + promptX);
      
      // Calculate first user message marker position
      const firstUserMsg = messages.find(m => m.role === 'user');
      if (firstUserMsg && scrollEl.scrollHeight > 0) {
        const msgEl = scrollEl.querySelector(`[data-message-id="${firstUserMsg.id}"]`);
        if (msgEl) {
          const rect = msgEl.getBoundingClientRect();
          const scrollRect = scrollEl.getBoundingClientRect();
          const relativeTop = rect.top - scrollRect.top + scrollEl.scrollTop;
          const availableTrackHeight = scrollEl.clientHeight - (promptHeight + promptY + promptX) - 16;
          const position = (relativeTop / scrollEl.scrollHeight) * availableTrackHeight;
          // Subtract half the marker height (6px) so scrollbar starts at marker center
          setFirstMarkerPosition(Math.max(8, position - 6));
        }
      }
    };

    updateDimensions();
    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(scrollEl);
    
    // Also update on scroll to catch content changes
    scrollEl.addEventListener('scroll', updateDimensions);
    
    return () => {
      resizeObserver.disconnect();
      scrollEl.removeEventListener('scroll', updateDimensions);
    };
  }, [ref, messages]);

  return (
    <div className="flex-1 min-h-0 relative">
      <ScrollbarStyles topMargin={firstMarkerPosition} bottomMargin={promptAreaHeight + 8} />
      
      {/* Message markers on the right */}
      {hasMessages && (
        <MessageMarkers
          messages={messages}
          scrollRef={ref as React.RefObject<HTMLDivElement>}
          containerHeight={containerHeight}
          scrollHeight={scrollHeight}
          promptAreaHeight={promptAreaHeight}
        />
      )}
      
      <div 
        ref={ref}
        className={`overflow-y-auto pt-4 custom-scrollbar ${
          showEmptyState ? 'flex flex-col items-center justify-center' : ''
        }`}
        style={{
          height: '100%',
          paddingBottom: 'calc(var(--prompt-area-height) + var(--prompt-area-y) + var(--prompt-area-x) + var(--scale-space-4) * var(--spacing-scale))',
          paddingLeft: 24,
          paddingRight: 40,
        }}
      >
        {/* Content wrapper */}
        <div style={{ width: '100%' }} className="space-y-6">
          {/* Empty State with Welcome Message */}
          {showEmptyState && (
            <div className="flex justify-center">
              <WelcomeMessage 
                welcomeMessage={welcomeMessage} 
                isExiting={isEmptyStateExiting}
                activeMode={activeMode}
                promptKey={promptKey}
              />
            </div>
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
    </div>
  );
});

MainArea.displayName = 'MainArea';
