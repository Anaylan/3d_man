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

  constructor() {
    this.loadVoices();
  }

  /**
   * Legacy
   */
  async speak(options: SpeechSynthesisOptions) {
    if (!options.text?.trim()) return;

    const audio = new Audio();

    const key = `${options.voice || 'default'}: ${options.text}`;
    const blob = await this._getOrGenerateAudio(key, options);

    if (blob.size === 0) return;
    const url = URL.createObjectURL(blob);

    audio.src = url;
    audio.playbackRate = options.rate ?? 1.0;
    audio.volume = options.volume ?? 1.0;
    audio.preservesPitch = options.preservesPitch ?? true;

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

    this.isSpeaking.set(false);
    this.audioQueueLength.set(0);
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
