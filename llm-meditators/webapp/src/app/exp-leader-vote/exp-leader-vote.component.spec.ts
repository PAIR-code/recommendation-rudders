import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatRadioModule } from '@angular/material/radio';

import { ExpLeaderVoteComponent } from './exp-leader-vote.component';

describe('ExpLeaderVoteComponent', () => {
  let component: ExpLeaderVoteComponent;
  let fixture: ComponentFixture<ExpLeaderVoteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ExpLeaderVoteComponent],
      imports: [ExpLeaderVoteComponent, MatRadioModule],
    }).compileComponents();

    fixture = TestBed.createComponent(ExpLeaderVoteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
