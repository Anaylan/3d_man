import { Injectable } from '@angular/core';
import { CharacterConfig } from './character.models';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

/**
 * @class CharacterConfigService
 * @description Provides configuration data for characters.
 * This service centralizes all static assets and settings,
 * allowing the Character component to be fully generic.
 */
@Injectable({ providedIn: 'root' })
export class ConfigService {
  constructor(private http: HttpClient) {}

  /**
   * @method getJenniferConfig
   * @description Returns the complete configuration for the character.
   * @returns {CharacterConfig}
   */
  async getConfig(configName: string): Promise<CharacterConfig> {
    return await firstValueFrom(
      this.http.get<CharacterConfig>(`/characters/${configName}-config.json`)
    );
  }
}
