/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { Component, computed, EventEmitter, Input, OnInit, Output, Signal, signal, WritableSignal } from '@angular/core';
import { DataItem, SavedDataService, dummyItem } from '../saved-data.service';
import { FormControl } from '@angular/forms';
import { LmApiService } from '../lm-api.service';
import { isEmbedError } from 'src/lib/text-embeddings/embedder';


// class SignalModel<T> {
//   public signalValue: WritableSignal<T>;

//   constructor(initialValue: T) {
//     this.signalValue = signal(initialValue);
//   }

//   set model(value: T) {
//     this.signalValue.set(value);
//   }

//   get model(): T {
//     return this.signalValue();
//   }
// }


@Component({
  selector: 'app-data-item',
  templateUrl: './data-item.component.html',
  styleUrls: ['./data-item.component.scss']
})
export class DataItemComponent {
  public mode: 'view' | 'edit' = 'view';
  public waiting: boolean = false;
  public saveError?: string;
  public dataItem = signal<DataItem>(dummyItem);
  public keys: string[] = [];
  // Set by the initialization call of the @Input()
  public initialDataItem!: DataItem;

  @Input()
  set item(i: DataItem) {
    this.dataItem.set(i);
    this.initialDataItem = i;
    this.keys = Object.keys(i.embeddings);
  }
  @Input() rank!: number;

  constructor(
    public dataService: SavedDataService,
    public lmApi: LmApiService) {
  }

  setTitle(s: string): void {
    const newItem = { ...this.dataItem() };
    newItem.entityTitle = s;
    this.dataItem.set(newItem);
  }

  setText(s: string): void {
    const newItem = { ...this.dataItem() };
    newItem.text = s;
    this.dataItem.set(newItem);
  }

  setDetails(s: string): void {
    const newItem = { ...this.dataItem() };
    newItem.entityDetails = s;
    this.dataItem.set(newItem);
  }

  setSentiment(s: string): void {
    const newItem = { ...this.dataItem() };
    newItem.sentiment = s;
    this.dataItem.set(newItem);
  }

  addKey() {
    this.keys.push('');
  }

  editMode(): void {
    this.mode = 'edit';
  }
  viewMode(): void {
    this.mode = 'view';
  }

  async save(): Promise<void> {
    this.waiting = true;
    delete this.saveError;

    const dataItem = this.dataItem();

    const newEmbeddings: { [key: string]: number[] } = {};
    for (const key of this.keys) {
      if (key.match(/^\s*$/) !== null) {
        continue;  // Don't add empty keys
      } else if (key in dataItem.embeddings) {
        newEmbeddings[key] = dataItem.embeddings[key];
      } else {
        const embedResponse = await this.lmApi.embedder.embed(key);
        if (isEmbedError(embedResponse)) {
          this.waiting = false;
          this.saveError = embedResponse.error;
          return;
        }
        newEmbeddings[key] = embedResponse.embedding;
      }
    }
    this.keys = Object.keys(newEmbeddings);
    dataItem.embeddings = newEmbeddings;
    this.dataService.saveItem(dataItem);
    this.viewMode();
    this.waiting = false;
  }

  revert(): void {
    this.dataItem.set(this.initialDataItem);
  }

  deleteItem(): void {
    this.dataService.deleteItem(this.item);
  }

  itemEmbeddingStr(item: DataItem): string {
    const embeddingKeys = Object.keys(item.embeddings)
    if (embeddingKeys.length > 0) {
      const embedding = item.embeddings[embeddingKeys[0]];
      return `${embedding.length}:${JSON.stringify(embedding.slice(0, 3))}`
    } else {
      return "none";
    }
  }
}
