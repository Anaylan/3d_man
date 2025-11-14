import { Injectable } from '@angular/core';
import { environment } from '@/environments/environment';
import OpenAI from 'openai';
import { from, Observable, Subject } from 'rxjs';
import { ChatCompletionMessageParam } from 'openai/resources/index.mjs';

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
}

@Injectable({
  providedIn: 'root',
})
export class OpenaiService {
  private apiKey = environment.OPENAI_API_KEY;
  private openai: OpenAI;
  public responseGenerated$ = new Subject<string>();
  private conversationHistory: Array<ChatCompletionMessageParam> = [];

  constructor() {
    this.openai = new OpenAI({ apiKey: this.apiKey, dangerouslyAllowBrowser: true, maxRetries: 0 });
  }

  generateResponse(prompt: string): void {
    (async () => {
      this.addUserPrompt(prompt);

      const stream = await this.openai.chat.completions.create({
        messages: this.conversationHistory,
        model: 'gpt-3.5-turbo',
        stream: true,
      });

      let fullResponse = '';
      let buffer = '';

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        fullResponse += content;
        buffer += content;

        const sentences = this.extractCompleteSentences(buffer);
        if (sentences.completeSentences.length > 0) {
          this.responseGenerated$.next(sentences.completeSentences.join(' '));
          buffer = sentences.remainder;
        }
      }

      if (buffer.trim()) {
        this.responseGenerated$.next(buffer.trim());
      }

      this.addAssistantResponse(fullResponse);
    })();
  }

  private addUserPrompt(prompt: string): void {
    this.conversationHistory.push({ role: 'user', content: prompt });
  }

  private addAssistantResponse(content: string): void {
    if (content) {
      this.conversationHistory.push({ role: 'assistant', content });
    }
  }

  private extractCompleteSentences(text: string): {
    completeSentences: string[];
    remainder: string;
  } {
    const sentencePattern = /([^.!?]+[.!?]+)/g;
    const matches = text.match(sentencePattern) || [];

    const completeSentences = matches.map((s) => s.trim());
    const processedLength = matches.join('').length;
    const remainder = text.substring(processedLength);

    return { completeSentences, remainder };
  }

  generateSpeech(text: string, options?: SpeechOptions): Observable<ArrayBuffer> {
    return from(
      (async () => {
        const response = await this.openai.audio.speech.create({
          input: text,
          model: options?.model || 'tts-1',
          voice: options?.voice || 'alloy',
        });
        return await response.arrayBuffer();
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
