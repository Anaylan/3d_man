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
  textStream?: ReadableStream<string>;
}

@Injectable({ providedIn: 'any' })
export class SpeechService {
  // --- Public Signals ---
  isSpeaking = signal(false);
  isGenerating = signal(false);
  audioQueueLength = signal(0);
  voices = signal<VoiceOption[]>([]);
  audioElement = signal<HTMLAudioElement | null>(null);

  // --- Private Dependencies ---
  private readonly cacheService = inject(CacheService);
  private readonly openaiTtsService = inject(OpenaiTtsService);

  // --- Streaming State ---
  private audioQueue: HTMLAudioElement[] = [];
  private pendingRequests = 0;
  private currentStreamOptions: Omit<StreamingSpeechOptions, 'textStream'> | null = null;
  private streamReader: ReadableStreamDefaultReader<string> | null = null;

  constructor() {
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
    const blob = await this._getOrGenerateAudio(key, options);
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
    this.isGenerating.set(true);

    const { textStream, ...streamOptions } = options;
    this.currentStreamOptions = streamOptions;

    this._processTextStream(textStream!).catch((error) => {
      if (error.name !== 'AbortError') {
        console.error('Error processing text stream:', error);
      }
    });
  }

  /**
   * Reads from a text stream and feeds chunks into the service.
   */
  private async _processTextStream(stream: ReadableStream<string>): Promise<void> {
    this.streamReader = stream.getReader();

    try {
      while (this.isGenerating()) {
        const { value, done } = await this.streamReader.read();

        if (done) {
          break;
        }

        if (value) {
          await this._generateAndQueueAudio(value);
        }
      }
    } finally {
      if (this.streamReader) {
        this.streamReader.releaseLock();
        this.streamReader = null;
      }
    }

    this.isGenerating.set(false);
    this.currentStreamOptions = null;
  }

  /**
   * 
   */
  private async _generateAndQueueAudio(textChunk: string): Promise<void> {
    const trimmedChunk = textChunk.trim();
    if (!trimmedChunk || !this.currentStreamOptions) return;

    this.pendingRequests++;
    try {
      const options: SpeechSynthesisOptions = {
        text: trimmedChunk,
        voice: this.currentStreamOptions.voice,
        rate: this.currentStreamOptions.rate,
        volume: this.currentStreamOptions.volume,
      };

      const key = `${options.voice || 'default'}: ${trimmedChunk}`;
      const blob = await this._getOrGenerateAudio(key, options);
      if (blob.size === 0) return;

      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.playbackRate = options.rate ?? 1.0;
      audio.volume = options.volume ?? 1.0;

      const onFinish = () => {
        URL.revokeObjectURL(url);
        this._playNextInQueue();
        audio.removeEventListener('ended', onFinish);
        audio.removeEventListener('error', onFinish);
      };

      audio.addEventListener('ended', onFinish);
      audio.addEventListener('error', onFinish);

      this.audioQueue.push(audio);
      this.audioQueueLength.set(this.audioQueue.length);

      if (!this.isSpeaking()) {
        this._playNextInQueue();
      }
    } catch (error) {
      console.error('Error processing text chunk:', error);
    } finally {
      this.pendingRequests--;
    }
  }

  /**
   */
  private _playNextInQueue(): void {
    if (this.audioQueue.length === 0) {
      this.isSpeaking.set(false);
      this.audioElement.set(null);
      return;
    }

    this.isSpeaking.set(true);
    const audio = this.audioQueue.shift()!;
    this.audioQueueLength.set(this.audioQueue.length);
    this.audioElement.set(audio);

    audio.play().catch((error) => {
      console.error('Playback error:', error);
      this._playNextInQueue();
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

  private async _getOrGenerateAudio(key: string, options: SpeechSynthesisOptions): Promise<Blob> {
    const cachedBlob = (await this.cacheService.get(key)) as Blob;

    if (cachedBlob) {
      return cachedBlob;
    }

    return await this._generateAndCacheAudio(key, options);
  }

  private _generateAndCacheAudio(key: string, options: SpeechSynthesisOptions): Promise<Blob> {
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

  private _stopAndClearAudio(audio: HTMLAudioElement): void {
    audio.pause();
    audio.currentTime = 0;
    if (audio.src && audio.src.startsWith('blob:')) {
      URL.revokeObjectURL(audio.src);
    }
    audio.src = '';
    audio.onended = null;
    audio.onerror = null;
  }

  stop(): void {
    const currentAudio = this.audioElement();
    if (currentAudio) {
      this._stopAndClearAudio(currentAudio);
    }
    this.audioElement.set(null);

    this.audioQueue.forEach((audio) => this._stopAndClearAudio(audio));
    this.audioQueue = [];

    if (this.streamReader) {
      this.streamReader.cancel();
      this.streamReader = null;
    }

    this.isSpeaking.set(false);
    this.isGenerating.set(false);
    this.audioQueueLength.set(0);
    this.pendingRequests = 0;
    this.currentStreamOptions = null;
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
