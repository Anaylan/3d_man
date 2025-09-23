import { Injectable, signal } from '@angular/core';

export interface EmotionConfig {}

@Injectable({
  providedIn: 'root',
})
export class EmotionService {
  currentEmotion = signal('neutral');

  private emotionConfigs: Record<string, EmotionConfig> = {
    neutral: {},
    happy: {},
    sad: {},
    angry: {},
    surprised: {},
    confused: {},
  };

  constructor() {}

  async setEmotion(emotion: string) {
    this.currentEmotion.set(emotion);
  }

  getEmotionConfig(emotion: string): EmotionConfig {
    return this.emotionConfigs[emotion] || this.emotionConfigs['neutral'];
  }
}
