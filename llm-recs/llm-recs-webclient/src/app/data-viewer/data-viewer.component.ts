/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { Component, Input, OnInit, Signal, WritableSignal, computed } from '@angular/core';
import { DataItem, SavedDataService } from '../services/saved-data.service';
import { ActivatedRoute, Router } from '@angular/router';
// import { EventEmitter, Input, OnInit, Output, effect } from '@angular/core';

export interface SearchSpec {
  query: string;
  embedding: number[];
}

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

  @Input() public search?: WritableSignal<SearchSpec | null>;

  public itemRanks!: Signal<{ [itemId: string]: number }>;

  constructor(
    private dataService: SavedDataService,
    private route: ActivatedRoute,
    public router: Router,
    // private router: 
    ) {
  }

  ngOnInit() {
    this.itemRanks = computed(() => {
      const items = this.dataService.data().items;
      const ranks = {} as { [itemId: string]: number };

      const searchSpec = (this.search && this.search()) || null;
      if (!searchSpec) {
        Object.values(items).forEach(item =>
          ranks[item.id] = parseInt(item.id));
        return ranks;
      }

      Object.values(items).forEach(item =>
        ranks[item.id] = maxOf(Object.values(item.embeddings).map(
          e => dotProd(e, searchSpec.embedding))));

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

  removeSearch() {
    if (this.search) {
      this.search.set(null);
    }
  }

}
