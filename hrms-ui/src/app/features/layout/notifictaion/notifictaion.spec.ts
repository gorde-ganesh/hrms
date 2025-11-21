import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Notifictaion } from './notifictaion';

describe('Notifictaion', () => {
  let component: Notifictaion;
  let fixture: ComponentFixture<Notifictaion>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Notifictaion]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Notifictaion);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
