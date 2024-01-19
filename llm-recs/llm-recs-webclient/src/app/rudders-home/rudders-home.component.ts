/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { Component, Signal, WritableSignal, effect, signal } from '@angular/core';
import { FormControl } from '@angular/forms';
import { DataItem, ItemEmbeddings, SavedDataService, emptyItem } from '../services/saved-data.service';
import { LmApiService } from '../services/lm-api.service';
import { SearchSpec } from '../data-viewer/data-viewer.component';
import { ItemInterpreterService } from '../services/item-interpreter.service';
import { isErrorResponse } from 'src/lib/simple-errors/simple-errors';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';

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
  public itemToAdd: DataItem | null = null;

  constructor(
    private lmApiService: LmApiService,
    private dataService: SavedDataService
  ) {
    this.searchSpec = signal(null);
    this.itemTextControl = new FormControl<string>('');
    this.itemTextControl.valueChanges.forEach(n => {
      if (n) { this.dataService.setItemText(n); };
    });

    effect(async () => {
      delete this.errorMessage;
      this.waiting = true;

      const activeSearch = this.dataService.activeSearch();
      if (activeSearch === '') {
        this.searchSpec.set(null);
        this.waiting = false;
        delete this.errorMessage;
        return;
      }
      // if (!this.itemTextControl.value) {
      //   console.error('no value to search for; this should not be possible');
      //   return;
      // }
      const embedResult = await this.lmApiService.embedder.embed(activeSearch);
      if (isErrorResponse(embedResult)) {
        this.waiting = false;
        this.errorMessage = embedResult.error;
        return;
      }
      this.searchSpec.set(
        {
          query: activeSearch,
          embedding: embedResult.embedding
        });
      this.waiting = false;
      // console.log(`searching for ${this.itemTextControl.value}.`);
    }, {allowSignalWrites: true});
  }

  startSearch() {
    if (!this.itemTextControl.value) {
      return;
    }
    this.dataService.setActiveSearch(this.itemTextControl.value);
  }

  dismissError() {
    delete this.errorMessage;
  }

  async add() {
    const text = this.itemTextControl.value;
    if (text === null) {
      console.error('called when text was null');
      return;
    }
    if (text.trim() === '') {
      const item = this.dataService.addDataItem(emptyItem());
      this.dataService.openItem(item.id);
      this.waiting = false;
      return;
    }
    
    this.waiting = true;
    const itemOrError = await this.dataService.createItem(text);
    if (isErrorResponse(itemOrError)) {
      this.errorMessage = itemOrError.error;
      this.waiting = false;
      return;
    }
    const item = this.dataService.addDataItem(itemOrError);
    this.dataService.openItem(item.id);
    this.waiting = false;
  }

  saveOrCancelAdd(event: 'saved' | 'cancelled') {
    this.itemToAdd = null;
    if (event === 'saved') {
      this.itemTextControl.setValue('');
    }
  }

  itemTextIsEmpty(): boolean  {
    return !this.itemTextControl.value || this.itemTextControl.value.length === 0;
  }

}
