import { Injectable } from '@angular/core';

export interface DataItem {
  id: number;
  date: string;
  text: string;
}

@Injectable({
  providedIn: 'root'
})
export class SavedDataService {
  public data: DataItem[];

  constructor() {
    this.data = JSON.parse(localStorage.getItem('data') || '[]');
  }

  save() {
    localStorage.setItem('data', JSON.stringify(this.data));
  }

  saveItem(item: DataItem) {
    this.data[item.id] = item;
    localStorage.setItem('data', JSON.stringify(this.data));
  }

  deleteItem(item: DataItem) {
    this.data.splice(item.id, 1);
    localStorage.setItem('data', JSON.stringify(this.data));
  }

  async add(text: string): Promise<boolean> {
    this.data.push({
      id: this.data.length,
      date: new Date().toISOString(),
      text
    });
    this.save();
    return true;
  }

  clear() {
    localStorage.setItem('data', '[]');
    this.data = [];
  }

  // list(): string[] {
  //   return [...this.data];
  // }
}
