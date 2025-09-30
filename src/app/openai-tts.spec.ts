import { TestBed } from '@angular/core/testing';

import { OpenaiTtsService } from './openai-tts';

describe('OpenaiTtsService', () => {
  let service: OpenaiTtsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(OpenaiTtsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
