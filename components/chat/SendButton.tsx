import React, { memo } from 'react';
import { Send, Square } from 'lucide-react';
import { IconButton } from '../buttonFormat';

interface SendButtonProps {
  isLoading: boolean;
  isRecording: boolean;
  hasContent: boolean;
  hasPendingVoiceMessage: boolean;
  onClick: () => void;
  onStop?: () => void;
}

export const SendButton = memo<SendButtonProps>(({ 
  isLoading, 
  isRecording, 
  hasContent, 
  hasPendingVoiceMessage, 
  onClick,
  onStop,
}) => {
  const smoothEasing = 'cubic-bezier(0.22, 1, 0.36, 1)';
  const isActive = (hasContent || hasPendingVoiceMessage) && !isLoading;

  const handleClick = () => {
    if (isLoading && onStop) {
      onStop();
    } else {
      onClick();
    }
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: isRecording ? '0fr' : '1fr',
        transition: `grid-template-columns 0.45s ${smoothEasing}`,
      }}
    >
      <div style={{ overflow: 'hidden' }}>
        <IconButton
          icon={isLoading ? (
            <Square
              size={18}
              fill="currentColor"
              style={{ 
                width: 'calc(18px * var(--icon-scale) * var(--scale-text))', 
                height: 'calc(18px * var(--icon-scale) * var(--scale-text))' 
              }}
            />
          ) : (
            <Send 
              size={22}
              style={{ 
                width: 'calc(22px * var(--icon-scale) * var(--scale-text))', 
                height: 'calc(22px * var(--icon-scale) * var(--scale-text))' 
              }}
              className={isActive ? 'animate-in zoom-in duration-200' : 'opacity-50'} 
            />
          )}
          onClick={handleClick}
          disabled={false}
          variant={isLoading ? "glass" : isActive ? "glass" : "ghost"}
          size="lg"
          aria-label={isLoading ? "Stop generation" : "Send message"}
          data-send-button
          style={{ 
            backgroundColor: isLoading ? '#ef444440' : isActive ? '#3b82f640' : '#3b82f620',
            opacity: isRecording ? 0 : 1,
            transform: isRecording ? 'scale(0.85)' : 'scale(1)',
            transition: `opacity 0.35s ${smoothEasing}, transform 0.4s ${smoothEasing}, background-color 0.2s ease`,
            boxShadow: 'none !important',
            padding: 'calc(12px * var(--component-scale) * var(--scale))',
            borderRadius: 'calc(16px * var(--component-scale) * var(--scale))',
          }}
        />
      </div>
    </div>
  );
});

SendButton.displayName = 'SendButton';
