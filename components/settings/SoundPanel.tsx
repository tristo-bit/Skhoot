import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, VolumeX, Volume2, AlertCircle, Terminal, CheckCircle, Volume } from 'lucide-react';
import { audioService, AudioDevice } from '../../services/audio/audioService';
import { linuxAudioSetup, LinuxAudioStatus } from '../../services/audio/linuxAudioSetup';
import { sttConfigStore, SttProvider } from '../../services/audio/sttConfig';
import { sttService } from '../../services/audio/sttService';
import { BackButton } from '../buttonFormat';
import SynthesisVisualizer from '../ui/SynthesisVisualizer';

interface SoundPanelProps {
  onBack: () => void;
}

interface SectionLabelProps {
  label: string;
  description?: string;
  icon?: React.ReactNode;
  iconColor?: string;
}

const SectionLabel: React.FC<SectionLabelProps> = ({ label, description, icon, iconColor = 'text-[#C0B7C9]' }) => (
  <div>
    <label className="text-sm font-bold font-jakarta text-text-primary flex items-center gap-2">
      {icon && <span className={iconColor}>{icon}</span>}
      {label}
    </label>
    {description && <p className="text-xs text-text-secondary font-jakarta mt-1">{description}</p>}
  </div>
);

export const SoundPanel: React.FC<SoundPanelProps> = ({ onBack }) => {
  // Audio settings state
  const [inputDevices, setInputDevices] = useState<AudioDevice[]>([]);
  const [outputDevices, setOutputDevices] = useState<AudioDevice[]>([]);
  const [selectedInputDevice, setSelectedInputDevice] = useState('');
  const [selectedOutputDevice, setSelectedOutputDevice] = useState('');
  const [inputVolume, setInputVolume] = useState(80);
  const [outputVolume, setOutputVolume] = useState(70);
  const [isTesting, setIsTesting] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [waveformData, setWaveformData] = useState<number[]>(new Array(40).fill(0));
  const [autoSensitivity, setAutoSensitivity] = useState(true);
  const [manualSensitivity, setManualSensitivity] = useState(50);
  const [micPermissionError, setMicPermissionError] = useState<string | null>(null);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [linuxAudioStatus, setLinuxAudioStatus] = useState<LinuxAudioStatus | null>(null);
  const [isFixingLinuxAudio, setIsFixingLinuxAudio] = useState(false);
  const [linuxFixResult, setLinuxFixResult] = useState<{ success: boolean; message: string } | null>(null);
  const [sttProvider, setSttProvider] = useState<SttProvider>('auto');
  const [customSttUrl, setCustomSttUrl] = useState('');
  const [customSttKey, setCustomSttKey] = useState('');
  const [sttTestStatus, setSttTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [sttTestMessage, setSttTestMessage] = useState('');
  
  // Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const outputGainRef = useRef<GainNode | null>(null);
  const audioTestRef = useRef<{ stop: () => void } | null>(null);

  // Load audio settings on mount
  useEffect(() => {
    const loadAudioSettings = async () => {
      try {
        setMicPermissionError(null);
        
        // Load saved settings first
        const savedSettings = audioService.getSettings();
        setInputVolume(savedSettings.inputVolume);
        setOutputVolume(savedSettings.outputVolume);
        setAutoSensitivity(savedSettings.autoSensitivity);
        setManualSensitivity(savedSettings.manualSensitivity);
        
        // Load STT config
        const sttConfig = sttConfigStore.get();
        setSttProvider(sttConfig.provider);
        setCustomSttUrl(sttConfig.customUrl || '');
        setCustomSttKey(sttConfig.customKey || '');
        
        // Check if we already have permission (cached)
        const permStatus = audioService.getPermissionStatus();
        
        if (permStatus.granted) {
          // We have permission, enumerate devices
          setIsRequestingPermission(true);
          const { inputs, outputs } = await audioService.getDevices();
          setInputDevices(inputs);
          setOutputDevices(outputs);
          
          // Set selected devices
          if (savedSettings.selectedInputDevice && inputs.some(d => d.deviceId === savedSettings.selectedInputDevice)) {
            setSelectedInputDevice(savedSettings.selectedInputDevice);
          } else if (inputs.length > 0) {
            setSelectedInputDevice(inputs[0].deviceId);
          }
          
          if (savedSettings.selectedOutputDevice && outputs.some(d => d.deviceId === savedSettings.selectedOutputDevice)) {
            setSelectedOutputDevice(savedSettings.selectedOutputDevice);
          } else if (outputs.length > 0) {
            setSelectedOutputDevice(outputs[0].deviceId);
          }
          setIsRequestingPermission(false);
        } else {
          // No permission yet - just try to enumerate (will show generic labels)
          try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const inputs = devices.filter(d => d.kind === 'audioinput');
            const outputs = devices.filter(d => d.kind === 'audiooutput');
            
            // If we got devices with labels, permission was already granted
            if (inputs.some(d => d.label)) {
              const mappedInputs = inputs.map((d, i) => ({
                deviceId: d.deviceId,
                label: d.label || `Microphone ${i + 1}`,
                kind: 'audioinput' as const,
                isDefault: i === 0
              }));
              const mappedOutputs = outputs.map((d, i) => ({
                deviceId: d.deviceId,
                label: d.label || `Speaker ${i + 1}`,
                kind: 'audiooutput' as const,
                isDefault: i === 0
              }));
              
              setInputDevices(mappedInputs);
              setOutputDevices(mappedOutputs);
              
              // Restore saved device selection
              if (savedSettings.selectedInputDevice && mappedInputs.some(d => d.deviceId === savedSettings.selectedInputDevice)) {
                setSelectedInputDevice(savedSettings.selectedInputDevice);
              } else if (mappedInputs.length > 0) {
                setSelectedInputDevice(mappedInputs[0].deviceId);
              }
              
              if (savedSettings.selectedOutputDevice && mappedOutputs.some(d => d.deviceId === savedSettings.selectedOutputDevice)) {
                setSelectedOutputDevice(savedSettings.selectedOutputDevice);
              } else if (mappedOutputs.length > 0) {
                setSelectedOutputDevice(mappedOutputs[0].deviceId);
              }
            }
          } catch (e) {
            // Ignore enumeration errors
          }
        }
        
      } catch (error) {
        console.error('[SoundPanel] Error loading audio settings:', error);
      }
    };

    loadAudioSettings();

    const sttConfig = sttConfigStore.get();
    setSttProvider(sttConfig.provider);
    
    // Check Linux audio status
    if (linuxAudioSetup.isLinuxTauri()) {
      linuxAudioSetup.checkStatus().then(status => {
        setLinuxAudioStatus(status);
        console.log('[SoundPanel] Linux audio status:', status);
      });
    }
    
    // Listen for device changes
    const unsubscribe = audioService.onDeviceChange(() => {
      console.log('[SoundPanel] Audio devices changed, refreshing...');
      loadAudioSettings();
    });
    
    return () => unsubscribe();
  }, []);

  // Audio level monitoring
  const startAudioMonitoring = useCallback(async () => {
    try {
      setMicPermissionError(null);
      
      // Save current settings to audioService
      audioService.saveSettings({
        selectedInputDevice,
        selectedOutputDevice,
        inputVolume,
        outputVolume,
        autoSensitivity,
        manualSensitivity,
      });
      
      // Get the audio stream first and store it in streamRef
      const stream = await audioService.getInputStream();
      if (!stream) {
        setMicPermissionError('Could not access microphone');
        setIsTesting(false);
        return;
      }
      
      // Store stream for SynthesisVisualizer
      streamRef.current = stream;
      
      // Use audioService's test function
      const testHandle = await audioService.testMicrophone(
        (level, waveform) => {
          setAudioLevel(level);
          setWaveformData(waveform);
        },
        (error) => {
          console.error('[SoundPanel] Microphone test error:', error);
          setMicPermissionError(error);
          setIsTesting(false);
        }
      );
      
      if (testHandle) {
        audioTestRef.current = testHandle;
      } else {
        setIsTesting(false);
      }
    } catch (error) {
      console.error('[SoundPanel] Error starting audio monitoring:', error);
      setMicPermissionError('Failed to start microphone test. Please check your permissions.');
      setIsTesting(false);
    }
  }, [selectedInputDevice, selectedOutputDevice, inputVolume, outputVolume, autoSensitivity, manualSensitivity]);

  const stopAudioMonitoring = useCallback(() => {
    if (audioTestRef.current) {
      audioTestRef.current.stop();
      audioTestRef.current = null;
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    outputGainRef.current = null;
    setAudioLevel(0);
    setWaveformData(new Array(40).fill(0));
  }, []);

  // Save settings when they change
  useEffect(() => {
    audioService.saveSettings({
      selectedInputDevice,
      selectedOutputDevice,
      inputVolume,
      outputVolume,
      autoSensitivity,
      manualSensitivity,
    });
  }, [selectedInputDevice, selectedOutputDevice, inputVolume, outputVolume, autoSensitivity, manualSensitivity]);

  // Restart test when sensitivity changes
  useEffect(() => {
    if (isTesting) {
      console.log(`[SoundPanel] Sensitivity changed during test: Auto=${autoSensitivity}, Manual=${manualSensitivity}`);
    }
  }, [autoSensitivity, manualSensitivity, isTesting]);

  // Animation for soundwave
  useEffect(() => {
    let animationId: number;
    
    const animate = () => {
      if (isTesting) {
        animationId = requestAnimationFrame(animate);
      }
    };
    
    if (isTesting) {
      animate();
    }
    
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [isTesting]);

  // Update output volume in real-time
  useEffect(() => {
    if (outputGainRef.current && isTesting) {
      outputGainRef.current.gain.value = outputVolume / 100;
      console.log(`🔊 Output volume updated LIVE: ${outputVolume}%`);
    }
  }, [outputVolume, isTesting]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAudioMonitoring();
    };
  }, [stopAudioMonitoring]);

  const handleInputDeviceChange = (deviceId: string) => {
    setSelectedInputDevice(deviceId);
    if (isTesting) {
      stopAudioMonitoring();
      setTimeout(() => {
        startAudioMonitoring();
      }, 100);
    }
  };

  const handleOutputDeviceChange = (deviceId: string) => {
    setSelectedOutputDevice(deviceId);
    if (isTesting) {
      stopAudioMonitoring();
      setTimeout(() => {
        startAudioMonitoring();
      }, 100);
    }
  };

  const handleMicTest = () => {
    if (isTesting) {
      setIsTesting(false);
      stopAudioMonitoring();
    } else {
      setIsTesting(true);
      startAudioMonitoring();
    }
  };

  const handleRequestPermission = async () => {
    setIsRequestingPermission(true);
    setMicPermissionError(null);
    
    const result = await audioService.requestPermission();
    
    if (result.granted) {
      const { inputs, outputs } = await audioService.getDevices();
      setInputDevices(inputs);
      setOutputDevices(outputs);
      
      if (inputs.length > 0 && !selectedInputDevice) {
        setSelectedInputDevice(inputs[0].deviceId);
      }
      if (outputs.length > 0 && !selectedOutputDevice) {
        setSelectedOutputDevice(outputs[0].deviceId);
      }
    } else {
      setMicPermissionError(result.error || 'Permission denied');
    }
    
    setIsRequestingPermission(false);
  };

  const handleFixLinuxAudio = async () => {
    setIsFixingLinuxAudio(true);
    setLinuxFixResult(null);

    const status = await linuxAudioSetup.checkStatus();
    let result: { success: boolean; message: string };

    if (status.audioServer === 'none' || status.audioServer === 'unknown') {
      result = await linuxAudioSetup.startAudioServices();
    } else if (status.audioServer === 'pulseaudio' && !status.inAudioGroup) {
      result = await linuxAudioSetup.addUserToAudioGroup();
    } else {
      result = { success: true, message: 'Audio setup looks good.' };
    }

    setLinuxFixResult(result);
    const updated = await linuxAudioSetup.checkStatus();
    setLinuxAudioStatus(updated);
    setIsFixingLinuxAudio(false);
  };

  const hasPermission = audioService.getPermissionStatus().granted;
  const showEnableButton = !hasPermission && !micPermissionError && !isRequestingPermission && inputDevices.length === 0;
  const showLinuxFix = linuxAudioStatus?.isLinux && linuxAudioStatus?.needsSetup;
  
  // STT provider decision state
  const [sttProviderDecision, setSttProviderDecision] = useState<string | null>(null);
  const isWebSpeechOnly = sttProviderDecision === 'web-speech';
  
  // Update STT provider decision when provider changes
  useEffect(() => {
    sttService.getProviderDecision().then(decision => {
      setSttProviderDecision(decision);
    });
  }, [sttProvider]);

  const handleTestStt = async () => {
    setSttTestStatus('testing');
    setSttTestMessage('');

    const currentProvider = await sttService.getProviderDecision();
    if (!currentProvider) {
      // If no provider resolved (likely because of missing key in auto mode),
      // we should guide them based on their selection.
      // But based on our new logic in sttService, we should get 'openai' back even if key is missing.
      // If we still get null here, something is wrong.
      // Let's fallback to asking for configuration.
      setSttTestStatus('error');
      setSttTestMessage('No STT provider is available. Please configure an API key or check your settings.');
      return;
    }

    if (currentProvider === 'web-speech') {
      setSttTestStatus('error');
      setSttTestMessage('Web Speech API should be tested via the mic button in chat.');
      return;
    }

    let stream: MediaStream | null = null;
    try {
      stream = await audioService.getInputStream();
      if (!stream) {
        throw new Error('Microphone not available.');
      }

      const session = await sttService.startRecording(stream, currentProvider || undefined);

      await new Promise(resolve => setTimeout(resolve, 2500));
      const transcript = await session.stop();
      stream.getTracks().forEach(track => track.stop());

      if (transcript) {
        setSttTestStatus('success');
        setSttTestMessage(`Heard: "${transcript}"`);
      } else {
        setSttTestStatus('error');
        setSttTestMessage('No speech detected. Try again closer to the mic.');
      }
    } catch (error) {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      let message = error instanceof Error ? error.message : 'Failed to test STT provider.';
      
      // Improve error message for missing key
      if (message.includes('Missing OpenAI API key')) {
        message = 'Missing API Key. Please add your OpenAI key in Profile settings.';
      }
      
      setSttTestStatus('error');
      setSttTestMessage(message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-2 border-b border-glass-border">
        <BackButton onClick={onBack} />
        <Volume size={20} className="text-[#C0B7C9]" />
        <h3 className="text-lg font-black font-jakarta text-text-primary">Sound Settings</h3>
      </div>

      {/* Linux Audio Setup Banner */}
      {showLinuxFix && !linuxFixResult?.success && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700">
          <div className="flex items-start gap-3">
            <Terminal size={20} className="text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-bold font-jakarta text-amber-800 dark:text-amber-300 mb-1">
                Linux Audio Setup Required
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400 font-jakarta mb-3">
                {(linuxAudioStatus?.audioServer === 'none' || linuxAudioStatus?.audioServer === 'unknown') &&
                  'Audio services are not running. '}
                {linuxAudioStatus?.audioServer === 'pulseaudio' && !linuxAudioStatus?.inAudioGroup &&
                  'Your user is not in the audio group. '}
                Click below to fix this automatically.
              </p>
              
              {linuxAudioStatus?.audioServer !== 'none' && (
                <p className="text-xs text-amber-600 dark:text-amber-500 font-jakarta mb-3">
                  Audio server: <span className="font-bold">{linuxAudioStatus?.audioServer}</span>
                </p>
              )}
              
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={handleFixLinuxAudio}
                  disabled={isFixingLinuxAudio}
                  className="px-4 py-2 rounded-lg text-sm font-medium font-jakarta bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                >
                  {isFixingLinuxAudio ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Fixing...
                    </>
                  ) : (
                    <>
                      <Terminal size={14} />
                      Fix Audio Setup
                    </>
                  )}
                </button>
              </div>
              
              {linuxFixResult && !linuxFixResult.success && (
                <p className="text-xs text-red-600 dark:text-red-400 font-jakarta mt-2">
                  {linuxFixResult.message}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Linux Fix Success Message */}
      {linuxFixResult?.success && (
        <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700">
          <div className="flex items-start gap-3">
            <CheckCircle size={20} className="text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold font-jakarta text-green-800 dark:text-green-300 mb-1">
                Audio Permissions Fixed!
              </p>
              <p className="text-xs text-green-700 dark:text-green-400 font-jakarta">
                {linuxFixResult.message}
              </p>
            </div>
          </div>
        </div>
      )}


      {/* Enable Microphone Button */}
      {showEnableButton && !showLinuxFix && (
        <div className="p-6 rounded-xl glass-subtle text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#C0B7C9]/20 flex items-center justify-center">
            <Mic size={32} className="text-[#C0B7C9]" />
          </div>
          <h4 className="text-lg font-bold font-jakarta text-text-primary mb-2">
            Enable Microphone
          </h4>
          <p className="text-sm text-text-secondary font-jakarta mb-4">
            Click the button below to allow Skhoot to access your microphone for voice features.
          </p>
          <button
            onClick={handleRequestPermission}
            className="w-full px-4 py-2 rounded-lg text-sm font-medium font-jakarta bg-[#C0B7C9] text-white hover:bg-[#B0A7B9] transition-all flex items-center justify-center gap-2"
          >
            <Mic size={18} />
            Enable Microphone Access
          </button>
        </div>
      )}

      {/* Permission Error Banner */}
      {micPermissionError && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="text-red-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-bold font-jakarta text-red-700 dark:text-red-400 mb-1">
                Microphone Access Required
              </p>
              <p className="text-xs text-red-600 dark:text-red-300 font-jakarta whitespace-pre-line mb-3">
                {micPermissionError}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleRequestPermission}
                  disabled={isRequestingPermission}
                  className="px-4 py-2 rounded-lg text-sm font-medium font-jakarta bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isRequestingPermission ? 'Requesting...' : 'Try Again'}
                </button>
                <button
                  onClick={() => {
                    audioService.resetPermission();
                    setMicPermissionError(null);
                  }}
                  className="px-4 py-2 rounded-lg text-sm font-medium font-jakarta text-text-secondary hover:bg-white/5 transition-all"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isRequestingPermission && !micPermissionError && (
        <div className="p-4 rounded-xl glass-subtle">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-[#C0B7C9] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium font-jakarta text-text-secondary">
              Requesting microphone access...
            </p>
          </div>
        </div>
      )}

      {/* Speech-to-Text Provider */}
      <div className="space-y-3">
        <SectionLabel 
          label="Speech-to-Text Provider"
          icon={<Mic size={16} />}
          iconColor="text-blue-500"
        />
        <div className="p-3 rounded-xl glass-subtle space-y-3">
          <select
            value={sttProvider}
            onChange={(e) => {
              const next = e.target.value as SttProvider;
              setSttProvider(next);
              sttConfigStore.set({ provider: next });
              setSttTestStatus('idle');
              setSttTestMessage('');
            }}
            className="w-full p-3 rounded-lg bg-black/20 border border-white/5 hover:border-white/10 text-sm font-medium font-jakarta text-text-primary focus:outline-none focus:border-fuku-brand/50 focus:ring-1 focus:ring-fuku-brand/20 transition-all [&>option]:bg-black [&>option]:text-white"
          >
            <option value="auto" className="!bg-black !text-white">Auto (preferred)</option>
            <option value="web-speech" className="!bg-black !text-white">Web Speech API</option>
            <option value="openai" className="!bg-black !text-white">OpenAI Whisper (cloud)</option>
            <option value="custom" className="!bg-black !text-white">Custom / Groq (Free/Fast)</option>
          </select>
          
          <p className="text-xs text-text-secondary font-jakarta">
            {sttProvider === 'auto' && 'Auto uses Web Speech when available, then OpenAI cloud.'}
            {sttProvider === 'web-speech' && 'Uses browser-native speech recognition. Free, but restricted on some Linux systems.'}
            {sttProvider === 'openai' && 'Uses OpenAI Whisper API. Highly accurate but requires a paid API key.'}
            {sttProvider === 'custom' && 'Use a Whisper-compatible API like Groq (Free & Extremely Fast) or a local server.'}
          </p>

          {sttProvider === 'custom' && (
            <div className="space-y-3 pt-2 border-t border-white/5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-secondary uppercase tracking-wider ml-1">Endpoint URL</label>
                <input
                  type="text"
                  value={customSttUrl}
                  onChange={(e) => {
                    const url = e.target.value;
                    setCustomSttUrl(url);
                    sttConfigStore.set({ customUrl: url });
                  }}
                  placeholder="https://api.groq.com/openai/v1/audio/transcriptions"
                  className="w-full p-2.5 rounded-lg bg-black/20 border border-white/5 text-sm font-medium font-jakarta text-text-primary focus:outline-none focus:border-emerald-500/50"
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-wider ml-1">API Key</label>
                  <a 
                    href="https://console.groq.com/keys" 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-[10px] text-emerald-500 hover:underline font-bold"
                  >
                    Get free Groq key
                  </a>
                </div>
                <input
                  type="password"
                  value={customSttKey}
                  onChange={(e) => {
                    const key = e.target.value;
                    setCustomSttKey(key);
                    sttConfigStore.set({ customKey: key });
                  }}
                  placeholder="Enter API Key (e.g. gsk_...)"
                  className="w-full p-2.5 rounded-lg bg-black/20 border border-white/5 text-sm font-medium font-jakarta text-text-primary focus:outline-none focus:border-emerald-500/50"
                />
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={handleTestStt}
              disabled={sttTestStatus === 'testing'}
              className="px-4 py-2 rounded-lg text-sm font-medium font-jakarta bg-[#C0B7C9] text-white hover:bg-[#B0A7B9] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {sttTestStatus === 'testing' ? 'Testing…' : 'Test STT'}
            </button>
            {sttTestMessage && (
              <span
                className={`text-xs font-jakarta ${
                  sttTestStatus === 'success' ? 'text-emerald-600' : 'text-red-600'
                }`}
              >
                {sttTestMessage}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Device settings - only show if we have permission or devices */}
      {(hasPermission || inputDevices.length > 0) && (
        <>
          {/* Input Device */}
          <div className="space-y-3">
            <SectionLabel 
              label="Input Device"
              icon={<Mic size={16} />}
              iconColor="text-emerald-500"
            />
            <div className="p-3 rounded-xl glass-subtle">
              {inputDevices.length === 0 ? (
                <p className="text-sm text-text-secondary font-jakarta">
                  No microphones found. Please connect a microphone.
                </p>
              ) : (
                <select
                  value={selectedInputDevice}
                  onChange={(e) => handleInputDeviceChange(e.target.value)}
                  className="w-full p-3 rounded-lg bg-black/20 border border-white/5 hover:border-white/10 text-sm font-medium font-jakarta text-text-primary focus:outline-none focus:border-fuku-brand/50 focus:ring-1 focus:ring-fuku-brand/20 transition-all [&>option]:bg-black [&>option]:text-white"
                >
                  {inputDevices.map(device => (
                    <option key={device.deviceId} value={device.deviceId} className="!bg-black !text-white">
                      {device.label}{device.isDefault ? ' (Default)' : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Output Device */}
          <div className="space-y-3">
            <SectionLabel 
              label="Output Device"
              icon={<Volume2 size={16} />}
              iconColor="text-cyan-500"
            />
            <div className="p-3 rounded-xl glass-subtle">
              {outputDevices.length === 0 ? (
                <p className="text-sm text-text-secondary font-jakarta">
                  No output devices found.
                </p>
              ) : (
                <select
                  value={selectedOutputDevice}
                  onChange={(e) => handleOutputDeviceChange(e.target.value)}
                  className="w-full p-3 rounded-lg bg-black/20 border border-white/5 hover:border-white/10 text-sm font-medium font-jakarta text-text-primary focus:outline-none focus:border-fuku-brand/50 focus:ring-1 focus:ring-fuku-brand/20 transition-all [&>option]:bg-black [&>option]:text-white"
                >
                  {outputDevices.map(device => (
                    <option key={device.deviceId} value={device.deviceId} className="!bg-black !text-white">
                      {device.label}{device.isDefault ? ' (Default)' : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Input Volume */}
          <div className="space-y-3">
            <SectionLabel 
              label="Input Volume"
              icon={<VolumeX size={16} />}
              iconColor="text-amber-500"
            />
            <div className="p-3 rounded-xl glass-subtle space-y-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium font-jakarta text-text-primary">Microphone Level</span>
                <span className="text-sm font-bold font-jakarta text-[#C0B7C9]">{inputVolume}%</span>
              </div>
              <div className="flex items-center gap-3">
                <VolumeX size={16} className="text-text-secondary" />
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={inputVolume}
                  onChange={(e) => setInputVolume(Number(e.target.value))}
                  className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer border border-gray-300 dark:border-gray-600 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#d4e4f1] [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#d4e4f1] [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-md"
                />
                <Volume2 size={16} className="text-text-secondary" />
              </div>
            </div>
          </div>

          {/* Output Volume */}
          <div className="space-y-3">
            <SectionLabel 
              label="Output Volume"
              icon={<Volume2 size={16} />}
              iconColor="text-purple-500"
            />
            <div className="p-3 rounded-xl glass-subtle space-y-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium font-jakarta text-text-primary">Speaker Level</span>
                <span className="text-sm font-bold font-jakarta text-[#C0B7C9]">{outputVolume}%</span>
              </div>
              <div className="flex items-center gap-3">
                <VolumeX size={16} className="text-text-secondary" />
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={outputVolume}
                  onChange={(e) => setOutputVolume(Number(e.target.value))}
                  className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer border border-gray-300 dark:border-gray-600 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#d4e4f1] [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#d4e4f1] [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-md"
                />
                <Volume2 size={16} className="text-text-secondary" />
              </div>
            </div>
          </div>

          {/* Microphone Test */}
          <div className="space-y-3">
            <SectionLabel 
              label="Microphone Test"
              description="Mic acting up? Give it a hoot and say something silly... We'll echo it right back!"
            />
            <div className="p-3 rounded-xl glass-subtle space-y-3">
              <button
                onClick={handleMicTest}
                className={`w-full px-4 py-2 rounded-lg text-sm font-medium font-jakarta transition-all ${
                  isTesting 
                    ? 'bg-red-500 text-white hover:bg-red-600' 
                    : 'bg-[#C0B7C9] text-white hover:bg-[#B0A7B9]'
                }`}
              >
                {isTesting ? 'Stop Test' : 'Let\'s Hoot!'}
              </button>
              
              {/* Audio Level Visualization - SynthesisVisualizer */}
              {isTesting && (
                <div className="h-24 glass-subtle rounded-lg overflow-hidden">
                  <SynthesisVisualizer 
                    audioStream={streamRef.current}
                    lineColor="#C0B7C9"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Voice Sensitivity */}
          <div className="space-y-3">
            <SectionLabel 
              label="Voice Sensitivity"
              icon={<Mic size={16} />}
              iconColor="text-[#C0B7C9]"
            />
            <div className="p-3 rounded-xl glass-subtle space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium font-jakarta text-text-primary">Auto Detection</span>
                <button
                  onClick={() => {
                    const newValue = !autoSensitivity;
                    setAutoSensitivity(newValue);
                    console.log(`🎛️ Sensitivity mode changed to: ${newValue ? 'AUTO (3x)' : 'MANUAL'}`);
                  }}
                  className={`w-12 h-6 rounded-full transition-all ${
                    autoSensitivity ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                    autoSensitivity ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>
              
              {!autoSensitivity && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium font-jakarta text-text-primary">Manual Sensitivity</span>
                    <span className="text-sm font-bold font-jakarta text-[#C0B7C9]">{manualSensitivity}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={manualSensitivity}
                    onChange={(e) => {
                      const newValue = Number(e.target.value);
                      setManualSensitivity(newValue);
                      console.log(`🎛️ Manual sensitivity changed to: ${newValue}% (${(newValue / 25).toFixed(1)}x multiplier)`);
                    }}
                    className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer border border-gray-300 dark:border-gray-600 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#d4e4f1] [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#d4e4f1] [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-md"
                  />
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SoundPanel;
