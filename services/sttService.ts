import { audioService } from './audioService';
import { apiKeyStore } from './apiKeyStore';
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

const resolveProvider = (): SttProvider | null => {
  const config = sttConfigStore.get();
  const preference = config.provider;

  const hasWebSpeech = sttConfigStore.hasWebSpeechSupport();
  const hasOpenAI = apiKeyStore.has();
  const hasLocal = !!config.localUrl?.trim();

  if (preference === 'web-speech') return hasWebSpeech ? 'web-speech' : null;
  if (preference === 'openai') return hasOpenAI ? 'openai' : null;
  if (preference === 'local') return hasLocal ? 'local' : null;

  if (hasWebSpeech) return 'web-speech';
  if (hasLocal) return 'local';
  if (hasOpenAI) return 'openai';

  return null;
};

const transcribeWithOpenAI = async (chunks: BlobPart[], mimeType: string | null): Promise<string> => {
  const apiKey = apiKeyStore.get();
  if (!apiKey) {
    throw new Error('Missing API key. Add your API key in User Profile to enable cloud transcription.');
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
  const audioFile = buildAudioFile(chunks, mimeType);
  const formData = new FormData();
  formData.append('file', audioFile);
  const lang = getLanguageHint();
  if (lang) formData.append('language', lang);
  if (url.includes('/v1/audio/transcriptions')) {
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'json');
  }

  const response = await fetch(url, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Transcription failed: ${response.status} ${errorText}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const result = await response.json();
    return (result?.text || result?.transcript || '').trim();
  }

  return (await response.text()).trim();
};

export const sttService = {
  getProviderDecision(): SttProvider | null {
    return resolveProvider();
  },

  isAvailable(): boolean {
    if (typeof window === 'undefined') return false;
    const provider = resolveProvider();
    if (!provider) return false;
    if (provider === 'web-speech') {
      return audioService.isSpeechRecognitionSupported();
    }
    if (!('MediaRecorder' in window)) return false;
    if (!audioService.isAudioSupported()) return false;
    return true;
  },

  async startRecording(stream: MediaStream, providerOverride?: SttProvider): Promise<SttSession> {
    const provider = providerOverride || resolveProvider();
    if (!provider || provider === 'web-speech') {
      throw new Error('No STT provider available for fallback transcription.');
    }

    const mimeType = getPreferredMimeType();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const chunks: BlobPart[] = [];

    recorder.ondataavailable = (event: BlobEvent) => {
      if (event.data && event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    recorder.start();

    const stop = async (): Promise<string> => {
      if (recorder.state !== 'inactive') {
        recorder.stop();
      }

      await new Promise<void>((resolve) => {
        if (recorder.state === 'inactive') {
          resolve();
        } else {
          recorder.onstop = () => resolve();
        }
      });

      if (provider === 'openai') {
        return await transcribeWithOpenAI(chunks, mimeType);
      }

      const config = sttConfigStore.get();
      const url = config.localUrl?.trim();
      if (!url) {
        throw new Error('Local STT URL is not configured.');
      }

      return await transcribeWithLocal(chunks, mimeType, url);
    };

    const abort = () => {
      if (recorder.state !== 'inactive') {
        recorder.stop();
      }
    };

    return { stop, abort };
  }
};

export default sttService;
