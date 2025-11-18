import { VISEMES } from 'wawa-lipsync';

/**
 * @interface EmotionConfig
 * @description Defines the structure for a single character emotion animation.
 */
export interface EmotionConfig {
  value: string; // The unique identifier for the emotion (e.g., 'happy')
  label: string; // The display name for the emotion (e.g., 'Happy')
  path: string; // The path to the corresponding animation file (e.g., '/animations/Happy.fbx')
}

/**
 * @interface VisemeConfig
 * @description Maps viseme names to their phonetic type.
 */
export type VisemeConfig = Record<
  VISEMES,
  {
    type: 'vowel' | 'consonant' | 'silent';
  }
>;

/**
 * @interface CharacterConfig
 * @description A comprehensive configuration object for a character.
 */
export interface CharacterConfig {
  voice: string;
  prompt?: string;
  modelPath: string;
  emotions: EmotionConfig[];
  lipsyncSettings: {
    smoothing: {
      vowel: number;
      consonant: number;
      silent: number;
    };
    activationThreshold: number;
  };
}
