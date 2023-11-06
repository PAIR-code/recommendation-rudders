import { computed, effect, Injectable, Signal, signal, WritableSignal } from '@angular/core';

export interface ItemEmbeddings { [key: string]: number[] };
export interface DataItems { [id: string]: DataItem }

export interface AppData {
  settings: AppSettings;
  items: DataItems;
}

export interface AppSettings {
  name: string;
}

export interface DataItem {
  id: string;
  date: string;
  text: string;
  embeddings: ItemEmbeddings;
}

function initialAppData(): AppData {
  return {
    settings: { name: 'A Rudders App' },
    items: {},
  }
}

@Injectable({
  providedIn: 'root'
})
export class SavedDataService {
  public data: WritableSignal<AppData>;
  public appName: Signal<string>;

  constructor() {
    // The data.
    this.data = signal(JSON.parse(
      localStorage.getItem('data') || JSON.stringify(initialAppData())));

    // Convenience signal for the appName.
    this.appName = computed(() => this.data().settings.name);

    // Save whenever data changes.
    effect(() => {
      localStorage.setItem('data', JSON.stringify(this.data()));
    });
  }

  setAppName(name: string) {
    const data = this.data();
    data.settings.name = name;
    this.data.set(data);
  }

  saveItem(item: DataItem) {
    const data = this.data();
    data.items[item.id] = item;
    this.data.set(data);
  }

  deleteItem(item: DataItem) {
    const data = this.data();
    delete data.items[item.id];
    this.data.set(data);
  }

  async add(text: string, embeddings: ItemEmbeddings): Promise<boolean> {
    const id = `${new Date().valueOf()}`;
    const data = this.data();
    data.items[id] = {
      id,
      date: new Date().toISOString(),
      text,
      embeddings: embeddings
    };
    this.data.set(data);
    return true;
  }

  clearItems() {
    const data = this.data();
    data.items = {};
    this.data.set(data);
  }

  reset() {
    this.data.set(initialAppData());
  }
}
