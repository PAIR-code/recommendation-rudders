import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DataItemComponent } from './data-item.component';

describe('DataItemComponent', () => {
  let component: DataItemComponent;
  let fixture: ComponentFixture<DataItemComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [DataItemComponent]
    });
    fixture = TestBed.createComponent(DataItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
