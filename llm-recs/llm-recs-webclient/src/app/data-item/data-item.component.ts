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
  save(): void {
    this.mode = 'view';
    this.item.text = this.itemTextControl.value || this.item.text;
    this.dataService.saveItem(this.item);
  }

  revert(): void {
    this.itemTextControl.setValue(this.item.text);
  }

  deleteItem(): void {
    this.deleteEvent.emit();
    this.mode = 'view';
  }

}
