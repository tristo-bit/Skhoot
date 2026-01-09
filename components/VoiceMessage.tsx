import React, { useState, memo, useRef, useEffect } from 'react';
import { Send, X, MessageSquare } from 'lucide-react';

interface VoiceMessageProps {
  transcript: string;
  pendingText: string;
  onSend: () => void;
  onDiscard: () => void;
  isRecording: boolean;
  isPending: boolean;
}

export const VoiceMessage = memo<VoiceMessageProps>(({ 
  transcript, 
  pendingText, 
  onSend, 
  onDiscard, 
  isRecording, 
  isPending 
}) => {
  const [isDiscarding, setIsDiscarding] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  
  // Check if content is small and adjust button size accordingly
  useEffect(() => {
    if (contentRef.current) {
      const width = contentRef.current.offsetWidth;
      setIsCompact(width < 180);
    }
  }, [transcript, pendingText]);
  
  const handleDiscard = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDiscarding(true);
    setTimeout(() => {
      onDiscard();
    }, 400);
  };
  
  if (isDiscarding) {
    return (
      <div className="flex justify-end">
        <div 
          className="flex items-center justify-center"
          style={{
            animation: 'morphToIcon 400ms ease-out forwards',
          }}
        >
          <style>{`
            @keyframes morphToIcon {
              0% {
                opacity: 1;
                transform: scale(1);
              }
              50% {
                opacity: 0.7;
                transform: scale(0.5);
              }
              100% {
                opacity: 0;
                transform: scale(0) translateY(-20px);
              }
            }
          `}</style>
          <div className="glass-subtle rounded-full p-3 flex items-center justify-center">
            <MessageSquare size={20} className="text-text-secondary" />
          </div>
        </div>
      </div>
    );
  }

  const buttonSize = isCompact ? 'w-8 h-8 rounded-xl' : 'w-10 h-10 rounded-2xl';
  const iconSize = isCompact ? 14 : 18;
  
  return (
    <div className="flex justify-end animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="relative max-w-[90%]">
        {/* Recording indicator - positioned outside the bubble */}
        {isRecording && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse z-10" />
        )}
        
        <div 
          ref={contentRef}
          className="glass-elevated rounded-3xl rounded-tr-none border-glass-border"
        >
          <div className={isCompact ? 'p-3 space-y-1.5' : 'p-4 space-y-2'}>
            {transcript && (
              <p 
                className={`leading-relaxed font-semibold font-jakarta text-text-primary ${isCompact ? 'text-[12px]' : 'text-[13px]'}`}
              >
                {transcript}
              </p>
            )}
            
            {pendingText && (
              <p 
                className={`leading-relaxed font-medium opacity-60 italic font-jakarta animate-pulse text-text-secondary ${isCompact ? 'text-[10px]' : 'text-[11px]'}`}
              >
                {pendingText}
              </p>
            )}
          </div>
          
          {/* Pending state - action buttons below text */}
          {isPending && (
            <div className={`flex items-center ${isCompact ? 'px-3 pb-2.5 gap-1.5' : 'px-4 pb-3 gap-2'}`}>
              <button
                onClick={onSend}
                className={`${buttonSize} flex items-center justify-center active:scale-90 glass-subtle text-text-primary hover:brightness-95 transition-all`}
              >
                <Send size={iconSize} />
              </button>
              
              <button
                onClick={handleDiscard}
                className={`${buttonSize} flex items-center justify-center active:scale-90 glass-subtle text-text-secondary hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all`}
              >
                <X size={iconSize} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

VoiceMessage.displayName = 'VoiceMessage';
