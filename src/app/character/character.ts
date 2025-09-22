import { EntityLoader } from '@/loaders/EntityLoader';
import { AnimatorService } from '@/services/animator-service';
import { EmotionService } from '@/services/emotion-service';
import { SpeechService } from '@/services/speech-service';
import { ThreeService } from '@/services/three-service';
import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';

@Component({
  selector: 'app-character',
  imports: [],
  templateUrl: './character.html',
  styleUrl: './character.scss',
})
export class Character implements OnInit, OnDestroy {
  private loader: EntityLoader;

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
    const isAnimating = this.emotionService.isAnimating();
    const isSpeaking = this.speechService.isSpeaking();

    if (isAnimating) {
      return `${this.getEmotionLabel(emotion)}`;
    } else if (isSpeaking) {
      return `${this.speechText()}`;
    } else {
      return `${this.getEmotionLabel(emotion)}`;
    }
  });

  emotions = [
    { value: 'neutral', label: 'Neutral' },
    { value: 'happy', label: 'Happy' },
    { value: 'sad', label: 'Sad' },
    { value: 'angry', label: 'Angry' },
    { value: 'surprised', label: 'Surprised' },
    { value: 'confused', label: 'Confused' },
  ];

  async spawn() {
    const scene = this.threeService.getScene();
    const model = await this.loader.loadObjectAsync('/models/Y Bot.fbx');
    model.scale.setScalar(0.01);
    scene.add(model);

    const animMap = new Map<string, string>([
      // [this.emotions[0].value, ''],
      // [this.emotions[1].value, ''],
      // [this.emotions[2].value, ''],
      // [this.emotions[3].value, ''],
    ]);

    // TODO: refactor this part, maybe add path to animation into emotions array
    for (const { value } of this.emotions) {
      animMap.set(value, '');
    }

    const mixer = new AnimatorService(model);
    mixer.init(animMap);
  }

  ngOnInit(): void {
    this.speechService.initialize();
    this.spawn();
    this.selectedEmotion.set('neutral');
    this.emotionService.setEmotion('neutral');
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
}
