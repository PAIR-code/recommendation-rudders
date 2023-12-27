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
        text: this.itemTextControl.value!,
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
    if (text) {
      const embedResponse = await this.lmApiService.embedder.embed(text);
      if (isEmbedError(embedResponse)) {
        this.waiting = false;
        this.errorMessage = embedResponse.error;
        return;
      }
      const embeddings = {} as ItemEmbeddings;
      embeddings[text] = embedResponse.embedding;
      this.dataService.add(text, embeddings);
      this.waiting = false;
    }
  }

  hasNoInput() {
    return !this.itemTextControl.value
      || this.itemTextControl.value.length === 0;
  }

}
