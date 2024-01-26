import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExpCreationComponent } from './exp-creation.component';

describe('ExpCreationComponent', () => {
  let component: ExpCreationComponent;
  let fixture: ComponentFixture<ExpCreationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExpCreationComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ExpCreationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
