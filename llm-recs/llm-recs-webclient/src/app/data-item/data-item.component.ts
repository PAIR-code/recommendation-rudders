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

  @Input() item!: DataItem;
  @Input() rank!: number;
  @Output() deleteEvent = new EventEmitter<void>();

  public itemTextControl!: FormControl<string | null>;

  constructor(
    public dataService: SavedDataService,
    public lmApi: LmApiService) {
  }

  ngOnInit(): void {
    this.itemTextControl = new FormControl<string | null>(this.item.text);
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
    const embedResponse = await this.lmApi.embedder.embed(this.item.text);
    if (isEmbedError(embedResponse)) {
      this.waiting = false;
      this.saveError = embedResponse.error;
      return;
    }
    this.item.embeddings[this.item.text] = embedResponse.embedding;
    this.dataService.saveItem(this.item);
    this.viewMode();
    this.waiting = false;
  }

  revert(): void {
    this.itemTextControl.setValue(this.item.text);
  }

  deleteItem(): void {
    this.deleteEvent.emit();
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