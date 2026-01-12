import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { COLORS, WELCOME_MESSAGES, QUICK_ACTIONS } from '../../src/constants';
import { Message } from '../../types';
import { geminiService } from '../../services/gemini';
import { activityLogger } from '../../services/activityLogger';
import { MainArea } from '../main-area';
import { PromptArea } from './PromptArea';
import { useVoiceRecording } from './hooks';

interface ChatInterfaceProps {
  chatId: string | null;
  initialMessages: Message[];
  onMessagesChange: (messages: Message[]) => void;
  onActiveModeChange?: (mode: string | null) => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ initialMessages, onMessagesChange, onActiveModeChange }) => {
  // State
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchType, setSearchType] = useState<'files' | 'messages' | 'disk' | 'cleanup' | null>(null);
  const [searchStatus, setSearchStatus] = useState<string>('');
  const [activeMode, setActiveMode] = useState<string | null>(null);
  const [promptKey, setPromptKey] = useState(0);
  const [welcomeMessage] = useState(() => 
    WELCOME_MESSAGES[Math.floor(Math.random() * WELCOME_MESSAGES.length)]
  );
  const [isEmptyStateVisible, setIsEmptyStateVisible] = useState(initialMessages.length === 0);
  const [isEmptyStateExiting, setIsEmptyStateExiting] = useState(false);
  
  // Refs
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Voice recording hook
  const {
    isRecording,
    voiceTranscript,
    pendingVoiceText,
    hasPendingVoiceMessage,
    audioLevels,
    handleMicClick,
    stopRecording,
    discardVoice,
  } = useVoiceRecording(inputRef);

  // Computed values
  const activeColor = useMemo(() => {
    const action = QUICK_ACTIONS.find(a => a.id === activeMode);
    return action?.color ?? COLORS.almostAqua;
  }, [activeMode]);

  const hasMessages = messages.length > 0;
  const hasVoiceContent = voiceTranscript.length > 0 || pendingVoiceText.length > 0;

  // Notify parent when activeMode changes
  useEffect(() => {
    onActiveModeChange?.(activeMode);
  }, [activeMode, onActiveModeChange]);

  // Notify parent when messages change
  useEffect(() => {
    if (messages.length > 0) {
      onMessagesChange(messages);
    }
  }, [messages, onMessagesChange]);

  // Demo event listener
  useEffect(() => {
    const handleDemoEvent = (event: CustomEvent) => {
      const { type, data } = event.detail;
      
      if (isEmptyStateVisible) {
        setIsEmptyStateExiting(true);
        setTimeout(() => {
          setIsEmptyStateVisible(false);
          setIsEmptyStateExiting(false);
        }, 100);
      }

      const createUserMessage = (content: string): Message => ({
        id: Date.now().toString(),
        role: 'user',
        content,
        type: 'text',
        timestamp: new Date()
      });

      const createAssistantMessage = (content: string, msgType: Message['type'], msgData?: any): Message => ({
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content,
        type: msgType,
        data: msgData,
        timestamp: new Date()
      });

      switch (type) {
        case 'search-files': {
          setInput(''); // Clear input after demo message
          setMessages(prev => [...prev, createUserMessage(`Find my ${data.query} files`)]);
          setIsLoading(true);
          setSearchType('files');
          
          setTimeout(() => {
            setSearchType(null);
            setIsLoading(false);
            setMessages(prev => [...prev, createAssistantMessage(
              `I found ${data.results.length} files matching "${data.query}":`,
              'file_list',
              data.results
            )]);
          }, 2000);
          break;
        }
        
        case 'search-messages': {
          setInput(''); // Clear input after demo message
          setMessages(prev => [...prev, createUserMessage(`Find messages about ${data.query}`)]);
          setIsLoading(true);
          setSearchType('messages');
          
          setTimeout(() => {
            setSearchType(null);
            setIsLoading(false);
            setMessages(prev => [...prev, createAssistantMessage(
              `Found ${data.results.length} messages:`,
              'message_list',
              data.results
            )]);
          }, 2000);
          break;
        }
        
        case 'analyze-disk': {
          setInput(''); // Clear input after demo message
          setMessages(prev => [...prev, createUserMessage('Analyze my disk space')]);
          setIsLoading(true);
          setSearchType('disk');
          
          setTimeout(() => {
            setSearchType(null);
            setIsLoading(false);
            setMessages(prev => [...prev, createAssistantMessage(
              'Here\'s your disk usage analysis:',
              'disk_usage',
              data.results
            )]);
          }, 2500);
          break;
        }
        
        case 'show-markdown': {
          setInput(''); // Clear input after demo message
          setMessages(prev => [...prev, createUserMessage('What can you help me with?')]);
          setIsLoading(true);
          
          setTimeout(() => {
            setIsLoading(false);
            setMessages(prev => [...prev, createAssistantMessage(data.content, 'text')]);
          }, 1000);
          break;
        }

        case 'cleanup': {
          setInput(''); // Clear input after demo message
          setMessages(prev => [...prev, createUserMessage('Help me free up some space')]);
          setIsLoading(true);
          setSearchType('cleanup');
          
          setTimeout(() => {
            setSearchType(null);
            setIsLoading(false);
            setMessages(prev => [...prev, createAssistantMessage(
              'I\'ve scanned your system and found some items that could be cleaned up:',
              'cleanup',
              data.results
            )]);
          }, 3000);
          break;
        }
      }
    };

    // Demo typing animation handler
    const handleDemoTyping = (event: CustomEvent) => {
      const { text } = event.detail;
      setInput('');
      let i = 0;
      const typeChar = () => {
        if (i < text.length) {
          setInput(prev => prev + text[i]);
          i++;
          setTimeout(typeChar, 50 + Math.random() * 30);
        }
      };
      typeChar();
    };

    // Demo reset handler (for looping)
    const handleDemoReset = () => {
      setMessages([]);
      setInput('');
      setIsEmptyStateVisible(true);
      setIsEmptyStateExiting(false);
    };

    window.addEventListener('skhoot-demo', handleDemoEvent as EventListener);
    window.addEventListener('skhoot-demo-typing', handleDemoTyping as EventListener);
    window.addEventListener('skhoot-demo-reset', handleDemoReset as EventListener);
    
    return () => {
      window.removeEventListener('skhoot-demo', handleDemoEvent as EventListener);
      window.removeEventListener('skhoot-demo-typing', handleDemoTyping as EventListener);
      window.removeEventListener('skhoot-demo-reset', handleDemoReset as EventListener);
    };
  }, [isEmptyStateVisible]);

  // Empty state visibility
  useEffect(() => {
    const shouldHide = hasMessages || (isRecording && hasVoiceContent);
    
    if (shouldHide && isEmptyStateVisible && !isEmptyStateExiting) {
      setIsEmptyStateExiting(true);
      const timer = setTimeout(() => {
        setIsEmptyStateVisible(false);
        setIsEmptyStateExiting(false);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [hasMessages, isRecording, hasVoiceContent, isEmptyStateVisible, isEmptyStateExiting]);

  // Smooth auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      const scrollElement = scrollRef.current;
      const targetScroll = scrollElement.scrollHeight;
      const currentScroll = scrollElement.scrollTop;
      const distance = targetScroll - currentScroll - scrollElement.clientHeight;
      
      if (distance > 0) {
        const startTime = performance.now();
        const duration = Math.min(600, Math.max(300, distance * 0.5));
        
        const animateScroll = (currentTime: number) => {
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const easeOut = 1 - Math.pow(1 - progress, 3);
          
          scrollElement.scrollTop = currentScroll + (distance + scrollElement.clientHeight) * easeOut;
          
          if (progress < 1) {
            requestAnimationFrame(animateScroll);
          }
        };
        
        requestAnimationFrame(animateScroll);
      }
    }
  }, [messages, voiceTranscript, pendingVoiceText, hasPendingVoiceMessage]);

  // Determine search type from message
  const getSearchType = (text: string): typeof searchType => {
    const lower = text.toLowerCase();
    if (lower.includes('file') || lower.includes('find') || lower.includes('search')) return 'files';
    if (lower.includes('message') || lower.includes('conversation')) return 'messages';
    if (lower.includes('disk') || lower.includes('space') || lower.includes('storage')) return 'disk';
    if (lower.includes('cleanup') || lower.includes('clean up')) return 'cleanup';
    return null;
  };

  const handleSend = useCallback(async () => {
    const messageText = voiceTranscript.trim() || input.trim();
    
    if (!messageText || isLoading) return;

    stopRecording();

    if (isEmptyStateVisible) {
      setIsEmptyStateExiting(true);
      setTimeout(() => {
        setIsEmptyStateVisible(false);
        setIsEmptyStateExiting(false);
      }, 100);
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      type: 'text',
      timestamp: new Date()
    };

    const history = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    setActiveMode(null);
    setSearchType(getSearchType(messageText));

    try {
      const result = await geminiService.chat(messageText, history, (status) => {
        setSearchStatus(status);
      });
      setSearchType(null);
      setSearchStatus('');
      
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant' as const,
        content: (result.text || 'I received your message.').trim(),
        type: (result.type as Message['type']) || 'text',
        data: result.data || undefined,
        searchInfo: result.searchInfo || undefined,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, assistantMsg]);
      
      // Log AI chat activity (only for non-search responses, searches are logged in gemini service)
      if (result.type === 'text') {
        activityLogger.log(
          'AI Chat',
          messageText.slice(0, 50) + (messageText.length > 50 ? '...' : ''),
          'Response received',
          'success'
        );
      }
    } catch (error) {
      setSearchType(null);
      setSearchStatus('');
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      // Log failed chat
      activityLogger.log(
        'AI Chat',
        messageText.slice(0, 50) + (messageText.length > 50 ? '...' : ''),
        'Error: ' + errorMessage.slice(0, 30),
        'error'
      );
      
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Sorry, I encountered an error: ${errorMessage}. Please check your API key configuration.`,
        type: 'text',
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [input, voiceTranscript, isLoading, messages, stopRecording, isEmptyStateVisible]);

  const handleQuickAction = useCallback((mode: string, _placeholder: string) => {
    if (activeMode === mode) {
      setActiveMode(null);
    } else {
      setActiveMode(mode);
      setPromptKey(prev => prev + 1);
    }
    inputRef.current?.focus();
  }, [activeMode]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (activeMode && !e.target.value) setActiveMode(null);
  }, [activeMode]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden relative">
      <MainArea
        ref={scrollRef}
        messages={messages}
        isLoading={isLoading}
        searchType={searchType}
        searchStatus={searchStatus}
        isRecording={isRecording}
        hasPendingVoiceMessage={hasPendingVoiceMessage}
        voiceTranscript={voiceTranscript}
        pendingVoiceText={pendingVoiceText}
        welcomeMessage={welcomeMessage}
        isEmptyStateVisible={isEmptyStateVisible}
        isEmptyStateExiting={isEmptyStateExiting}
        activeMode={activeMode}
        promptKey={promptKey}
        onSendVoice={handleSend}
        onDiscardVoice={discardVoice}
      />
      
      <PromptArea
        ref={inputRef}
        input={input}
        isLoading={isLoading}
        isRecording={isRecording}
        hasPendingVoiceMessage={hasPendingVoiceMessage}
        activeMode={activeMode}
        activeColor={activeColor}
        audioLevels={audioLevels}
        onInputChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onSend={handleSend}
        onMicClick={handleMicClick}
        onQuickAction={handleQuickAction}
      />
    </div>
  );
};

export default ChatInterface;
