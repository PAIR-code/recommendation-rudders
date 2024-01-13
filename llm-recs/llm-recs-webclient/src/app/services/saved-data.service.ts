/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { computed, effect, Injectable, OnInit, Signal, signal, untracked, WritableSignal } from '@angular/core';
import { ItemInterpreterService } from './item-interpreter.service';
import { LmApiService } from './lm-api.service';
import { ErrorResponse, isErrorResponse } from 'src/lib/simple-errors/simple-errors';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import * as _ from 'underscore';

export interface ItemEmbeddings { [key: string]: number[] };
export interface DataItems { [id: string]: DataItem }

// App session (reflected in URL parameters)
export interface AppSession {
  openItemIds: string[];  // sorted. 
  activeSearch: string;
  itemText: string;
}

export interface AppSessionParamState {
  session: Partial<AppSession>;
  errors: string[];
}

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

export function emptyItem(): DataItem {
  const id = `${new Date().valueOf()}`;
  const dataItem: DataItem = {
    id,
    date: new Date().toISOString(),
    text: '',
    entityTitle: '',
    entityDetails: '',
    sentiment: '',
    embeddings: { '': [] },
  };
  return dataItem;
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

const DEFAULT_SESSION: AppSession = {
  openItemIds: [],
  activeSearch: '',
  itemText: '',
};

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

function parseSessionParam(str: string | null): AppSessionParamState {
  if(!str) {
    return { session: DEFAULT_SESSION, errors: [] }
  }
  try {
    const session = JSON.parse(str) as AppSession;
    return { session, errors: [] }
  } catch (err) {
    return { session: DEFAULT_SESSION, 
      errors: ['URL state param is not valid JSON'] }
  }
}

function prepareSessionParam(session: AppSession): string {
  return JSON.stringify(session);
}

@Injectable({
  providedIn: 'root'
})
export class SavedDataService {
  public data: WritableSignal<AppData>;
  public appName: Signal<string>;
  public activeSearch: Signal<string>;
  public dataSize: Signal<number>;
  public dataJson: Signal<string>;
  public session: WritableSignal<AppSession>;
  public openItems: Signal<Set<string>>;
  public errors: WritableSignal<string[]>;

  constructor(
    private lmApiService: LmApiService,
    private itemInterpreterService: ItemInterpreterService,
    private router: Router,
    private route: ActivatedRoute,
  ) {
    // The data.
    this.data = signal(JSON.parse(
      localStorage.getItem('data') || JSON.stringify(initialAppData())));

    // Convenience signal for the appName.
    this.appName = computed(() => this.data().settings.name);
    this.dataJson = computed(() => JSON.stringify(this.data()));
    this.dataSize = computed(() => this.dataJson().length);
    this.session = signal(DEFAULT_SESSION, { equal: _.isEqual });
    this.errors = signal([]);
    this.openItems = computed(() => new Set(this.session().openItemIds));
    this.activeSearch = computed(() => this.session().activeSearch);

    // Save whenever data changes.
    effect(() => {
      localStorage.setItem('data', this.dataJson());
    });
    
    const params = signal<Partial<AppSession>>({});
    this.route.queryParamMap.forEach(paramMap => {
      // console.log('updating params state: ', paramMap.get('state'));
      const paramSessionState = parseSessionParam(paramMap.get('state'));
      params.set(paramSessionState.session);
      this.errors.update(errors => errors.concat(paramSessionState.errors));
      const oldSession = untracked(this.session);
      const newSession = Object.assign({...oldSession}, paramSessionState.session);
      if (!_.isEqual(newSession, oldSession)) {
        this.session.set(newSession);
      }
    });

    effect(() => {
      const newSession = this.session();
      const oldParams = untracked(params);
      const oldParamSession = Object.assign({...DEFAULT_SESSION}, oldParams);
      // console.log('might update search params', JSON.stringify({oldParamSession, newSession}));
      if (!_.isEqual(oldParamSession, newSession)) {
        this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { state: prepareSessionParam(newSession) },
          });
      }
    }, {});
  }

  // Not needed, done by signals in the constructor. 
  // ngOnInit() {
  //   this.session.set(this.route.snapshot.paramMap
  //   this.hero$ = this.service.getHero(heroId);
  // }

  // TODO: Think about whether we should depend on the signal equality or not...
  setItemText(s: string) {
    const session = this.session();
    if (session.itemText !== s) {
      const newSession = { ...session };
      newSession.itemText = s;
      this.session.set(newSession);
    }
  }

  // // TODO: Think about whether we should depend on the signal equality or not...
  // setTabText(tab: 'home' | 'settings') {
  //   const session = this.session();
  //   if (session.tab !== tab) {
  //     session.tab = tab;
  //     this.session.set({ ...session });
  //   }
  // }

  // TODO: Think about whether we should depend on the signal equality or not...
  setActiveSearch(activeSearch: string) {
    const session = this.session();
    if (session.activeSearch !== activeSearch) {
      const newSession = { ...session };
      newSession.activeSearch = activeSearch;
      this.session.set(newSession);
    }
  }

  // TODO: Think about whether we should depend on the signal equality or not...
  openItem(itemId: string) {
    const session = this.session();
    const items = new Set(session.openItemIds)
    if (!items.has(itemId)) {
      const newSession = { ...session };
      items.add(itemId);
      newSession.openItemIds = [...items].sort();
      this.session.set(newSession);
    }
  }

  // TODO: Think about whether we should depend on the signal equality or not...
  closeItem(itemId: string) {
    const session = this.session();
    const items = new Set(session.openItemIds)
    if (items.has(itemId)) {
      const newSession = { ...session };
      items.delete(itemId);
      newSession.openItemIds = [...items].sort();
      this.session.set(newSession);
    }
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
    this.closeItem(item.id);
    delete data.items[item.id];
    this.data.set({ ...data });
  }

  addDataItem(dataItem: DataItem): DataItem {
    const data = { ... this.data() };
    data.items[dataItem.id] = dataItem;
    this.data.set({ ...data });
    return dataItem;
  }

  async createItem(textToInterpret: string): Promise<DataItem | ErrorResponse> {
    if (textToInterpret.trim() === '') {
      return { error: 'Cannot add empty text!' };
    }
    const responseOrError =
      await this.itemInterpreterService.interpretItemText(textToInterpret);
    if (isErrorResponse(responseOrError)) {
      return responseOrError;
    }
    const {
      entityDetails, entityTitle, sentiment, text, keys
    } = responseOrError;

    const embeddings = {} as ItemEmbeddings;
    for (const key of keys) {
      if (key.trim() === '') {
        continue;
      }
      const embedResponse = await this.lmApiService.embedder.embed(key);
      if (isErrorResponse(embedResponse)) {
        return embedResponse;
      }
      embeddings[key] = embedResponse.embedding;
    }
    const id = `${new Date().valueOf()}`;
    const dataItem: DataItem = {
      id,
      date: new Date().toISOString(),
      text,
      entityTitle,
      entityDetails,
      sentiment,
      embeddings,
    };
    return dataItem;
  }

  itemIsOpen(item: DataItem): boolean {
    return this.openItems().has(item.id);
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
