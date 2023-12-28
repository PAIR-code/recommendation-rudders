/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { DataItem, SavedDataService } from '../saved-data.service';
import { FormControl } from '@angular/forms';
import { LmApiService } from '../lm-api.service';
import { isEmbedError } from 'src/lib/text-embeddings/embedder';

@Component({
  selector: 'app-data-item',
  templateUrl: './data-item.component.html',
  styleUrls: ['./data-item.component.scss']
})
export class DataItemComponent implements OnInit {
  public mode: 'view' | 'edit' = 'view';
  public waiting: boolean = false;
  public saveError?: string;
  public keys: string[] = [];

  @Input() item!: DataItem;
  @Input() rank!: number;

  public itemTextControl!: FormControl<string | null>;
  public itemTitleControl!: FormControl<string | null>;
  public keyControls: FormControl<string | null>[] = [];

  constructor(
    public dataService: SavedDataService,
    public lmApi: LmApiService) {
  }

  ngOnInit(): void {
    this.itemTitleControl = new FormControl<string | null>(
      this.item ? this.item.title : '');
    this.itemTextControl = new FormControl<string | null>(
      this.item ? this.item.text : '');
    for (const key of Object.keys(this.item.embeddings)) {
      this.keys.push(key);
      this.keyControls.push(new FormControl<string | null>(key));
    }
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

    this.item.text = this.itemTextControl.value || this.item.text;
    this.item.title = this.itemTitleControl.value || this.item.title

    const newEmbeddings: { [key: string]: number[] } = {};
    for (const key of this.keys) {
      if (key.match(/\s*/)) {
        // Don't add empty keys
        continue;
      } else if (key in this.item.embeddings) {
        newEmbeddings[key] = this.item.embeddings[key];
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

    this.item.embeddings = newEmbeddings;
    this.dataService.saveItem(this.item);
    this.viewMode();
    this.waiting = false;
  }

  addKey() {
    this.keys.push('');
    this.keyControls.push(new FormControl<string | null>(''));
  }

  revert(): void {
    this.itemTitleControl.setValue(this.item.title);
    this.itemTextControl.setValue(this.item.text);
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
