/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import {
  computed,
  effect,
  Injectable,
  Signal,
  signal,
  untracked,
  WritableSignal,
} from '@angular/core';
import { LmApiService } from './lm-api.service';
import {
  Experiment,
  ExpStage,
  UserData,
  ExpDataKinds,
  UserProfile,
  ChatAboutItems,
} from '../../lib/staged-exp/data-model';
import { initialExperimentSetup } from '../../lib/staged-exp/example-experiment';
import { ActivatedRoute, Params, Router } from '@angular/router';
import * as _ from 'underscore';
import { toSignal } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import { Session } from 'src/lib/session';
import { AppSettings, AppState, initAppState, initialAppData, SavedAppData } from 'src/lib/app';

// -------------------------------------------------------------------------------------
//  The Service Class...
// -------------------------------------------------------------------------------------
@Injectable({
  providedIn: 'root',
})
export class SavedDataService {
  public data: WritableSignal<SavedAppData>;
  public state: WritableSignal<AppState>;

  // About the app itself.
  public appName: Signal<string>;
  public dataSize: Signal<number>;
  public dataJson: Signal<string>;

  // Any errors.
  public errors: WritableSignal<string[]>;

  constructor(
    private lmApiService: LmApiService,
    private router: Router,
    private route: ActivatedRoute,
  ) {
    // The data.
    this.data = signal(
      JSON.parse(localStorage.getItem('data') || JSON.stringify(initialAppData())),
    );
    this.state = signal(initAppState);

    // Convenience signal for the appName.
    this.appName = computed(() => this.data().settings.name);
    this.dataJson = computed(() => JSON.stringify(this.data()));
    this.dataSize = computed(() => this.dataJson().length);
    this.errors = signal([]);

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

  editExpStageData<T extends ExpDataKinds>(
    uid: string,
    stageName: string,
    f: (oldExpStage: T) => T | void,
  ) {
    this.editUser(uid, (user) => {
      const maybeNewData = f(user.stageMap[stageName].config as T);
      if (maybeNewData) {
        user.stageMap[stageName].config = maybeNewData;
      }
    });
  }

  setCurrentUserId(userId: string) {
    if (Object.keys(data.experiment.participants).includes(userId) === false) {
      throw new Error(`Cannot set current user to ${userId}, they do not exist`);
    }
    this.session.this.data.set({ ...data });
  }

  sendMessage(message: string, stageName: string): void {
    const user = this.user();
    const data = this.data();
    for (const u of Object.values(data.experiment.participants)) {
      // const stage = u.stageMap[stageName];
      // if (stage.kind !== 'group-chat') {
      //   throw new Error(`Cant send a message to stage ${stage.name}, it is of kind ${stage.kind}.`);
      // }
      this.editExpStageData<ChatAboutItems>(u.userId, stageName, (config) => {
        console.log(u.userId, config);
        config.messages.push({
          userId: user.userId,
          messageType: 'userMessage',
          text: message,
          timestamp: new Date().valueOf(),
        });
      });
    }
    this.data.set({ ...data });
  }

  reset() {
    this.data.set(initialAppData());
  }
}
