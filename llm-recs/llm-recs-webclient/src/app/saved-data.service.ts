/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { computed, effect, Injectable, Signal, signal, WritableSignal } from '@angular/core';
import { isEmbedError, EmbedError } from 'src/lib/text-embeddings/embedder';
import { ItemInterpreterService } from './item-interpreter.service';
import { LmApiService } from './lm-api.service';

export interface ItemEmbeddings { [key: string]: number[] };
export interface DataItems { [id: string]: DataItem }

export interface AppData {
  settings: AppSettings;
  items: DataItems;
}

export interface AppSettings {
  name: string;
  sheetsId: string;
  sheetsRange: string;
}

export interface DataItem {
  id: string;
  date: string;
  text: string;
  entityTitle: string;
  entityDetails: string;
  sentiment: string;
  embeddings: ItemEmbeddings;
}

export const dummyItem: DataItem = {
  id: 'dummyItemId',
  date: 'dummyItemDate',
  text: 'dummyItemText',
  entityTitle: 'dummyItemTitle',
  entityDetails: 'dummyItemDetails',
  sentiment: 'dummySentiment',
  embeddings: { 'dummyItemTitle': [1, 2, 3] },
}

function initialAppData(): AppData {
  return {
    settings: {
      name: 'A Rudders App',
      sheetsId: '',
      sheetsRange: '', // e.g.
    },
    items: {},
  }
}

@Injectable({
  providedIn: 'root'
})
export class SavedDataService {
  public data: WritableSignal<AppData>;
  public appName: Signal<string>;
  public dataSize: Signal<number>;
  public dataJson: Signal<string>;

  constructor(
    private lmApiService: LmApiService,
    private itemInterpreterService: ItemInterpreterService
  ) {
    // The data.
    this.data = signal(JSON.parse(
      localStorage.getItem('data') || JSON.stringify(initialAppData())));

    // Convenience signal for the appName.
    this.appName = computed(() => this.data().settings.name);
    this.dataJson = computed(() => JSON.stringify(this.data()));
    this.dataSize = computed(() => this.dataJson().length);
    // Save whenever data changes.
    effect(() => {
      localStorage.setItem('data', this.dataJson());
    });
  }

  setSetting(settingKey: keyof AppSettings, settingValue: string) {
    const data = this.data();
    if (data.settings[settingKey] !== settingValue) {
      data.settings[settingKey] = settingValue;
      this.data.set({ ...data });
    }
  }

  saveItem(item: DataItem) {
    const data = this.data();
    data.items[item.id] = item;
    this.data.set({ ...data });
  }

  deleteItem(item: DataItem) {
    const data = this.data();
    delete data.items[item.id];
    this.data.set({ ...data });
  }

  async addRaw(
    entityTitle: string, text: string, entityDetails: string, sentiment: string, embeddings: ItemEmbeddings
  ): Promise<DataItem> {
    const id = `${new Date().valueOf()}`;
    const data = { ... this.data() };
    const dataItem: DataItem = {
      id,
      date: new Date().toISOString(),
      text,
      entityTitle,
      entityDetails,
      sentiment,
      embeddings,
    };
    data.items[id] = dataItem;
    this.data.set({ ...data });
    return dataItem;
  }

  async add(text: string): Promise<EmbedError | DataItem> {
    if (!text) {
      return { error: 'Cannot add empty text!' };
    }
    const item = await this.itemInterpreterService.interpretItemText(text);
    const embeddings = {} as ItemEmbeddings;
    for (const key of item.keys) {
      if (key.trim() === '') {
        continue;
      }
      const embedResponse = await this.lmApiService.embedder.embed(key);
      if (isEmbedError(embedResponse)) {
        return embedResponse;
      }
      embeddings[key] = embedResponse.embedding;
    }
    const dataItem = this.addRaw(item.entityTitle, item.text, item.entityDetails, item.sentiment, embeddings);
    return dataItem;
  }

  clearItems() {
    const data = this.data();
    data.items = {};
    this.data.set({ ...data });
  }

  reset() {
    this.data.set(initialAppData());
  }
}
