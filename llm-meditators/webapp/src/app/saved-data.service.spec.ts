/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { TestBed } from '@angular/core/testing';

import { SavedDataService } from './saved-data.service';

describe('SavedDataService', () => {
  let service: SavedDataService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SavedDataService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
