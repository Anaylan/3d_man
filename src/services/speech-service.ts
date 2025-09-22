import { Injectable, signal } from '@angular/core';
import { EmotionService } from './emotion-service';


export interface SpeechOptions {
  text: string;
  voice?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
}

export interface VoiceOption {
  name: string;
  lang: string;
}

@Injectable({
  providedIn: 'root'
})
export class SpeechService {
  isSpeaking = signal(false);
  voices = signal<VoiceOption[]>([]);

  private speechSynthesis: SpeechSynthesis;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private mouthAnimationId: number | null = null;

  constructor(
    private emotionService: EmotionService,
  ) {
    this.speechSynthesis = window.speechSynthesis;
  }

  initialize() {
    this.loadVoices();

    if (this.speechSynthesis.onvoiceschanged !== undefined) {
      this.speechSynthesis.onvoiceschanged = () => this.loadVoices();
    }
  }

  speak(options: SpeechOptions) {
    if (this.isSpeaking()) {
      this.stop();
    }

    const utterance = new SpeechSynthesisUtterance(options.text);

    // Настройка голоса
    if (options.voice) {
      const voice = this.speechSynthesis.getVoices().find(v => v.name === options.voice);
      if (voice) {
        utterance.voice = voice;
      }
    }

    utterance.rate = options.rate || 1;
    utterance.pitch = options.pitch || 1;
    utterance.volume = options.volume || 1;

    utterance.onstart = () => {
      this.isSpeaking.set(true);
      this.startMouthAnimation();
    };

    utterance.onend = () => {
      this.isSpeaking.set(false);
      this.stopMouthAnimation();
    };

    utterance.onerror = () => {
      this.isSpeaking.set(false);
      this.stopMouthAnimation();
    };

    this.currentUtterance = utterance;
    this.speechSynthesis.speak(utterance);
  }

  stop() {
    if (this.speechSynthesis.speaking) {
      this.speechSynthesis.cancel();
    }

    this.isSpeaking.set(false);
    this.stopMouthAnimation();
  }

  private loadVoices() {
    const voiceList = this.speechSynthesis.getVoices();
    const voices = voiceList.map(voice => ({
      name: voice.name,
      lang: voice.lang
    }));

    this.voices.set(voices);
  }

  private startMouthAnimation() {
    // const character = this.threeService.getCharacter();
    // if (!character) return;

    const mouth = null;
    if (!mouth) return;

    const animate = () => {
      if (!this.isSpeaking()) return;

      const time = Date.now() * 0.01;
      const scale = 0.3 + Math.abs(Math.sin(time)) * 0.4;
      // mouth.scale.y = scale;

      this.mouthAnimationId = requestAnimationFrame(animate);
    };

    animate();
  }

  private stopMouthAnimation() {
    if (this.mouthAnimationId) {
      cancelAnimationFrame(this.mouthAnimationId);
      this.mouthAnimationId = null;
    }

    // const character = this.threeService.getCharacter();
    // if (!character) return;

    const mouth = null;
    if (!mouth) return;

    // Возврат рта к нормальному состоянию
    const emotionConfig = this.emotionService.getEmotionConfig(
      this.emotionService.currentEmotion()
    );
    // mouth.scale.copy(emotionConfig.mouthScale);
  }

  dispose() {
    this.stop();
  }
}
