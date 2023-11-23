import { TestBed } from '@angular/core/testing';

import { LmApiService } from './lm-api.service';

describe('LmApiService', () => {
  let service: LmApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LmApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
