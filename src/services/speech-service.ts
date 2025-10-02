import { OpenaiTtsService, VoiceOption } from '@/app/openai-tts';
import { inject, Injectable, signal } from '@angular/core';

export interface SpeechSynthesisOptions {
  text: string;
  voice?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
}

@Injectable({ providedIn: 'any' })
export class SpeechService {
  isSpeaking = signal(false);
  voices = signal<VoiceOption[]>([]);
  audioElement = signal<HTMLAudioElement | null>(null);
  openaiTtsService: OpenaiTtsService = inject(OpenaiTtsService);

  constructor() {}

  initialize() {
    this.loadVoices();
  }

  async speak(options: SpeechSynthesisOptions) {
    this.isSpeaking.set(true);

    const audio = new Audio();

    this.openaiTtsService
      .generateSpeech(options.text, {
        voice: options.voice!,
        speed: options.rate!,
      })
      .subscribe({
        next: (buffer: ArrayBuffer) => {
          const blob = new Blob([buffer], { type: 'audio/mpeg' });
          const url = URL.createObjectURL(blob);
          audio.src = url;
        },
        error: (error) => {
          console.error('Error generating speech:', error);
          audio.src = '/ElevenLabs_Emma_consonants.mp3';
        },
      });

    this.audioElement.set(audio);

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
