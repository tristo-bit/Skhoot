import React, { useState, useCallback, memo, useEffect, useRef } from 'react';
import { ChevronRight, Volume2, Shield, Palette, HelpCircle, Mic, VolumeX, ClipboardList, AlertCircle, Terminal, CheckCircle } from 'lucide-react';
import { useTheme } from '../src/contexts/ThemeContext';
import { audioService, AudioDevice } from '../services/audioService';
import { linuxAudioSetup, LinuxAudioStatus } from '../services/linuxAudioSetup';
import { Modal } from './shared';
import { BackButton, Button, SubmitButton, SwitchToggle } from './buttonFormat';
import { AppearancePanel, HelpCenterPanel, PrivacyPanel } from './settings';

interface SettingsPanelProps {
  onClose: () => void;
  onOpenTraceability?: () => void;
}

// Remove local AudioDevice interface - using the one from audioService

const SETTINGS_ITEMS = [
  { icon: Volume2, label: 'Sound', color: 'almost-aqua' },
  { icon: Palette, label: 'Appearance', color: 'lemon-icing' },
  { icon: Shield, label: 'Privacy', color: 'ice-melt' },
  { icon: ClipboardList, label: 'Activity Log', color: 'orchid-tint' },
  { icon: HelpCircle, label: 'Help Center', color: 'peach-dust' },
] as const;

const SettingsPanel: React.FC<SettingsPanelProps> = ({ onClose, onOpenTraceability }) => {
  const { theme, setTheme, showBranding, setShowBranding, resolvedTheme } = useTheme();
  const [uiOpacity, setUiOpacity] = useState(() => {
    if (typeof window === 'undefined') return 0.85;
    const stored = window.localStorage.getItem('skhoot-ui-opacity');
    const parsed = stored ? parseFloat(stored) : NaN;
    if (!Number.isNaN(parsed)) return parsed;
    const cssValue = getComputedStyle(document.documentElement)
      .getPropertyValue('--glass-opacity-level')
      .trim();
    const cssParsed = cssValue ? parseFloat(cssValue) : NaN;
    return Number.isNaN(cssParsed) ? 0.85 : cssParsed;
  });
  const [activePanel, setActivePanel] = useState<string | null>(null);
  
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
  const [animationTime, setAnimationTime] = useState(0);
  const [autoSensitivity, setAutoSensitivity] = useState(true);
  const [manualSensitivity, setManualSensitivity] = useState(50);
  const [micPermissionError, setMicPermissionError] = useState<string | null>(null);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [linuxAudioStatus, setLinuxAudioStatus] = useState<LinuxAudioStatus | null>(null);
  const [isFixingLinuxAudio, setIsFixingLinuxAudio] = useState(false);
  const [linuxFixResult, setLinuxFixResult] = useState<{ success: boolean; message: string } | null>(null);
  
  // AI settings state
  const [aiEnabled, setAiEnabled] = useState(true);
  
  // Appearance settings state - now using theme context
  // const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'system'>('system');
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const outputGainRef = useRef<GainNode | null>(null);

  const toggleAi = useCallback(() => setAiEnabled(v => !v), []);

  const applyOpacity = useCallback((value: number, isDarkMode: boolean) => {
    const root = document.documentElement;
    const level = Math.min(1, Math.max(0.5, value));
    const light = Math.max(0.1, level - 0.15);
    const heavy = Math.min(1, level + 0.1);
    const base = isDarkMode ? '30, 30, 30' : '255, 255, 255';

    root.style.setProperty('--glass-opacity-level', level.toString());
    root.style.setProperty('--glass-opacity-light', light.toString());
    root.style.setProperty('--glass-opacity-medium', level.toString());
    root.style.setProperty('--glass-opacity-heavy', heavy.toString());
    root.style.setProperty('--glass-bg', `rgba(${base}, ${level})`);

    window.localStorage.setItem('skhoot-ui-opacity', level.toString());
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    applyOpacity(uiOpacity, resolvedTheme === 'dark');
  }, [uiOpacity, applyOpacity, resolvedTheme]);

  // Get available audio devices using audioService
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
              setInputDevices(inputs.map((d, i) => ({
                deviceId: d.deviceId,
                label: d.label || `Microphone ${i + 1}`,
                kind: 'audioinput' as const,
                isDefault: i === 0
              })));
              setOutputDevices(outputs.map((d, i) => ({
                deviceId: d.deviceId,
                label: d.label || `Speaker ${i + 1}`,
                kind: 'audiooutput' as const,
                isDefault: i === 0
              })));
            }
            // Otherwise, leave devices empty to show "Enable Microphone" button
          } catch (e) {
            // Ignore enumeration errors
          }
        }
        
      } catch (error) {
        console.error('[Settings] Error loading audio settings:', error);
      }
    };

    if (activePanel === 'Sound') {
      loadAudioSettings();
      
      // Check Linux audio status
      if (linuxAudioSetup.isLinuxTauri()) {
        linuxAudioSetup.checkStatus().then(status => {
          setLinuxAudioStatus(status);
          console.log('[Settings] Linux audio status:', status);
        });
      }
      
      // Listen for device changes
      const unsubscribe = audioService.onDeviceChange(() => {
        console.log('[Settings] Audio devices changed, refreshing...');
        loadAudioSettings();
      });
      
      return () => unsubscribe();
    }
  }, [activePanel]);

  // Audio level monitoring using audioService
  const audioTestRef = useRef<{ stop: () => void } | null>(null);
  
  const startAudioMonitoring = async () => {
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
          console.error('[Settings] Microphone test error:', error);
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
      console.error('[Settings] Error starting audio monitoring:', error);
      setMicPermissionError('Failed to start microphone test. Please check your permissions.');
      setIsTesting(false);
    }
  };

  const stopAudioMonitoring = () => {
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
    // Reset refs
    outputGainRef.current = null;
    setAudioLevel(0);
    setWaveformData(new Array(40).fill(0));
  };

  // Save settings when they change
  useEffect(() => {
    if (activePanel === 'Sound') {
      audioService.saveSettings({
        selectedInputDevice,
        selectedOutputDevice,
        inputVolume,
        outputVolume,
        autoSensitivity,
        manualSensitivity,
      });
    }
  }, [selectedInputDevice, selectedOutputDevice, inputVolume, outputVolume, autoSensitivity, manualSensitivity, activePanel]);

  // Restart test when sensitivity changes
  useEffect(() => {
    if (isTesting) {
      console.log(`[Settings] Sensitivity changed during test: Auto=${autoSensitivity}, Manual=${manualSensitivity}`);
    }
  }, [autoSensitivity, manualSensitivity, isTesting]);

  const handleInputDeviceChange = (deviceId: string) => {
    setSelectedInputDevice(deviceId);
    // Restart test if active to use new device
    if (isTesting) {
      stopAudioMonitoring();
      setTimeout(() => {
        startAudioMonitoring();
      }, 100);
    }
  };

  const handleOutputDeviceChange = (deviceId: string) => {
    setSelectedOutputDevice(deviceId);
    // Output device change requires reconnection
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
      // Refresh devices after permission granted
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
    
    const result = await linuxAudioSetup.addUserToAudioGroup();
    setLinuxFixResult(result);
    
    if (result.success) {
      // Refresh Linux audio status
      const status = await linuxAudioSetup.checkStatus();
      setLinuxAudioStatus(status);
    }
    
    setIsFixingLinuxAudio(false);
  };

  // Animation continue pour la soundwave
  useEffect(() => {
    let animationId: number;
    
    const animate = () => {
      if (isTesting) {
        setAnimationTime(Date.now());
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

  // Mettre à jour le volume de sortie en temps réel
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
  }, []);

  const handleSettingClick = (label: string) => {
    if (label === 'Activity Log' && onOpenTraceability) {
      onOpenTraceability();
      return;
    }
    setActivePanel(label);
  };

  const handleBack = () => {
    setActivePanel(null);
  };

  const renderSoundPanel = () => {
    const hasPermission = audioService.getPermissionStatus().granted;
    const showEnableButton = !hasPermission && !micPermissionError && !isRequestingPermission && inputDevices.length === 0;
    const showLinuxFix = linuxAudioStatus?.isLinux && linuxAudioStatus?.needsSetup;
    
    return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button 
          onClick={handleBack}
          className="w-8 h-8 flex items-center justify-center rounded-xl hover:glass-subtle transition-all text-text-secondary"
        >
          <ChevronRight size={18} className="rotate-180" />
        </button>
        <h3 className="text-lg font-black font-jakarta text-text-primary">
          Sound Settings
        </h3>
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
                {!linuxAudioStatus?.inAudioGroup && 'Your user is not in the audio group. '}
                {linuxAudioStatus?.audioServer === 'none' && 'No audio server detected. '}
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
                      Fix Audio Permissions
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

      {/* Enable Microphone Button - shown when no permission yet */}
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

      {/* Only show device settings if we have permission or devices */}
      {(hasPermission || inputDevices.length > 0) && (
        <>
        {/* Input Device */}
        <div className="space-y-3">
          <label className="text-sm font-bold font-jakarta text-text-primary">Input Device</label>
          {inputDevices.length === 0 ? (
            <p className="text-sm text-text-secondary font-jakarta">
              No microphones found. Please connect a microphone.
            </p>
          ) : (
            <select
              value={selectedInputDevice}
              onChange={(e) => handleInputDeviceChange(e.target.value)}
              className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-medium font-jakarta text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent"
            >
            {inputDevices.map(device => (
              <option key={device.deviceId} value={device.deviceId} className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
                {device.label}{device.isDefault ? ' (Default)' : ''}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Output Device */}
      <div className="space-y-3">
        <label className="text-sm font-bold font-jakarta text-text-primary">Output Device</label>
        {outputDevices.length === 0 ? (
          <p className="text-sm text-text-secondary font-jakarta">
            No output devices found.
          </p>
        ) : (
          <select
            value={selectedOutputDevice}
            onChange={(e) => handleOutputDeviceChange(e.target.value)}
            className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-medium font-jakarta text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent"
          >
            {outputDevices.map(device => (
              <option key={device.deviceId} value={device.deviceId} className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
                {device.label}{device.isDefault ? ' (Default)' : ''}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Input Volume */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-bold font-jakarta text-text-primary">Input Volume</label>
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
          <label className="text-sm font-bold font-jakarta text-text-primary">Output Volume</label>
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
        <label className="text-sm font-bold font-jakarta text-text-primary">Microphone Test</label>
        <p className="text-xs text-text-secondary font-jakarta">
          Mic acting up? Give it a hoot and say something silly... We'll echo it right back!
        </p>
        <div className="flex items-center gap-4">
          <Button
            onClick={handleMicTest}
            variant={isTesting ? "danger" : "primary"}
            size="md"
          >
            {isTesting ? 'Stop Test' : 'Let\'s Hoot!'}
          </Button>
          
          {/* Audio Level Visualization - Soundwave Simplifiée */}
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
              
              // Utiliser les données réelles avec plus d'amplification
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
        <label className="text-sm font-bold font-jakarta text-text-primary">Voice Sensitivity</label>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-text-secondary">Auto Detection</span>
          <SwitchToggle
            isToggled={autoSensitivity}
            onToggle={(toggled) => {
              setAutoSensitivity(toggled);
              console.log(`🎛️ Sensitivity mode changed to: ${toggled ? 'AUTO (3x)' : 'MANUAL'}`);
            }}
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

  return (
    <Modal
      key={resolvedTheme}
      title="Settings"
      onClose={onClose}
      panelClassName="settings-panel"
      headerClassName="settings-panel-header"
      bodyClassName="settings-panel-body"
      footerClassName="settings-panel-footer"
      closeAriaLabel="Close settings"
      footer={(
        <p className="text-[10px] font-medium font-jakarta text-center opacity-40 text-text-primary">
          Skhoot v1.0
        </p>
      )}
    >
      {activePanel === 'Sound' ? (
        renderSoundPanel()
      ) : activePanel === 'Privacy' ? (
        <PrivacyPanel onBack={handleBack} />
      ) : activePanel === 'Appearance' ? (
        <AppearancePanel 
          onBack={handleBack}
          uiOpacity={uiOpacity}
          setUiOpacity={setUiOpacity}
        />
      ) : activePanel === 'Help Center' ? (
        <HelpCenterPanel onBack={handleBack} />
      ) : (
        <>
          {SETTINGS_ITEMS.map(item => (
            <SettingsItem 
              key={item.label}
              icon={<item.icon size={18} />} 
              label={item.label} 
              color={item.color}
              onClick={() => handleSettingClick(item.label)}
            />
          ))}
        </>
      )}
    </Modal>
  );
};

const SettingsSection = memo<{ title: string; children: React.ReactNode }>(({ title, children }) => (
  <div className="space-y-3">
    <p 
      className="text-[10px] font-black uppercase tracking-[0.1em] font-jakarta opacity-40" 
      style={{ color: '#1e1e1e' }}
    >
      {title}
    </p>
    {children}
  </div>
));
SettingsSection.displayName = 'SettingsSection';

const SettingsToggle = memo<{
  icon: React.ReactNode;
  label: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
  color: string;
}>(({ icon, label, description, enabled, onToggle, color }) => (
  <div 
    className="settings-item flex items-center justify-between p-4 rounded-2xl transition-all glass-subtle"
    style={{ 
      backgroundColor: enabled ? `${color}30` : 'var(--glass-bg)',
    }}
  >
    <div className="flex items-center gap-3">
      <IconBox color={color}>{icon}</IconBox>
      <div>
        <p className="text-sm font-bold font-jakarta" style={{ color: '#1e1e1e' }}>{label}</p>
        <p className="text-[10px] font-medium font-jakarta opacity-50" style={{ color: '#1e1e1e' }}>
          {description}
        </p>
      </div>
    </div>
    <Toggle enabled={enabled} onToggle={onToggle} />
  </div>
));
SettingsToggle.displayName = 'SettingsToggle';

const Toggle = memo<{ enabled: boolean; onToggle: () => void }>(({ enabled, onToggle }) => (
  <button 
    onClick={onToggle}
    className={`settings-toggle w-12 h-7 rounded-full transition-all duration-300 relative ${
      enabled ? 'bg-accent' : 'bg-glass-border'
    }`}
    role="switch"
    aria-checked={enabled}
  >
    <div 
      className={`settings-toggle-knob absolute top-1 w-5 h-5 rounded-full glass-subtle shadow-md transition-all duration-300 ${
        enabled ? 'left-6' : 'left-1'
      }`}
    />
  </button>
));
Toggle.displayName = 'Toggle';

const SettingsItem = memo<{
  icon: React.ReactNode;
  label: string;
  color: string;
  onClick?: () => void;
}>(({ icon, label, color, onClick }) => (
  <button 
    onClick={onClick}
    className="settings-item flex items-center justify-between w-full p-4 rounded-2xl transition-all hover:brightness-[1.02] active:scale-[0.99] glass-subtle"
  >
    <div className="flex items-center gap-3">
      <IconBox color={color}>{icon}</IconBox>
      <p className="text-sm font-bold font-jakarta text-text-primary">{label}</p>
    </div>
    <ChevronRight size={18} className="text-text-secondary" />
  </button>
));
SettingsItem.displayName = 'SettingsItem';

const IconBox = memo<{ color: string; children: React.ReactNode }>(({ color, children }) => (
  <div 
    className={`settings-icon w-10 h-10 rounded-xl flex items-center justify-center bg-${color}/60`}
    style={{ 
      boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.4), inset 0 -1px 1px rgba(0,0,0,0.05)'
    }}
  >
    <span className="text-text-primary">{children}</span>
  </div>
));
IconBox.displayName = 'IconBox';

export default SettingsPanel;
