import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ExpeditionGeneratorComponent } from './expedition-generator.component';

describe('ExpeditionGeneratorComponent', () => {
  let component: ExpeditionGeneratorComponent;
  let fixture: ComponentFixture<ExpeditionGeneratorComponent>;

  beforeEach(async(() => {
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
