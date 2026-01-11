import { useState, useRef, useCallback, useEffect } from 'react';
import { audioService } from '../../../services/audioService';
import { activityLogger } from '../../../services/activityLogger';

interface UseVoiceRecordingOptions {
  onTranscriptChange?: (transcript: string, pending: string) => void;
}

interface UseVoiceRecordingReturn {
  isRecording: boolean;
  voiceTranscript: string;
  pendingVoiceText: string;
  hasPendingVoiceMessage: boolean;
  audioLevels: number[];
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  handleMicClick: () => Promise<void>;
  discardVoice: () => void;
  setInput: (input: string) => void;
}

export function useVoiceRecording(
  inputRef: React.RefObject<HTMLTextAreaElement | null>,
  options?: UseVoiceRecordingOptions
): UseVoiceRecordingReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [pendingVoiceText, setPendingVoiceText] = useState('');
  const [hasPendingVoiceMessage, setHasPendingVoiceMessage] = useState(false);
  const [audioLevels, setAudioLevels] = useState<number[]>([0.2, 0.4, 0.6, 0.3, 0.5, 0.7, 0.4, 0.8]);
  const [inputValue, setInputValue] = useState('');

  // Refs
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isRecordingRef = useRef(false);

  // Audio visualization effect
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

  const stopRecording = useCallback(() => {
    isRecordingRef.current = false;
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

  const startRecording = useCallback(async () => {
    setIsRecording(true);
    isRecordingRef.current = true;
    setVoiceTranscript('');
    setPendingVoiceText('');

    // Setup audio visualization
    try {
      const stream = await audioService.getInputStream();
      if (stream) {
        streamRef.current = stream;
        
        const context = await audioService.createAudioContext();
        if (context) {
          audioContextRef.current = context;
          const source = context.createMediaStreamSource(stream);
          analyserRef.current = context.createAnalyser();
          analyserRef.current.fftSize = 256;
          analyserRef.current.smoothingTimeConstant = 0.8;
          source.connect(analyserRef.current);
        }
      }
    } catch (audioError) {
      console.warn('[Voice] Audio visualization setup failed:', audioError);
    }

    // Setup speech recognition
    const recognition = audioService.createSpeechRecognition();
    if (!recognition) {
      stopRecording();
      alert('Could not initialize speech recognition. Please try again.');
      return;
    }
    
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
      options?.onTranscriptChange?.(finalTranscript.trim(), interimTranscript.trim());
    };
    
    recognition.onerror = (event: any) => {
      switch (event.error) {
        case 'no-speech':
          return;
        case 'audio-capture':
          alert('Microphone not available.');
          break;
        case 'not-allowed':
          alert('Microphone permission denied.');
          break;
        case 'network':
          alert('Network error occurred. Speech recognition requires an internet connection.');
          break;
        default:
          console.warn('[Voice] Recognition error:', event.error);
      }
      stopRecording();
    };
    
    recognition.onend = () => {
      if (isRecordingRef.current && recognitionRef.current) {
        setTimeout(() => {
          if (isRecordingRef.current && recognitionRef.current) {
            try {
              recognitionRef.current.start();
            } catch (e) {
              stopRecording();
            }
          }
        }, 100);
      }
    };
    
    recognitionRef.current = recognition;
    recognition.start();
  }, [stopRecording, options]);

  const handleMicClick = useCallback(async () => {
    try {
      if (isRecording) {
        stopRecording();
        const fullTranscript = (voiceTranscript + ' ' + pendingVoiceText).trim();
        
        if (fullTranscript) {
          setVoiceTranscript(fullTranscript);
          setPendingVoiceText('');
          setHasPendingVoiceMessage(true);
          
          // Log voice input activity
          activityLogger.log(
            'Voice Input',
            fullTranscript.slice(0, 50) + (fullTranscript.length > 50 ? '...' : ''),
            'Transcription complete',
            'success'
          );
        } else {
          setVoiceTranscript('');
          setPendingVoiceText('');
          setHasPendingVoiceMessage(false);
        }
        return;
      }

      if (!audioService.isSpeechRecognitionSupported()) {
        const isOpera = navigator.userAgent.indexOf('OPR') !== -1 || navigator.userAgent.indexOf('Opera') !== -1;
        
        if (isOpera) {
          const userInput = prompt(
            '🎤 Voice Input - Opera Browser\n\n' +
            'Opera doesn\'t support Web Speech API yet.\n' +
            'Please type your message below:'
          );
          if (userInput && userInput.trim()) {
            setInputValue(userInput.trim());
            inputRef.current?.focus();
          }
          return;
        } else {
          alert('Speech recognition not supported in this browser. Please try Chrome, Edge, or Safari.');
          return;
        }
      }

      const permissionStatus = await audioService.requestPermission();
      
      if (!permissionStatus.granted) {
        alert(permissionStatus.error || 'Microphone access denied. Please check your system settings.');
        return;
      }

      await startRecording();
      
    } catch (error: any) {
      isRecordingRef.current = false;
      setIsRecording(false);
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          alert('Microphone access denied. Please allow microphone access and try again.');
        } else if (error.name === 'NotFoundError') {
          alert('No microphone found. Please connect a microphone and try again.');
        } else {
          alert(`Recording error: ${error.message}`);
        }
      }
    }
  }, [isRecording, voiceTranscript, pendingVoiceText, stopRecording, startRecording, inputRef]);

  const discardVoice = useCallback(() => {
    setVoiceTranscript('');
    setPendingVoiceText('');
    setHasPendingVoiceMessage(false);
  }, []);

  const clearPendingMessage = useCallback(() => {
    setHasPendingVoiceMessage(false);
  }, []);

  return {
    isRecording,
    voiceTranscript,
    pendingVoiceText,
    hasPendingVoiceMessage,
    audioLevels,
    startRecording,
    stopRecording,
    handleMicClick,
    discardVoice,
    setInput: setInputValue,
  };
}
