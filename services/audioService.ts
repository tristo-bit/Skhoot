/**
 * Cross-platform Audio Service for Tauri V2
 * Handles microphone permissions, device enumeration, and audio management
 * Compatible with Windows 11, macOS, and Linux (Ubuntu)
 */

import { linuxAudioSetup } from './linuxAudioSetup';

export interface AudioDevice {
  deviceId: string;
  label: string;
  kind: 'audioinput' | 'audiooutput';
  isDefault: boolean;
}

export interface AudioPermissionStatus {
  granted: boolean;
  state: 'granted' | 'denied' | 'prompt' | 'unknown';
  error?: string;
  platform?: string;
}

export interface AudioSettings {
  selectedInputDevice: string;
  selectedOutputDevice: string;
  inputVolume: number;
  outputVolume: number;
  autoSensitivity: boolean;
  manualSensitivity: number;
}

const STORAGE_KEY = 'skhoot-audio-settings';
const PERMISSION_CACHE_KEY = 'skhoot-audio-permission-granted';

class AudioService {
  private static instance: AudioService;
  private settings: AudioSettings;
  private permissionStatus: AudioPermissionStatus = { granted: false, state: 'unknown' };
  private isTauri: boolean = false;
  private platform: 'windows' | 'macos' | 'linux' | 'unknown' = 'unknown';
  private permissionRequestInProgress: boolean = false;

  private constructor() {
    this.settings = this.loadSettings();
    this.detectEnvironment();
    this.checkCachedPermission();
  }

  static getInstance(): AudioService {
    if (!AudioService.instance) {
      AudioService.instance = new AudioService();
    }
    return AudioService.instance;
  }

  private detectEnvironment(): void {
    this.isTauri = typeof window !== 'undefined' && 
      ('__TAURI__' in window || '__TAURI_INTERNALS__' in window);
    
    if (typeof navigator !== 'undefined') {
      const ua = navigator.userAgent.toLowerCase();
      if (ua.includes('win')) this.platform = 'windows';
      else if (ua.includes('mac')) this.platform = 'macos';
      else if (ua.includes('linux')) this.platform = 'linux';
    }
    
    console.log(`[AudioService] Environment: ${this.isTauri ? 'Tauri' : 'Browser'}, Platform: ${this.platform}`);
  }

  private checkCachedPermission(): void {
    try {
      const cached = localStorage.getItem(PERMISSION_CACHE_KEY);
      if (cached === 'true') {
        this.permissionStatus = { granted: true, state: 'granted' };
        console.log('[AudioService] Using cached permission status: granted');
      }
    } catch (e) {
      // Ignore
    }
  }

  private loadSettings(): AudioSettings {
    const defaults: AudioSettings = {
      selectedInputDevice: '',
      selectedOutputDevice: '',
      inputVolume: 80,
      outputVolume: 70,
      autoSensitivity: true,
      manualSensitivity: 50,
    };

    if (typeof window === 'undefined') return defaults;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...defaults, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.warn('[AudioService] Failed to load settings:', e);
    }
    return defaults;
  }

  saveSettings(settings: Partial<AudioSettings>): void {
    this.settings = { ...this.settings, ...settings };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch (e) {
      console.warn('[AudioService] Failed to save settings:', e);
    }
  }

  getSettings(): AudioSettings {
    return { ...this.settings };
  }

  isAudioSupported(): boolean {
    return typeof navigator !== 'undefined' && 
           'mediaDevices' in navigator && 
           'getUserMedia' in navigator.mediaDevices;
  }

  isSpeechRecognitionSupported(): boolean {
    if (typeof window === 'undefined') return false;
    
    const isOpera = navigator.userAgent.indexOf('OPR') !== -1 || 
                    navigator.userAgent.indexOf('Opera') !== -1;
    if (isOpera) return false;

    return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  }

  getPlatform(): 'windows' | 'macos' | 'linux' | 'unknown' {
    return this.platform;
  }

  /**
   * Request microphone permission - simplified and more direct
   */
  async requestPermission(allowAutoFix: boolean = true): Promise<AudioPermissionStatus> {
    // Prevent multiple simultaneous requests
    if (this.permissionRequestInProgress) {
      console.log('[AudioService] Permission request already in progress');
      return this.permissionStatus;
    }

    this.permissionRequestInProgress = true;
    console.log('[AudioService] Requesting microphone permission...');

    if (!this.isAudioSupported()) {
      this.permissionRequestInProgress = false;
      this.permissionStatus = {
        granted: false,
        state: 'denied',
        error: 'Audio APIs not supported in this environment',
        platform: this.platform
      };
      return this.permissionStatus;
    }

    try {
      // Directly request microphone access - this should trigger the native permission dialog
      console.log('[AudioService] Calling getUserMedia to trigger permission prompt...');
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        } 
      });
      
      // Successfully got access
      stream.getTracks().forEach(track => track.stop());
      
      this.permissionStatus = {
        granted: true,
        state: 'granted',
        platform: this.platform
      };
      
      // Cache the permission
      try {
        localStorage.setItem(PERMISSION_CACHE_KEY, 'true');
      } catch (e) {}
      
      console.log('[AudioService] Microphone permission granted!');
      this.permissionRequestInProgress = false;
      return this.permissionStatus;

    } catch (error: any) {
      console.error('[AudioService] Permission request failed:', error.name, error.message);
      
      let errorMessage: string;
      let state: AudioPermissionStatus['state'] = 'denied';

      // Clear cached permission on error
      try {
        localStorage.removeItem(PERMISSION_CACHE_KEY);
      } catch (e) {}

      switch (error.name) {
        case 'NotAllowedError':
        case 'PermissionDeniedError':
          errorMessage = this.getDetailedPermissionError();
          state = 'denied';
          break;
        case 'NotFoundError':
        case 'DevicesNotFoundError':
          errorMessage = 'No microphone detected. Please connect a microphone and try again.';
          state = 'denied';
          break;
        case 'NotReadableError':
        case 'TrackStartError':
          errorMessage = 'Microphone is busy. Please close other applications using the microphone.';
          state = 'denied';
          break;
        case 'AbortError':
          errorMessage = 'Microphone access was interrupted. Please try again.';
          state = 'prompt';
          break;
        default:
          errorMessage = `Microphone error: ${error.message || error.name || 'Unknown error'}`;
          state = 'denied';
      }

      this.permissionStatus = {
        granted: false,
        state,
        error: errorMessage,
        platform: this.platform
      };

      this.permissionRequestInProgress = false;

      if (allowAutoFix && this.platform === 'linux' && linuxAudioSetup.isLinuxTauri()) {
        const autoFix = await linuxAudioSetup.tryAutoFix();
        if (autoFix.success) {
          return await this.requestPermission(false);
        }
      }

      return this.permissionStatus;
    }
  }

  /**
   * Get detailed, platform-specific permission error message
   */
  private getDetailedPermissionError(): string {
    switch (this.platform) {
      case 'linux':
        return 'Microphone access was denied.\n\n' +
          'On Linux this can be caused by missing PipeWire/PulseAudio services or permissions.\n' +
          'Use the "Fix Audio Setup" button above to fix this automatically.';
      
      case 'macos':
        return 'Microphone access was denied.\n\n' +
          'Please enable in:\n' +
          'System Preferences → Security & Privacy → Privacy → Microphone\n' +
          'Then check the box next to Skhoot.';
      
      case 'windows':
        return 'Microphone access was denied.\n\n' +
          'Please enable in:\n' +
          'Settings → Privacy & Security → Microphone\n' +
          'Enable "Microphone access" and "Let apps access your microphone"';
      
      default:
        return 'Microphone access was denied. Please check your system privacy settings.';
    }
  }

  getPermissionStatus(): AudioPermissionStatus {
    return { ...this.permissionStatus };
  }

  /**
   * Enumerate available audio devices
   */
  async getDevices(): Promise<{ inputs: AudioDevice[]; outputs: AudioDevice[] }> {
    console.log('[AudioService] Enumerating audio devices...');

    if (!this.isAudioSupported()) {
      return { inputs: [], outputs: [] };
    }

    try {
      // First enumerate to see what we have
      let devices = await navigator.mediaDevices.enumerateDevices();
      
      // Check if we have labels - if not, we need permission
      const hasLabels = devices.some(d => d.label && d.label.length > 0);
      
      if (!hasLabels && !this.permissionStatus.granted) {
        console.log('[AudioService] No device labels, requesting permission...');
        await this.requestPermission();
        
        // Re-enumerate after permission
        if (this.permissionStatus.granted) {
          devices = await navigator.mediaDevices.enumerateDevices();
        }
      }
      
      const inputs: AudioDevice[] = devices
        .filter(d => d.kind === 'audioinput')
        .map((d, index) => ({
          deviceId: d.deviceId,
          label: d.label || `Microphone ${index + 1}`,
          kind: 'audioinput' as const,
          isDefault: d.deviceId === 'default' || d.deviceId === '' || index === 0
        }));

      const outputs: AudioDevice[] = devices
        .filter(d => d.kind === 'audiooutput')
        .map((d, index) => ({
          deviceId: d.deviceId,
          label: d.label || `Speaker ${index + 1}`,
          kind: 'audiooutput' as const,
          isDefault: d.deviceId === 'default' || d.deviceId === '' || index === 0
        }));

      console.log(`[AudioService] Found ${inputs.length} inputs, ${outputs.length} outputs`);
      
      // Auto-select default devices
      if (!this.settings.selectedInputDevice && inputs.length > 0) {
        const defaultInput = inputs.find(d => d.isDefault) || inputs[0];
        this.saveSettings({ selectedInputDevice: defaultInput.deviceId });
      }
      if (!this.settings.selectedOutputDevice && outputs.length > 0) {
        const defaultOutput = outputs.find(d => d.isDefault) || outputs[0];
        this.saveSettings({ selectedOutputDevice: defaultOutput.deviceId });
      }

      return { inputs, outputs };
    } catch (error) {
      console.error('[AudioService] Failed to enumerate devices:', error);
      return { inputs: [], outputs: [] };
    }
  }

  /**
   * Get a media stream from the selected input device
   */
  async getInputStream(deviceId?: string): Promise<MediaStream | null> {
    const targetDevice = deviceId || this.settings.selectedInputDevice;
    
    console.log('[AudioService] Getting input stream, device:', targetDevice || 'default');

    // Ensure we have permission first
    if (!this.permissionStatus.granted) {
      const result = await this.requestPermission();
      if (!result.granted) {
        console.error('[AudioService] Cannot get stream - permission denied');
        return null;
      }
    }

    try {
      const constraints: MediaStreamConstraints = {
        audio: targetDevice && targetDevice !== 'default' ? {
          deviceId: { ideal: targetDevice },
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        } : {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('[AudioService] Got input stream successfully');
      return stream;
    } catch (error: any) {
      console.error('[AudioService] Failed to get input stream:', error);
      
      // Try fallback with no device constraint
      if (targetDevice) {
        console.log('[AudioService] Retrying with default device...');
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          return stream;
        } catch (retryError) {
          console.error('[AudioService] Fallback also failed:', retryError);
        }
      }
      
      return null;
    }
  }

  async createAudioContext(): Promise<AudioContext | null> {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        return null;
      }

      const context = new AudioContextClass({
        sampleRate: 48000,
        latencyHint: 'interactive'
      });

      // Resume context if suspended (required by some browsers)
      if (context.state === 'suspended') {
        await context.resume();
      }

      return context;
    } catch (error) {
      console.error('[AudioService] Failed to create AudioContext:', error);
      return null;
    }
  }

  createSpeechRecognition(): any | null {
    if (!this.isSpeechRecognitionSupported()) {
      return null;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || 
                              (window as any).SpeechRecognition;
    
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = navigator.language || 'en-US';
    recognition.maxAlternatives = 1;

    return recognition;
  }

  /**
   * Test microphone with real-time level feedback
   */
  async testMicrophone(
    onLevel: (level: number, waveform: number[]) => void,
    onError: (error: string) => void
  ): Promise<{ stop: () => void } | null> {
    
    const stream = await this.getInputStream();
    if (!stream) {
      onError(this.permissionStatus.error || 'Could not access microphone');
      return null;
    }

    const context = await this.createAudioContext();
    if (!context) {
      stream.getTracks().forEach(t => t.stop());
      onError('Could not create audio context');
      return null;
    }

    const analyser = context.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.3;

    const source = context.createMediaStreamSource(stream);
    source.connect(analyser);

    // Audio monitoring (playback)
    const gainNode = context.createGain();
    gainNode.gain.value = this.settings.outputVolume / 100;
    source.connect(gainNode);
    gainNode.connect(context.destination);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    let animationId: number;
    let isRunning = true;

    const updateLevel = () => {
      if (!isRunning) return;

      analyser.getByteFrequencyData(dataArray);

      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const average = sum / bufferLength;
      let level = (average / 255) * 100;

      level *= this.settings.inputVolume / 100;

      const sensitivityMultiplier = this.settings.autoSensitivity 
        ? 3.0 
        : Math.max(0.1, this.settings.manualSensitivity / 25);
      level *= sensitivityMultiplier;

      if (level < 3) level = 0;
      level = Math.min(100, level);

      const waveform: number[] = [];
      for (let i = 0; i < 40; i++) {
        const freqIndex = Math.floor((i / 40) * bufferLength);
        let amplitude = (dataArray[freqIndex] / 255) - 0.5;
        amplitude *= (this.settings.inputVolume / 100) * sensitivityMultiplier;
        if (Math.abs(amplitude) * 100 < 3) amplitude = 0;
        waveform.push(amplitude);
      }

      onLevel(level, waveform);
      animationId = requestAnimationFrame(updateLevel);
    };

    updateLevel();

    return {
      stop: () => {
        isRunning = false;
        if (animationId) cancelAnimationFrame(animationId);
        stream.getTracks().forEach(t => t.stop());
        context.close();
      }
    };
  }

  onDeviceChange(callback: () => void): () => void {
    if (!this.isAudioSupported()) return () => {};
    navigator.mediaDevices.addEventListener('devicechange', callback);
    return () => navigator.mediaDevices.removeEventListener('devicechange', callback);
  }

  /**
   * Reset permission status (for retry)
   */
  resetPermission(): void {
    this.permissionStatus = { granted: false, state: 'unknown' };
    try {
      localStorage.removeItem(PERMISSION_CACHE_KEY);
    } catch (e) {}
  }
}

export const audioService = AudioService.getInstance();
export default audioService;
