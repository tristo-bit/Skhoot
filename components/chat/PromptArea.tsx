import React, { forwardRef, useRef, useEffect, useState, useCallback } from 'react';
import { Search, Bot, Workflow, Terminal, X, FileText } from 'lucide-react';
import { QUICK_ACTIONS } from '../../src/constants';
import SynthesisVisualizer from '../ui/SynthesisVisualizer';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useSettings } from '../../src/contexts/SettingsContext';
import { QuickActionButton } from './QuickActionButton';
import { RecordButton } from './RecordButton';
import { SendButton } from './SendButton';

// Icon mapping for quick actions
const QUICK_ACTION_ICONS: Record<string, (props: { size: number }) => React.ReactNode> = {
  Files: ({ size }) => <Search size={size} />,
  Agents: ({ size }) => <Bot size={size} />,
  Workflows: ({ size }) => <Workflow size={size} />,
  Terminal: ({ size }) => <Terminal size={size} />,
};

// File reference chip type
interface FileReference {
  fileName: string;
  filePath: string;
}

interface PromptAreaProps {
  input: string;
  isLoading: boolean;
  isRecording: boolean;
  hasPendingVoiceMessage: boolean;
  activeMode: string | null;
  activeColor: string;
  audioLevels: number[];
  audioStream: MediaStream | null;
  onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onSend: () => void;
  onMicClick: () => void;
  onQuickAction: (mode: string, placeholder: string) => void;
  disabled?: boolean;
  isTerminalOpen?: boolean;
  onToggleTerminal?: () => void;
}

export const PromptArea = forwardRef<HTMLTextAreaElement, PromptAreaProps>(({
  input,
  isLoading,
  isRecording,
  hasPendingVoiceMessage,
  activeMode,
  audioLevels,
  audioStream,
  onInputChange,
  onKeyDown,
  onSend,
  onMicClick,
  onQuickAction,
  disabled = false,
  isTerminalOpen = false,
  onToggleTerminal,
}, ref) => {
  const { resolvedTheme } = useTheme();
  const { illumination } = useSettings();
  const isDarkMode = resolvedTheme === 'dark';
  
  const hasContent = input.trim().length > 0;
  const showQuickActions = !isRecording && !hasPendingVoiceMessage;
  const placeholder = isTerminalOpen
    ? "Type command and press Enter..."
    : hasPendingVoiceMessage 
        ? "Send your message?" 
        : "Skhoot is listening...";
  
  // Handle terminal command sending
  const handleTerminalKeyDown = (e: React.KeyboardEvent) => {
    if (isTerminalOpen && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const command = (e.target as HTMLTextAreaElement).value;
      if (command.trim() && (window as any).__terminalSendCommand) {
        (window as any).__terminalSendCommand(command);
        (e.target as HTMLTextAreaElement).value = '';
        // Trigger onChange to clear the input state
        const event = new Event('input', { bubbles: true });
        (e.target as HTMLTextAreaElement).dispatchEvent(event);
      }
    } else if (!isTerminalOpen) {
      onKeyDown(e);
    }
  };
  
  // Detect Opera browser for notification (disabled in demo mode)
  const isOpera = navigator.userAgent.indexOf('OPR') !== -1 || navigator.userAgent.indexOf('Opera') !== -1;
  const isDemoMode = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('demo') === 'true';
  
  const quickActionsRef = useRef<HTMLDivElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const [showOperaNotification, setShowOperaNotification] = useState(false);
  const [fileReferences, setFileReferences] = useState<FileReference[]>([]);
  
  // Listen for file reference additions from FileExplorerPanel
  useEffect(() => {
    const handleAddFileReference = (event: CustomEvent<{ fileName: string; filePath: string }>) => {
      const { fileName, filePath } = event.detail;
      setFileReferences(prev => {
        // Don't add duplicates
        if (prev.some(ref => ref.fileName === fileName)) {
          return prev;
        }
        return [...prev, { fileName, filePath }];
      });
    };
    
    window.addEventListener('add-file-reference', handleAddFileReference as EventListener);
    return () => {
      window.removeEventListener('add-file-reference', handleAddFileReference as EventListener);
    };
  }, []);
  
  // Update global file references map when fileReferences changes
  useEffect(() => {
    if (!(window as any).__chatFileReferences) {
      (window as any).__chatFileReferences = new Map();
    }
    const map = (window as any).__chatFileReferences as Map<string, string>;
    map.clear();
    fileReferences.forEach(ref => {
      map.set(ref.fileName, ref.filePath);
    });
  }, [fileReferences]);
  
  // Clear file references after sending a message
  useEffect(() => {
    const handleMessageSent = () => {
      setFileReferences([]);
    };
    
    window.addEventListener('chat-message-sent', handleMessageSent);
    return () => {
      window.removeEventListener('chat-message-sent', handleMessageSent);
    };
  }, []);
  
  // Remove a file reference
  const removeFileReference = useCallback((fileName: string) => {
    setFileReferences(prev => prev.filter(ref => ref.fileName !== fileName));
  }, []);
  
  // Show Opera notification briefly when component mounts (skip in demo mode)
  useEffect(() => {
    if (isOpera && !isDemoMode && !localStorage.getItem('opera-voice-notification-shown')) {
      setShowOperaNotification(true);
      localStorage.setItem('opera-voice-notification-shown', 'true');
      setTimeout(() => setShowOperaNotification(false), 4000);
    }
  }, [isOpera, isDemoMode]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textAreaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const max = parseFloat(getComputedStyle(el).maxHeight || '0');
    const next = Math.min(el.scrollHeight, max || el.scrollHeight);
    el.style.height = `${next}px`;
  }, [input]);

  const smoothEasing = 'cubic-bezier(0.22, 1, 0.36, 1)';

  // Calculate illumination based on active button and settings
  const activeAction = activeMode ? QUICK_ACTIONS.find(a => a.id === activeMode) : null;
  
  const showIllumination = illumination.enabled && activeAction;
  const intensityHex = Math.round(illumination.intensity * 2.55).toString(16).padStart(2, '0');
  const intensityMidHex = Math.round(illumination.intensity * 1.27).toString(16).padStart(2, '0');
  const intensityLowHex = Math.round(illumination.intensity * 0.5).toString(16).padStart(2, '0');
  const diffusionStop1 = Math.round(illumination.diffusion * 0.35);
  const diffusionStop2 = Math.round(illumination.diffusion * 0.6);
  const diffusionStop3 = Math.round(illumination.diffusion * 0.9);

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
        className="prompt-panel flex flex-col shadow-2xl pointer-events-auto glass-elevated relative overflow-hidden"
        style={{ 
          background: showIllumination
            ? `${activeAction.color}${isDarkMode ? '08' : '12'}`
            : undefined,
          transition: `background 0.5s ${smoothEasing}, border-color 0.5s ${smoothEasing}, box-shadow 0.5s ${smoothEasing}`,
          padding: 'var(--prompt-panel-padding)',
          borderRadius: 'var(--prompt-panel-radius)',
        }}
      >
        {/* Illumination overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: showIllumination
              ? `radial-gradient(circle at 12.5% 25%, ${activeAction.color}${intensityHex} 0%, ${activeAction.color}${intensityMidHex} ${diffusionStop1}%, ${activeAction.color}${intensityLowHex} ${diffusionStop2}%, transparent ${diffusionStop3}%)`
              : 'none',
            opacity: showIllumination ? 1 : 0,
            transition: `opacity 0.4s ${smoothEasing}, background 0.4s ${smoothEasing}`,
            borderRadius: 'inherit',
          }}
        />

        {/* Quick Actions */}
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
                {QUICK_ACTIONS.map((action, index) => {
                  const isActive = activeMode === action.id;
                  return (
                    <QuickActionButton
                      key={action.id}
                      id={action.id}
                      color={action.color}
                      activeColor={action.activeColor}
                      icon={QUICK_ACTION_ICONS[action.id]({ size: 14 })}
                      isActive={isActive}
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
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        
        {/* Input Row */}
        <div className="flex items-center gap-2">
          <div
            className="flex-1 relative"
            style={{
              paddingLeft: 'calc(var(--scale-space-2) * var(--spacing-scale))',
              minHeight: 'calc(40px * var(--component-scale) * var(--scale))',
              transform: 'translateY(5px)',
            }}
          >
            {/* SoundWave when recording */}
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
              <SynthesisVisualizer 
                audioStream={audioStream}
                lineColor={isDarkMode ? '#ffffff' : '#fbd0d0'}
                isDarkMode={isDarkMode}
              />
            </div>
            
            {/* Text input */}
            <div
              style={{
                opacity: isRecording ? 0 : 1,
                transform: isRecording ? 'scale(0.98)' : 'scale(1)',
                pointerEvents: isRecording ? 'none' : 'auto',
                transition: `opacity 0.4s ${smoothEasing}, transform 0.5s ${smoothEasing}`,
              }}
            >
              {/* File Reference Chips */}
              {fileReferences.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {fileReferences.map((ref) => (
                    <div
                      key={ref.fileName}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-400 text-xs font-medium animate-in fade-in zoom-in-95 duration-200"
                      title={ref.filePath}
                    >
                      <FileText size={12} className="flex-shrink-0" />
                      <span className="truncate max-w-[120px]">@{ref.fileName}</span>
                      <button
                        onClick={() => removeFileReference(ref.fileName)}
                        className="flex-shrink-0 p-0.5 rounded-full hover:bg-purple-500/30 transition-colors"
                        title="Remove file reference"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              <textarea 
                ref={(node) => {
                  textAreaRef.current = node;
                  if (typeof ref === 'function') ref(node);
                  else if (ref) (ref as React.RefObject<HTMLTextAreaElement | null>).current = node;
                }}
                rows={1}
                value={input}
                onChange={onInputChange}
                onKeyDown={handleTerminalKeyDown}
                placeholder={placeholder}
                disabled={disabled}
                className="w-full bg-transparent border-none outline-none font-semibold placeholder:text-text-secondary placeholder:font-medium font-jakarta text-text-primary resize-none disabled:cursor-default file-mention-input"
                style={{
                  fontSize: 'var(--prompt-input-font)',
                  paddingTop: 'calc(var(--scale-space-1) * var(--spacing-scale))',
                  paddingBottom: 'calc(var(--scale-space-1) * var(--spacing-scale))',
                  maxHeight: 'calc(140px * var(--component-scale) * var(--scale))',
                  overflowY: 'auto',
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
            <RecordButton isRecording={isRecording} onClick={onMicClick} />
            <SendButton
              isLoading={isLoading}
              isRecording={isRecording}
              hasContent={hasContent}
              hasPendingVoiceMessage={hasPendingVoiceMessage}
              onClick={onSend}
            />
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
