/**
 * Web Audio API based audio recorder
 * Fallback for when MediaRecorder doesn't work (e.g., WebKitGTK on Linux)
 * 
 * This uses ScriptProcessorNode to capture raw PCM audio and converts it to WAV
 */

export interface WebAudioRecorderSession {
  stop: () => Promise<Blob>;
  abort: () => void;
}

export class WebAudioRecorder {
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private audioChunks: Float32Array[] = [];
  private isRecording = false;
  private sampleRate = 16000; // Whisper prefers 16kHz

  async start(stream: MediaStream): Promise<WebAudioRecorderSession> {
    console.log('[WebAudioRecorder] Starting...');
    
    // Create audio context with target sample rate
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.audioContext = new AudioContextClass({ sampleRate: this.sampleRate });
    
    // If context sample rate differs, we'll need to resample
    const actualSampleRate = this.audioContext.sampleRate;
    console.log('[WebAudioRecorder] AudioContext sample rate:', actualSampleRate);
    
    // Create source from stream
    this.sourceNode = this.audioContext.createMediaStreamSource(stream);
    
    // Create script processor (deprecated but widely supported)
    // Buffer size of 4096 is a good balance between latency and performance
    this.processorNode = this.audioContext.createScriptProcessor(4096, 1, 1);
    
    this.audioChunks = [];
    this.isRecording = true;
    
    this.processorNode.onaudioprocess = (event) => {
      if (!this.isRecording) return;
      
      const inputData = event.inputBuffer.getChannelData(0);
      // Clone the data since the buffer is reused
      const chunk = new Float32Array(inputData.length);
      chunk.set(inputData);
      this.audioChunks.push(chunk);
    };
    
    // Connect: source -> processor -> destination (required for processor to work)
    this.sourceNode.connect(this.processorNode);
    this.processorNode.connect(this.audioContext.destination);
    
    console.log('[WebAudioRecorder] Recording started');
    
    return {
      stop: async () => {
        console.log('[WebAudioRecorder] Stopping, chunks:', this.audioChunks.length);
        this.isRecording = false;
        
        // Disconnect nodes
        if (this.processorNode) {
          this.processorNode.disconnect();
          this.processorNode = null;
        }
        if (this.sourceNode) {
          this.sourceNode.disconnect();
          this.sourceNode = null;
        }
        
        // Merge all chunks
        const totalLength = this.audioChunks.reduce((acc, chunk) => acc + chunk.length, 0);
        console.log('[WebAudioRecorder] Total samples:', totalLength);
        
        const mergedData = new Float32Array(totalLength);
        let offset = 0;
        for (const chunk of this.audioChunks) {
          mergedData.set(chunk, offset);
          offset += chunk.length;
        }
        
        // Convert to WAV
        const wavBlob = this.encodeWAV(mergedData, actualSampleRate);
        console.log('[WebAudioRecorder] WAV blob size:', wavBlob.size);
        
        // Close audio context
        if (this.audioContext) {
          await this.audioContext.close();
          this.audioContext = null;
        }
        
        return wavBlob;
      },
      abort: () => {
        console.log('[WebAudioRecorder] Aborting');
        this.isRecording = false;
        this.audioChunks = [];
        
        if (this.processorNode) {
          this.processorNode.disconnect();
          this.processorNode = null;
        }
        if (this.sourceNode) {
          this.sourceNode.disconnect();
          this.sourceNode = null;
        }
        if (this.audioContext) {
          this.audioContext.close();
          this.audioContext = null;
        }
      }
    };
  }
  
  private encodeWAV(samples: Float32Array, sampleRate: number): Blob {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);
    
    // WAV header
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    this.writeString(view, 8, 'WAVE');
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk1Size
    view.setUint16(20, 1, true); // AudioFormat (PCM)
    view.setUint16(22, 1, true); // NumChannels (mono)
    view.setUint32(24, sampleRate, true); // SampleRate
    view.setUint32(28, sampleRate * 2, true); // ByteRate
    view.setUint16(32, 2, true); // BlockAlign
    view.setUint16(34, 16, true); // BitsPerSample
    this.writeString(view, 36, 'data');
    view.setUint32(40, samples.length * 2, true);
    
    // Convert float samples to 16-bit PCM
    let offset = 44;
    for (let i = 0; i < samples.length; i++) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      offset += 2;
    }
    
    return new Blob([buffer], { type: 'audio/wav' });
  }
  
  private writeString(view: DataView, offset: number, string: string): void {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }
}

export const webAudioRecorder = new WebAudioRecorder();
