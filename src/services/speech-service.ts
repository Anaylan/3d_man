import { OpenaiTtsService, VoiceOption } from '@/app/openai-tts';
import { inject, Injectable, signal } from '@angular/core';
import { CacheService } from './cache-service';

export interface SpeechSynthesisOptions {
  text?: string;
  voice?: string;
  rate?: number;
  volume?: number;
  preservesPitch?: boolean;
}

export interface StreamingSpeechOptions extends Omit<SpeechSynthesisOptions, 'text'> {
  minChunkLength?: number;
  maxChunkLength?: number;
  bufferTimeout?: number;
}

@Injectable({ providedIn: 'any' })
export class SpeechService {
  isSpeaking = signal(false);
  isGenerating = signal(false);
  audioQueueLength = signal(0);
  voices = signal<VoiceOption[]>([]);
  audioElement = signal<HTMLAudioElement | null>(null);
  openaiTtsService: OpenaiTtsService = inject(OpenaiTtsService);

  // Streaming properties
  private textBuffer = '';
  private audioQueue: HTMLAudioElement[] = [];
  private pendingRequests = 0;
  private bufferTimer: any = null;
  private currentStreamOptions: StreamingSpeechOptions | null = null;

  // Buffer config by default
  private readonly DEFAULT_MIN_CHUNK_LENGTH = 100;
  private readonly DEFAULT_MAX_CHUNK_LENGTH = 500;
  private readonly DEFAULT_BUFFER_TIMEOUT = 2000;

  constructor(private cacheService: CacheService) {
    this.loadVoices();
  }

  /**
   * Legacy
   */
  async speak(options: SpeechSynthesisOptions) {
    this.stop();
    this.isSpeaking.set(true);

    const audio = new Audio();

    const key = `${options.voice || 'default'}: ${options.text}`;
    const blob = await this.getOrGenerateAudio(key, options);
    const url = URL.createObjectURL(blob);

    this.configureAudio(audio, url, options);
    this.audioElement.set(audio);

    await audio.play();
  }

  /**
   * New: maybe bot correct
   */
  startStreaming(options: StreamingSpeechOptions): void {
    this.stop();
    this.currentStreamOptions = {
      ...options,
      minChunkLength: options.minChunkLength ?? this.DEFAULT_MIN_CHUNK_LENGTH,
      maxChunkLength: options.maxChunkLength ?? this.DEFAULT_MAX_CHUNK_LENGTH,
      bufferTimeout: options.bufferTimeout ?? this.DEFAULT_BUFFER_TIMEOUT,
    };
    this.isGenerating.set(true);
    this.textBuffer = '';
    this.audioQueue = [];
    this.audioQueueLength.set(0);
  }

  /**
   * add chunk
   */
  async addTextChunk(chunk: string): Promise<void> {
    if (!this.isGenerating()) {
      console.warn('Streaming not started. Call startStreaming() first.');
      return;
    }

    this.textBuffer += chunk;

    if (this.bufferTimer) {
      clearTimeout(this.bufferTimer);
    }

    if (this.shouldProcessBuffer()) {
      await this.processBuffer();
    } else {
      this.bufferTimer = setTimeout(() => {
        if (this.textBuffer.length > 0) {
          this.processBuffer();
        }
      }, this.currentStreamOptions!.bufferTimeout);
    }
  }

  /**
   * end streaming
   */
  async finalizeStreaming(): Promise<void> {
    if (!this.isGenerating()) {
      return;
    }

    if (this.bufferTimer) {
      clearTimeout(this.bufferTimer);
      this.bufferTimer = null;
    }

    if (this.textBuffer.trim()) {
      await this.processBuffer();
    }

    while (this.pendingRequests > 0) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    this.isGenerating.set(false);
    this.currentStreamOptions = null;
  }

  /**
   * 
   */
  private shouldProcessBuffer(): boolean {
    if (!this.currentStreamOptions) return false;

    const buffer = this.textBuffer.trim();

    if (buffer.length < this.currentStreamOptions.minChunkLength!) {
      return false;
    }

    if (buffer.length >= this.currentStreamOptions.maxChunkLength!) {
      return true;
    }

    const endsWithPause = /[.!?,;:]\s*$/.test(buffer);

    return endsWithPause;
  }

  /**
   * 
   */
  private async processBuffer(): Promise<void> {
    const textToProcess = this.textBuffer.trim();
    if (!textToProcess || !this.currentStreamOptions) return;

    this.textBuffer = '';
    this.pendingRequests++;

    try {
      const options: SpeechSynthesisOptions = {
        text: textToProcess,
        voice: this.currentStreamOptions.voice,
        rate: this.currentStreamOptions.rate,
        volume: this.currentStreamOptions.volume,
        preservesPitch: this.currentStreamOptions.preservesPitch,
      };

      const key = `${options.voice || 'default'}: ${textToProcess}`;
      const blob = await this.getOrGenerateAudio(key, options);
      const url = URL.createObjectURL(blob);

      const audio = new Audio();
      this.configureStreamingAudio(audio, url, options);

      this.audioQueue.push(audio);
      this.audioQueueLength.set(this.audioQueue.length);

      if (!this.isSpeaking()) {
        this.playNextInQueue();
      }
    } catch (error) {
      console.error('Error processing buffer:', error);
    } finally {
      this.pendingRequests--;
    }
  }

  /**
   * 
   */
  private configureStreamingAudio(
    audioRef: HTMLAudioElement,
    url: string,
    options: SpeechSynthesisOptions
  ): void {
    audioRef.src = url;
    audioRef.playbackRate = options.rate ?? 1.0;
    audioRef.volume = options.volume ?? 1.0;
    audioRef.preservesPitch = options.preservesPitch ?? true;

    audioRef.onended = () => {
      URL.revokeObjectURL(url);
      this.playNextInQueue();
    };

    audioRef.onerror = (error) => {
      console.error('Audio playback error:', error);
      URL.revokeObjectURL(url);
      this.playNextInQueue();
    };
  }

  /**
   * 
   */
  private playNextInQueue(): void {
    if (this.audioQueue.length === 0) {
      this.isSpeaking.set(false);
      this.audioQueueLength.set(0);
      this.audioElement.set(null);
      return;
    }

    this.isSpeaking.set(true);
    const audio = this.audioQueue.shift()!;
    this.audioQueueLength.set(this.audioQueue.length);
    this.audioElement.set(audio);

    audio.play().catch((error) => {
      console.error('Playback error:', error);
      this.playNextInQueue();
    });
  }

  /**
   * 
   */
  public configureAudio(
    audioRef: HTMLAudioElement,
    url: string,
    options: SpeechSynthesisOptions
  ): void {
    audioRef.src = url;
    audioRef.playbackRate = options.rate ?? 1.0;
    audioRef.volume = options.volume ?? 1.0;
    audioRef.preservesPitch = options.preservesPitch ?? true;

    audioRef.onended = () => {
      this.isSpeaking.set(false);
      this.cleanupAudio();
    };

    audioRef.onerror = (error) => {
      console.error('Audio playback error:', error);
      this.isSpeaking.set(false);
      this.cleanupAudio();
    };
  }

  private async getOrGenerateAudio(key: string, options: SpeechSynthesisOptions): Promise<Blob> {
    const cachedBlob = (await this.cacheService.get(key)) as Blob;

    if (cachedBlob) {
      return cachedBlob;
    }

    return await this.generateAndCacheAudio(key, options);
  }

  private generateAndCacheAudio(key: string, options: SpeechSynthesisOptions): Promise<Blob> {
    return new Promise((resolve) => {
      this.openaiTtsService
        .generateSpeech(options.text!, {
          voice: options.voice!,
        })
        .subscribe({
          next: async (buffer: ArrayBuffer) => {
            const blob = new Blob([buffer], { type: 'audio/mpeg' });
            await this.cacheService.set(key, blob);
            resolve(blob);
          },
          error: (error) => {
            console.error('Error generating speech:', error);
            resolve(new Blob([], { type: 'audio/mpeg' }));
          },
        });
    });
  }

  stop(): void {
    this.audioElement.update((_value) => {
      if (_value) {
        _value.pause();
        _value.currentTime = 0;
      }
      return _value;
    });

    this.audioQueue.forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
    });
    this.audioQueue = [];

    this.isSpeaking.set(false);
    this.isGenerating.set(false);
    this.audioQueueLength.set(0);
    this.textBuffer = '';
    this.pendingRequests = 0;

    if (this.bufferTimer) {
      clearTimeout(this.bufferTimer);
      this.bufferTimer = null;
    }

    this.cleanupAudio();
  }

  private loadVoices(): void {
    this.voices.set(this.openaiTtsService.getVoices());
  }

  public getAudioElement(): HTMLAudioElement | null {
    return this.audioElement();
  }

  private cleanupAudio(): void {
    this.audioElement.update((_value) => {
      if (_value) {
        _value.srcObject = null;
        _value = null;
      }
      return _value;
    });

    this.audioElement.set(null);
  }

  public dispose(): void {
    this.stop();
  }
}
