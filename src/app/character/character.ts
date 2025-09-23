import { EntityLoader } from '@/loaders/entity-loader';
import { AnimatorService } from '@/services/animator-service';
import { EmotionService } from '@/services/emotion-service';
import { SpeechService } from '@/services/speech-service';
import { ThreeService } from '@/services/three-service';
import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { Tickable } from '../tickable';

@Component({
  selector: 'app-character',
  imports: [],
  templateUrl: './character.html',
  styleUrl: './character.scss',
  providers: [
    { provide: Tickable, useExisting: Character },
    // { provide: Tickable, useClass: AnimatorService },
  ],
})
export class Character implements OnInit, OnDestroy, Tickable {
  private loader: EntityLoader;
  private animatorService!: AnimatorService;

  constructor(
    public threeService: ThreeService,
    public emotionService: EmotionService,
    public speechService: SpeechService
  ) {
    this.loader = new EntityLoader();
  }

  speechText = signal('Hey! How are you doing?');
  selectedEmotion = signal('neutral');
  selectedVoice = signal('');
  speechSpeed = signal(1);

  currentStatus = computed(() => {
    const emotion = this.emotionService.currentEmotion();
    const isSpeaking = this.speechService.isSpeaking();

    if (isSpeaking) {
      return `${this.speechText()}`;
    }

    return `${this.getEmotionLabel(emotion)}`;
  });

  emotions = [
    { value: 'neutral', label: 'Neutral', path: '/models/Capoeira.fbx' },
    { value: 'happy', label: 'Happy', path: '' },
    { value: 'sad', label: 'Sad', path: '' },
    { value: 'angry', label: 'Angry', path: '' },
    { value: 'surprised', label: 'Surprised', path: '' },
    { value: 'confused', label: 'Confused', path: '' },
  ];

  async spawn() {
    const scene = this.threeService.getScene();
    const model = await this.loader.loadObjectAsync('/models/Y Bot.fbx');
    model.scale.setScalar(0.01);
    scene.add(model);

    const animMap = new Map<string, string>();

    // TODO: refactor this part, maybe add path to animation into emotions array
    for (const { value, path } of this.emotions) {
      animMap.set(value, path);
    }

    this.animatorService = new AnimatorService(model);
    this.animatorService.setMap(animMap);
  }

  ngOnInit(): void {
    this.speechService.initialize();
    this.spawn();
    this.selectedEmotion.set('neutral');
    this.emotionService.setEmotion('neutral');

    setTimeout(() => {
      this.setEmotion('neutral');
    }, 2000);
  }

  ngOnDestroy(): void {
    // this.threeService.dispose();
    this.speechService.dispose();
  }

  speak() {
    if (!this.speechText().trim()) return;

    this.speechService.speak({
      text: this.speechText(),
      voice: this.selectedVoice(),
      rate: this.speechSpeed(),
    });
  }

  stopSpeaking() {
    this.speechService.stop();
  }

  private getEmotionLabel(emotion: string): string {
    const emotionData = this.emotions.find((e) => e.value === emotion);
    return emotionData?.label || emotion;
  }

  onEmotionChange() {
    this.setEmotion(this.selectedEmotion());
  }

  setEmotion(emotion: string) {
    this.selectedEmotion.set(emotion);
    this.emotionService.setEmotion(emotion);
    this.animatorService.playAnimation(emotion);
  }

  update(deltaTime: number) {}
}
