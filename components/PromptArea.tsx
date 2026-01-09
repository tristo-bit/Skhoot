import React, { memo, forwardRef, useRef, useEffect, useState } from 'react';
import { Send, Square, Search, MessageSquare, HardDrive, Trash2, Mic } from 'lucide-react';
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
  style?: React.CSSProperties;
}

const QuickActionButton = memo<QuickActionButtonProps>(({ id, icon, color, isActive, onClick, style }) => (
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
        : '0 2px 4px -1px rgba(0,0,0,0.1), 0 1px 2px rgba(255,255,255,0.5)',
      ...style
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
  
  // Detect Opera browser and speech support
  const isOpera = navigator.userAgent.indexOf('OPR') !== -1 || navigator.userAgent.indexOf('Opera') !== -1;
  const isSpeechSupported = !isOpera && (('webkitSpeechRecognition' in window) || ('SpeechRecognition' in window));
  
  const quickActionsRef = useRef<HTMLDivElement>(null);
  const [quickActionsHeight, setQuickActionsHeight] = useState(52);
  const [showOperaNotification, setShowOperaNotification] = useState(false);
  
  // Show Opera notification briefly when component mounts if Opera is detected
  useEffect(() => {
    if (isOpera && !localStorage.getItem('opera-voice-notification-shown')) {
      setShowOperaNotification(true);
      localStorage.setItem('opera-voice-notification-shown', 'true');
      setTimeout(() => setShowOperaNotification(false), 4000);
    }
  }, [isOpera]);
  
  // Measure quick actions height for smooth animation
  useEffect(() => {
    if (quickActionsRef.current) {
      const height = quickActionsRef.current.scrollHeight;
      if (height > 0) setQuickActionsHeight(height);
    }
  }, []);

  // Smooth easing for buttery animations
  const smoothEasing = 'cubic-bezier(0.22, 1, 0.36, 1)';

  return (
    <div className="absolute bottom-0 left-0 right-0 px-6 pb-6 pt-4 pointer-events-none z-20">
      <div 
        className={`rounded-[32px] p-2.5 flex flex-col shadow-2xl border pointer-events-auto ${
          activeMode ? 'ring-2 ring-white/30' : ''
        }`} 
        style={{ 
          backgroundColor: activeMode ? `${activeColor}20` : 'rgba(255, 255, 255, 0.85)', 
          backdropFilter: 'blur(20px)',
          borderColor: activeMode ? `${activeColor}30` : 'rgba(255, 255, 255, 0.5)',
          boxShadow: '0 -8px 32px -4px rgba(0, 0, 0, 0.1), 0 4px 16px -2px rgba(0, 0, 0, 0.08)',
          transition: `background-color 0.5s ${smoothEasing}, border-color 0.5s ${smoothEasing}, box-shadow 0.5s ${smoothEasing}`,
        }}
      >
        {/* Quick Actions - animated container with grid for smooth height */}
        <div 
          style={{
            display: 'grid',
            gridTemplateRows: showQuickActions ? '1fr' : '0fr',
            transition: `grid-template-rows 0.5s ${smoothEasing}`,
          }}
        >
          <div style={{ overflow: 'hidden' }}>
            <div 
              ref={quickActionsRef}
              style={{
                opacity: showQuickActions ? 1 : 0,
                transform: showQuickActions ? 'translateY(0)' : 'translateY(8px)',
                transition: `opacity 0.4s ${smoothEasing}, transform 0.5s ${smoothEasing}`,
                paddingBottom: 12,
              }}
            >
              <div className="flex gap-2 overflow-x-auto px-2 py-1 no-scrollbar">
                {QUICK_ACTIONS.map((action, index) => (
                  <QuickActionButton
                    key={action.id}
                    id={action.id}
                    color={action.color}
                    icon={QUICK_ACTION_ICONS[action.id]}
                    isActive={activeMode === action.id}
                    onClick={() => onQuickAction(action.id, action.placeholder)}
                    style={{
                      opacity: showQuickActions ? 1 : 0,
                      transform: showQuickActions ? 'scale(1)' : 'scale(0.92)',
                      transition: `opacity 0.35s ${smoothEasing} ${showQuickActions ? index * 0.04 : (QUICK_ACTIONS.length - 1 - index) * 0.02}s, transform 0.4s ${smoothEasing} ${showQuickActions ? index * 0.04 : 0}s`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
        
        {/* Input Row */}
        <div className="flex items-center gap-2">
          {/* SoundWave replaces input when recording */}
          <div className="flex-1 relative pl-2" style={{ minHeight: 40 }}>
            <div
              style={{
                opacity: isRecording ? 1 : 0,
                transform: isRecording ? 'scale(1)' : 'scale(0.98)',
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                pointerEvents: isRecording ? 'auto' : 'none',
                transition: `opacity 0.4s ${smoothEasing}, transform 0.5s ${smoothEasing}`,
              }}
            >
              <SoundWave levels={audioLevels} barCount={32} />
            </div>
            <div
              style={{
                opacity: isRecording ? 0 : 1,
                transform: isRecording ? 'scale(0.98)' : 'scale(1)',
                pointerEvents: isRecording ? 'none' : 'auto',
                transition: `opacity 0.4s ${smoothEasing}, transform 0.5s ${smoothEasing}`,
              }}
            >
              <input 
                ref={ref}
                type="text" 
                value={input}
                onChange={onInputChange}
                onKeyDown={onKeyDown}
                placeholder={placeholder}
                className="w-full bg-transparent border-none outline-none py-2 text-[14px] font-semibold placeholder:text-gray-400 placeholder:font-medium font-jakarta"
                style={{ color: '#1e1e1e' }}
              />
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 pr-1">
            <button 
              onClick={onMicClick}
              className={`relative p-3 hover:bg-black/5 rounded-2xl active:scale-90 ${
                isRecording ? 'text-red-500 animate-pulse bg-red-50' : 
                isOpera ? 'text-amber-500' : 'text-gray-400'
              }`}
              style={{
                transition: `all 0.4s cubic-bezier(0.22, 1, 0.36, 1)`,
              }}
              aria-label={
                isRecording ? 'Stop recording' : 
                isOpera ? 'Voice input (Opera fallback)' : 
                'Start recording'
              }
              title={
                isOpera ? 'Voice input not supported in Opera - click for text input fallback' :
                isSpeechSupported ? 'Click to start voice recording' :
                'Voice input not supported in this browser'
              }
            >
              <Mic size={22} />
              {/* Opera indicator */}
              {isOpera && !isRecording && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full flex items-center justify-center">
                  <span className="text-[8px] font-bold text-white">!</span>
                </div>
              )}
            </button>
            
            {/* Send button - animated hide during recording */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isRecording ? '0fr' : '1fr',
                transition: `grid-template-columns 0.45s cubic-bezier(0.22, 1, 0.36, 1)`,
              }}
            >
              <div style={{ overflow: 'hidden' }}>
                <button 
                  onClick={onSend}
                  disabled={isLoading}
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center active:scale-90 border border-black/5 ${
                    (hasContent || hasPendingVoiceMessage) && !isLoading ? 'text-gray-700' : 'text-gray-400'
                  } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  style={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.7)',
                    ...GLASS_STYLES.base,
                    boxShadow: '0 2px 4px -1px rgba(0,0,0,0.1), 0 1px 2px rgba(255,255,255,0.5), inset 0 1px 2px rgba(255,255,255,0.3), inset 0 -1px 2px rgba(0,0,0,0.05)',
                    opacity: isRecording ? 0 : 1,
                    transform: isRecording ? 'scale(0.85)' : 'scale(1)',
                    transition: `opacity 0.35s ${smoothEasing}, transform 0.4s ${smoothEasing}, background-color 0.2s ease`,
                  }}
                  aria-label="Send message"
                >
                  {isLoading ? (
                    <Square size={18} fill="currentColor" className="animate-pulse" />
                  ) : (
                    <Send 
                      size={22} 
                      className={(hasContent || hasPendingVoiceMessage) ? 'animate-in zoom-in duration-200' : 'opacity-50'} 
                    />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Opera Voice Input Notification */}
      {showOperaNotification && (
        <div 
          className="absolute bottom-full left-4 right-4 mb-2 p-3 rounded-2xl border border-amber-200 animate-in fade-in slide-in-from-bottom-2 duration-300"
          style={{ 
            backgroundColor: 'rgba(251, 191, 36, 0.1)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <div className="flex items-start gap-2">
            <div className="w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-[10px] font-bold text-white">!</span>
            </div>
            <div>
              <p className="text-[11px] font-bold text-amber-700 font-jakarta">
                Opera Browser Detected
              </p>
              <p className="text-[10px] font-medium text-amber-600 font-jakarta leading-relaxed mt-1">
                Voice input isn't supported in Opera. Click the mic button for a text input fallback.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
PromptArea.displayName = 'PromptArea';
