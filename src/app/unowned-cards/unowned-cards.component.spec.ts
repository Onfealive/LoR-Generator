import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UnownedCardsComponent } from './unowned-cards.component';

describe('UnownedCardsComponent', () => {
  let component: UnownedCardsComponent;
  let fixture: ComponentFixture<UnownedCardsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ UnownedCardsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(UnownedCardsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
