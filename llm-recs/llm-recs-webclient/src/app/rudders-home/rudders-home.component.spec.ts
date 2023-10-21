/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RuddersHomeComponent } from './rudders-home.component';

describe('RuddersHomeComponent', () => {
  let component: RuddersHomeComponent;
  let fixture: ComponentFixture<RuddersHomeComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [RuddersHomeComponent]
    });
    fixture = TestBed.createComponent(RuddersHomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
