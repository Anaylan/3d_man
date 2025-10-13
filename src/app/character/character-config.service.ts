import { Injectable } from '@angular/core';
import { CharacterConfig } from './character.models';

/**
 * @class CharacterConfigService
 * @description Provides configuration data for characters.
 * This service centralizes all static assets and settings,
 * allowing the Character component to be fully generic.
 */
@Injectable({ providedIn: 'root' })
export class CharacterConfigService {
  /**
   * @method getJenniferConfig
   * @description Returns the complete configuration for the character.
   * @returns {CharacterConfig}
   */
  getConfig(configPath: string): CharacterConfig {
    return {
      modelPath: '/models/Avatar.glb',
      emotions: [
        { value: 'neutral', label: 'Neutral', path: '/animations/Idle.fbx' },
        { value: 'happy', label: 'Happy', path: '/animations/Happy.fbx' },
        { value: 'sad', label: 'Sad', path: '/animations/Rejected.fbx' },
      ],
      lipsyncSettings: {
        smoothing: {
          vowel: 0.2,
          consonant: 0.4,
          silent: .6,
        },
        activationThreshold: 0.15,
      },
    };
  }
}
