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
        this.selectedVoice.set(list[0].voiceId);
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
    const { scene: model } = await loader.loadObjectAsync('/models/Avatar V2.glb');

    this.model = model;
    this.threeService.getScene().add(this.model);

    const animMap = new Map(this.emotions.map(({ value, path }) => [value, path]));

    this.animatorService = new AnimatorService(this.model);
    this.animatorService.setMap(animMap);

    // Register animator via Tickable interface
    this.tickService.registerTickable(this.animatorService);
  }

  async ngOnInit(): Promise<void> {
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

    if (this.model && this.lipsync.features) {
      this.applyViseme();
    }
  }

  private applyViseme() {
    const current = this.lipsync.features;
    if (!current) return;

    const avg = this.lipsync.getAveragedFeatures();
    const volumeDiff = current.volume - avg.volume;
    const centroidDiff = current.centroid - avg.centroid;

    const scores = this.lipsync.computeVisemeScores(current, avg, volumeDiff, centroidDiff);
    const adjusted = this.lipsync.adjustScoresForConsistency(scores);

    let maxViseme = 'viseme_sil';
    let maxValue = 0;

    Object.entries(adjusted).forEach(([key, value]) => {
      if (value > maxValue) {
        maxValue = value;
        maxViseme = key;
      }
    });

    const isVowel =
      maxViseme === 'viseme_aa' ||
      maxViseme === 'viseme_E' ||
      maxViseme === 'viseme_I' ||
      maxViseme === 'viseme_O' ||
      maxViseme === 'viseme_U';

    this.lerpMorphTarget(maxViseme, 1, isVowel ? 0.2 : 0.6);

    Object.keys(adjusted).forEach((viseme) => {
      if (viseme !== maxViseme) {
        this.lerpMorphTarget(viseme, 0, isVowel ? 0.1 : 0.5);
      }
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
