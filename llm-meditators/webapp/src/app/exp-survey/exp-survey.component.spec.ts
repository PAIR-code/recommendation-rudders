import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExpSurveyComponent } from './exp-survey.component';

describe('ExpSurveyComponent', () => {
  let component: ExpSurveyComponent;
  let fixture: ComponentFixture<ExpSurveyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExpSurveyComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ExpSurveyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
