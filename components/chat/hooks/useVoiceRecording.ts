import { useState, useRef, useCallback, useEffect } from 'react';
import { audioService } from '../../../services/audioService';
import { sttService, SttSession } from '../../../services/sttService';
import { sttConfigStore } from '../../../services/sttConfig';
import { activityLogger } from '../../../services/activityLogger';

// Helper to show notifications (console + optional UI callback)
const showNotification = (message: string, type: 'error' | 'warning' | 'info' = 'error') => {
  const prefix = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
  console.log(`[Voice] ${prefix} ${message}`);
  // Don't use alert() in Tauri - it requires dialog permissions
};

interface UseVoiceRecordingOptions {
  onTranscriptChange?: (transcript: string, pending: string) => void;
}

interface UseVoiceRecordingReturn {
  isRecording: boolean;
  voiceTranscript: string;
  pendingVoiceText: string;
  hasPendingVoiceMessage: boolean;
  audioLevels: number[];
  audioStream: MediaStream | null;
  startRecording: () => Promise<void>;
  stopRecording: (abortStt?: boolean) => void;
  handleMicClick: () => Promise<void>;
  discardVoice: () => void;
  editVoiceTranscript: (newText: string) => void;
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
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);

  // Refs
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isRecordingRef = useRef(false);
  const sttSessionRef = useRef<SttSession | null>(null);

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

  const stopRecording = useCallback((abortStt: boolean = true) => {
    isRecordingRef.current = false;
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (abortStt && sttSessionRef.current) {
      sttSessionRef.current.abort();
      sttSessionRef.current = null;
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
    setAudioStream(null);
  }, []);

  const startRecording = useCallback(async () => {
    setIsRecording(true);
    isRecordingRef.current = true;
    setVoiceTranscript('');
    setPendingVoiceText('');

    console.log('[Voice] Starting recording...');

    // Setup audio visualization
    try {
      const stream = await audioService.getInputStream();
      console.log('[Voice] Got audio stream:', stream ? 'yes' : 'no');
      if (stream) {
        const tracks = stream.getAudioTracks();
        console.log('[Voice] Audio tracks:', tracks.length, tracks.map(t => ({ label: t.label, enabled: t.enabled, muted: t.muted })));
        
        streamRef.current = stream;
        setAudioStream(stream);
        
        const context = await audioService.createAudioContext();
        if (context) {
          console.log('[Voice] AudioContext created, state:', context.state);
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

    const providerDecision = await sttService.getProviderDecision();
    console.log('[Voice] Provider decision:', providerDecision);
    const useFallback = providerDecision && providerDecision !== 'web-speech';

      if (useFallback) {
      console.log('[Voice] Using fallback STT provider:', providerDecision);
      try {
        if (!streamRef.current) {
          throw new Error('Microphone not available.');
        }
        sttSessionRef.current = await sttService.startRecording(streamRef.current, providerDecision);
        console.log('[Voice] STT session started successfully');
      } catch (error) {
        stopRecording();
        const message = error instanceof Error ? error.message : 'Failed to start voice transcription.';
        console.error('[Voice] STT start error:', message);
        // Use console.error instead of alert for Tauri compatibility
      }
      return;
    }

    // Setup speech recognition
    const recognition = audioService.createSpeechRecognition();
    if (!recognition) {
      stopRecording();
      showNotification('Could not initialize speech recognition. Please try again.');
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
          showNotification('Microphone not available.');
          break;
        case 'not-allowed':
          showNotification('Microphone permission denied.');
          break;
        case 'network':
          showNotification('Network error occurred. Speech recognition requires an internet connection.');
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
        console.log('[Voice] Stopping recording...');
        stopRecording(false);
        const fullTranscript = (voiceTranscript + ' ' + pendingVoiceText).trim();
        console.log('[Voice] Full transcript so far:', fullTranscript);

        if (sttSessionRef.current) {
          console.log('[Voice] Waiting for STT session to complete...');
          const session = sttSessionRef.current;
          sttSessionRef.current = null;
          try {
            const transcript = await session.stop();
            console.log('[Voice] STT transcript received:', transcript);
            if (transcript) {
              setVoiceTranscript(transcript);
              setPendingVoiceText('');
              setHasPendingVoiceMessage(true);
              activityLogger.log(
                'Voice Input',
                transcript.slice(0, 50) + (transcript.length > 50 ? '...' : ''),
                'Transcription complete',
                'success'
              );
            } else {
              setVoiceTranscript('');
              setPendingVoiceText('');
              setHasPendingVoiceMessage(false);
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Transcription failed.';
            alert(message);
          }
        } else {
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
        }
        return;
      }

      const preference = sttConfigStore.getProviderPreference();
      if (preference === 'web-speech' && !audioService.isSpeechRecognitionSupported()) {
        showNotification('Web Speech API is not supported on this platform. Choose a different STT provider in Sound Settings.');
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
        }

        if (!(await sttService.isAvailable())) {
          showNotification('Speech recognition is unavailable. Configure a provider in Sound Settings or add an API key.');
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
          showNotification('Microphone access denied. Please allow microphone access and try again.');
        } else if (error.name === 'NotFoundError') {
          showNotification('No microphone found. Please connect a microphone and try again.');
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

  const editVoiceTranscript = useCallback((newText: string) => {
    setVoiceTranscript(newText);
    setPendingVoiceText('');
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
    audioStream,
    startRecording,
    stopRecording,
    handleMicClick,
    discardVoice,
    editVoiceTranscript,
    setInput: setInputValue,
  };
}
