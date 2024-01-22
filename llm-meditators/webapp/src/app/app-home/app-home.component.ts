/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { Component } from '@angular/core';
import { SavedDataService } from '../services/saved-data.service';
import { LmApiService } from '../services/lm-api.service';

@Component({
  selector: 'app-home',
  templateUrl: './app-home.component.html',
  styleUrls: ['./app-home.component.scss'],
})
export class AppHomeComponent {
  public waiting: boolean = false;
  public errorMessage?: string;

  constructor(
    private lmApiService: LmApiService,
    public dataService: SavedDataService,
  ) {}

  dismissError() {
    delete this.errorMessage;
  }

  nextStep() {
    this.dataService.nextStep();
  }
}
