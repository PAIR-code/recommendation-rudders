/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { TestBed } from '@angular/core/testing';

import { ItemInterpreterService } from './item-interpreter.service';

describe('ItemInterpreterService', () => {
  let service: ItemInterpreterService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ItemInterpreterService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
