/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

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