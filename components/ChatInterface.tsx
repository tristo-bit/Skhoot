import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { COLORS, WELCOME_MESSAGES, QUICK_ACTIONS, MOCK_FILES, MOCK_MESSAGES } from '../constants';
import { Message } from '../types';
import { geminiService } from '../services/gemini';
import { Conversations } from './Conversations';
import { PromptArea } from './PromptArea';

interface ChatInterfaceProps {
  chatId: string | null;
  initialMessages: Message[];
  onMessagesChange: (messages: Message[]) => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ initialMessages, onMessagesChange }) => {
  // State
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchType, setSearchType] = useState<'files' | 'messages' | 'disk' | 'cleanup' | null>(null);
  const [activeMode, setActiveMode] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [pendingVoiceText, setPendingVoiceText] = useState('');
  const [hasPendingVoiceMessage, setHasPendingVoiceMessage] = useState(false);
  const [audioLevels, setAudioLevels] = useState<number[]>([0.2, 0.4, 0.6, 0.3, 0.5, 0.7, 0.4, 0.8]);
  const [welcomeMessage] = useState(() => 
    WELCOME_MESSAGES[Math.floor(Math.random() * WELCOME_MESSAGES.length)]
  );
  const [isEmptyStateVisible, setIsEmptyStateVisible] = useState(initialMessages.length === 0);
  const [isEmptyStateExiting, setIsEmptyStateExiting] = useState(false);
  
  // Refs
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Computed values
  const activeColor = useMemo(() => {
    const action = QUICK_ACTIONS.find(a => a.id === activeMode);
    return action?.color ?? COLORS.almostAqua;
  }, [activeMode]);

  const hasMessages = messages.length > 0;
  const hasVoiceContent = voiceTranscript.length > 0 || pendingVoiceText.length > 0;

  // Notify parent when messages change
  useEffect(() => {
    if (messages.length > 0) {
      onMessagesChange(messages);
    }
  }, [messages, onMessagesChange]);

  // Demo event listener for console commands
  useEffect(() => {
    const handleDemoEvent = (event: CustomEvent) => {
      const { type, data } = event.detail;
      
      // Hide empty state
      if (isEmptyStateVisible) {
        setIsEmptyStateExiting(true);
        setTimeout(() => {
          setIsEmptyStateVisible(false);
          setIsEmptyStateExiting(false);
        }, 100);
      }

      switch (type) {
        case 'search-files': {
          // Add user message
          const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: `Find my ${data.query} files`,
            type: 'text',
            timestamp: new Date()
          };
          setMessages(prev => [...prev, userMsg]);
          setIsLoading(true);
          setSearchType('files');
          
          // Simulate search delay then show results
          setTimeout(() => {
            setSearchType(null);
            setIsLoading(false);
            const assistantMsg: Message = {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: `I found ${data.results.length} files matching "${data.query}":`,
              type: 'file_list',
              data: data.results,
              timestamp: new Date()
            };
            setMessages(prev => [...prev, assistantMsg]);
          }, 2000);
          break;
        }
        
        case 'search-messages': {
          const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: `Find messages about ${data.query}`,
            type: 'text',
            timestamp: new Date()
          };
          setMessages(prev => [...prev, userMsg]);
          setIsLoading(true);
          setSearchType('messages');
          
          setTimeout(() => {
            setSearchType(null);
            setIsLoading(false);
            const assistantMsg: Message = {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: `Found ${data.results.length} messages:`,
              type: 'message_list',
              data: data.results,
              timestamp: new Date()
            };
            setMessages(prev => [...prev, assistantMsg]);
          }, 2000);
          break;
        }
        
        case 'analyze-disk': {
          const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: 'Analyze my disk space',
            type: 'text',
            timestamp: new Date()
          };
          setMessages(prev => [...prev, userMsg]);
          setIsLoading(true);
          setSearchType('disk');
          
          setTimeout(() => {
            setSearchType(null);
            setIsLoading(false);
            const assistantMsg: Message = {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: 'Here\'s your disk usage analysis:',
              type: 'disk_usage',
              data: data.results,
              timestamp: new Date()
            };
            setMessages(prev => [...prev, assistantMsg]);
          }, 2500);
          break;
        }
        
        case 'show-markdown': {
          const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: 'Show me markdown formatting',
            type: 'text',
            timestamp: new Date()
          };
          setMessages(prev => [...prev, userMsg]);
          setIsLoading(true);
          
          setTimeout(() => {
            setIsLoading(false);
            const assistantMsg: Message = {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: data.content,
              type: 'text',
              timestamp: new Date()
            };
            setMessages(prev => [...prev, assistantMsg]);
          }, 1000);
          break;
        }

        case 'cleanup': {
          const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: 'Help me clean up and free some space',
            type: 'text',
            timestamp: new Date()
          };
          setMessages(prev => [...prev, userMsg]);
          setIsLoading(true);
          setSearchType('cleanup');
          
          setTimeout(() => {
            setSearchType(null);
            setIsLoading(false);
            const assistantMsg: Message = {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: 'I\'ve scanned your system and found some items that could be cleaned up. Here\'s what I found:',
              type: 'cleanup',
              data: data.results,
              timestamp: new Date()
            };
            setMessages(prev => [...prev, assistantMsg]);
          }, 3000);
          break;
        }
      }
    };

    window.addEventListener('skhoot-demo', handleDemoEvent as EventListener);
    return () => window.removeEventListener('skhoot-demo', handleDemoEvent as EventListener);
  }, [isEmptyStateVisible]);

  // Effects
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

  // Audio visualization
  useEffect(() => {
    let animationId: number;
    
    const updateAudioLevels = () => {
      if (analyserRef.current && isRecording) {
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        
        const bands = 8;
        const bandSize = Math.floor(dataArray.length / bands);
        const levels: number[] = [];
        
        for (let i = 0; i < bands; i++) {
          let sum = 0;
          for (let j = i * bandSize; j < (i + 1) * bandSize; j++) {
            sum += dataArray[j];
          }
          const level = Math.max(0.1, (sum / bandSize) / 255);
          levels.push(level);
        }
        
        setAudioLevels(levels);
        animationId = requestAnimationFrame(updateAudioLevels);
      }
    };
    
    if (isRecording && analyserRef.current) {
      updateAudioLevels();
    }
    
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [isRecording]);

  // Handlers
  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    analyserRef.current = null;
    setIsRecording(false);
  }, []);

  // Detect browser type for Opera-specific handling
  const isOpera = () => {
    return (navigator.userAgent.indexOf('OPR') !== -1 || navigator.userAgent.indexOf('Opera') !== -1);
  };

  // Check if speech recognition is available with Opera-specific detection
  const isSpeechRecognitionAvailable = () => {
    // Opera doesn't support Web Speech API natively
    if (isOpera()) {
      return false;
    }
    return ('webkitSpeechRecognition' in window) || ('SpeechRecognition' in window);
  };

  const handleMicClick = async () => {
    try {
      if (isRecording) {
        stopRecording();
        const fullTranscript = (voiceTranscript + ' ' + pendingVoiceText).trim();
        
        if (fullTranscript) {
          setVoiceTranscript(fullTranscript);
          setPendingVoiceText('');
          setHasPendingVoiceMessage(true);
        } else {
          setVoiceTranscript('');
          setPendingVoiceText('');
          setHasPendingVoiceMessage(false);
        }
        return;
      }

      // Check for speech recognition support
      if (!isSpeechRecognitionAvailable()) {
        // Opera-specific fallback
        if (isOpera()) {
          const userInput = prompt(
            '🎤 Voice Input - Opera Browser\n\n' +
            'Opera doesn\'t support Web Speech API yet.\n' +
            'Please type your message below:'
          );
          if (userInput && userInput.trim()) {
            setInput(userInput.trim());
            inputRef.current?.focus();
          }
          return;
        } else {
          alert('Speech recognition not supported in this browser. Please try Chrome, Edge, or Safari.');
          return;
        }
      }

      // Start recording for supported browsers
      setIsRecording(true);
      setVoiceTranscript('');
      setPendingVoiceText('');

      // Setup audio visualization
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        
        // Create audio context for visualization
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          audioContextRef.current = new AudioContextClass();
          const source = audioContextRef.current.createMediaStreamSource(stream);
          analyserRef.current = audioContextRef.current.createAnalyser();
          analyserRef.current.fftSize = 256;
          analyserRef.current.smoothingTimeConstant = 0.8;
          source.connect(analyserRef.current);
        }
      } catch (audioError) {
        // Continue without visualization
      }

      // Setup speech recognition
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();
      
      // Configure recognition
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = navigator.language || 'en-US';
      recognition.maxAlternatives = 1;
      
      // Handle results
      recognition.onresult = (event: any) => {
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
        
        setVoiceTranscript(finalTranscript.trim());
        setPendingVoiceText(interimTranscript.trim());
      };
      
      // Handle errors
      recognition.onerror = (event: any) => {
        // Handle specific errors
        switch (event.error) {
          case 'no-speech':
            // Continue listening
            return;
          case 'audio-capture':
            alert('Microphone access denied. Please allow microphone access and try again.');
            break;
          case 'not-allowed':
            alert('Microphone permission denied. Please enable microphone access in your browser settings.');
            break;
          case 'network':
            alert('Network error occurred. Please check your internet connection.');
            break;
          default:
            // Silent error handling
        }
        
        stopRecording();
      };
      
      // Handle recognition end
      recognition.onend = () => {
        // Only restart if still recording and recognition object exists
        if (isRecording && recognitionRef.current) {
          setTimeout(() => {
            if (isRecording && recognitionRef.current) {
              try {
                recognitionRef.current.start();
              } catch (e) {
                stopRecording();
              }
            }
          }, 100);
        }
      };

      // Handle start
      recognition.onstart = () => {
        // Recognition started
      };
      
      recognitionRef.current = recognition;
      recognition.start();
      
    } catch (error) {
      setIsRecording(false);
      
      // Provide user-friendly error messages
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          alert('Microphone access denied. Please allow microphone access and try again.');
        } else if (error.name === 'NotFoundError') {
          alert('No microphone found. Please connect a microphone and try again.');
        } else {
          alert(`Recording error: ${error.message}`);
        }
      } else {
        alert('An unknown error occurred while starting voice recording.');
      }
    }
  };

  const handleDiscardVoice = useCallback(() => {
    setVoiceTranscript('');
    setPendingVoiceText('');
    setHasPendingVoiceMessage(false);
  }, []);

  const handleSend = useCallback(async () => {
    const messageText = voiceTranscript.trim() || input.trim();
    
    if (!messageText || isLoading) return;

    stopRecording();
    setHasPendingVoiceMessage(false);

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

    // Build history from current messages BEFORE adding the new user message
    const history = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    // Add user message to state immediately
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setVoiceTranscript('');
    setPendingVoiceText('');
    setIsLoading(true);
    setActiveMode(null);
    
    // Determine search type based on message content or active mode
    const lowerMessage = messageText.toLowerCase();
    if (lowerMessage.includes('file') || lowerMessage.includes('find') || lowerMessage.includes('search') || lowerMessage.includes('where') || lowerMessage.includes('locate')) {
      setSearchType('files');
    } else if (lowerMessage.includes('message') || lowerMessage.includes('conversation') || lowerMessage.includes('chat') || lowerMessage.includes('said')) {
      setSearchType('messages');
    } else if (lowerMessage.includes('disk') || lowerMessage.includes('space') || lowerMessage.includes('storage')) {
      setSearchType('disk');
    } else if (lowerMessage.includes('cleanup') || lowerMessage.includes('clean up') || lowerMessage.includes('free space') || lowerMessage.includes('remove')) {
      setSearchType('cleanup');
    } else {
      setSearchType(null);
    }

    try {
      const result = await geminiService.chat(messageText, history);
      
      // Clear search type when done
      setSearchType(null);
      
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant' as const,
        content: (result.text || 'I received your message.').trim(),
        type: (result.type as Message['type']) || 'text',
        data: result.data || undefined,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, assistantMsg]);
    } catch (error) {
      setSearchType(null);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
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
    setActiveMode(prev => prev === mode ? null : mode);
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
    <div className="flex flex-col h-full w-full overflow-hidden relative">
      <Conversations
        ref={scrollRef}
        messages={messages}
        isLoading={isLoading}
        searchType={searchType}
        isRecording={isRecording}
        hasPendingVoiceMessage={hasPendingVoiceMessage}
        voiceTranscript={voiceTranscript}
        pendingVoiceText={pendingVoiceText}
        welcomeMessage={welcomeMessage}
        isEmptyStateVisible={isEmptyStateVisible}
        isEmptyStateExiting={isEmptyStateExiting}
        onSendVoice={handleSend}
        onDiscardVoice={handleDiscardVoice}
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
