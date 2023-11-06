/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { Component, Input, OnInit, Signal, computed } from '@angular/core';
import { DataItem, SavedDataService } from '../saved-data.service';
// import { EventEmitter, Input, OnInit, Output, effect } from '@angular/core';

function dotProd(e1: number[], e2: number[]) {
  let dotProduct = 0;
  for (let i = 0; i < e1.length; i++) {
    dotProduct += e1[i] * e2[i];
  };
  return dotProduct;
};

function maxOf(a: number[]): number {
  return a.reduce((p, c) => p > c ? p : c, a[0]);
}

@Component({
  selector: 'app-data-viewer',
  templateUrl: './data-viewer.component.html',
  styleUrls: ['./data-viewer.component.scss']
})
export class DataViewerComponent implements OnInit {
  // Local copy of the data items
  public data!: Signal<DataItem[]>;

  @Input() search!: Signal<number[] | null>;


  public itemRanks!: Signal<{ [itemId: string]: number }>;

  constructor(private dataService: SavedDataService) {
  }

  ngOnInit() {
    this.itemRanks = computed(() => {
      const items = this.dataService.data().items;
      const ranks = {} as { [itemId: string]: number };

      const searchEmbedding = this.search();
      if (!searchEmbedding) {
        Object.values(items).forEach(item =>
          ranks[item.id] = parseInt(item.id));
        console.log(JSON.stringify(ranks, null, 2));
        return ranks;
      }

      Object.values(items).forEach(item =>
        ranks[item.id] = maxOf(Object.values(item.embeddings).map(
          e => dotProd(e, searchEmbedding))));

      console.log(JSON.stringify(ranks, null, 2));
      return ranks;
    });

    this.data = computed(() => {
      const ranks = this.itemRanks();
      // Sort biggest first: biggest = most recent, most relevant
      return Object.values(this.dataService.data().items).sort(
        (a, b) => ranks[b.id] - ranks[a.id]);
    });
  }

  size(): number {
    return this.data().length;
  }
  deleteData() {
    this.dataService.clearItems();
  }
  deleteItem(d: DataItem) {
    console.log('delete', d);
    this.dataService.deleteItem(d);
  }
  itemRank(d: DataItem): number {
    return this.itemRanks()[d.id];
  }

}
