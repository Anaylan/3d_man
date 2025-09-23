import { EntityLoader } from '@/loaders/entity-loader';
import { AnimatorService } from '@/services/animator-service';
import { TickService } from '@/services/tick-service';
import { EmotionService } from '@/services/emotion-service';
import { SpeechService } from '@/services/speech-service';
import { ThreeService } from '@/services/three-service';
import { Component, OnInit, OnDestroy, signal, computed, EffectRef, effect } from '@angular/core';
import { Tickable } from '../tickable';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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

  constructor(
    public threeService: ThreeService,
    public emotionService: EmotionService,
    public speechService: SpeechService,
    private tickService: TickService
  ) {
    this.loader = new EntityLoader();
    this.voicesEffect = effect(() => {
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
    return `${this.getEmotionLabel(emotion)}`;
  });

  emotions = [
    { value: 'neutral', label: 'Neutral', path: '' },
    { value: 'happy', label: 'Happy', path: '' },
    { value: 'sad', label: 'Sad', path: '' },
    { value: 'angry', label: 'Angry', path: '' },
    { value: 'surprised', label: 'Surprised', path: '' },
    { value: 'confused', label: 'Confused', path: '' },
  ];

  /**
   * Loads the character model, registers animator, and sets animation map.
   */
  async spawn() {
    const scene = this.threeService.getScene();
    const model = await this.loader.loadObjectAsync('/models/woman.fbx');
    model.scale.setScalar(0.01);
    scene.add(model);

    const animMap = new Map<string, string>();

    // TODO: refactor this part, maybe add path to animation into emotions array
    for (const { value, path } of this.emotions) {
      animMap.set(value, path);
    }

    this.animatorService = new AnimatorService(model);
    // Register animator via Tickable interface
    this.tickService.registerTickable(this.animatorService);
    this.animatorService.setMap(animMap);
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
  speak() {
    if (!this.speechText().trim()) return;

    this.speechService.speak({
      text: this.speechText(),
      voice: this.selectedVoice(),
      rate: this.speechSpeed(),
    });
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
  update(deltaTime: number) {}
}
