import React, { useState, useCallback, memo, useEffect, useRef } from 'react';
import { COLORS, GLASS_STYLES } from '../src/constants';
import { X, Bot, ChevronRight, Volume2, Bell, Shield, Palette, HelpCircle, Mic, VolumeX, ClipboardList, ExternalLink, Mail, Bug } from 'lucide-react';
import { useTheme } from '../src/contexts/ThemeContext';
import { COLORS, GLASS_STYLES } from '../src/constants';

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
  { icon: Volume2, label: 'Sound', color: 'almost-aqua' },
  { icon: Palette, label: 'Appearance', color: 'lemon-icing' },
  { icon: Shield, label: 'Privacy', color: 'ice-melt' },
  { icon: ClipboardList, label: 'Activity Log', color: 'orchid-tint' },
  { icon: HelpCircle, label: 'Help Center', color: 'peach-dust' },
] as const;

const SettingsPanel: React.FC<SettingsPanelProps> = ({ onClose, onOpenTraceability }) => {
  const { theme, setTheme } = useTheme();
  const [activePanel, setActivePanel] = useState<string | null>(null);
  
  // Privacy panel states
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  
  // Help Center states
  const [bugReport, setBugReport] = useState('');
  const [supportRequest, setSupportRequest] = useState('');
  const [isSubmittingBug, setIsSubmittingBug] = useState(false);
  const [isRequestingSupport, setIsRequestingSupport] = useState(false);
  const [showBugReportPanel, setShowBugReportPanel] = useState(false);
  const [showSupportRequestPanel, setShowSupportRequestPanel] = useState(false);
  
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

  // Privacy panel functions
  const handleUpdateEmail = async () => {
    // Vérifier si l'email est vide
    if (!newEmail || newEmail.trim() === '') {
      alert('Please enter an email address');
      return;
    }
    
    // Validation du format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail.trim())) {
      alert('Please enter a valid email format (example: user@domain.com)');
      return;
    }
    
    // Vérifier si l'email est différent de l'actuel (simulation)
    const currentEmail = 'user@example.com'; // En réalité, ceci viendrait de votre état utilisateur
    if (newEmail.trim().toLowerCase() === currentEmail.toLowerCase()) {
      alert('This email is already your current email address');
      return;
    }
    
    setIsUpdatingEmail(true);
    try {
      // Simulate API call to backend
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Simulate email sending
      console.log(`📧 Confirmation email sent to: ${newEmail.trim()}`);
      console.log(`📧 Email content: "Please click the link to confirm your new email address: ${newEmail.trim()}"`);
      
      alert(`✅ Confirmation email sent to ${newEmail.trim()}!\n\nPlease check your inbox and click the verification link to complete the email change.`);
      setNewEmail('');
    } catch (error) {
      console.error('Email update error:', error);
      alert('❌ Failed to send confirmation email. Please try again or contact support.');
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword) {
      alert('Please enter your current password');
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      alert('New password must be at least 8 characters long');
      return;
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
      alert('Password must contain at least one uppercase letter, one lowercase letter, and one number');
      return;
    }
    if (newPassword !== confirmPassword) {
      alert('New passwords do not match');
      return;
    }
    if (newPassword === currentPassword) {
      alert('New password must be different from current password');
      return;
    }
    
    setIsChangingPassword(true);
    try {
      // Simulate API call to verify current password and update
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // In a real app, this would call your backend API
      // const response = await fetch('/api/user/change-password', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ currentPassword, newPassword })
      // });
      
      // Simulate email notification
      console.log('🔐 Password changed successfully');
      console.log('📧 Security notification email sent to user');
      console.log('📧 Email content: "Your password has been successfully changed. If this wasn\'t you, please contact support immediately."');
      
      alert('Password changed successfully! A confirmation email has been sent to your account for security purposes.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Password change error:', error);
      alert('Failed to change password. Please verify your current password and try again.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDownloadData = async () => {
    setIsDownloading(true);
    try {
      // Simulate data preparation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Create mock data
      const userData = {
        profile: {
          email: 'user@example.com',
          createdAt: new Date().toISOString(),
        },
        conversations: [
          {
            id: '1',
            title: 'Sample conversation',
            messages: ['Hello', 'Hi there!'],
            createdAt: new Date().toISOString(),
          }
        ],
        settings: {
          aiEnabled: aiEnabled,
          theme: 'default',
        }
      };
      
      // Create and download file
      const blob = new Blob([JSON.stringify(userData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `skhoot-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      alert('Your data has been downloaded successfully!');
    } catch (error) {
      alert('Failed to download data. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  // Help Center functions
  const handleOpenDocumentation = () => {
    window.open('https://docs.skhoot.com', '_blank');
  };

  const handleRequestSupport = () => {
    setShowSupportRequestPanel(true);
  };

  const handleSubmitSupportRequest = async () => {
    if (!supportRequest.trim()) {
      alert('Please describe your issue before submitting.');
      return;
    }
    
    setIsRequestingSupport(true);
    try {
      // Simulate sending support request email
      await new Promise(resolve => setTimeout(resolve, 1500));
      alert('Support request sent successfully! Our team will respond within 24 hours.');
      setSupportRequest('');
      setShowSupportRequestPanel(false);
    } catch (error) {
      alert('Failed to send support request. Please try again.');
    } finally {
      setIsRequestingSupport(false);
    }
  };

  const handleSubmitBugReport = async () => {
    if (!bugReport.trim()) {
      alert('Please describe the bug before submitting.');
      return;
    }
    
    setIsSubmittingBug(true);
    try {
      // Simulate sending bug report email
      await new Promise(resolve => setTimeout(resolve, 1500));
      alert('Bug report submitted successfully! We will investigate and respond within 24 hours.');
      setBugReport('');
      setShowBugReportPanel(false);
    } catch (error) {
      alert('Failed to submit bug report. Please try again.');
    } finally {
      setIsSubmittingBug(false);
    }
  };

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

  const renderSupportRequestPanel = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button 
          onClick={() => setShowSupportRequestPanel(false)}
          className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-black/5 transition-all text-gray-500"
        >
          <ChevronRight size={18} className="rotate-180" />
        </button>
        <h3 className="text-lg font-black font-jakarta" style={{ color: '#1e1e1e' }}>
          Request Assistance
        </h3>
      </div>

      {/* Skhoot Logo and Welcome Message */}
      <div className="text-center space-y-4 mb-6">
        <div className="flex justify-center">
          <img 
            src="/skhoot-purple.svg" 
            alt="Skhoot" 
            className="w-16 h-16"
          />
        </div>
        <div>
          <h4 className="text-lg font-bold font-jakarta text-gray-700 mb-2">
            How can we help you?
          </h4>
          <p className="text-sm text-gray-500 font-jakarta">
            Please describe your issue in detail and our support team will respond via email within 24 hours.
          </p>
        </div>
      </div>

      {/* Support Request Description */}
      <div className="space-y-3">
        <label className="text-sm font-bold font-jakarta text-gray-700">Describe Your Issue</label>
        <textarea
          value={supportRequest}
          onChange={(e) => setSupportRequest(e.target.value)}
          placeholder="Please provide details about your question or issue. The more information you provide, the better we can assist you..."
          rows={6}
          className="w-full p-3 rounded-xl border border-gray-200 bg-white text-sm font-medium font-jakarta focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
        />
      </div>

      {/* Submit Button */}
      <button
        onClick={handleSubmitSupportRequest}
        disabled={isRequestingSupport || !supportRequest.trim()}
        className="w-full p-3 rounded-xl font-bold text-sm font-jakarta transition-all text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ backgroundColor: '#c0b7c9' }}
      >
        {isRequestingSupport ? 'Sending Request...' : 'Send Support Request'}
      </button>
    </div>
  );

  const renderBugReportPanel = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button 
          onClick={() => setShowBugReportPanel(false)}
          className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-black/5 transition-all text-gray-500"
        >
          <ChevronRight size={18} className="rotate-180" />
        </button>
        <h3 className="text-lg font-black font-jakarta" style={{ color: '#1e1e1e' }}>
          Report a Bug
        </h3>
      </div>

      {/* Skhoot Logo and Welcome Message */}
      <div className="text-center space-y-4 mb-6">
        <div className="flex justify-center">
          <img 
            src="/skhoot-purple.svg" 
            alt="Skhoot" 
            className="w-16 h-16"
            style={{ filter: 'brightness(0) saturate(100%) invert(12%) sepia(87%) saturate(7426%) hue-rotate(357deg) brightness(95%) contrast(95%)' }}
          />
        </div>
        <div>
          <h4 className="text-lg font-bold font-jakarta text-gray-700 mb-2">
            Found a Bug?
          </h4>
          <p className="text-sm text-gray-500 font-jakarta">
            Please describe the issue in detail and our development team will investigate and respond within 24 hours.
          </p>
        </div>
      </div>

      {/* Bug Description */}
      <div className="space-y-3">
        <label className="text-sm font-bold font-jakarta text-gray-700">Describe the Bug</label>
        <p className="text-xs text-gray-500 font-jakarta">
          Please provide as much detail as possible about the issue you encountered.
        </p>
        <textarea
          value={bugReport}
          onChange={(e) => setBugReport(e.target.value)}
          placeholder="Describe what happened, what you expected to happen, and steps to reproduce the issue..."
          rows={6}
          className="w-full p-3 rounded-xl border border-gray-200 bg-white text-sm font-medium font-jakarta focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      {/* Submit Button */}
      <button
        onClick={handleSubmitBugReport}
        disabled={isSubmittingBug || !bugReport.trim()}
        className="w-full p-3 rounded-xl font-bold text-sm font-jakarta transition-all text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ backgroundColor: '#dc2626' }}
      >
        {isSubmittingBug ? 'Submitting...' : 'Submit Bug Report'}
      </button>
    </div>
  );

  const renderHelpCenterPanel = () => (
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
          Help Center
        </h3>
      </div>

      {/* Documentation */}
      <div className="space-y-3">
        <label className="text-sm font-bold font-jakarta text-gray-700">Documentation</label>
        <p className="text-xs text-gray-500 font-jakarta">
          Access our comprehensive guides and tutorials
        </p>
        <button
          onClick={handleOpenDocumentation}
          className="w-full p-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border flex items-center justify-center" style={{ borderColor: '#c0b7c9' }}>
              <ExternalLink size={18} style={{ color: '#c0b7c9' }} />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold font-jakarta text-gray-700">Open Documentation</p>
              <p className="text-xs text-gray-500 font-jakarta">View guides, tutorials, and FAQs</p>
            </div>
          </div>
          <ChevronRight size={18} className="text-gray-400" />
        </button>
      </div>

      {/* Request Support */}
      <div className="space-y-3">
        <label className="text-sm font-bold font-jakarta text-gray-700">Get Support</label>
        <p className="text-xs text-gray-500 font-jakarta">
          Need help? Our team will respond within 24 hours
        </p>
        <button
          onClick={handleRequestSupport}
          className="w-full p-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border flex items-center justify-center" style={{ borderColor: '#c0b7c9' }}>
              <Mail size={18} style={{ color: '#c0b7c9' }} />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold font-jakarta text-gray-700">Request Assistance</p>
              <p className="text-xs text-gray-500 font-jakarta">Contact our support team</p>
            </div>
          </div>
          <ChevronRight size={18} className="text-gray-400" />
        </button>
      </div>

      {/* Report Bug */}
      <div className="space-y-3">
        <label className="text-sm font-bold font-jakarta text-gray-700">Report Issues</label>
        <p className="text-xs text-gray-500 font-jakarta">
          Found a bug? Help us improve by reporting it
        </p>
        <button
          onClick={() => setShowBugReportPanel(true)}
          className="w-full p-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
              <Bug size={18} className="text-red-600" />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold font-jakarta text-gray-700">Report a Bug</p>
              <p className="text-xs text-gray-500 font-jakarta">Submit bug reports and issues</p>
            </div>
          </div>
          <ChevronRight size={18} className="text-gray-400" />
        </button>
      </div>

      {/* Contact Info */}
      <div className="p-4 rounded-xl border bg-[#d9e2eb]" style={{ borderColor: '#c1d0db' }}>
        <div className="flex items-start gap-3">
          <HelpCircle size={16} className="text-[#5a7a94] mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold font-jakarta text-[#3d5a73] mb-1">Need Immediate Help?</p>
            <p className="text-xs text-[#5a7a94] font-jakarta">
              For urgent issues, all support requests and bug reports are handled within 24 hours by our dedicated team.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSoundPanel = () => (
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

      {/* Input Device */}
      <div className="space-y-3">
        <label className="text-sm font-bold font-jakarta text-text-primary">Input Device</label>
        <select
          value={selectedInputDevice}
          onChange={(e) => handleInputDeviceChange(e.target.value)}
          className="w-full p-3 rounded-xl border-glass-border glass-subtle text-sm font-medium font-jakarta text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
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
        <label className="text-sm font-bold font-jakarta text-text-primary">Output Device</label>
        <select
          value={selectedOutputDevice}
          onChange={(e) => handleOutputDeviceChange(e.target.value)}
          className="w-full p-3 rounded-xl border-glass-border glass-subtle text-sm font-medium font-jakarta text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
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
          <button
            onClick={handleMicTest}
            className={`px-4 py-2 rounded-xl font-bold text-sm font-jakarta transition-all text-white ${
              isTesting ? 'bg-red-500' : 'bg-accent'
            }`}
          >
            {isTesting ? 'Stop Test' : 'Let\'s Hoot!'}
          </button>
          
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
          <button
            onClick={() => {
              setAutoSensitivity(!autoSensitivity);
              console.log(`🎛️ Sensitivity mode changed to: ${!autoSensitivity ? 'AUTO (3x)' : 'MANUAL'}`);
            }}
            className={`w-12 h-6 rounded-full transition-all ${
              autoSensitivity ? 'bg-accent' : 'bg-glass-border'
            }`}
          >
            <div className={`w-5 h-5 glass-subtle rounded-full shadow transition-transform ${
              autoSensitivity ? 'translate-x-6' : 'translate-x-0.5'
            }`} />
          </button>
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
    </div>
  );

  const renderPrivacyPanel = () => (
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
          Privacy & Security
        </h3>
      </div>

      {/* Email Update */}
      <div className="space-y-3">
        <label className="text-sm font-bold font-jakarta text-text-primary">Update Email</label>
        <p className="text-xs text-text-secondary font-jakarta">
          Change your account email address
        </p>
        <div className="flex gap-2">
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="Enter new email address"
            className="flex-1 p-3 rounded-xl border-glass-border glass-subtle text-sm font-medium font-jakarta text-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            onClick={handleUpdateEmail}
            disabled={false}
            className="px-4 py-3 rounded-xl font-bold text-sm font-jakarta transition-all text-white"
            style={{ 
              backgroundColor: '#9a8ba3',
              opacity: 1,
              cursor: 'pointer'
            }}
          >
            {isUpdatingEmail ? 'Updating...' : 'Update'}
          </button>
        </div>
      </div>

      {/* Password Change */}
      <div className="space-y-3">
        <label className="text-sm font-bold font-jakarta text-text-primary">Change Password</label>
        <p className="text-xs text-text-secondary font-jakarta">
          Update your account password
        </p>
        <div className="space-y-2">
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Current password"
            className="w-full p-3 rounded-xl border-glass-border glass-subtle text-sm font-medium font-jakarta text-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="New password"
            className="w-full p-3 rounded-xl border-glass-border glass-subtle text-sm font-medium font-jakarta text-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            className="w-full p-3 rounded-xl border-glass-border glass-subtle text-sm font-medium font-jakarta text-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            onClick={handleChangePassword}
            disabled={false}
            className="w-full p-3 rounded-xl font-bold text-sm font-jakarta transition-all text-white"
            style={{ 
              backgroundColor: '#9a8ba3',
              opacity: 1,
              cursor: 'pointer'
            }}
          >
            {isChangingPassword ? 'Changing...' : 'Change Password'}
          </button>
        </div>
      </div>

      {/* Data Download */}
      <div className="space-y-3">
        <label className="text-sm font-bold font-jakarta text-text-primary">Download Your Data</label>
        <p className="text-xs text-text-secondary font-jakarta">
          Export all your conversations and settings
        </p>
        <button
          onClick={handleDownloadData}
          disabled={false}
          className="w-full p-3 rounded-xl font-bold text-sm font-jakarta transition-all text-white"
          style={{ 
            backgroundColor: '#9a8ba3',
            opacity: 1,
            cursor: 'pointer'
          }}
        >
          {isDownloading ? 'Preparing Download...' : 'Download Data'}
        </button>
      </div>

      {/* Privacy Notice */}
      <div className="p-4 rounded-xl glass-subtle">
        <div className="flex items-start gap-3">
          <Shield size={16} className="mt-0.5 flex-shrink-0" style={{ color: '#c0b7c9' }} />
          <div>
            <p className="text-sm font-bold font-jakarta text-text-primary mb-1">Your Privacy Matters</p>
            <p className="text-xs text-text-secondary font-jakarta">
              We take your privacy seriously. All data is encrypted and stored securely. You can request data deletion at any time.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAppearancePanel = () => (
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
          Appearance
        </h3>
      </div>

      {/* Theme Selection */}
      <div className="space-y-3">
        <label className="text-sm font-bold font-jakarta text-text-primary">Theme</label>
        <p className="text-xs text-text-secondary font-jakarta">
          Choose your preferred theme or let the system decide
        </p>
        
        <div className="space-y-2">
          {[
            { value: 'light', label: 'Light', description: 'Always use light theme' },
            { value: 'dark', label: 'Dark', description: 'Always use dark theme' },
            { value: 'system', label: 'System', description: 'Follow system preference' }
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setTheme(option.value as 'light' | 'dark' | 'system')}
              className={`w-full p-4 rounded-xl transition-all text-left ${
                theme === option.value
                  ? 'glass-subtle'
                  : 'glass-subtle hover:glass-elevated'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold font-jakarta text-text-primary">
                    {option.label}
                  </p>
                  <p className="text-xs text-text-secondary font-jakarta">
                    {option.description}
                  </p>
                </div>
                <div className={`w-4 h-4 rounded-full ${
                  theme === option.value
                    ? 'bg-accent'
                    : 'glass-subtle'
                }`}>
                  {theme === option.value && (
                    <div className="w-full h-full rounded-full glass-subtle scale-50" />
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Coming Soon Section */}
      <div className="space-y-3">
        <label className="text-sm font-bold font-jakarta text-text-primary">More Options</label>
        <div className="p-4 rounded-xl glass-subtle">
          <p className="text-sm font-medium font-jakarta text-text-primary">
            More appearance customization options coming soon!
          </p>
          <p className="text-xs text-text-secondary font-jakarta mt-1">
            Font size, accent colors, and layout preferences
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div 
      className="absolute inset-0 z-30 flex items-center justify-center bg-black/20 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-[90%] max-w-[400px] max-h-[80%] rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 glass-elevated"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 flex items-center justify-between">
          <h2 className="text-lg font-black font-jakarta text-text-primary">
            Settings
          </h2>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-black/5 transition-all text-text-secondary active:scale-90"
            aria-label="Close settings"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-scroll" style={{ maxHeight: '500px' }}>
          <div className="p-6 space-y-4">
          {showBugReportPanel ? (
            renderBugReportPanel()
          ) : showSupportRequestPanel ? (
            renderSupportRequestPanel()
          ) : activePanel === 'Sound' ? (
            renderSoundPanel()
          ) : activePanel === 'Privacy' ? (
            renderPrivacyPanel()
          ) : activePanel === 'Appearance' ? (
            renderAppearancePanel()
          ) : activePanel === 'Help Center' ? (
            renderHelpCenterPanel()
          ) : (
            <>
              {/* General Section */}
              {/* <SettingsSection title="General"> */}
                {SETTINGS_ITEMS.map(item => (
                  <SettingsItem 
                    key={item.label}
                    icon={<item.icon size={18} />} 
                    label={item.label} 
                    color={item.color}
                    onClick={() => handleSettingClick(item.label)}
                  />
                ))}
              {/* </SettingsSection> */}
            </>
          )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4">
          <p className="text-[10px] font-medium font-jakarta text-center opacity-40 text-text-primary">
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
    className="flex items-center justify-between p-4 rounded-2xl transition-all"
    style={{ 
      backgroundColor: enabled ? `${color}30` : 'var(--glass-bg)',
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
      enabled ? 'bg-accent' : 'bg-glass-border'
    }`}
    role="switch"
    aria-checked={enabled}
  >
    <div 
      className={`absolute top-1 w-5 h-5 rounded-full glass-subtle shadow-md transition-all duration-300 ${
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
    className="flex items-center justify-between w-full p-4 rounded-2xl transition-all hover:brightness-[1.02] active:scale-[0.99] glass-subtle"
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
    className={`w-10 h-10 rounded-xl flex items-center justify-center bg-${color}/60`}
    style={{ 
      boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.4), inset 0 -1px 1px rgba(0,0,0,0.05)'
    }}
  >
    <span className="text-text-primary">{children}</span>
  </div>
));
IconBox.displayName = 'IconBox';

export default SettingsPanel;
