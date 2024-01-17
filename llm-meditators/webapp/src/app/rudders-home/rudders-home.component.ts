/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { Component, WritableSignal, signal } from '@angular/core';
import { FormControl } from '@angular/forms';
import { SavedDataService, } from '../saved-data.service';
import { LmApiService } from '../lm-api.service';
import { ItemInterpreterService } from '../item-interpreter.service';
import { isErrorResponse } from 'src/lib/simple-errors/simple-errors';

@Component({
  selector: 'app-rudders-home',
  templateUrl: './rudders-home.component.html',
  styleUrls: ['./rudders-home.component.scss']
})
export class RuddersHomeComponent {
  public itemTextControl: FormControl<string | null>;
  public waiting: boolean = false;
  public errorMessage?: string;

  constructor(
    private lmApiService: LmApiService,
    private itemInterpreterService: ItemInterpreterService,
    private dataService: SavedDataService
  ) {
    this.itemTextControl = new FormControl<string | null>('');
  }

  async search() {
    if (this.hasNoInput()) {
      return;
    }

    delete this.errorMessage;
    this.waiting = true;
    // if (!this.itemTextControl.value) {
    //   console.error('no value to search for; this should not be possible');
    //   return;
    // }
    const embedResult = await this.lmApiService.embedder.embed(
      this.itemTextControl.value!);

    if (isErrorResponse(embedResult)) {
      this.waiting = false;
      this.errorMessage = embedResult.error;
      return;
    }
    this.waiting = false;
    // console.log(`searching for ${this.itemTextControl.value}.`);
  }

  dismissError() {
    delete this.errorMessage;
  }

  async add() {
  }

  saveOrCancelAdd(event: 'saved' | 'cancelled') {
  }


  hasNoInput() {
    return !this.itemTextControl.value
      || this.itemTextControl.value.length === 0;
  }

}
