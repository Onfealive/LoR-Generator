import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { PatchNotesGeneratorComponent } from './patch-notes-generator.component';

describe('PatchNotesGeneratorComponent', () => {
  let component: PatchNotesGeneratorComponent;
  let fixture: ComponentFixture<PatchNotesGeneratorComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ PatchNotesGeneratorComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PatchNotesGeneratorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
