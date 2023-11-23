/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { Component, Signal, computed } from '@angular/core';
import { DataItem, SavedDataService } from '../saved-data.service';
// import { EventEmitter, Input, OnInit, Output, effect } from '@angular/core';

@Component({
  selector: 'app-data-viewer',
  templateUrl: './data-viewer.component.html',
  styleUrls: ['./data-viewer.component.scss']
})
export class DataViewerComponent {
  // Local copy of the data items
  public data: Signal<DataItem[]>;

  constructor(private dataService: SavedDataService) {
    this.data = computed(() =>
      Object.values(this.dataService.data().items).sort(
        (a, b) => a.id < b.id ? -1 : 1));
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

}
