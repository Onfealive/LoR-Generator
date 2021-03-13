import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { ExpeditionGeneratorComponent } from './expedition-generator.component';

describe('ExpeditionGeneratorComponent', () => {
  let component: ExpeditionGeneratorComponent;
  let fixture: ComponentFixture<ExpeditionGeneratorComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ ExpeditionGeneratorComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ExpeditionGeneratorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
