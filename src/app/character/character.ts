import { EntityLoader } from '@/loaders/entity-loader';
import { AnimatorService } from '@/services/animator-service';
import { TickService } from '@/services/tick-service';
import { EmotionService } from '@/services/emotion-service';
import { SpeechService } from '@/services/speech-service';
import { ThreeService } from '@/services/three-service';
import { OpenaiTtsService } from '../openai-tts';
import { Component, OnInit, OnDestroy, signal, computed, effect } from '@angular/core';
import { Tickable } from '../../interfaces/tickable';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Lipsync } from 'wawa-lipsync';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/**
 * Character component hosting the 3D model and wiring services.
 * @implements Tickable
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

  private readonly visemeMap: Record<string, Array<{ morph: string; value: number }>> = {
    sil: [],
    PP: [],
    FF: [{ morph: 'mouthOpen', value: 0.2 }],
    TH: [{ morph: 'mouthOpen', value: 0.3 }],
    DD: [{ morph: 'mouthOpen', value: 0.4 }],
    kk: [{ morph: 'mouthOpen', value: 0.5 }],
    CH: [
      { morph: 'mouthOpen', value: 0.4 },
      { morph: 'mouthSmile', value: 0.3 },
    ],
    SS: [
      { morph: 'mouthSmile', value: 0.5 },
      { morph: 'mouthOpen', value: 0.2 },
    ],
    nn: [{ morph: 'mouthOpen', value: 0.3 }],
    RR: [{ morph: 'mouthOpen', value: 0.4 }],
    aa: [{ morph: 'mouthOpen', value: 0.8 }],
    E: [
      { morph: 'mouthSmile', value: 0.6 },
      { morph: 'mouthOpen', value: 0.4 },
    ],
    I: [
      { morph: 'mouthSmile', value: 0.7 },
      { morph: 'mouthOpen', value: 0.2 },
    ],
    O: [{ morph: 'mouthOpen', value: 0.9 }],
    U: [{ morph: 'mouthOpen', value: 0.7 }],
  };

  constructor(
    public threeService: ThreeService,
    public emotionService: EmotionService,
    public speechService: SpeechService,
    public openaiTtsService: OpenaiTtsService,
    private tickService: TickService
  ) {
    effect(() => {
      const list = this.speechService.voices();
      if (list && list.length && !this.selectedVoice()) {
        this.selectedVoice.set(list[0].name);
      }
    });
  }

  speechText = signal('Hey! How are you doing?');
  selectedEmotion = signal('neutral');
  selectedVoice = signal('');
  speechSpeed = signal(1);

  currentStatus = computed(() => {
    const emotion = this.emotionService.currentEmotion();
    const emotionData = this.emotions.find((e) => e.value === emotion);
    return emotionData?.label || emotion;
  });

  emotions = [
    { value: 'neutral', label: 'Neutral', path: '/animations/Idle.fbx' },
    { value: 'happy', label: 'Happy', path: '/animations/Happy.fbx' },
    { value: 'sad', label: 'Sad', path: '/animations/Rejected.fbx' },
  ];

  /**
   * Loads the character model, registers animator, and sets animation map.
   */
  private async spawn() {
    const loader = new EntityLoader(GLTFLoader);
    const { scene: model } = await loader.loadObjectAsync('/models/Avatar.glb');
    // model.scale.setScalar(0.01);
    // model.rotateX(-Math.PI / 2);

    this.model = model;
    this.threeService.getScene().add(this.model);

    const animMap = new Map(this.emotions.map(({ value, path }) => [value, path]));

    this.animatorService = new AnimatorService(this.model);
    this.animatorService.setMap(animMap);

    // Register animator via Tickable interface
    this.tickService.registerTickable(this.animatorService);
  }

  async ngOnInit(): Promise<void> {
    this.speechService.initialize();
    // Subscribe Character to global tick stream via Tickable
    this.tickService.registerTickable(this);

    await this.spawn();
    await this.setEmotion('neutral');
  }

  ngOnDestroy(): void {
    this.speechService.dispose();
    this.tickService.unregisterTickable(this);

    if (this.animatorService) {
      this.tickService.unregisterTickable(this.animatorService);
    }
  }

  /**
   * Triggers speech synthesis using current settings.
   */
  async speak() {
    if (!this.speechText().trim()) return;

    await this.speechService.speak({
      text: this.speechText(),
      voice: this.selectedVoice(),
      rate: this.speechSpeed(),
    });

    const audioEl = this.speechService.getAudioElement();
    if (audioEl) {
      this.lipsync.connectAudio(audioEl);
    }
  }

  /**
   * Stops current speech.
   */
  stopSpeaking() {
    this.speechService.stop();
  }

  /**
   * Handler for emotion selection changes.
   */
  onEmotionChange() {
    this.setEmotion(this.selectedEmotion());
  }

  /**
   * Applies selected emotion and plays corresponding animation.
   */
  async setEmotion(emotion: string) {
    this.selectedEmotion.set(emotion);
    this.emotionService.setEmotion(emotion);

    for (let i = 0; i < 100; i++) {
      if (this.animatorService?.isReady()) {
        this.animatorService.playAnimation(emotion);
        return;
      }
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  /** Tickable.update implementation */
  update(deltaTime: number) {
    this.lipsync.processAudio();
    const viseme = this.lipsync.viseme;

    if (viseme && this.model) {
      const cleanViseme = viseme.replace('viseme_', '');
      this.applyViseme(cleanViseme);
    }
  }

  private applyViseme(viseme: string) {
    const targets = this.visemeMap[viseme] || [];
    const applied = new Set(targets.map((t) => t.morph));

    targets.forEach(({ morph, value }) => this.lerpMorphTarget(morph, value, 0.4));

    // we have only 2 morphs
    ['mouthOpen', 'mouthSmile'].forEach((morph) => {
      if (!applied.has(morph)) this.lerpMorphTarget(morph, 0, 0.2);
    });
  }

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
}
