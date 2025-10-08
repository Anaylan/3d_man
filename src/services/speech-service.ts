import { OpenaiTtsService, VoiceOption } from '@/app/openai-tts';
import { inject, Injectable, signal } from '@angular/core';
import { CacheService } from './cache-service';

export interface SpeechSynthesisOptions {
  text: string;
  voice?: string;
  rate?: number;
  volume?: number;
}

@Injectable({ providedIn: 'any' })
export class SpeechService {
  isSpeaking = signal(false);
  voices = signal<VoiceOption[]>([]);
  audioElement = signal<HTMLAudioElement | null>(null);
  openaiTtsService: OpenaiTtsService = inject(OpenaiTtsService);

  constructor(private cacheService: CacheService) {
    this.loadVoices();
  }

  async speak(options: SpeechSynthesisOptions) {
    this.isSpeaking.set(true);

    const audio = new Audio();

    const key = this.buildCacheKey(options);
    const blob = await this.getOrGenerateAudio(key, options);
    const url = URL.createObjectURL(blob);

    audio.src = url;
    this.audioElement.set(audio);
    audio.playbackRate = options.rate ?? 1.0;
    audio.volume = options.volume ?? 1.0;
    audio.preservesPitch = false;

    audio.onended = () => {
      this.isSpeaking.set(false);
      this.cleanupAudio();
    };

    audio.onerror = (error) => {
      console.error('Audio playback error:', error);
      this.isSpeaking.set(false);
      this.cleanupAudio();
    };

    await audio.play();
  }

  private buildCacheKey(options: SpeechSynthesisOptions): string {
    return `${options.voice || 'default'}: ${options.text}`;
  }

  private async getOrGenerateAudio(key: string, options: SpeechSynthesisOptions): Promise<Blob> {
    const cachedBlob = (await this.cacheService.get(key)) as Blob;

    if (cachedBlob) {
      return cachedBlob;
    }

    return await this.generateAndCacheAudio(key, options);
  }

  private generateAndCacheAudio(key: string, options: SpeechSynthesisOptions): Promise<Blob> {
    return new Promise((resolve, reject) => {
      this.openaiTtsService
        .generateSpeech(options.text, {
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
            reject(error);
          },
        });
    });
  }

  stop() {
    this.audioElement.update((_value) => {
      if (_value) {
        _value.pause();
        _value.currentTime = 0;
      }
      return _value;
    });

    this.isSpeaking.set(false);
    this.cleanupAudio();
  }

  private loadVoices(): void {
    this.voices.set(this.openaiTtsService.getVoices());
  }

  public getAudioElement(): HTMLAudioElement | null {
    return this.audioElement();
  }

  private cleanupAudio() {
    this.audioElement.update((_value) => {
      if (_value) {
        _value.srcObject = null;
        _value = null;
      }
      return _value;
    });

    this.audioElement.set(null);
  }

  public dispose() {
    this.stop();
  }
}
