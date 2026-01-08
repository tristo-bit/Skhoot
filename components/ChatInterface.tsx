import React, { useState, useRef, useEffect, useCallback, memo, useMemo } from 'react';
import { COLORS, THEME, WELCOME_MESSAGES, QUICK_ACTIONS, GLASS_STYLES } from '../constants';
import { Message, FileInfo } from '../types';
import { Send, Plus, Square, Search, MessageSquare, HardDrive, Trash2, Circle, Mic, StopCircle } from 'lucide-react';
import { geminiService } from '../services/gemini';
import { TypewriterText } from './shared';

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

// Icon mapping for quick actions
const QUICK_ACTION_ICONS: Record<string, React.ReactNode> = {
  Files: <Search size={14} />,
  Messages: <MessageSquare size={14} />,
  Space: <HardDrive size={14} />,
  Cleanup: <Trash2 size={14} />,
};

const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [placeholder, setPlaceholder] = useState('Skhoot is listening...');
  const [isLoading, setIsLoading] = useState(false);
  const [activeMode, setActiveMode] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [welcomeMessage] = useState(() => 
    WELCOME_MESSAGES[Math.floor(Math.random() * WELCOME_MESSAGES.length)]
  );
  
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const activeColor = useMemo(() => {
    const action = QUICK_ACTIONS.find(a => a.id === activeMode);
    return action?.color ?? COLORS.almostAqua;
  }, [activeMode]);

  const hasContent = input.trim().length > 0;
  const isEmpty = messages.length === 0;

  // Auto-scroll on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      type: 'text',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    const currentInput = input;
    setInput('');
    setPlaceholder('Skhoot is listening...');
    setIsLoading(true);
    setActiveMode(null);

    const history = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    const result = await geminiService.chat(currentInput, history);
    
    setMessages(prev => [...prev, {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: result.text || '',
      type: result.type as Message['type'],
      data: result.data,
      timestamp: new Date()
    }]);
    setIsLoading(false);
  }, [input, isLoading, messages]);

  const handleQuickAction = useCallback((mode: string, newPlaceholder: string) => {
    setInput('');
    setPlaceholder(newPlaceholder);
    setActiveMode(mode);
    inputRef.current?.focus();
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    if (activeMode && !e.target.value) setActiveMode(null);
  }, [activeMode]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSend();
  }, [handleSend]);

  return (
    <div className="flex flex-col h-full w-full">
      {/* Conversation Area */}
      <div 
        ref={scrollRef}
        className={`flex-1 overflow-y-auto px-6 py-8 space-y-6 scroll-smooth no-scrollbar ${
          isEmpty ? 'flex flex-col items-center justify-center' : ''
        }`}
      >
        {isEmpty ? (
          <EmptyState welcomeMessage={welcomeMessage} />
        ) : (
          <>
            {messages.map(msg => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            {isLoading && <LoadingIndicator />}
          </>
        )}
      </div>

      {/* Input Controller */}
      <div className="px-6 pb-8">
        <div 
          className={`rounded-[32px] p-2.5 flex flex-col gap-3 shadow-2xl border transition-all duration-300 ${
            activeMode ? 'ring-2 ring-white/30' : ''
          }`} 
          style={{ 
            backgroundColor: activeMode ? `${activeColor}15` : 'rgba(255, 255, 255, 0.6)', 
            backdropFilter: 'blur(20px)',
            borderColor: activeMode ? `${activeColor}30` : 'rgba(0, 0, 0, 0.05)'
          }}
        >
          {isEmpty && (
            <div className="flex gap-2 overflow-x-auto px-2 py-1 no-scrollbar">
              {QUICK_ACTIONS.map(action => (
                <QuickActionButton
                  key={action.id}
                  id={action.id}
                  color={action.color}
                  icon={QUICK_ACTION_ICONS[action.id]}
                  isActive={activeMode === action.id}
                  onClick={() => handleQuickAction(action.id, action.placeholder)}
                />
              ))}
            </div>
          )}
          
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
            
            <input 
              ref={inputRef}
              type="text" 
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="flex-1 bg-transparent border-none outline-none py-2 text-[14px] font-semibold placeholder:text-gray-400 placeholder:font-medium font-jakarta"
              style={{ color: '#1e1e1e' }}
            />
            
            <div className="flex items-center gap-1.5 pr-1">
              <RecordButton 
                isRecording={isRecording}
                onToggle={() => setIsRecording(r => !r)}
              />
              
              <ActionButton 
                onClick={handleSend}
                disabled={isLoading}
                isActive={hasContent && !isLoading}
                aria-label="Send message"
              >
                {isLoading ? (
                  <Square size={18} fill="currentColor" className="animate-pulse" />
                ) : (
                  <Send 
                    size={22} 
                    className={hasContent ? 'animate-in zoom-in duration-200' : 'opacity-50'} 
                  />
                )}
              </ActionButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


// Sub-components
const EmptyState = memo<{ welcomeMessage: string }>(({ welcomeMessage }) => (
  <div className="text-center animate-in fade-in zoom-in duration-700 max-w-[340px]">
    <div 
      className="w-28 h-28 rounded-[2.5rem] mb-10 mx-auto flex items-center justify-center rotate-[-4deg] transition-all hover:rotate-0 duration-500 border border-black/5 origin-center" 
      style={{ 
        backgroundColor: `${COLORS.orchidTint}B0`,
        ...GLASS_STYLES.base,
        boxShadow: '0 2px 4px -1px rgba(0,0,0,0.1), 0 1px 2px rgba(255,255,255,0.5), inset 0 2px 4px rgba(255,255,255,0.3), inset 0 -2px 4px rgba(0,0,0,0.1)'
      }}
    >
      <SkhootLogo size={64} />
    </div>
    <h2 
      className="text-2xl font-bold tracking-tight font-jakarta" 
      style={{ color: '#1e1e1e' }}
    >
      <TypewriterText text={welcomeMessage} />
    </h2>
  </div>
));
EmptyState.displayName = 'EmptyState';

const MessageBubble = memo<{ message: Message }>(({ message }) => {
  const isUser = message.role === 'user';
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
      <div 
        className={`max-w-[90%] p-4 rounded-3xl shadow-sm border border-black/5 ${
          isUser ? 'rounded-tr-none' : 'rounded-tl-none'
        }`}
        style={{ backgroundColor: isUser ? THEME.userBubble : THEME.assistantBubble }}
      >
        <p 
          className="text-[13px] leading-relaxed font-semibold font-jakarta" 
          style={{ color: isUser ? COLORS.textPrimary : '#333333' }}
        >
          {message.content}
        </p>

        {message.type === 'file_list' && message.data && (
          <FileList files={message.data} />
        )}

        {message.type === 'disk_usage' && message.data && (
          <DiskUsage items={message.data} />
        )}
      </div>
    </div>
  );
});
MessageBubble.displayName = 'MessageBubble';

const FileList = memo<{ files: FileInfo[] }>(({ files }) => (
  <div className="mt-4 space-y-2">
    {files.map(file => (
      <div 
        key={file.id} 
        className="p-3 bg-white/60 rounded-2xl border border-white/40 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div 
            className="w-8 h-8 rounded-xl flex items-center justify-center" 
            style={{ backgroundColor: COLORS.almostAqua }}
          >
            <Search size={14} className="text-gray-700" />
          </div>
          <div className="overflow-hidden">
            <p className="text-[11px] font-bold truncate text-gray-800 font-jakarta">{file.name}</p>
            <p className="text-[9px] font-medium opacity-50 truncate font-jakarta">{file.path}</p>
          </div>
        </div>
        <span className="text-[9px] font-black whitespace-nowrap ml-2 opacity-60 font-jakarta">
          {file.size}
        </span>
      </div>
    ))}
  </div>
));
FileList.displayName = 'FileList';

const DiskUsage = memo<{ items: FileInfo[] }>(({ items }) => (
  <div className="mt-4 p-4 bg-white/40 rounded-2xl border border-white/50">
    <h4 className="text-[10px] font-bold mb-3 uppercase tracking-tighter opacity-40 font-jakarta">
      Disk Analysis
    </h4>
    <div className="space-y-3">
      {items.slice(0, 3).map(item => (
        <div key={item.id} className="space-y-1.5">
          <div className="flex justify-between text-[10px] font-bold font-jakarta">
            <span className="truncate max-w-[180px] text-gray-700">{item.name}</span>
            <span>{item.size}</span>
          </div>
          <div className="h-2 w-full bg-black/5 rounded-full overflow-hidden">
            <div 
              className="h-full transition-all duration-1000" 
              style={{ 
                backgroundColor: COLORS.orchidTint, 
                width: item.size.includes('GB') ? '82%' : '18%' 
              }} 
            />
          </div>
        </div>
      ))}
    </div>
  </div>
));
DiskUsage.displayName = 'DiskUsage';

const LoadingIndicator = memo(() => (
  <div className="flex justify-start">
    <div 
      className="px-5 py-3 rounded-2xl border border-black/5 animate-pulse flex gap-2 items-center" 
      style={{ backgroundColor: THEME.assistantBubble }}
    >
      {[0, 0.2, 0.4].map((delay, i) => (
        <div 
          key={i}
          className="w-2 h-2 rounded-full animate-bounce bg-black/20"
          style={{ animationDelay: `${delay}s`, opacity: 0.2 + (i * 0.1) }}
        />
      ))}
    </div>
  </div>
));
LoadingIndicator.displayName = 'LoadingIndicator';

const ActionButton = memo<{ 
  children: React.ReactNode; 
  onClick: () => void; 
  disabled?: boolean;
  isActive?: boolean;
  'aria-label'?: string;
}>(({ children, onClick, disabled, isActive, ...props }) => (
  <button 
    onClick={onClick}
    disabled={disabled}
    className={`w-12 h-12 rounded-2xl transition-all flex items-center justify-center active:scale-90 border border-black/5 ${
      isActive ? 'text-gray-700' : 'text-gray-400'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    style={{ 
      backgroundColor: 'rgba(255, 255, 255, 0.7)',
      ...GLASS_STYLES.base,
      boxShadow: '0 2px 4px -1px rgba(0,0,0,0.1), 0 1px 2px rgba(255,255,255,0.5), inset 0 1px 2px rgba(255,255,255,0.3), inset 0 -1px 2px rgba(0,0,0,0.05)'
    }}
    {...props}
  >
    {children}
  </button>
));
ActionButton.displayName = 'ActionButton';

const QuickActionButton = memo<{ 
  id: string;
  icon: React.ReactNode;
  color: string;
  isActive?: boolean;
  onClick: () => void;
}>(({ id, icon, color, isActive, onClick }) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-[10px] font-black border transition-all duration-300 whitespace-nowrap font-jakarta outline-none ${
      isActive 
        ? 'scale-[1.02] animate-pulse border-black/20' 
        : 'border-black/5 opacity-80 hover:opacity-100 active:scale-95'
    }`}
    style={{ 
      backgroundColor: isActive ? color : `${color}B0`,
      backdropFilter: isActive ? 'none' : 'blur(10px)',
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

const RecordButton = memo<{
  isRecording: boolean;
  onToggle: () => void;
}>(({ isRecording, onToggle }) => {
  const [isHovering, setIsHovering] = useState(false);
  const [showStopButton, setShowStopButton] = useState(false);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    if (isHovering && isRecording) {
      timeout = setTimeout(() => {
        setShowStopButton(true);
      }, 2000);
    } else {
      setShowStopButton(false);
    }

    return () => clearTimeout(timeout);
  }, [isHovering, isRecording]);

  const handleClick = () => {
    setShowStopButton(false);
    onToggle();
  };

  return (
    <button 
      onClick={handleClick}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      className={`w-12 h-12 rounded-2xl transition-all flex items-center justify-center active:scale-90 border border-black/5 ${
        isRecording ? 'text-red-500' : 'text-gray-500'
      } ${showStopButton ? 'animate-pulse' : ''}`}
      style={{ 
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        ...GLASS_STYLES.base,
        boxShadow: '0 2px 4px -1px rgba(0,0,0,0.1), 0 1px 2px rgba(255,255,255,0.5), inset 0 1px 2px rgba(255,255,255,0.3), inset 0 -1px 2px rgba(0,0,0,0.05)'
      }}
      aria-label={isRecording ? 'Stop recording' : 'Start recording'}
    >
      <div className="relative w-6 h-6 flex items-center justify-center">
        {/* Microphone icon (default state) */}
        <Mic 
          size={22} 
          className={`absolute transition-all duration-300 ${
            isRecording ? 'opacity-0 scale-75' : 'opacity-100 scale-100'
          }`}
        />
        
        {/* Recording circle */}
        <Circle 
          size={18} 
          fill="currentColor" 
          className={`absolute transition-all duration-300 ${
            isRecording && !showStopButton 
              ? 'opacity-100 scale-100 animate-pulse' 
              : 'opacity-0 scale-75'
          }`}
        />
        
        {/* Stop button (appears on long hover) */}
        <StopCircle 
          size={20} 
          fill="currentColor"
          className={`absolute transition-all duration-500 ease-out ${
            showStopButton 
              ? 'opacity-100 scale-110 animate-pulse' 
              : 'opacity-0 scale-75'
          }`}
        />
      </div>
    </button>
  );
});
RecordButton.displayName = 'RecordButton';

export default ChatInterface;
