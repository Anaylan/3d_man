import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Character } from './character';

describe('Character', () => {
  let component: Character;
  let fixture: ComponentFixture<Character>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Character]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Character);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
