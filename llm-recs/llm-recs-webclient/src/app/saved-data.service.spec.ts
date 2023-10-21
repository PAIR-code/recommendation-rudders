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
