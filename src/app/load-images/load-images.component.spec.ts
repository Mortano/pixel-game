import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { LoadImagesComponent } from './load-images.component';

describe('LoadImagesComponent', () => {
  let component: LoadImagesComponent;
  let fixture: ComponentFixture<LoadImagesComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ LoadImagesComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(LoadImagesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
