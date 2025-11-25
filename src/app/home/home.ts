import { Component, inject, signal, ViewChild } from '@angular/core';
import { ThreeLayer } from '../three-layer/three-layer';
import { FormsModule } from '@angular/forms';
import { ContenteditableDirective } from '../contenteditable-model';
import { AIService } from '@/services/ai-service';

@Component({
  selector: 'app-home',
  imports: [ThreeLayer, FormsModule, ContenteditableDirective],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  @ViewChild('threelayerRef') layerComponentRef!: ThreeLayer;
  private readonly AIService = inject(AIService);

  message = signal('');

  onKeyPress(evt: KeyboardEvent) {
    if (evt.key === 'Enter' && !evt.shiftKey) {
      evt.preventDefault();
      this.sendMessage();
    }
  }

  onInput(evt: Event) {
    const target = evt.target as HTMLElement;
    if (target.textContent === '') {
      target.innerHTML = '';
    }
  }

  onClick(evt: PointerEvent) {
    throw new Error('Method not implemented.');
  }

  switchChats(evt: PointerEvent) {
    throw new Error('Method not implemented.');
  }

  sendMessage(): void {
    if (this.message().trim().length > 0) {
      this.AIService.generateResponse(this.message());
      this.message.set('');
    }
  }
}
