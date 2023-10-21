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

@Component({
  selector: 'app-data-item',
  templateUrl: './data-item.component.html',
  styleUrls: ['./data-item.component.scss']
})
export class DataItemComponent implements OnInit {
  public mode: 'view' | 'edit' = 'view';

  @Input() item!: DataItem;
  @Output() deleteEvent = new EventEmitter<void>();

  public itemTextControl!: FormControl<string | null>;

  constructor(public dataService: SavedDataService) {
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

  save(): void {
    this.item.text = this.itemTextControl.value || this.item.text;
    this.dataService.saveItem(this.item);
    this.viewMode();
  }

  revert(): void {
    this.itemTextControl.setValue(this.item.text);
  }

  deleteItem(): void {
    this.deleteEvent.emit();
  }

}
