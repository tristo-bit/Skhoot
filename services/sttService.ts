import { audioService } from './audioService';
import { apiKeyService } from './apiKeyService';
import { sttConfigStore, SttProvider } from './sttConfig';

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
    'audio/ogg'
  ];

  for (const mimeType of candidates) {
    if (MediaRecorder.isTypeSupported(mimeType)) return mimeType;
  }

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

    const mimeType = getPreferredMimeType();
    console.log('[STT] Starting MediaRecorder with mimeType:', mimeType);
    
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
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
      console.log('[STT] MediaRecorder started, state:', recorder.state);
    };

    // Start recording with timeslice to get periodic data
    recorder.start(1000); // Get data every 1 second
    console.log('[STT] MediaRecorder.start() called');

    const stop = async (): Promise<string> => {
      console.log('[STT] Stopping recorder, current state:', recorder.state, 'chunks so far:', chunks.length);
      
      return new Promise((resolve, reject) => {
        // Set up the onstop handler before calling stop
        recorder.onstop = async () => {
          console.log('[STT] MediaRecorder stopped, total chunks:', chunks.length);
          
          try {
            if (provider === 'openai') {
              const result = await transcribeWithOpenAI(chunks, mimeType);
              resolve(result);
              return;
            }

            const config = sttConfigStore.get();
            const url = config.localUrl?.trim();
            if (!url) {
              reject(new Error('Local STT URL is not configured.'));
              return;
            }

            const result = await transcribeWithLocal(chunks, mimeType, url);
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
