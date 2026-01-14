import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, VolumeX, Volume2, AlertCircle, Terminal, CheckCircle, Download, Trash2, Play, Square, HardDrive } from 'lucide-react';
import { audioService, AudioDevice } from '../../services/audioService';
import { linuxAudioSetup, LinuxAudioStatus } from '../../services/linuxAudioSetup';
import { sttConfigStore, SttProvider } from '../../services/sttConfig';
import { sttService } from '../../services/sttService';
import { whisperInstaller, WhisperStatus, AvailableModel, InstallProgress } from '../../services/whisperInstaller';
import { PanelHeader, SectionLabel } from './shared';
import { Button, ToggleButton } from '../buttonFormat';

interface SoundPanelProps {
  onBack: () => void;
}

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
  const [localSttUrl, setLocalSttUrl] = useState('');
  const [sttTestStatus, setSttTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [sttTestMessage, setSttTestMessage] = useState('');
  
  // Whisper local STT state
  const [whisperStatus, setWhisperStatus] = useState<WhisperStatus | null>(null);
  const [availableModels, setAvailableModels] = useState<AvailableModel[]>([]);
  const [selectedModel, setSelectedModel] = useState('ggml-base.en.bin');
  const [whisperPort, setWhisperPort] = useState(8000);
  const [whisperAutoStart, setWhisperAutoStart] = useState(true);
  const [isInstallingWhisper, setIsInstallingWhisper] = useState(false);
  const [isDownloadingModel, setIsDownloadingModel] = useState(false);
  const [whisperProgress, setWhisperProgress] = useState<InstallProgress | null>(null);
  const [whisperError, setWhisperError] = useState<string | null>(null);

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
    setLocalSttUrl(sttConfig.localUrl);
    
    // Load whisper status
    const loadWhisperStatus = async () => {
      try {
        const status = await whisperInstaller.getStatus();
        setWhisperStatus(status);
        
        const models = await whisperInstaller.getAvailableModels();
        setAvailableModels(models);
        
        // Set selected model to first downloaded one, or default
        const downloadedModel = status.models.find(m => m.is_downloaded);
        if (downloadedModel) {
          setSelectedModel(downloadedModel.name);
        }
      } catch (error) {
        console.log('[SoundPanel] Whisper not available (likely browser mode)');
      }
    };
    loadWhisperStatus();
    
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
      setSttTestStatus('error');
      setSttTestMessage('No STT provider is available. Configure one above.');
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
      const message = error instanceof Error ? error.message : 'Failed to test STT provider.';
      setSttTestStatus('error');
      setSttTestMessage(message);
    }
  };

  // Whisper installation handlers
  const handleInstallWhisper = async () => {
    setIsInstallingWhisper(true);
    setWhisperError(null);
    setWhisperProgress(null);

    try {
      await whisperInstaller.installBinary((progress) => {
        setWhisperProgress(progress);
      });

      // Refresh status
      const status = await whisperInstaller.getStatus();
      setWhisperStatus(status);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to install Whisper';
      setWhisperError(message);
    } finally {
      setIsInstallingWhisper(false);
      setWhisperProgress(null);
    }
  };

  const handleDownloadModel = async (modelName: string) => {
    setIsDownloadingModel(true);
    setWhisperError(null);
    setWhisperProgress(null);

    try {
      await whisperInstaller.downloadModel(modelName, (progress) => {
        setWhisperProgress(progress);
      });

      // Refresh status
      const status = await whisperInstaller.getStatus();
      setWhisperStatus(status);
      setSelectedModel(modelName);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to download model';
      setWhisperError(message);
    } finally {
      setIsDownloadingModel(false);
      setWhisperProgress(null);
    }
  };

  const handleStartWhisperServer = async () => {
    setWhisperError(null);
    try {
      await whisperInstaller.startServer(selectedModel, whisperPort);
      const status = await whisperInstaller.getStatus();
      setWhisperStatus(status);
      
      // Update local STT URL and switch provider to local
      const url = whisperInstaller.getLocalSttUrl(whisperPort);
      setLocalSttUrl(url);
      sttConfigStore.set({ localUrl: url, provider: 'local' });
      setSttProvider('local');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start server';
      setWhisperError(message);
    }
  };

  const handleStopWhisperServer = async () => {
    setWhisperError(null);
    try {
      await whisperInstaller.stopServer();
      const status = await whisperInstaller.getStatus();
      setWhisperStatus(status);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to stop server';
      setWhisperError(message);
    }
  };

  const handleUninstallWhisper = async () => {
    if (!confirm('Are you sure you want to uninstall Whisper? This will remove the binary and all downloaded models.')) {
      return;
    }
    
    setWhisperError(null);
    try {
      await whisperInstaller.uninstall(true);
      const status = await whisperInstaller.getStatus();
      setWhisperStatus(status);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to uninstall';
      setWhisperError(message);
    }
  };

  const handleDeleteModel = async (modelName: string) => {
    setWhisperError(null);
    try {
      await whisperInstaller.deleteModel(modelName);
      const status = await whisperInstaller.getStatus();
      setWhisperStatus(status);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete model';
      setWhisperError(message);
    }
  };

  // Check if we're in Tauri environment
  const isTauriEnv = whisperStatus !== null;

  return (
    <div className="space-y-6">
      <PanelHeader title="Sound Settings" onBack={onBack} />

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
                <Button
                  onClick={handleFixLinuxAudio}
                  variant="primary"
                  size="sm"
                  disabled={isFixingLinuxAudio}
                >
                  {isFixingLinuxAudio ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Fixing...
                    </>
                  ) : (
                    <>
                      <Terminal size={14} className="mr-2" />
                      Fix Audio Setup
                    </>
                  )}
                </Button>
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
        <div className="p-6 rounded-xl glass-subtle border border-accent/30 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent/20 flex items-center justify-center">
            <Mic size={32} className="text-accent" />
          </div>
          <h4 className="text-lg font-bold font-jakarta text-text-primary mb-2">
            Enable Microphone
          </h4>
          <p className="text-sm text-text-secondary font-jakarta mb-4">
            Click the button below to allow Skhoot to access your microphone for voice features.
          </p>
          <Button
            onClick={handleRequestPermission}
            variant="primary"
            size="lg"
            className="w-full"
          >
            <Mic size={18} className="mr-2" />
            Enable Microphone Access
          </Button>
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
                <Button
                  onClick={handleRequestPermission}
                  variant="danger"
                  size="sm"
                  disabled={isRequestingPermission}
                >
                  {isRequestingPermission ? 'Requesting...' : 'Try Again'}
                </Button>
                <Button
                  onClick={() => {
                    audioService.resetPermission();
                    setMicPermissionError(null);
                  }}
                  variant="ghost"
                  size="sm"
                >
                  Dismiss
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isRequestingPermission && !micPermissionError && (
        <div className="p-4 rounded-xl glass-subtle">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium font-jakarta text-text-secondary">
              Requesting microphone access...
            </p>
          </div>
        </div>
      )}

      {/* Speech-to-Text Provider */}
      <div className="space-y-3">
        <SectionLabel label="Speech-to-Text Provider" />
        <select
          value={sttProvider}
          onChange={(e) => {
            const next = e.target.value as SttProvider;
            setSttProvider(next);
            sttConfigStore.set({ provider: next });
            setSttTestStatus('idle');
            setSttTestMessage('');
          }}
          className="select-themed w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e1e1e] text-sm font-medium font-jakarta text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent"
        >
          <option value="auto">Auto (preferred)</option>
          <option value="web-speech">Web Speech API</option>
          <option value="openai">OpenAI Whisper (cloud)</option>
          <option value="local">Local STT Server {whisperStatus?.server_running ? '✓ Running' : ''}</option>
        </select>
        {sttProvider === 'local' && whisperStatus?.server_running && (
          <p className="text-xs text-green-600 dark:text-green-400 font-jakarta flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
            Local Whisper server is running on port {whisperStatus.server_port}
          </p>
        )}
        {sttProvider === 'local' && !whisperStatus?.server_running && whisperStatus?.installed && (
          <p className="text-xs text-amber-600 dark:text-amber-400 font-jakarta">
            Whisper is installed but server is not running. Start it in the section below.
          </p>
        )}
        {sttProvider === 'local' && !whisperStatus?.installed && isTauriEnv && (
          <p className="text-xs text-amber-600 dark:text-amber-400 font-jakarta">
            Whisper is not installed. Install it in the section below.
          </p>
        )}
        <p className="text-xs text-text-secondary font-jakarta">
          Choose how speech is transcribed. Auto uses Web Speech when available, otherwise local first, then cloud.
        </p>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleTestStt}
            variant="secondary"
            size="sm"
            disabled={sttTestStatus === 'testing'}
          >
            {sttTestStatus === 'testing' ? 'Testing…' : 'Test STT'}
          </Button>
          {sttTestMessage && (
            <span
              className={`text-xs font-jakarta ${
                sttTestStatus === 'success' ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {sttTestMessage}
            </span>
          )}
        </div>
      </div>

      {/* Local STT Server URL */}
      {sttProvider === 'local' && (
        <div className="space-y-3">
          <SectionLabel label="Local STT Server URL" />
          <input
            type="text"
            value={localSttUrl}
            onChange={(e) => {
              const value = e.target.value;
              setLocalSttUrl(value);
              sttConfigStore.set({ localUrl: value });
              setSttTestStatus('idle');
              setSttTestMessage('');
            }}
            className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e1e1e] text-sm font-medium font-jakarta text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent"
            placeholder="http://127.0.0.1:8000/v1/audio/transcriptions"
          />
          <p className="text-xs text-text-secondary font-jakarta">
            URL for your local STT server. Use the section below to install and manage Whisper locally.
          </p>
        </div>
      )}

      {/* Local Whisper STT Section */}
      {isTauriEnv && (
        <div className="space-y-4 p-4 rounded-xl glass-subtle border border-glass-border">
          <div className="flex items-center gap-2">
            <HardDrive size={18} className="text-accent" />
            <SectionLabel label="Local Whisper STT" />
          </div>
          
          {/* Hint to select Local STT provider */}
          {sttProvider !== 'local' && whisperStatus?.server_running && (
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <p className="text-xs text-blue-700 dark:text-blue-400 font-jakarta">
                💡 Whisper server is running! Select <strong>"Local STT Server"</strong> above to use it.
              </p>
            </div>
          )}
          
          {/* Status indicator */}
          <div className="flex items-center gap-2 text-sm">
            <div className={`w-2 h-2 rounded-full ${
              whisperStatus?.server_running ? 'bg-green-500' : 
              whisperStatus?.installed ? 'bg-yellow-500' : 'bg-gray-400'
            }`} />
            <span className="text-text-secondary font-jakarta">
              {whisperStatus?.server_running ? `Running on port ${whisperStatus.server_port}` :
               whisperStatus?.installed ? 'Installed (server stopped)' : 'Not installed'}
            </span>
            {whisperStatus?.platform && (
              <span className="text-xs text-text-secondary/60 ml-auto">
                {whisperStatus.platform}/{whisperStatus.arch}
              </span>
            )}
          </div>

          {/* Error message */}
          {whisperError && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-xs text-red-600 dark:text-red-400 font-jakarta">{whisperError}</p>
            </div>
          )}

          {/* Progress indicator */}
          {whisperProgress && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-text-secondary">
                <span>{whisperProgress.message}</span>
                <span>{whisperProgress.progress.toFixed(0)}%</span>
              </div>
              <div className="h-2 bg-glass-border rounded-full overflow-hidden">
                <div 
                  className="h-full bg-accent transition-all duration-300"
                  style={{ width: `${whisperProgress.progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Install/Uninstall buttons */}
          {!whisperStatus?.installed ? (
            <>
              {/* Build requirements warning */}
              {whisperStatus && !whisperStatus.build_available && whisperStatus.build_requirements.length > 0 && (
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <p className="text-xs font-bold text-amber-700 dark:text-amber-400 mb-1">Build tools required</p>
                  <p className="text-xs text-amber-600 dark:text-amber-500">
                    Missing: {whisperStatus.build_requirements.join(', ')}
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                    {whisperStatus.platform === 'linux' && 'Install with: sudo apt install cmake g++ git'}
                    {whisperStatus.platform === 'macos' && 'Install Xcode Command Line Tools: xcode-select --install'}
                  </p>
                </div>
              )}
              <Button
                onClick={handleInstallWhisper}
                variant="primary"
                size="md"
                disabled={isInstallingWhisper || (whisperStatus && !whisperStatus.build_available)}
                className="w-full"
              >
                {isInstallingWhisper ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Building from source...
                  </>
                ) : (
                  <>
                    <Download size={16} className="mr-2" />
                    Install Whisper (Build from Source)
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              {/* Model selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold font-jakarta text-text-primary">Model</label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  disabled={whisperStatus.server_running}
                  className="select-themed w-full p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e1e1e] text-sm font-jakarta text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
                >
                  {availableModels.map(model => {
                    const isDownloaded = whisperStatus.models.find(m => m.name === model.name)?.is_downloaded;
                    return (
                      <option key={model.name} value={model.name}>
                        {model.display_name} ({model.size_mb}MB) {isDownloaded ? '✓' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Download model button if not downloaded */}
              {!whisperStatus.models.find(m => m.name === selectedModel)?.is_downloaded && (
                <Button
                  onClick={() => handleDownloadModel(selectedModel)}
                  variant="secondary"
                  size="sm"
                  disabled={isDownloadingModel}
                  className="w-full"
                >
                  {isDownloadingModel ? (
                    <>
                      <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin mr-2" />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <Download size={14} className="mr-2" />
                      Download {availableModels.find(m => m.name === selectedModel)?.display_name}
                    </>
                  )}
                </Button>
              )}

              {/* Port setting */}
              <div className="space-y-2">
                <label className="text-xs font-bold font-jakarta text-text-primary">Server Port</label>
                <input
                  type="number"
                  value={whisperPort}
                  onChange={(e) => setWhisperPort(Number(e.target.value))}
                  disabled={whisperStatus.server_running}
                  className="w-full p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-jakarta text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
                  min={1024}
                  max={65535}
                />
              </div>

              {/* Start/Stop server buttons */}
              <div className="flex gap-2">
                {!whisperStatus.server_running ? (
                  <Button
                    onClick={handleStartWhisperServer}
                    variant="primary"
                    size="sm"
                    disabled={!whisperStatus.models.find(m => m.name === selectedModel)?.is_downloaded}
                    className="flex-1"
                  >
                    <Play size={14} className="mr-2" />
                    Start Server
                  </Button>
                ) : (
                  <Button
                    onClick={handleStopWhisperServer}
                    variant="danger"
                    size="sm"
                    className="flex-1"
                  >
                    <Square size={14} className="mr-2" />
                    Stop Server
                  </Button>
                )}
                
                <Button
                  onClick={handleUninstallWhisper}
                  variant="ghost"
                  size="sm"
                  disabled={whisperStatus.server_running}
                >
                  <Trash2 size={14} />
                </Button>
              </div>

              {/* Downloaded models list */}
              {whisperStatus.models.filter(m => m.is_downloaded).length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-bold font-jakarta text-text-primary">Downloaded Models</label>
                  <div className="space-y-1">
                    {whisperStatus.models.filter(m => m.is_downloaded).map(model => (
                      <div key={model.name} className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                        <span className="text-xs text-text-secondary font-jakarta">
                          {availableModels.find(m => m.name === model.name)?.display_name || model.name}
                        </span>
                        <button
                          onClick={() => handleDeleteModel(model.name)}
                          disabled={whisperStatus.server_running && selectedModel === model.name}
                          className="p-1 rounded hover:bg-red-500/10 text-text-secondary hover:text-red-500 transition-colors disabled:opacity-50"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
          
          <p className="text-xs text-text-secondary font-jakarta">
            Install Whisper locally for offline speech-to-text. Once installed and running, select "Local STT Server" in the provider dropdown above to use it.
          </p>
        </div>
      )}

      {/* Device settings - only show if we have permission or devices */}
      {(hasPermission || inputDevices.length > 0) && (
        <>
          {/* Input Device */}
          <div className="space-y-3">
            <SectionLabel label="Input Device" />
            {inputDevices.length === 0 ? (
              <p className="text-sm text-text-secondary font-jakarta">
                No microphones found. Please connect a microphone.
              </p>
            ) : (
              <select
                value={selectedInputDevice}
                onChange={(e) => handleInputDeviceChange(e.target.value)}
                className="select-themed w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e1e1e] text-sm font-medium font-jakarta text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent"
              >
                {inputDevices.map(device => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label}{device.isDefault ? ' (Default)' : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Output Device */}
          <div className="space-y-3">
            <SectionLabel label="Output Device" />
            {outputDevices.length === 0 ? (
              <p className="text-sm text-text-secondary font-jakarta">
                No output devices found.
              </p>
            ) : (
              <select
                value={selectedOutputDevice}
                onChange={(e) => handleOutputDeviceChange(e.target.value)}
                className="select-themed w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e1e1e] text-sm font-medium font-jakarta text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent"
              >
                {outputDevices.map(device => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label}{device.isDefault ? ' (Default)' : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Input Volume */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <SectionLabel label="Input Volume" />
              <span className="text-sm font-medium text-text-secondary">{inputVolume}%</span>
            </div>
            <div className="flex items-center gap-3">
              <VolumeX size={16} className="text-text-secondary" />
              <input
                type="range"
                min="0"
                max="100"
                value={inputVolume}
                onChange={(e) => setInputVolume(Number(e.target.value))}
                className="flex-1 h-2 bg-glass-border rounded-lg appearance-none cursor-pointer slider-accent"
              />
              <Volume2 size={16} className="text-text-secondary" />
            </div>
          </div>

          {/* Output Volume */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <SectionLabel label="Output Volume" />
              <span className="text-sm font-medium text-text-secondary">{outputVolume}%</span>
            </div>
            <div className="flex items-center gap-3">
              <VolumeX size={16} className="text-text-secondary" />
              <input
                type="range"
                min="0"
                max="100"
                value={outputVolume}
                onChange={(e) => setOutputVolume(Number(e.target.value))}
                className="flex-1 h-2 bg-glass-border rounded-lg appearance-none cursor-pointer slider-accent"
              />
              <Volume2 size={16} className="text-text-secondary" />
            </div>
          </div>

          {/* Microphone Test */}
          <div className="space-y-3">
            <SectionLabel 
              label="Microphone Test" 
              description="Mic acting up? Give it a hoot and say something silly... We'll echo it right back!"
            />
            <div className="flex items-center gap-4">
              <Button
                onClick={handleMicTest}
                variant={isTesting ? "danger" : "primary"}
                size="md"
              >
                {isTesting ? 'Stop Test' : 'Let\'s Hoot!'}
              </Button>
              
              {/* Audio Level Visualization - Soundwave */}
              <div className="flex-1 flex items-center justify-center gap-0.5 h-8 glass-subtle rounded-lg p-1">
                {waveformData.map((sample, i) => {
                  if (!isTesting) {
                    return (
                      <div
                        key={i}
                        className="w-1 rounded-full bg-glass-border"
                        style={{ height: '4px' }}
                      />
                    );
                  }
                  
                  const amplitude = Math.abs(sample);
                  const baseHeight = 8;
                  const maxHeight = 28;
                  const height = baseHeight + (amplitude * maxHeight);
                  
                  return (
                    <div
                      key={i}
                      className="w-1 rounded-full transition-all duration-100"
                      style={{
                        height: `${Math.max(baseHeight, Math.min(height, maxHeight + baseHeight))}px`,
                        backgroundColor: amplitude > 0.1 
                          ? `hsl(${280 - amplitude * 100}, 70%, 50%)` 
                          : 'var(--accent)'
                      }}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* Voice Sensitivity */}
          <div className="space-y-3">
            <SectionLabel label="Voice Sensitivity" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-text-secondary">Auto Detection</span>
              <ToggleButton
                isToggled={autoSensitivity}
                onToggle={(toggled) => {
                  setAutoSensitivity(toggled);
                  console.log(`🎛️ Sensitivity mode changed to: ${toggled ? 'AUTO (3x)' : 'MANUAL'}`);
                }}
                toggledText="Auto"
                untoggledText="Manual"
              />
            </div>
            
            {!autoSensitivity && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-text-secondary">Manual Sensitivity</span>
                  <span className="text-sm font-medium text-text-secondary">{manualSensitivity}%</span>
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
                  className="w-full h-2 bg-glass-border rounded-lg appearance-none cursor-pointer slider-accent"
                />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default SoundPanel;
