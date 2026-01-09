import React, { useState, memo } from 'react';
import { Send, X, MessageSquare } from 'lucide-react';
import { COLORS, THEME } from '../constants';

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
  const [isHovering, setIsHovering] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);
  
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
          <div className="bg-gray-200 rounded-full p-3 flex items-center justify-center">
            <MessageSquare size={20} className="text-gray-500" />
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex justify-end animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="relative max-w-[90%]">
        {/* Recording indicator - positioned outside the bubble */}
        {isRecording && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse z-10" />
        )}
        
        <div 
          className="rounded-3xl rounded-tr-none shadow-sm border border-black/5 relative overflow-hidden"
          style={{ backgroundColor: THEME.userBubble }}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          <div className="p-4 space-y-2">
            {transcript && (
              <p 
                className="text-[13px] leading-relaxed font-semibold font-jakarta" 
                style={{ color: COLORS.textPrimary }}
              >
                {transcript}
              </p>
            )}
            
            {pendingText && (
              <p 
                className="text-[11px] leading-relaxed font-medium opacity-60 italic font-jakarta animate-pulse" 
                style={{ color: COLORS.textSecondary }}
              >
                {pendingText}
              </p>
            )}
          </div>
          
          {/* Pending state overlay with Send | Discard */}
          {isPending && (
            <div 
              className={`absolute inset-0 flex items-center justify-center gap-4 transition-all duration-200 ${
                isHovering ? 'opacity-100' : 'opacity-0'
              }`}
              style={{ 
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                backdropFilter: 'blur(2px)',
              }}
            >
              <button
                onClick={onSend}
                className="flex items-center gap-1.5 px-4 py-2 bg-white/90 hover:bg-white rounded-full transition-all hover:scale-105 active:scale-95"
              >
                <Send size={14} className="text-gray-700" />
                <span className="text-xs font-semibold text-gray-700">Send</span>
              </button>
              
              <div className="w-px h-6 bg-white/30" />
              
              <button
                onClick={handleDiscard}
                className="flex items-center gap-1.5 px-4 py-2 bg-white/20 hover:bg-red-500/80 rounded-full transition-all hover:scale-105 active:scale-95 group"
              >
                <X size={14} className="text-white group-hover:text-white" />
                <span className="text-xs font-semibold text-white">Discard</span>
              </button>
            </div>
          )}
        </div>
        
        {/* Pending confirmation text */}
        {isPending && (
          <div className="flex justify-end mt-2">
            <p className="text-xs font-jakarta text-gray-400 animate-pulse">
              Waiting for your confirmation
            </p>
          </div>
        )}
      </div>
    </div>
  );
});

VoiceMessage.displayName = 'VoiceMessage';
