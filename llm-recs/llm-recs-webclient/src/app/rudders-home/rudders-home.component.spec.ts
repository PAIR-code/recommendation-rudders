/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonToggleModule } from '@angular/material/button-toggle';

import { RuddersHomeComponent } from './rudders-home.component';
import { DataViewerComponent } from '../data-viewer/data-viewer.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('RuddersHomeComponent', () => {
  let component: RuddersHomeComponent;
  let fixture: ComponentFixture<RuddersHomeComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [
        RuddersHomeComponent,
        DataViewerComponent,
      ],
      imports: [
        NoopAnimationsModule,
        MatButtonModule,
        MatSelectModule,
        MatButtonToggleModule,
        MatIconModule,
        MatListModule,
        FormsModule,
        ReactiveFormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatMenuModule,
        MatProgressBarModule,
      ],
    });
    fixture = TestBed.createComponent(RuddersHomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
