import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ThreeLayer } from './three-layer';

describe('ThreeLayer', () => {
  let component: ThreeLayer;
  let fixture: ComponentFixture<ThreeLayer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ThreeLayer]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ThreeLayer);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
