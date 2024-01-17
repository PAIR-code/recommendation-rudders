/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PromptsConfigComponent } from './prompts-config.component';

describe('PromptsConfigComponent', () => {
  let component: PromptsConfigComponent;
  let fixture: ComponentFixture<PromptsConfigComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PromptsConfigComponent]
    });
    fixture = TestBed.createComponent(PromptsConfigComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
