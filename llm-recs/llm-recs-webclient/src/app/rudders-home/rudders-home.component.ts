/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { Component, WritableSignal, signal } from '@angular/core';
import { FormControl } from '@angular/forms';
import { ItemEmbeddings, SavedDataService } from '../saved-data.service';
import { LmApiService } from '../lm-api.service';
import { isEmbedError } from 'src/lib/text-embeddings/embedder';
import { SearchSpec } from '../data-viewer/data-viewer.component';
import { ItemInterpreterService } from '../item-interpreter.service';

@Component({
  selector: 'app-rudders-home',
  templateUrl: './rudders-home.component.html',
  styleUrls: ['./rudders-home.component.scss']
})
export class RuddersHomeComponent {
  public itemTextControl: FormControl<string | null>;
  public waiting: boolean = false;
  public errorMessage?: string;
  public searchSpec: WritableSignal<SearchSpec | null>;

  constructor(
    private lmApiService: LmApiService,
    private itemInterpreterService: ItemInterpreterService,
    private dataService: SavedDataService
  ) {
    this.searchSpec = signal(null);
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

    if (isEmbedError(embedResult)) {
      this.waiting = false;
      this.errorMessage = embedResult.error;
      return;
    }
    this.searchSpec.set(
      {
        query: this.itemTextControl.value!,
        embedding: embedResult.embedding
      });
    this.waiting = false;
    // console.log(`searching for ${this.itemTextControl.value}.`);
  }

  dismissError() {
    delete this.errorMessage;
  }

  async add() {
    this.waiting = true;
    const text = this.itemTextControl.value;
    console.log(`adding ${text}.`);
    if (!text) {
      console.error('called when text was null');
      return;
    }
    const addResultItemOrError = await this.dataService.add(text);
    if (isEmbedError(addResultItemOrError)) {
      this.waiting = false;
      this.errorMessage = addResultItemOrError.error;
    }
    this.waiting = false;
  }

  hasNoInput() {
    return !this.itemTextControl.value
      || this.itemTextControl.value.length === 0;
  }

}
