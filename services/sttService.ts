import { audioService } from './audioService';
import { apiKeyService } from './apiKeyService';
import { sttConfigStore, SttProvider } from './sttConfig';
import { webAudioRecorder, WebAudioRecorderSession } from './webAudioRecorder';

const OPENAI_TRANSCRIPTION_URL = 'https://api.openai.com/v1/audio/transcriptions';

export interface SttSession {
  stop: () => Promise<string>;
  abort: () => void;
}

const getPreferredMimeType = (): string | null => {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/ogg',
    'audio/mp4',
    'audio/wav',
    'audio/mpeg',
    ''  // Empty string = browser default
  ];

  console.log('[STT] Checking supported MIME types...');
  for (const mimeType of candidates) {
    const supported = mimeType === '' || MediaRecorder.isTypeSupported(mimeType);
    console.log(`[STT] MIME type "${mimeType || '(default)'}": ${supported ? 'supported' : 'not supported'}`);
    if (supported && mimeType !== '') return mimeType;
  }

  // Return null to let browser choose default
  console.log('[STT] No explicit MIME type supported, using browser default');
  return null;
};

const buildAudioFile = (chunks: BlobPart[], mimeType: string | null): File => {
  const fallbackType = mimeType || 'audio/webm';
  const blob = new Blob(chunks, { type: fallbackType });
  const extension = fallbackType.includes('ogg') ? 'ogg' : 'webm';
  return new File([blob], `skhoot-recording.${extension}`, { type: fallbackType });
};

const getLanguageHint = (): string | undefined => {
  if (typeof navigator === 'undefined') return undefined;
  const lang = navigator.language || '';
  const base = lang.split('-')[0];
  return base || undefined;
};

const resolveProvider = async (): Promise<SttProvider | null> => {
  const config = sttConfigStore.get();
  const preference = config.provider;
  
  console.log('[STT] Resolving provider, preference:', preference);
  console.log('[STT] Config:', JSON.stringify(config));

  const hasWebSpeech = sttConfigStore.hasWebSpeechSupport();
  console.log('[STT] Web Speech supported:', hasWebSpeech);
  
  // Check if OpenAI key is available
  let hasOpenAI = false;
  try {
    const openaiKey = await apiKeyService.loadKey('openai');
    hasOpenAI = !!openaiKey;
    console.log('[STT] OpenAI key available:', hasOpenAI);
  } catch (e) {
    console.log('[STT] OpenAI key check failed:', e);
    hasOpenAI = false;
  }
  
  const hasLocal = !!config.localUrl?.trim();
  console.log('[STT] Local URL configured:', hasLocal, config.localUrl);

  let result: SttProvider | null = null;
  
  if (preference === 'web-speech') result = hasWebSpeech ? 'web-speech' : null;
  else if (preference === 'openai') result = hasOpenAI ? 'openai' : null;
  else if (preference === 'local') result = hasLocal ? 'local' : null;
  else {
    // Auto mode: prefer web-speech, then local, then openai
    if (hasWebSpeech) result = 'web-speech';
    else if (hasLocal) result = 'local';
    else if (hasOpenAI) result = 'openai';
  }

  console.log('[STT] Resolved provider:', result);
  return result;
};

const transcribeWithOpenAI = async (chunks: BlobPart[], mimeType: string | null): Promise<string> => {
  let apiKey: string;
  try {
    apiKey = await apiKeyService.loadKey('openai');
  } catch {
    throw new Error('Missing OpenAI API key. Add your API key in User Profile → API Configuration.');
  }
  
  if (!apiKey) {
    throw new Error('Missing OpenAI API key. Add your API key in User Profile → API Configuration.');
  }

  const audioFile = buildAudioFile(chunks, mimeType);
  const formData = new FormData();
  formData.append('file', audioFile);
  formData.append('model', 'whisper-1');
  const lang = getLanguageHint();
  if (lang) formData.append('language', lang);

  const response = await fetch(OPENAI_TRANSCRIPTION_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    body: formData
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Transcription failed: ${response.status} ${errorText}`);
  }

  const result = await response.json();
  return (result?.text || '').trim();
};

// Version that takes a File directly (for WebAudioRecorder)
const transcribeWithOpenAIFile = async (audioFile: File): Promise<string> => {
  let apiKey: string;
  try {
    apiKey = await apiKeyService.loadKey('openai');
  } catch {
    throw new Error('Missing OpenAI API key. Add your API key in User Profile → API Configuration.');
  }
  
  if (!apiKey) {
    throw new Error('Missing OpenAI API key. Add your API key in User Profile → API Configuration.');
  }

  const formData = new FormData();
  formData.append('file', audioFile);
  formData.append('model', 'whisper-1');
  const lang = getLanguageHint();
  if (lang) formData.append('language', lang);

  console.log('[STT] Sending WAV file to OpenAI, size:', audioFile.size);

  const response = await fetch(OPENAI_TRANSCRIPTION_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    body: formData
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Transcription failed: ${response.status} ${errorText}`);
  }

  const result = await response.json();
  return (result?.text || '').trim();
};

const transcribeWithLocal = async (chunks: BlobPart[], mimeType: string | null, url: string): Promise<string> => {
  console.log('[STT] Transcribing with local server:', url);
  console.log('[STT] Audio chunks:', chunks.length, 'mimeType:', mimeType);
  
  const audioFile = buildAudioFile(chunks, mimeType);
  console.log('[STT] Built audio file:', audioFile.name, 'size:', audioFile.size, 'type:', audioFile.type);
  
  const formData = new FormData();
  formData.append('file', audioFile);
  const lang = getLanguageHint();
  if (lang) formData.append('language', lang);
  if (url.includes('/v1/audio/transcriptions')) {
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'json');
  }

  console.log('[STT] Sending request to:', url);
  const response = await fetch(url, {
    method: 'POST',
    body: formData
  });

  console.log('[STT] Response status:', response.status, response.statusText);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('[STT] Transcription failed:', errorText);
    throw new Error(`Transcription failed: ${response.status} ${errorText}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const result = await response.json();
    console.log('[STT] JSON response:', result);
    return (result?.text || result?.transcript || '').trim();
  }

  const text = await response.text();
  console.log('[STT] Text response:', text);
  return text.trim();
};

// Version that takes a File directly (for WebAudioRecorder)
const transcribeWithLocalFile = async (audioFile: File, url: string): Promise<string> => {
  console.log('[STT] Transcribing WAV with local server:', url);
  console.log('[STT] WAV file size:', audioFile.size);
  
  const formData = new FormData();
  formData.append('file', audioFile);
  const lang = getLanguageHint();
  if (lang) formData.append('language', lang);
  if (url.includes('/v1/audio/transcriptions')) {
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'json');
  }

  console.log('[STT] Sending WAV request to:', url);
  const response = await fetch(url, {
    method: 'POST',
    body: formData
  });

  console.log('[STT] Response status:', response.status, response.statusText);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('[STT] Transcription failed:', errorText);
    throw new Error(`Transcription failed: ${response.status} ${errorText}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const result = await response.json();
    console.log('[STT] JSON response:', result);
    return (result?.text || result?.transcript || '').trim();
  }

  const text = await response.text();
  console.log('[STT] Text response:', text);
  return text.trim();
};

export const sttService = {
  async getProviderDecision(): Promise<SttProvider | null> {
    return await resolveProvider();
  },

  // Sync version for UI checks - uses simple heuristics
  isAvailableSync(): boolean {
    if (typeof window === 'undefined') return false;
    const config = sttConfigStore.get();
    const hasWebSpeech = sttConfigStore.hasWebSpeechSupport();
    const hasLocal = !!config.localUrl?.trim();
    // For sync check, assume OpenAI might be available if not web-speech or local
    if (hasWebSpeech) return true;
    if (hasLocal) return true;
    // Can't check OpenAI key synchronously, so return true to allow attempt
    if (!('MediaRecorder' in window)) return false;
    if (!audioService.isAudioSupported()) return false;
    return true;
  },

  async isAvailable(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    const provider = await resolveProvider();
    if (!provider) return false;
    if (provider === 'web-speech') {
      return audioService.isSpeechRecognitionSupported();
    }
    if (!('MediaRecorder' in window)) return false;
    if (!audioService.isAudioSupported()) return false;
    return true;
  },

  async startRecording(stream: MediaStream, providerOverride?: SttProvider): Promise<SttSession> {
    const provider = providerOverride || await resolveProvider();
    if (!provider || provider === 'web-speech') {
      throw new Error('No STT provider available for fallback transcription.');
    }

    // Diagnostic: Check if stream actually has audio
    const audioTracks = stream.getAudioTracks();
    console.log('[STT] Stream audio tracks:', audioTracks.length);
    audioTracks.forEach((track, i) => {
      console.log(`[STT] Track ${i}: enabled=${track.enabled}, muted=${track.muted}, readyState=${track.readyState}`);
      const capabilities = track.getCapabilities?.() || {};
      console.log(`[STT] Track ${i} capabilities:`, JSON.stringify(capabilities));
    });

    // Check if we should use WebAudioRecorder fallback
    // WebKitGTK on Linux has broken MediaRecorder, so we detect and use fallback
    // We force this on Linux because Tauri/WebKitGTK MediaRecorder is often broken or produces empty blobs
    const isLinux = audioService.getPlatform() === 'linux';
    const isWebKitGTK = navigator.userAgent.includes('WebKit') && 
                        !navigator.userAgent.includes('Chrome') && 
                        !navigator.userAgent.includes('Safari');
    const useWebAudioFallback = isLinux || isWebKitGTK;
    
    console.log('[STT] User agent:', navigator.userAgent);
    console.log('[STT] Using WebAudio fallback:', useWebAudioFallback);

    if (useWebAudioFallback) {
      // Use WebAudioRecorder for WebKitGTK
      console.log('[STT] Starting WebAudioRecorder (fallback for WebKitGTK)');
      let webAudioSession: WebAudioRecorderSession;
      
      try {
        webAudioSession = await webAudioRecorder.start(stream);
      } catch (e) {
        console.error('[STT] WebAudioRecorder failed to start:', e);
        throw new Error('Failed to start audio recording');
      }

      return {
        stop: async () => {
          console.log('[STT] Stopping WebAudioRecorder');
          const wavBlob = await webAudioSession.stop();
          console.log('[STT] Got WAV blob, size:', wavBlob.size);
          
          if (wavBlob.size < 1000) {
            console.error('[STT] WAV blob too small, likely no audio captured');
            return '';
          }
          
          const wavFile = new File([wavBlob], 'recording.wav', { type: 'audio/wav' });
          
          if (provider === 'openai') {
            return await transcribeWithOpenAIFile(wavFile);
          }
          
          const config = sttConfigStore.get();
          const url = config.localUrl?.trim();
          if (!url) {
            throw new Error('Local STT URL is not configured.');
          }
          
          return await transcribeWithLocalFile(wavFile, url);
        },
        abort: () => {
          webAudioSession.abort();
        }
      };
    }

    // Standard MediaRecorder path
    const mimeType = getPreferredMimeType();
    console.log('[STT] Starting MediaRecorder with mimeType:', mimeType);
    
    // Try to create MediaRecorder with explicit options
    let recorder: MediaRecorder;
    try {
      const options: MediaRecorderOptions = {};
      if (mimeType) {
        options.mimeType = mimeType;
      }
      // Try with higher bitrate
      options.audioBitsPerSecond = 128000;
      
      recorder = new MediaRecorder(stream, options);
      console.log('[STT] MediaRecorder created with mimeType:', recorder.mimeType);
    } catch (e) {
      console.error('[STT] Failed to create MediaRecorder with options, trying default:', e);
      recorder = new MediaRecorder(stream);
      console.log('[STT] MediaRecorder created with default mimeType:', recorder.mimeType);
    }
    
    const chunks: BlobPart[] = [];

    recorder.ondataavailable = (event: BlobEvent) => {
      console.log('[STT] ondataavailable fired, data size:', event.data?.size || 0);
      if (event.data && event.data.size > 0) {
        chunks.push(event.data);
        console.log('[STT] Chunk added, total chunks:', chunks.length);
      }
    };

    recorder.onerror = (event: Event) => {
      console.error('[STT] MediaRecorder error:', event);
    };

    recorder.onstart = () => {
      console.log('[STT] MediaRecorder started, state:', recorder.state, 'mimeType:', recorder.mimeType);
    };

    // Start recording with timeslice to get periodic data
    recorder.start(500); // Get data every 500ms for faster feedback
    console.log('[STT] MediaRecorder.start() called');

    const stop = async (): Promise<string> => {
      console.log('[STT] Stopping recorder, current state:', recorder.state, 'chunks so far:', chunks.length);
      
      return new Promise((resolve, reject) => {
        // Set up the onstop handler before calling stop
        recorder.onstop = async () => {
          console.log('[STT] MediaRecorder stopped, total chunks:', chunks.length);
          
          // Calculate total size
          let totalSize = 0;
          chunks.forEach(chunk => {
            if (chunk instanceof Blob) totalSize += chunk.size;
          });
          console.log('[STT] Total audio data size:', totalSize, 'bytes');
          
          if (totalSize === 0) {
            console.error('[STT] No audio data captured! This is likely a WebKitGTK MediaRecorder issue on Linux.');
            resolve(''); // Return empty instead of failing
            return;
          }
          
          try {
            if (provider === 'openai') {
              const result = await transcribeWithOpenAI(chunks, recorder.mimeType || mimeType);
              resolve(result);
              return;
            }

            const config = sttConfigStore.get();
            const url = config.localUrl?.trim();
            if (!url) {
              reject(new Error('Local STT URL is not configured.'));
              return;
            }

            const result = await transcribeWithLocal(chunks, recorder.mimeType || mimeType, url);
            resolve(result);
          } catch (error) {
            reject(error);
          }
        };

        // Now stop the recorder
        if (recorder.state !== 'inactive') {
          recorder.stop();
        } else {
          // Already stopped, trigger onstop manually
          recorder.onstop?.(new Event('stop'));
        }
      });
    };

    const abort = () => {
      console.log('[STT] Aborting recorder');
      if (recorder.state !== 'inactive') {
        recorder.stop();
      }
    };

    return { stop, abort };
  }
};

export default sttService;
