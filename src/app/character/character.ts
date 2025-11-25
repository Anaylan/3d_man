import {
  Component,
  OnInit,
  OnDestroy,
  signal,
  computed,
  effect,
  inject,
  input,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Lipsync, VISEMES } from 'wawa-lipsync';

// --- Services and Interfaces ---
import { EntityLoader } from '@/loaders/entity-loader';
import { AnimatorService } from '@/services/animator-service';
import { TickService } from '@/services/tick-service';
import { EmotionService } from '@/services/emotion-service';
import { SpeechService } from '@/services/speech-service';
import { ThreeService } from '@/services/three-service';
import { Tickable } from '../../interfaces/tickable';
import { CharacterConfig, VisemeConfig } from './character.models';
import { GUI } from 'dat.gui';
import { AIService } from '@/services/ai-service';

/**
 * @class Character
 * @description A reusable component that hosts a 3D model and wires up all related services.
 * It is configured dynamically via the CharacterConfigService.
 * @implements OnInit, OnDestroy, Tickable
 */
@Component({
  selector: 'app-character',
  imports: [CommonModule, FormsModule],
  templateUrl: './character.html',
  styleUrl: './character.scss',
})
export class Character implements OnInit, OnDestroy, Tickable {
  private animatorService!: AnimatorService;
  private lipsync: Lipsync = new Lipsync();
  private model!: THREE.Object3D<THREE.Object3DEventMap>;

  public emotionService = inject(EmotionService);
  public speechService = inject(SpeechService);
  public threeService = inject(ThreeService);
  private tickService = inject(TickService);

  readonly gui = input<GUI>();
  // --- All configuration is now provided externally ---
  readonly config = input<CharacterConfig>({
    voice: '',
    modelPath: '',
    emotions: [],
    lipsyncSettings: {
      smoothing: {
        vowel: 0,
        consonant: 0,
        silent: 0,
      },
      activationThreshold: 0,
    },
  });

  readonly VISEME_DETAILS: VisemeConfig = {
    viseme_PP: { type: 'consonant' },
    viseme_FF: { type: 'consonant' },
    viseme_TH: { type: 'consonant' },
    viseme_DD: { type: 'consonant' },
    viseme_kk: { type: 'consonant' },
    viseme_CH: { type: 'consonant' },
    viseme_SS: { type: 'consonant' },
    viseme_nn: { type: 'consonant' },
    viseme_RR: { type: 'consonant' },
    viseme_aa: { type: 'vowel' },
    viseme_E: { type: 'vowel' },
    viseme_I: { type: 'vowel' },
    viseme_O: { type: 'vowel' },
    viseme_U: { type: 'vowel' },
    viseme_sil: { type: 'silent' },
  };

  private readonly openaiService = inject(AIService);
  private debug!: GUI;

  constructor() {
    effect(() => {
      const audioEl = this.speechService.getAudioElement();
      if (audioEl) {
        this.lipsync.connectAudio(audioEl);
      }
    });

    effect(() => {
      this.setEmotion(this.selectedEmotion());
    });

    // It's doubtful, but it works.
    this.openaiService.responseGenerated$.subscribe(async (text) => {
      if (text.trim()) {
        await this.speak(text);
      }
    });
  }

  // --- Component State Signals ---
  debugSpeechText = signal('Hey! How are you doing?');
  selectedEmotion = signal('neutral');
  speechSpeed = signal(1);
  volume = signal(1);
  loopAudio = signal(false);
  preservesPitch = signal(false);

  // --- Computed property to derive status from the config ---
  currentStatus = computed(() => {
    const emotion = this.emotionService.currentEmotion();
    const emotionData = this.config().emotions.find((e) => e.value === emotion);
    return emotionData?.label || emotion;
  });

  /**
   * @method ngOnInit
   * @description Initializes the component by loading the configuration and spawning the character.
   */
  async ngOnInit(): Promise<void> {
    this.tickService.registerTickable(this);

    await this.spawn();
  }

  /**
   * @method ngOnDestroy
   * @description Cleans up services and unregisters from the tick service.
   */
  ngOnDestroy(): void {
    this.speechService.dispose();
    this.tickService.unregisterTickable(this);
    this.threeService.getScene().remove(this.model);

    this.gui()?.removeFolder(this.debug);

    if (this.animatorService) {
      this.tickService.unregisterTickable(this.animatorService);
    }
  }

  /**
   * @method spawn
   * @description Loads the 3D model and sets up the animator service based on the provided configuration.
   */
  private async spawn() {
    const loader = new EntityLoader(GLTFLoader);
    const { scene: model } = await loader.loadObjectAsync(this.config().modelPath);

    this.model = model;
    this.threeService.getScene().add(this.model);

    this.animatorService = new AnimatorService(this.model);
    this.animatorService.setMap(
      new Map(this.config().emotions.map(({ value, path }) => [value, path]))
    );

    if (this.gui()) {
      this.debug = this.gui()!.addFolder('Character');
      Object.entries(this).forEach(([key, value]) => {
        if (typeof value === 'function' && 'set' in value) {
          const signal = value;
          let options;

          if (key === 'selectedEmotion') options = this.config().emotions.map((e) => e.value);

          const controller = options
            ? this.debug.add({ value: signal() }, 'value', options)
            : this.debug.add({ value: signal() }, 'value');

          controller.name(key).onChange((v) => signal.set(v));
        }
      });
    }

    this.tickService.registerTickable(this.animatorService);
  }

  /**
   * @method update
   * @description Part of the Tickable interface. Called on every frame to update lipsync.
   * @param {number} deltaTime - Time elapsed since the last frame.
   */
  update(deltaTime: number): void {
    this.lipsync.processAudio();
    if (this.model && this.lipsync.features) {
      this.applyViseme();
    }
  }

  /**
   * @method applyViseme
   * @description Calculates viseme scores and applies them as morph targets to the model's mesh.
   * All parameters for this calculation are sourced from the injected configuration.
   */
  private applyViseme() {
    const current = this.lipsync.features;
    if (!current || !this.model || !this.config) return;

    const avg = this.lipsync.getAveragedFeatures();
    const scores = this.lipsync.computeVisemeScores(
      current,
      avg,
      current.volume - avg.volume,
      current.centroid - avg.centroid
    );
    const adjusted = this.lipsync.adjustScoresForConsistency(scores);

    let dominantViseme = VISEMES.sil;
    let maxScore = 0;

    const allVisemes = Object.values(VISEMES);

    for (const visemeName of allVisemes) {
      if (this.VISEME_DETAILS[visemeName].type === 'silent') continue;

      const score = adjusted[visemeName] || 0;
      if (score > maxScore) {
        maxScore = score;
        dominantViseme = visemeName;
      }
    }

    const threshold = this.config().lipsyncSettings.activationThreshold;
    const activeViseme = maxScore > threshold ? dominantViseme : VISEMES.sil;

    const speeds = this.config().lipsyncSettings.smoothing;

    for (const visemeName of allVisemes) {
      const targetValue = visemeName === activeViseme ? 1.0 : 0.0;

      const visemeType = this.VISEME_DETAILS[visemeName].type;
      const speed = speeds[visemeType];

      this.lerpMorphTarget(visemeName, targetValue, speed);
    }
  }

  /**
   * @method lerpMorphTarget
   * @description Smoothly interpolates a morph target to a new value.
   * @param {string} target - The name of the morph target.
   * @param {number} value - The target value (usually 0 or 1).
   * @param {number} speed - The interpolation speed.
   */
  private lerpMorphTarget(target: string, value: number, speed = 0.1) {
    this.model?.traverse((child) => {
      if (child instanceof THREE.SkinnedMesh) {
        const dict = child.morphTargetDictionary;
        const influences = child.morphTargetInfluences;
        const index = dict?.[target];

        if (index !== undefined && influences?.[index] !== undefined) {
          influences[index] = THREE.MathUtils.lerp(influences[index], value, speed);
        }
      }
    });
  }

  async speak(text: string) {
    await this.speechService.speak({
      text,
      voice: this.config().voice,
      rate: this.speechSpeed(),
      volume: this.volume(),
      preservesPitch: this.preservesPitch(),
    });
  }

  stopSpeaking() {
    this.speechService.stop();
  }

  async setEmotion(emotion: string) {
    this.emotionService.setEmotion(emotion);

    for (let i = 0; i < 100; i++) {
      if (this.animatorService?.isReady()) {
        this.animatorService.playAnimation(emotion);
        return;
      }
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  readonly AUDIO_CLIPS: Map<string, string> = new Map([
    ['Hey there! How are you today?', '/audio/1.mp3'],
    ['Hi! Great to see you again.', '/audio/2.mp3'],
    ["What's up? How can I help?", '/audio/3.mp3'],
    ["My name's Jennifer - I'm your friendly AI assistant.", '/audio/4.mp3'],
    ["Whoa! That's awesome!", '/audio/5.mp3'],
    ['Bravo! Well done!', '/audio/6.mp3'],
  ]);

  // async onKeyDown(event: KeyboardEvent) {
  //   if (event.code === 'Space' || event.key === ' ') {
  //     const text = this.debugSpeechText().trim();
  //     if (!text) return;

  //     const words = text.split(/\s+/);
  //     const lastWord = words.at(-1);
  //     if (!lastWord) return;

  //     await this.speak(lastWord);
  //   }
  // }

  // async onAudioItemClick(item: [string, string]) {
  //   const audioEl =
  //     this.speechService.audioElement() ??
  //     (() => {
  //       const newAudio = new Audio();
  //       this.speechService.audioElement.set(newAudio);
  //       return newAudio;
  //     })();

  //   audioEl.pause();
  //   audioEl.currentTime = 0;
  //   audioEl.loop = this.loopAudio();

  //   this.speechService.configureAudio(audioEl, item[1], {
  //     rate: this.speechSpeed(),
  //     volume: this.volume(),
  //     preservesPitch: this.preservesPitch(),
  //   });

  //   this.speechService.isSpeaking.set(true);
  //   await audioEl.play();
  // }
}
