import React, { memo, forwardRef, useRef, useEffect, useState } from 'react';
import { Send, Square, Search, MessageSquare, HardDrive, Trash2, Mic } from 'lucide-react';
import { COLORS, QUICK_ACTIONS, GLASS_STYLES } from '../src/constants';
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
    className={`quick-action-button flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 font-jakarta outline-none glass-subtle w-full ${
      isActive 
        ? 'text-text-primary' 
        : 'text-text-secondary hover:scale-[1.02] active:scale-95'
    }`}
    style={{ 
      backgroundColor: `${color}${isActive ? '20' : '15'}`,
      backdropFilter: 'blur(8px) saturate(1.1)',
      WebkitBackdropFilter: 'blur(8px) saturate(1.1)',
      boxShadow: isActive 
        ? 'inset 0 3px 6px rgba(0, 0, 0, 0.25), inset 0 1px 3px rgba(0, 0, 0, 0.2)' 
        : '0 1px 3px rgba(0, 0, 0, 0.08), 0 4px 12px rgba(0, 0, 0, 0.04)',
      ...style
    }}
  >
    <span className={`quick-action-icon ${isActive ? 'animate-pulse' : ''}`}>{icon}</span>
    <span className="quick-action-label">{id}</span>
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
    <div
      className="absolute bottom-0 left-0 right-0 pointer-events-none z-20"
      style={{
        paddingLeft: 'var(--prompt-area-x)',
        paddingRight: 'var(--prompt-area-x)',
        paddingTop: 'var(--prompt-area-y)',
        paddingBottom: 'var(--prompt-area-x)',
        transform: 'translateY(calc(-1 * var(--prompt-panel-bottom-offset)))',
      }}
    >
      <div 
        className="prompt-panel flex flex-col shadow-2xl pointer-events-auto glass-elevated"
        style={{ 
          background: activeMode 
            ? `linear-gradient(135deg, ${activeColor}08, ${activeColor}04)` 
            : undefined,
          transition: `background 0.5s ${smoothEasing}, border-color 0.5s ${smoothEasing}, box-shadow 0.5s ${smoothEasing}`,
          padding: 'var(--prompt-panel-padding)',
          borderRadius: 'var(--prompt-panel-radius)',
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
              <div
                className="quick-action-grid grid grid-cols-4"
                style={{
                  gap: 'calc(var(--scale-space-2) * var(--spacing-scale))',
                  paddingLeft: 'calc(var(--scale-space-2) * var(--spacing-scale))',
                  paddingRight: 'calc(var(--scale-space-2) * var(--spacing-scale))',
                  paddingTop: 'calc(var(--scale-space-1) * var(--spacing-scale))',
                  paddingBottom: 'calc(var(--scale-space-2) * var(--spacing-scale))',
                }}
              >
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
                      fontSize: 'calc(var(--scale-font-sm) * var(--text-scale))',
                      padding: 'calc(8px * var(--component-scale) * var(--scale)) calc(12px * var(--component-scale) * var(--scale))',
                      borderRadius: 'calc(12px * var(--component-scale) * var(--scale))',
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
          <div
            className="flex-1 relative"
            style={{
              paddingLeft: 'calc(var(--scale-space-2) * var(--spacing-scale))',
              minHeight: 'calc(40px * var(--component-scale) * var(--scale))',
            }}
          >
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
                className="w-full bg-transparent border-none outline-none font-semibold placeholder:text-text-secondary placeholder:font-medium font-jakarta text-text-primary"
                style={{
                  fontSize: 'var(--prompt-input-font)',
                  paddingTop: 'calc(var(--scale-space-1) * var(--spacing-scale))',
                  paddingBottom: 'calc(var(--scale-space-1) * var(--spacing-scale))',
                }}
              />
            </div>
          </div>
          
          {/* Action Buttons */}
          <div
            className="flex items-center"
            style={{
              gap: 'calc(var(--scale-space-2) * var(--spacing-scale))',
              paddingRight: 'calc(var(--scale-space-1) * var(--spacing-scale))',
            }}
          >
            <button 
              onClick={onMicClick}
              className={`relative hover:bg-black/5 dark:hover:bg-white/5 rounded-2xl active:scale-90 ${
                isRecording ? 'text-red-500 animate-pulse bg-red-50' : 
                isOpera ? 'text-amber-500' : 'text-text-secondary'
              }`}
              style={{
                backgroundColor: isRecording ? '#ef444440' : isOpera ? '#f59e0b20' : '#8b5cf620',
                transition: `all 0.4s cubic-bezier(0.22, 1, 0.36, 1)`,
                padding: 'calc(12px * var(--component-scale) * var(--scale))',
                borderRadius: 'calc(16px * var(--component-scale) * var(--scale))',
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
              <Mic size={22} style={{ width: 'calc(22px * var(--icon-scale) * var(--scale-text))', height: 'calc(22px * var(--icon-scale) * var(--scale-text))' }} />
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
                  className={`rounded-2xl flex items-center justify-center active:scale-90 ${
                    (hasContent || hasPendingVoiceMessage) && !isLoading ? 'text-text-primary' : 'text-text-secondary'
                  } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  style={{ 
                    backgroundColor: (hasContent || hasPendingVoiceMessage) && !isLoading ? '#3b82f640' : '#3b82f620',
                    opacity: isRecording ? 0 : 1,
                    transform: isRecording ? 'scale(0.85)' : 'scale(1)',
                    transition: `opacity 0.35s ${smoothEasing}, transform 0.4s ${smoothEasing}, background-color 0.2s ease`,
                    boxShadow: 'none !important',
                    width: 'calc(48px * var(--component-scale) * var(--scale))',
                    height: 'calc(48px * var(--component-scale) * var(--scale))',
                    borderRadius: 'calc(16px * var(--component-scale) * var(--scale))',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = 'none !important';
                    e.currentTarget.style.filter = 'none';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = 'none !important';
                    e.currentTarget.style.filter = 'none';
                  }}
                  aria-label="Send message"
                >
                  {isLoading ? (
                    <Square
                      size={18}
                      fill="currentColor"
                      className="animate-pulse"
                      style={{ width: 'calc(18px * var(--icon-scale) * var(--scale-text))', height: 'calc(18px * var(--icon-scale) * var(--scale-text))' }}
                    />
                  ) : (
                    <Send 
                      size={22}
                      style={{ width: 'calc(22px * var(--icon-scale) * var(--scale-text))', height: 'calc(22px * var(--icon-scale) * var(--scale-text))' }}
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
          className="absolute bottom-full left-4 right-4 mb-2 p-3 rounded-2xl border border-amber-200 dark:border-amber-600 animate-in fade-in slide-in-from-bottom-2 duration-300 glass-subtle"
        >
          <div className="flex items-start gap-2">
            <div className="w-5 h-5 rounded-full bg-amber-400 dark:bg-amber-500 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-[10px] font-bold text-white dark:text-amber-900">!</span>
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
