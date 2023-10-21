/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { Component } from '@angular/core';
import { FormControl } from '@angular/forms';
import { PalmApiService } from '../palm-api.service';
import { SavedDataService } from '../saved-data.service';

@Component({
  selector: 'app-rudders-home',
  templateUrl: './rudders-home.component.html',
  styleUrls: ['./rudders-home.component.scss']
})
export class RuddersHomeComponent {

  public searchControl: FormControl<string | null>;
  public addControl: FormControl<string | null>;

  constructor(
    private llmService: PalmApiService,
    private dataService: SavedDataService
  ) {
    this.searchControl = new FormControl<string | null>('');
    this.addControl = new FormControl<string | null>('');
  }

  search() {
    console.log(`searching for ${this.searchControl.value}.`);
  }

  add() {
    console.log(`adding ${this.addControl.value}.`);
    if (this.addControl.value) {
      this.dataService.add(this.addControl.value);
    }
  }

}
