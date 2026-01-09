import React, { useState, useCallback, memo, useEffect, useRef } from 'react';
import { COLORS, GLASS_STYLES } from '../constants';
import { X, Bot, ChevronRight, Volume2, Bell, Shield, Palette, HelpCircle, Mic, VolumeX, ClipboardList } from 'lucide-react';

interface SettingsPanelProps {
  onClose: () => void;
  onOpenTraceability?: () => void;
}

interface AudioDevice {
  deviceId: string;
  label: string;
  kind: string;
}

const SETTINGS_ITEMS = [
  { icon: Volume2, label: 'Sound', color: COLORS.almostAqua },
  // { icon: Bell, label: 'Notifications', color: COLORS.raindropsOnRoses },
  { icon: Palette, label: 'Appearance', color: COLORS.lemonIcing },
  { icon: Shield, label: 'Privacy', color: COLORS.iceMelt },
  { icon: ClipboardList, label: 'Activity Log', color: COLORS.orchidTint },
  { icon: HelpCircle, label: 'Help Center', color: COLORS.peachDust },
] as const;

const SettingsPanel: React.FC<SettingsPanelProps> = ({ onClose, onOpenTraceability }) => {
  const [aiEnabled, setAiEnabled] = useState(true);
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
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const outputGainRef = useRef<GainNode | null>(null);

  const toggleAi = useCallback(() => setAiEnabled(v => !v), []);

  // Get available audio devices
  useEffect(() => {
    const getDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const inputs = devices.filter(device => device.kind === 'audioinput');
        const outputs = devices.filter(device => device.kind === 'audiooutput');
        
        setInputDevices(inputs.map(d => ({ deviceId: d.deviceId, label: d.label || 'Microphone', kind: d.kind })));
        setOutputDevices(outputs.map(d => ({ deviceId: d.deviceId, label: d.label || 'Speaker', kind: d.kind })));
        
        // Set default devices
        if (inputs.length > 0) setSelectedInputDevice(inputs[0].deviceId);
        if (outputs.length > 0) setSelectedOutputDevice(outputs[0].deviceId);
      } catch (error) {
        console.error('Error getting devices:', error);
      }
    };

    if (activePanel === 'Sound') {
      getDevices();
    }
  }, [activePanel]);

  // Audio level monitoring avec retour audio
  const startAudioMonitoring = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: selectedInputDevice ? { exact: selectedInputDevice } : undefined,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });
      
      streamRef.current = stream;
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      
      // Le volume d'entrée sera appliqué dans le traitement des données
      source.connect(analyserRef.current);
      
      // Ajouter le retour audio dans le casque avec volume de sortie
      const outputGainNode = audioContextRef.current.createGain();
      outputGainNode.gain.value = outputVolume / 100;
      outputGainRef.current = outputGainNode;
      source.connect(outputGainNode);
      outputGainNode.connect(audioContextRef.current.destination);
      
      // Configuration pour une meilleure détection
      analyserRef.current.fftSize = 256;
      analyserRef.current.smoothingTimeConstant = 0.3; // Moins de lissage pour plus de réactivité
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const updateLevel = () => {
        if (analyserRef.current && isTesting) {
          // Utiliser getByteFrequencyData pour une meilleure réactivité
          analyserRef.current.getByteFrequencyData(dataArray);
          
          // Calculer le niveau audio brut
          let sum = 0;
          let peak = 0;
          for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
            peak = Math.max(peak, dataArray[i]);
          }
          const average = sum / bufferLength;
          const rawLevel = (average / 255) * 100;
          
          // RÉCUPÉRER LES VALEURS ACTUELLES DIRECTEMENT DES STATES (pas des refs)
          const currentInputVolume = inputVolume;
          const currentAutoSensitivity = autoSensitivity;
          const currentManualSensitivity = manualSensitivity;
          
          // 1. Appliquer le volume d'entrée
          let processedLevel = rawLevel * (currentInputVolume / 100);
          
          // 2. Calculer et appliquer la sensibilité
          const sensitivityMultiplier = currentAutoSensitivity ? 3.0 : Math.max(0.1, currentManualSensitivity / 25);
          processedLevel = processedLevel * sensitivityMultiplier;
          
          // 3. Noise Gate simple
          const noiseGate = 3;
          if (processedLevel < noiseGate) {
            processedLevel = 0;
          }
          
          // 4. Limiter à 100%
          processedLevel = Math.min(100, processedLevel);
          
          setAudioLevel(processedLevel);
          
          // 5. Waveform avec même traitement
          const waveformSamples = [];
          for (let i = 0; i < 40; i++) {
            const freqIndex = Math.floor((i / 40) * bufferLength);
            let amplitude = (dataArray[freqIndex] / 255) - 0.5;
            
            // Appliquer le même traitement
            let processedAmplitude = Math.abs(amplitude) * (currentInputVolume / 100) * sensitivityMultiplier;
            
            // Noise gate
            if (processedAmplitude * 100 < noiseGate) {
              processedAmplitude = 0;
            }
            
            // Garder le signe original
            waveformSamples.push(amplitude >= 0 ? processedAmplitude : -processedAmplitude);
          }
          setWaveformData(waveformSamples);
          
          // 6. Logs fréquents pour debug
          if (Math.random() < 0.05) { // 5% de chance = logs fréquents
            console.log(`🎛️ SENSITIVITY TEST: Raw=${rawLevel.toFixed(1)}% → Input=${currentInputVolume}% → Sens=${sensitivityMultiplier.toFixed(1)}x (${currentAutoSensitivity ? 'AUTO' : 'MANUAL ' + currentManualSensitivity + '%'}) → Final=${processedLevel.toFixed(1)}%`);
          }
          
          animationRef.current = requestAnimationFrame(updateLevel);
        }
      };
      
      updateLevel();
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  };

  const stopAudioMonitoring = () => {
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
    setWaveformData(new Array(40).fill(0)); // Reset waveform
  };

  // Redémarrer le test audio quand la sensibilité change pour forcer la mise à jour
  useEffect(() => {
    if (isTesting) {
      console.log(`🔄 Sensitivity changed during test: Auto=${autoSensitivity}, Manual=${manualSensitivity}`);
      // Les valeurs sont maintenant lues directement dans updateLevel, pas besoin de redémarrer
    }
  }, [autoSensitivity, manualSensitivity, isTesting]);

  const handleInputDeviceChange = (deviceId: string) => {
    setSelectedInputDevice(deviceId);
    // Redémarrer le test si actif pour utiliser le nouveau périphérique
    if (isTesting) {
      stopAudioMonitoring();
      setTimeout(() => {
        startAudioMonitoring();
      }, 100);
    }
  };

  const handleOutputDeviceChange = (deviceId: string) => {
    setSelectedOutputDevice(deviceId);
    // Le changement de périphérique de sortie nécessite une reconnexion
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

  const renderSoundPanel = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button 
          onClick={handleBack}
          className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-black/5 transition-all text-gray-500"
        >
          <ChevronRight size={18} className="rotate-180" />
        </button>
        <h3 className="text-lg font-black font-jakarta" style={{ color: '#1e1e1e' }}>
          Sound Settings
        </h3>
      </div>

      {/* Input Device */}
      <div className="space-y-3">
        <label className="text-sm font-bold font-jakarta text-gray-700">Input Device</label>
        <select
          value={selectedInputDevice}
          onChange={(e) => handleInputDeviceChange(e.target.value)}
          className="w-full p-3 rounded-xl border border-gray-200 bg-white text-sm font-medium font-jakarta focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {inputDevices.map(device => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label}
            </option>
          ))}
        </select>
      </div>

      {/* Output Device */}
      <div className="space-y-3">
        <label className="text-sm font-bold font-jakarta text-gray-700">Output Device</label>
        <select
          value={selectedOutputDevice}
          onChange={(e) => handleOutputDeviceChange(e.target.value)}
          className="w-full p-3 rounded-xl border border-gray-200 bg-white text-sm font-medium font-jakarta focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {outputDevices.map(device => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label}
            </option>
          ))}
        </select>
      </div>

      {/* Input Volume */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-bold font-jakarta text-gray-700">Input Volume</label>
          <span className="text-sm font-medium text-gray-500">{inputVolume}%</span>
        </div>
        <div className="flex items-center gap-3">
          <VolumeX size={16} className="text-gray-400" />
          <input
            type="range"
            min="0"
            max="100"
            value={inputVolume}
            onChange={(e) => setInputVolume(Number(e.target.value))}
            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-purple"
            style={{
              background: `linear-gradient(to right, ${COLORS.fukuBrand} 0%, ${COLORS.fukuBrand} ${inputVolume}%, #e5e7eb ${inputVolume}%, #e5e7eb 100%)`
            }}
          />
          <Volume2 size={16} className="text-gray-400" />
        </div>
      </div>

      {/* Output Volume */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-bold font-jakarta text-gray-700">Output Volume</label>
          <span className="text-sm font-medium text-gray-500">{outputVolume}%</span>
        </div>
        <div className="flex items-center gap-3">
          <VolumeX size={16} className="text-gray-400" />
          <input
            type="range"
            min="0"
            max="100"
            value={outputVolume}
            onChange={(e) => setOutputVolume(Number(e.target.value))}
            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-purple"
            style={{
              background: `linear-gradient(to right, ${COLORS.fukuBrand} 0%, ${COLORS.fukuBrand} ${outputVolume}%, #e5e7eb ${outputVolume}%, #e5e7eb 100%)`
            }}
          />
          <Volume2 size={16} className="text-gray-400" />
        </div>
      </div>

      {/* Microphone Test */}
      <div className="space-y-3">
        <label className="text-sm font-bold font-jakarta text-gray-700">Microphone Test</label>
        <p className="text-xs text-gray-500 font-jakarta">
          Mic acting up? Give it a hoot and say something silly... We'll echo it right back!
        </p>
        <div className="flex items-center gap-4">
          <button
            onClick={handleMicTest}
            className={`px-4 py-2 rounded-xl font-bold text-sm font-jakarta transition-all text-white`}
            style={{ backgroundColor: isTesting ? '#ef4444' : COLORS.fukuBrand }}
          >
            {isTesting ? 'Stop Test' : 'Let\'s Hoot!'}
          </button>
          
          {/* Audio Level Visualization - Soundwave Simplifiée */}
          <div className="flex-1 flex items-center justify-center gap-0.5 h-8 bg-gray-100 rounded-lg p-1">
            {waveformData.map((sample, i) => {
              if (!isTesting) {
                return (
                  <div
                    key={i}
                    className="w-1 rounded-full bg-gray-300"
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
                      : '#a855f7'
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Voice Sensitivity */}
      <div className="space-y-3">
        <label className="text-sm font-bold font-jakarta text-gray-700">Voice Sensitivity</label>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-600">Auto Detection</span>
          <button
            onClick={() => {
              setAutoSensitivity(!autoSensitivity);
              console.log(`🎛️ Sensitivity mode changed to: ${!autoSensitivity ? 'AUTO (3x)' : 'MANUAL'}`);
            }}
            className={`w-12 h-6 rounded-full transition-all ${
              autoSensitivity ? '' : 'bg-gray-300'
            }`}
            style={{ backgroundColor: autoSensitivity ? COLORS.fukuBrand : undefined }}
          >
            <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
              autoSensitivity ? 'translate-x-6' : 'translate-x-0.5'
            }`} />
          </button>
        </div>
        
        {!autoSensitivity && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Manual Sensitivity</span>
              <span className="text-sm font-medium text-gray-500">{manualSensitivity}%</span>
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
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-purple"
              style={{
                background: `linear-gradient(to right, ${COLORS.fukuBrand} 0%, ${COLORS.fukuBrand} ${manualSensitivity}%, #e5e7eb ${manualSensitivity}%, #e5e7eb 100%)`
              }}
            />
          </div>
        )}
      </div>
      
      {/* CSS pour les sliders violets */}
      <style jsx>{`
        .slider-purple::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: ${COLORS.fukuBrand};
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        
        .slider-purple::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: ${COLORS.fukuBrand};
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
      `}</style>
    </div>
  );

  return (
    <div 
      className="absolute inset-0 z-30 flex items-center justify-center bg-black/20 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-[90%] max-w-[400px] max-h-[80%] rounded-3xl overflow-hidden shadow-2xl border border-black/5 animate-in zoom-in-95 duration-300"
        style={{ 
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(20px)'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 flex items-center justify-between border-b border-black/5">
          <h2 className="text-lg font-black font-jakarta" style={{ color: '#1e1e1e' }}>
            Settings
          </h2>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-black/5 transition-all text-gray-500 active:scale-90"
            aria-label="Close settings"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto max-h-[500px] no-scrollbar">
          {activePanel === 'Sound' ? (
            renderSoundPanel()
          ) : (
            <>
              {/* AI Section */}
              <SettingsSection title="AI Assistant">
                <SettingsToggle 
                  icon={<Bot size={18} />}
                  label="AI Assistance"
                  description="Enable smart file suggestions"
                  enabled={aiEnabled}
                  onToggle={toggleAi}
                  color={COLORS.orchidTint}
                />
              </SettingsSection>

              {/* General Section */}
              <SettingsSection title="General">
                {SETTINGS_ITEMS.map(item => (
                  <SettingsItem 
                    key={item.label}
                    icon={<item.icon size={18} />} 
                    label={item.label} 
                    color={item.color}
                    onClick={() => handleSettingClick(item.label)}
                  />
                ))}
              </SettingsSection>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-black/5">
          <p 
            className="text-[10px] font-medium font-jakarta text-center opacity-40" 
            style={{ color: '#1e1e1e' }}
          >
            Skhoot v1.0
          </p>
        </div>
      </div>
    </div>
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
    className="flex items-center justify-between p-4 rounded-2xl border border-black/5 transition-all"
    style={{ 
      backgroundColor: enabled ? `${color}30` : 'rgba(255, 255, 255, 0.5)',
      boxShadow: GLASS_STYLES.subtle.boxShadow,
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
    className={`w-12 h-7 rounded-full transition-all duration-300 relative ${
      enabled ? '' : 'bg-black/10'
    }`}
    style={{ backgroundColor: enabled ? COLORS.fukuBrand : undefined }}
    role="switch"
    aria-checked={enabled}
  >
    <div 
      className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300 ${
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
    className="flex items-center justify-between w-full p-4 rounded-2xl border border-black/5 transition-all hover:brightness-[1.02] active:scale-[0.99]"
    style={{ 
      backgroundColor: 'rgba(255, 255, 255, 0.5)',
      boxShadow: GLASS_STYLES.subtle.boxShadow,
    }}
  >
    <div className="flex items-center gap-3">
      <IconBox color={color}>{icon}</IconBox>
      <p className="text-sm font-bold font-jakarta" style={{ color: '#1e1e1e' }}>{label}</p>
    </div>
    <ChevronRight size={18} className="text-gray-400" />
  </button>
));
SettingsItem.displayName = 'SettingsItem';

const IconBox = memo<{ color: string; children: React.ReactNode }>(({ color, children }) => (
  <div 
    className="w-10 h-10 rounded-xl flex items-center justify-center border border-black/5"
    style={{ 
      backgroundColor: `${color}60`,
      boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.4), inset 0 -1px 1px rgba(0,0,0,0.05)'
    }}
  >
    <span style={{ color: COLORS.textPrimary }}>{children}</span>
  </div>
));
IconBox.displayName = 'IconBox';

export default SettingsPanel;
