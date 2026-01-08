
import React, { useState, useRef, useEffect } from 'react';
import { COLORS, THEME } from '../constants';
import { Message, FileInfo } from '../types';
import { Send, Mic, Plus, Square, Search, MessageSquare, HardDrive, Trash2 } from 'lucide-react';
import { geminiService } from '../services/gemini';

const SkhootLogo = ({ size = 64, className = "" }: { size?: number, className?: string }) => (
  <img src="/skhoot-purple.svg" alt="Skhoot" width={size} height={size} className={className} />
);

const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [placeholder, setPlaceholder] = useState('Skhoot is listening...');
  const [isLoading, setIsLoading] = useState(false);
  const [activeMode, setActiveMode] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [micPermission, setMicPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const getActiveColor = (mode: string) => {
    switch(mode) {
      case 'Files': return COLORS.almostAqua;
      case 'Messages': return COLORS.raindropsOnRoses;
      case 'Space': return COLORS.lemonIcing;
      case 'Cleanup': return COLORS.orchidTint;
      default: return COLORS.almostAqua;
    }
  };

  const initSpeechRecognition = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = navigator.language || 'en-US';
      recognition.maxAlternatives = 1;
      
      recognition.onstart = () => {
        console.log('Speech recognition started');
        setIsRecording(true);
        setPlaceholder('🎤 Listening in any language...');
      };
      
      recognition.onresult = (event: any) => {
        console.log('Speech recognition result:', event);
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            transcript += event.results[i][0].transcript;
          } else {
            // Show interim results
            const interimTranscript = event.results[i][0].transcript;
            setInput(transcript + interimTranscript);
          }
        }
        if (transcript) {
          setInput(transcript.trim());
        }
      };
      
      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
        
        // Handle different error types
        switch (event.error) {
          case 'no-speech':
            setPlaceholder('No speech detected, try again');
            break;
          case 'audio-capture':
            setPlaceholder('Microphone not accessible');
            break;
          case 'not-allowed':
            setMicPermission('denied');
            setPlaceholder('Microphone permission denied');
            break;
          case 'network':
            setPlaceholder('Network error, check connection');
            break;
          case 'aborted':
            setPlaceholder('Speech recognition aborted');
            break;
          default:
            setPlaceholder('Speech recognition error');
        }
        
        setTimeout(() => setPlaceholder('Skhoot is listening...'), 3000);
      };
      
      recognition.onend = () => {
        console.log('Speech recognition ended');
        setIsRecording(false);
        setPlaceholder('Skhoot is listening...');
      };
      
      return recognition;
    }
    return null;
  };

  const handleMicClick = () => {
    console.log('🎤 Mic clicked, isRecording:', isRecording);
    
    try {
      // Check if speech recognition is supported
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        alert('Speech recognition not supported in this browser');
        return;
      }
      
      if (isRecording) {
        // Stop recording when clicked again
        console.log('🔴 Stopping recording...');
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }
        setIsRecording(false);
        setPlaceholder('Skhoot is listening...');
        return;
      }
      
      // Start recording
      console.log('🟢 Starting recording...');
      
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = true; // Keep listening continuously
      recognition.interimResults = true;
      recognition.lang = navigator.language || 'en-US';
      
      recognition.onstart = () => {
        console.log('✅ Recording started successfully');
        setIsRecording(true);
        setPlaceholder('🎤 Listening... Click send button to confirm');
      };
      
      recognition.onresult = (event: any) => {
        console.log('✅ Got speech result');
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = 0; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }
        
        const fullTranscript = (finalTranscript + interimTranscript).trim();
        if (fullTranscript) {
          console.log('📝 Transcript:', fullTranscript);
          setInput(fullTranscript);
        }
      };
      
      recognition.onerror = (event: any) => {
        console.error('❌ Recognition error:', event.error);
        
        // Don't stop on 'no-speech' error, just continue
        if (event.error === 'no-speech') {
          console.log('No speech detected, but continuing to listen...');
          return;
        }
        
        setIsRecording(false);
        setPlaceholder('Error: ' + event.error);
        setTimeout(() => setPlaceholder('Skhoot is listening...'), 2000);
      };
      
      recognition.onend = () => {
        console.log('✅ Recognition ended, restarting if still recording...');
        
        // Auto-restart if we're still supposed to be recording
        if (isRecording) {
          setTimeout(() => {
            if (isRecording && recognitionRef.current) {
              try {
                recognitionRef.current.start();
                console.log('🔄 Auto-restarted recognition');
              } catch (e) {
                console.log('Could not restart:', e);
              }
            }
          }, 100);
        } else {
          setPlaceholder('Skhoot is listening...');
        }
      };
      
      recognitionRef.current = recognition;
      recognition.start();
      
    } catch (error) {
      console.error('❌ Error:', error);
      setIsRecording(false);
      setPlaceholder('Skhoot is listening...');
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    // Stop any ongoing recording when sending
    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }

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
    
    const assistantMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: result.text || '',
      type: result.type as any,
      data: result.data,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, assistantMsg]);
    setIsLoading(false);
  };

  const hasContent = input.trim().length > 0;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleQuickAction = (mode: string, newPlaceholder: string) => {
    setInput('');
    setPlaceholder(newPlaceholder);
    setActiveMode(mode);
    inputRef.current?.focus();
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full w-full">
      {/* Conversation Area */}
      <div 
        ref={scrollRef}
        className={`flex-1 overflow-y-auto px-6 py-8 space-y-6 scroll-smooth no-scrollbar ${isEmpty ? 'flex flex-col items-center justify-center' : ''}`}
      >
        {isEmpty ? (
          <div className="text-center max-w-[340px]">
            <div 
              className="w-28 h-28 rounded-[2.5rem] mb-10 mx-auto flex items-center justify-center shadow-xl rotate-[-4deg] hover:rotate-0 duration-500" 
              style={{ 
                backgroundColor: COLORS.orchidTint,
                animation: 'logoEntrance 1s ease-out 0.3s both'
              }}
              onAnimationEnd={(e) => {
                e.currentTarget.style.animation = 'none';
                e.currentTarget.classList.add('transition-transform');
              }}
            >
              <div style={{ 
                filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.4)) drop-shadow(0 -1px 0px rgba(255,255,255,0.6))',
                transform: 'translateY(1px)',
                opacity: 0.9
              }}>
                <SkhootLogo size={64} />
              </div>
            </div>
            <div className="space-y-4">
              <h2 className="text-2xl font-bold tracking-tight font-jakarta" style={{ color: '#1e1e1e' }}>
                {"Need help with something?".split("").map((char, index) => (
                  <span
                    key={index}
                    className="inline-block"
                    style={{
                      animation: `dropIn 0.6s ease-out ${1300 + index * 50}ms both`,
                    }}
                  >
                    {char === " " ? "\u00A0" : char}
                  </span>
                ))}
              </h2>
              <style jsx>{`
                @keyframes dropIn {
                  0% {
                    transform: translateY(-20px);
                    opacity: 0;
                  }
                  100% {
                    transform: translateY(0);
                    opacity: 1;
                  }
                }
                @keyframes logoEntrance {
                  0% {
                    transform: rotate(-4deg) scale(0.3);
                    opacity: 0;
                  }
                  50% {
                    transform: rotate(8deg) scale(1.1);
                  }
                  100% {
                    transform: rotate(-4deg) scale(1);
                    opacity: 1;
                  }
                }
              `}</style>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
              <div 
                className={`max-w-[90%] p-4 rounded-3xl shadow-sm border border-black/5 ${
                  msg.role === 'user' 
                    ? 'rounded-tr-none' 
                    : 'rounded-tl-none'
                }`}
                style={{ backgroundColor: msg.role === 'user' ? THEME.userBubble : THEME.assistantBubble }}
              >
                <p 
                  className="text-[13px] leading-relaxed font-semibold font-jakarta" 
                  style={{ color: msg.role === 'user' ? COLORS.textPrimary : '#333333' }}
                >
                  {msg.content}
                </p>

                {msg.type === 'file_list' && msg.data && (
                  <div className="mt-4 space-y-2">
                    {msg.data.map((file: FileInfo) => (
                      <div key={file.id} className="p-3 bg-white/60 rounded-2xl border border-white/40 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: COLORS.almostAqua }}>
                            <Search size={14} className="text-gray-700" />
                          </div>
                          <div className="overflow-hidden">
                            <p className="text-[11px] font-bold truncate text-gray-800 font-jakarta">{file.name}</p>
                            <p className="text-[9px] font-medium opacity-50 truncate font-jakarta">{file.path}</p>
                          </div>
                        </div>
                        <span className="text-[9px] font-black whitespace-nowrap ml-2 opacity-60 font-jakarta">{file.size}</span>
                      </div>
                    ))}
                  </div>
                )}

                {msg.type === 'disk_usage' && msg.data && (
                  <div className="mt-4 p-4 bg-white/40 rounded-2xl border border-white/50">
                    <h4 className="text-[10px] font-bold mb-3 uppercase tracking-tighter opacity-40 font-jakarta">Disk Analysis</h4>
                    <div className="space-y-3">
                      {msg.data.slice(0, 3).map((item: FileInfo) => (
                        <div key={item.id} className="space-y-1.5">
                          <div className="flex justify-between text-[10px] font-bold font-jakarta">
                            <span className="truncate max-w-[180px] text-gray-700">{item.name}</span>
                            <span>{item.size}</span>
                          </div>
                          <div className="h-2 w-full bg-black/5 rounded-full overflow-hidden">
                            <div className="h-full transition-all duration-1000" style={{ backgroundColor: COLORS.orchidTint, width: item.size.includes('GB') ? '82%' : '18%' }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="px-5 py-3 rounded-2xl border border-black/5 animate-pulse flex gap-2 items-center" style={{ backgroundColor: THEME.assistantBubble }}>
              <div className="w-2 h-2 rounded-full animate-bounce bg-black/20" />
              <div className="w-2 h-2 rounded-full animate-bounce [animation-delay:0.2s] bg-black/30" />
              <div className="w-2 h-2 rounded-full animate-bounce [animation-delay:0.4s] bg-black/40" />
            </div>
          </div>
        )}
      </div>

      {/* Input Controller */}
      <div className="px-6 pb-8">
        <div className={`rounded-[32px] p-2.5 flex flex-col gap-3 shadow-2xl border border-white/60 transition-all duration-300 ${activeMode ? 'ring-2 ring-white/30' : ''}`} style={{ 
          backgroundColor: activeMode ? `${getActiveColor(activeMode)}15` : 'rgba(255, 255, 255, 0.6)', 
          backdropFilter: 'blur(20px)',
          borderColor: activeMode ? `${getActiveColor(activeMode)}30` : 'rgba(255, 255, 255, 0.6)'
        }}>
          {isEmpty && (
            <div className="flex gap-2 overflow-x-auto px-2 py-1 no-scrollbar">
              <QuickAction 
                isActive={activeMode === 'Files'}
                color={COLORS.almostAqua} 
                icon={<Search size={14}/>} 
                label="Files" 
                onClick={() => handleQuickAction('Files', 'Which file are you looking for?')} 
              />
              <QuickAction 
                isActive={activeMode === 'Messages'}
                color={COLORS.raindropsOnRoses} 
                icon={<MessageSquare size={14}/>} 
                label="Messages" 
                onClick={() => handleQuickAction('Messages', 'Search in conversations for...')} 
              />
              <QuickAction 
                isActive={activeMode === 'Space'}
                color={COLORS.lemonIcing} 
                icon={<HardDrive size={14}/>} 
                label="Space" 
                onClick={() => handleQuickAction('Space', 'Ask about disk usage...')} 
              />
              <QuickAction 
                isActive={activeMode === 'Cleanup'}
                color={COLORS.orchidTint} 
                icon={<Trash2 size={14}/>} 
                label="Cleanup" 
                onClick={() => handleQuickAction('Cleanup', 'Identify removable files...')} 
              />
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <button className="p-3 hover:bg-black/5 rounded-2xl transition-all text-gray-500 active:scale-90">
              <Plus size={22} />
            </button>
            
            {/* Audio Visualization */}
            {isRecording && (
              <div className="flex items-center gap-1 px-3">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1 rounded-full"
                    style={{
                      height: '8px',
                      background: 'linear-gradient(to top, #60a5fa, #a855f7)',
                      animation: `audioWave-${i} 1.5s ease-in-out infinite`,
                    }}
                  />
                ))}
                <style>
                  {`
                    @keyframes audioWave-0 {
                      0%, 100% { height: 8px; opacity: 0.4; }
                      50% { height: 24px; opacity: 1; }
                    }
                    @keyframes audioWave-1 {
                      0%, 100% { height: 8px; opacity: 0.4; }
                      50% { height: 20px; opacity: 1; }
                    }
                    @keyframes audioWave-2 {
                      0%, 100% { height: 8px; opacity: 0.4; }
                      50% { height: 28px; opacity: 1; }
                    }
                    @keyframes audioWave-3 {
                      0%, 100% { height: 8px; opacity: 0.4; }
                      50% { height: 16px; opacity: 1; }
                    }
                    @keyframes audioWave-4 {
                      0%, 100% { height: 8px; opacity: 0.4; }
                      50% { height: 22px; opacity: 1; }
                    }
                  `}
                </style>
              </div>
            )}
            
            <input 
              ref={inputRef}
              type="text" 
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                if (activeMode && !e.target.value) setActiveMode(null);
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={placeholder}
              style={{ color: '#1e1e1e' }}
              className={`flex-1 bg-transparent border-none outline-none py-2 text-[14px] font-semibold placeholder:text-gray-400 placeholder:font-medium font-jakarta transition-all ${
                isRecording ? 'placeholder:text-blue-500' : ''
              }`}
            />
            <div className="flex items-center gap-1.5 pr-1">
              <button 
                onClick={handleMicClick}
                className={`p-3 hover:bg-black/5 rounded-2xl transition-all active:scale-90 ${
                  isRecording ? 'text-red-500 animate-pulse bg-red-50' : 'text-gray-400'
                }`}
              >
                <Mic size={22} />
              </button>
              <button 
                onClick={handleSend}
                disabled={isLoading}
                className={`w-12 h-12 rounded-2xl transition-all flex items-center justify-center shadow-lg active:scale-90 ${
                  hasContent && !isLoading ? 'text-white' : 'text-gray-400'
                }`}
                style={{ 
                  backgroundColor: hasContent && !isLoading ? COLORS.fukuBrand : 'transparent',
                  boxShadow: hasContent && !isLoading ? `0 8px 16px -4px ${COLORS.fukuBrand}66` : 'none'
                }}
              >
                {isLoading ? (
                  <Square size={18} fill="currentColor" className="animate-pulse" />
                ) : (
                  <Send size={22} className={hasContent ? "animate-in zoom-in duration-200" : "opacity-30 transition-opacity"} />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const QuickAction: React.FC<{ icon: React.ReactNode, label: string, color: string, isActive?: boolean, onClick: () => void }> = ({ icon, label, color, isActive, onClick }) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-[10px] font-black border transition-all duration-300 transform-gpu whitespace-nowrap font-jakarta outline-none focus:outline-none ${
      isActive 
        ? 'scale-[1.02] animate-pulse border-black/20' 
        : 'border-black/5 opacity-80 hover:opacity-100 hover:scale-[1.01] active:scale-95'
    }`}
    style={{ 
      backgroundColor: isActive ? color : color,
      color: COLORS.textPrimary,
      boxShadow: isActive 
        ? `inset 0 2px 4px rgba(0,0,0,0.2), inset 0 -1px 2px rgba(255,255,255,0.3), 0 4px 8px -2px ${color}40`
        : `0 2px 4px -1px rgba(0,0,0,0.1), 0 1px 2px rgba(255,255,255,0.5)`
    }}
  >
    <span className={isActive ? 'animate-bounce' : ''}>{icon}</span>
    {label}
  </button>
);

export default ChatInterface;
