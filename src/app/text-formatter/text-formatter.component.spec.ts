import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { TextFormatterComponent } from './text-formatter.component';

describe('TextFormatterComponent', () => {
  let component: TextFormatterComponent;
  let fixture: ComponentFixture<TextFormatterComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ TextFormatterComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TextFormatterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
