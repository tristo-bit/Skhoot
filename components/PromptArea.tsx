import React, { memo, forwardRef } from 'react';
import { Send, Plus, Square, Search, MessageSquare, HardDrive, Trash2, Mic } from 'lucide-react';
import { COLORS, QUICK_ACTIONS, GLASS_STYLES } from '../constants';
import { SoundWave } from './shared';

// Icon mapping for quick actions
const QUICK_ACTION_ICONS: Record<string, React.ReactNode> = {
  Files: <Search size={14} />,
  Messages: <MessageSquare size={14} />,
  Space: <HardDrive size={14} />,
  Cleanup: <Trash2 size={14} />,
};

interface QuickActionButtonProps {
  id: string;
  icon: React.ReactNode;
  color: string;
  isActive?: boolean;
  onClick: () => void;
}

const QuickActionButton = memo<QuickActionButtonProps>(({ id, icon, color, isActive, onClick }) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-[10px] font-black border transition-all duration-300 whitespace-nowrap font-jakarta outline-none ${
      isActive 
        ? 'scale-[1.02] animate-pulse border-black/20' 
        : 'border-black/5 opacity-80 hover:opacity-100 active:scale-95'
    }`}
    style={{ 
      backgroundColor: color,
      color: COLORS.textPrimary,
      boxShadow: isActive 
        ? `inset 0 2px 4px rgba(0,0,0,0.2), inset 0 -1px 2px rgba(255,255,255,0.3), 0 4px 8px -2px ${color}40`
        : '0 2px 4px -1px rgba(0,0,0,0.1), 0 1px 2px rgba(255,255,255,0.5)'
    }}
  >
    <span className={isActive ? 'animate-bounce' : ''}>{icon}</span>
    {id}
  </button>
));
QuickActionButton.displayName = 'QuickActionButton';

interface PromptAreaProps {
  input: string;
  isLoading: boolean;
  isRecording: boolean;
  hasPendingVoiceMessage: boolean;
  activeMode: string | null;
  activeColor: string;
  audioLevels: number[];
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onSend: () => void;
  onMicClick: () => void;
  onQuickAction: (mode: string, placeholder: string) => void;
}

export const PromptArea = forwardRef<HTMLInputElement, PromptAreaProps>(({
  input,
  isLoading,
  isRecording,
  hasPendingVoiceMessage,
  activeMode,
  activeColor,
  audioLevels,
  onInputChange,
  onKeyDown,
  onSend,
  onMicClick,
  onQuickAction,
}, ref) => {
  const hasContent = input.trim().length > 0;
  const showQuickActions = !isRecording && !hasPendingVoiceMessage;
  const placeholder = hasPendingVoiceMessage ? "Send your message?" : "Skhoot is listening...";

  return (
    <div className="absolute bottom-0 left-0 right-0 px-6 pb-6 pt-4 pointer-events-none z-20">
      <div 
        className={`rounded-[32px] p-2.5 flex flex-col gap-3 shadow-2xl border transition-all duration-300 pointer-events-auto ${
          activeMode ? 'ring-2 ring-white/30' : ''
        }`} 
        style={{ 
          backgroundColor: activeMode ? `${activeColor}20` : 'rgba(255, 255, 255, 0.85)', 
          backdropFilter: 'blur(20px)',
          borderColor: activeMode ? `${activeColor}30` : 'rgba(255, 255, 255, 0.5)',
          boxShadow: '0 -8px 32px -4px rgba(0, 0, 0, 0.1), 0 4px 16px -2px rgba(0, 0, 0, 0.08)'
        }}
      >
        {/* Quick Actions */}
        {showQuickActions && (
          <div className="flex gap-2 overflow-x-auto px-2 py-1 no-scrollbar">
            {QUICK_ACTIONS.map(action => (
              <QuickActionButton
                key={action.id}
                id={action.id}
                color={action.color}
                icon={QUICK_ACTION_ICONS[action.id]}
                isActive={activeMode === action.id}
                onClick={() => onQuickAction(action.id, action.placeholder)}
              />
            ))}
          </div>
        )}
        
        {/* Input Row */}
        <div className="flex items-center gap-2">
          <button 
            className="p-3 hover:bg-black/5 rounded-2xl transition-all text-gray-500 active:scale-90 group"
            aria-label="Add attachment"
          >
            <Plus 
              size={22} 
              className="transition-transform duration-300 ease-out group-hover:rotate-90" 
            />
          </button>
          
          {/* SoundWave replaces input when recording */}
          {isRecording ? (
            <SoundWave levels={audioLevels} barCount={32} />
          ) : (
            <input 
              ref={ref}
              type="text" 
              value={input}
              onChange={onInputChange}
              onKeyDown={onKeyDown}
              placeholder={placeholder}
              className="flex-1 bg-transparent border-none outline-none py-2 text-[14px] font-semibold placeholder:text-gray-400 placeholder:font-medium font-jakarta transition-all"
              style={{ color: '#1e1e1e' }}
            />
          )}
          
          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 pr-1">
            <button 
              onClick={onMicClick}
              className={`p-3 hover:bg-black/5 rounded-2xl transition-all active:scale-90 ${
                isRecording ? 'text-red-500 animate-pulse bg-red-50' : 'text-gray-400'
              }`}
              aria-label={isRecording ? 'Stop recording' : 'Start recording'}
            >
              <Mic size={22} />
            </button>
            
            {/* Send button - hidden during recording */}
            {!isRecording && (
              <button 
                onClick={onSend}
                disabled={isLoading}
                className={`w-12 h-12 rounded-2xl transition-all flex items-center justify-center active:scale-90 border border-black/5 ${
                  (hasContent || hasPendingVoiceMessage) && !isLoading ? 'text-gray-700' : 'text-gray-400'
                } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''} ${
                  hasPendingVoiceMessage ? 'animate-pulse shadow-lg' : ''
                }`}
                style={{ 
                  backgroundColor: hasPendingVoiceMessage ? 'rgba(192, 183, 201, 0.2)' : 'rgba(255, 255, 255, 0.7)',
                  ...GLASS_STYLES.base,
                  boxShadow: hasPendingVoiceMessage 
                    ? '0 4px 12px -2px rgba(192, 183, 201, 0.4), 0 2px 8px rgba(192, 183, 201, 0.2), inset 0 1px 2px rgba(255,255,255,0.3), inset 0 -1px 2px rgba(0,0,0,0.05)'
                    : '0 2px 4px -1px rgba(0,0,0,0.1), 0 1px 2px rgba(255,255,255,0.5), inset 0 1px 2px rgba(255,255,255,0.3), inset 0 -1px 2px rgba(0,0,0,0.05)'
                }}
                aria-label="Send message"
              >
                {isLoading ? (
                  <Square size={18} fill="currentColor" className="animate-pulse" />
                ) : (
                  <Send 
                    size={22} 
                    className={`${(hasContent || hasPendingVoiceMessage) ? 'animate-in zoom-in duration-200' : 'opacity-50'} ${
                      hasPendingVoiceMessage ? 'animate-bounce' : ''
                    }`}
                  />
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
PromptArea.displayName = 'PromptArea';
