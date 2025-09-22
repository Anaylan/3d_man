import { Injectable, signal } from '@angular/core';

export interface EmotionConfig {}

@Injectable({
  providedIn: 'root',
})
export class EmotionService {
  currentEmotion = signal('neutral');
  isAnimating = signal(false);

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
    if (this.isAnimating()) return;

    this.currentEmotion.set(emotion);
    this.isAnimating.set(true);

    try {
      // TODO: maybe bind listener?
    } finally {
      this.isAnimating.set(false);
    }
  }

  getEmotionConfig(emotion: string): EmotionConfig {
    return this.emotionConfigs[emotion] || this.emotionConfigs['neutral'];
  }
}
