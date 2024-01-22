/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExpRatingComponent } from './exp-rating.component';

describe('ExpRatingComponent', () => {
  let component: ExpRatingComponent;
  let fixture: ComponentFixture<ExpRatingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExpRatingComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ExpRatingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
