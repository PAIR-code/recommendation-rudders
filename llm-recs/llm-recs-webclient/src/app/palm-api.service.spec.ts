/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file.
 */
import { TestBed } from '@angular/core/testing';

import { PalmApiService } from './palm-api.service';

describe('PalmApiService', () => {
  let service: PalmApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PalmApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
