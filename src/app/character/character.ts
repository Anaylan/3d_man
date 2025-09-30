import { EntityLoader } from '@/loaders/entity-loader';
import { AnimatorService } from '@/services/animator-service';
import { TickService } from '@/services/tick-service';
import { EmotionService } from '@/services/emotion-service';
import { SpeechService } from '@/services/speech-service';
import { ThreeService } from '@/services/three-service';
import { OpenaiTtsService, VoiceOption } from '../openai-tts';
import { Component, OnInit, OnDestroy, signal, computed, EffectRef, effect } from '@angular/core';
import { Tickable } from '../../interfaces/tickable';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Lipsync } from 'wawa-lipsync';

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
  private loader: EntityLoader;
  private animatorService!: AnimatorService;
  private voicesEffect?: EffectRef;
  private lipsync: Lipsync;

  constructor(
    public threeService: ThreeService,
    public emotionService: EmotionService,
    public speechService: SpeechService,
    public openaiTtsService: OpenaiTtsService,
    private tickService: TickService
  ) {
    this.loader = new EntityLoader();
    this.voicesEffect = effect(() => {
      const list = this.speechService.voices();
      if (list && list.length && !this.selectedVoice()) {
        this.selectedVoice.set(list[0].name);
      }
    });

    this.lipsync = new Lipsync();
  }

  speechText = signal('Hey! How are you doing?');
  selectedEmotion = signal('neutral');
  selectedVoice = signal('');
  speechSpeed = signal(1);

  currentStatus = computed(() => {
    const emotion = this.emotionService.currentEmotion();
    return `${this.getEmotionLabel(emotion)}`;
  });

  emotions = [
    { value: 'neutral', label: 'Neutral', path: '/animations/Anim_Idle_7.FBX' },
    { value: 'happy', label: 'Happy', path: '/animations/Anim_Clap_3.FBX' },
    { value: 'sad', label: 'Sad', path: '/animations/Anim_Wave_4.FBX' }
  ];

  /**
   * Loads the character model, registers animator, and sets animation map.
   */
  async spawn() {
    const scene = this.threeService.getScene();
    const model = await this.loader.loadObjectAsync('/models/SKM_Woman.FBX');
    model.scale.setScalar(0.01);
    model.rotateX(-Math.PI / 2);
    scene.add(model);

    const animMap = new Map<string, string>();

    for (const { value, path } of this.emotions) {
      animMap.set(value, path);
    }

    this.animatorService = new AnimatorService(model);
    this.animatorService.setMap(animMap);

    // Register animator via Tickable interface
    this.tickService.registerTickable(this.animatorService);
  }

  ngOnInit(): void {
    this.speechService.initialize();

    this.spawn();
    this.setEmotion('neutral');

    // Subscribe Character to global tick stream via Tickable
    this.tickService.registerTickable(this);
  }

  ngOnDestroy(): void {
    this.speechService.dispose();
    this.voicesEffect?.destroy();
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
   * Returns a human-readable label for an emotion value.
   */
  private getEmotionLabel(emotion: string): string {
    const emotionData = this.emotions.find((e) => e.value === emotion);
    return emotionData?.label || emotion;
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
  setEmotion(emotion: string) {
    this.selectedEmotion.set(emotion);
    this.emotionService.setEmotion(emotion);
    if (this.animatorService) {
      this.animatorService.playAnimation(emotion);
    }
  }

  /** Tickable.update implementation */
  update(deltaTime: number) {
    this.lipsync.processAudio();
    const viseme = this.lipsync.viseme;
  }
}
