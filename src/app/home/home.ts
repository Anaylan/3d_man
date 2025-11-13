import { Component, effect, signal } from '@angular/core';
import { ThreeLayer } from '../three-layer/three-layer';
import { FormsModule } from '@angular/forms';
import { ContenteditableDirective } from '../contenteditable-model';

@Component({
  selector: 'app-home',
  imports: [ThreeLayer, FormsModule, ContenteditableDirective],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  message = signal('');

  constructor() {}

  sendMessage(): void {
    // implement send logic
    if (this.message().trim()) {
      this.message.set('');
    }
  }
}
