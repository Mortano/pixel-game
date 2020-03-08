import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { PixelizationComponent } from './pixelization.component';

describe('PixelizationComponent', () => {
  let component: PixelizationComponent;
  let fixture: ComponentFixture<PixelizationComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ PixelizationComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PixelizationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
