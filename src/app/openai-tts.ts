import { Injectable } from '@angular/core';
import { environment } from '@/environments/environment';
import OpenAI from 'openai';
import { from, Observable } from 'rxjs';

export type VoiceType =
  | (string & {})
  | 'alloy'
  | 'ash'
  | 'ballad'
  | 'coral'
  | 'echo'
  | 'sage'
  | 'shimmer'
  | 'verse'
  | 'marin'
  | 'cedar';

export interface VoiceOption {
  name: string;
  lang: string;
  voiceId: VoiceType;
}

export interface SpeechOptions {
  voice?: VoiceType;
  model?: string;
  speed?: number;
}

@Injectable({
  providedIn: 'root',
})
export class OpenaiTtsService {
  private apiKey = environment.OPENAI_API_KEY;
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({ apiKey: this.apiKey, dangerouslyAllowBrowser: true, maxRetries: 0 });
  }

  generateSpeech(text: string, options?: SpeechOptions): Observable<Buffer<ArrayBuffer>> {
    return from(
      (async () => {
        const response = await this.openai.audio.speech.create({
          input: text,
          model: options?.model || 'tts-1',
          voice: options?.voice || 'alloy',
          speed: options?.speed || 1,
        });
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
      })()
    );
  }

  getVoices(): VoiceOption[] {
    return [
      {
        voiceId: 'alloy',
        name: 'Alloy',
        lang: 'en-US',
      },
      {
        voiceId: 'echo',
        name: 'Echo',
        lang: 'en-US',
      },
      {
        voiceId: 'fable',
        name: 'Fable',
        lang: 'en-US',
      },
      {
        voiceId: 'nova',
        name: 'Nova',
        lang: 'en-US',
      },
      {
        voiceId: 'onyx',
        name: 'Onyx',
        lang: 'en-US',
      },
      {
        voiceId: 'shimmer',
        name: 'Shimmer',
        lang: 'en-US',
      },
    ];
  }
}
