/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { Component, WritableSignal, signal } from '@angular/core';
import { DataItem, SavedDataService } from '../saved-data.service';
// import { EventEmitter, Input, OnInit, Output, effect } from '@angular/core';

@Component({
  selector: 'app-data-viewer',
  templateUrl: './data-viewer.component.html',
  styleUrls: ['./data-viewer.component.scss']
})
export class DataViewerComponent {
  data = signal([] as DataItem[]) as WritableSignal<DataItem[]>;

  constructor(private dataService: SavedDataService) {
    this.data.set(this.dataService.data);
  }

  size(): number {
    return this.data().length;
  }

  deleteData() {
    this.dataService.clear();
    this.data.set(this.dataService.data);
  }
  deleteItem(d: DataItem) {
    console.log('delete', d);
    this.dataService.deleteItem(d);
    this.data.set(this.dataService.data);
  }

}
