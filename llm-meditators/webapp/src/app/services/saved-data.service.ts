/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { computed, effect, Injectable, Signal, signal, untracked, WritableSignal } from '@angular/core';
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
import { ActivatedRoute, Router } from '@angular/router';
import * as _ from 'underscore';

export function initialAppData(): AppData {
  const experiment = initialExperimentSetup(5);
  return {
    settings: {
      name: 'LLM-Mediators',
      sheetsId: '',
      sheetsRange: '', // e.g.
    },
    experiment,
    currentUserId: Object.values(experiment.participants)[0].userId,
  };
}

// -------------------------------------------------------------------------------------
//  Session management: stored in the URL
// -------------------------------------------------------------------------------------
export interface AppSession {
  stage: string;
}
export interface AppSessionParamState {
  session: Partial<AppSession>;
  errors: string[];
}
const DEFAULT_SESSION: AppSession = {
  stage: '',
};

function parseSessionParam(str: string | null): AppSessionParamState {
  if (!str) {
    return { session: DEFAULT_SESSION, errors: [] };
  }
  try {
    const session = JSON.parse(str) as AppSession;
    return { session, errors: [] };
  } catch (err) {
    return { session: DEFAULT_SESSION, errors: ['URL state param is not valid JSON'] };
  }
}

function prepareSessionParam(session: AppSession): string {
  return JSON.stringify(session);
}

// -------------------------------------------------------------------------------------
//  App Settings & Data (saved in local storage / firebase)
// -------------------------------------------------------------------------------------
// App setting and data saved in localstorage/server side.
export interface AppSettings {
  name: string;
  sheetsId: string;
  sheetsRange: string;
}
export interface AppData {
  settings: AppSettings;
  experiment: Experiment;
  currentUserId: string;
}

// -------------------------------------------------------------------------------------
//  The Service Class...
// -------------------------------------------------------------------------------------
@Injectable({
  providedIn: 'root',
})
export class SavedDataService {
  public data: WritableSignal<AppData>;

  // About the app itself.
  public appName: Signal<string>;
  public dataSize: Signal<number>;
  public dataJson: Signal<string>;

  // Specific to the current user.
  public user: Signal<UserData>;
  public stageComplete: Signal<boolean>;
  public nameStageMap: Signal<{ [stageName: string]: ExpStage }>;
  public currentStage: Signal<ExpStage>;

  // the current URL params...
  public session: WritableSignal<AppSession>;

  // Any errors.
  public errors: WritableSignal<string[]>;

  constructor(
    private lmApiService: LmApiService,
    private router: Router,
    private route: ActivatedRoute,
  ) {
    // The data.
    this.data = signal(JSON.parse(localStorage.getItem('data') || JSON.stringify(initialAppData())));

    // The current URL params data.
    this.session = signal(DEFAULT_SESSION, { equal: _.isEqual });

    // Current user related data...
    this.user = computed(() => {
      const data = this.data();
      return data.experiment.participants[data.currentUserId];
    });
    this.nameStageMap = computed(() => {
      return this.user().stageMap;
    });
    this.currentStage = computed(() => {
      return this.user().stageMap[this.user().currentStageName];
    });
    this.stageComplete = computed(() => this.currentStage().complete);

    // Convenience signal for the appName.
    this.appName = computed(() => this.data().settings.name);
    this.dataJson = computed(() => JSON.stringify(this.data()));
    this.dataSize = computed(() => this.dataJson().length);
    this.errors = signal([]);

    const params = signal<Partial<AppSession>>({});
    this.route.queryParamMap.forEach((paramMap) => {
      // console.log('updating params state: ', paramMap.get('state'));
      const paramSessionState = parseSessionParam(paramMap.get('state'));
      params.set(paramSessionState.session);
      this.errors.update((errors) => errors.concat(paramSessionState.errors));
      const oldSession = untracked(this.session);
      const newSession = Object.assign({ ...oldSession }, paramSessionState.session);
      if (!_.isEqual(newSession, oldSession)) {
        this.session.set(newSession);
      }
    });

    effect(() => {
      const newSession = this.session();
      const oldParams = untracked(params);
      const oldParamSession = Object.assign({ ...DEFAULT_SESSION }, oldParams);
      // console.log('might update search params', JSON.stringify({oldParamSession, newSession}));
      if (!_.isEqual(oldParamSession, newSession)) {
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { state: prepareSessionParam(newSession) },
        });
      }
    }, {});

    // Save whenever data changes.
    effect(() => {
      localStorage.setItem('data', this.dataJson());
    });
  }

  editSession(f: (session: AppSession) => AppSession | void): void {
    const curSession = this.session();
    let newSession = { ...curSession };
    const maybeFreshSession = f(newSession);
    if (maybeFreshSession) {
      newSession = { ...maybeFreshSession };
    }
    this.session.set(newSession);
  }

  nextStep() {
    this.editCurrentUser((u) => {
      const nextStageName = u.futureStageNames.shift();
      if (!nextStageName) {
        return;
      }
      u.completedStageNames.push(u.currentStageName);
      u.currentStageName = nextStageName;
      this.editSession((session) => {
        session.stage = u.currentStageName;
      });
    });
  }

  setSetting(settingKey: keyof AppSettings, settingValue: string) {
    const data = this.data();
    if (data.settings[settingKey] !== settingValue) {
      data.settings[settingKey] = settingValue;
      this.data.set({ ...data });
    }
  }

  editCurrentUser(f: (user: UserData) => UserData | void) {
    this.editUser(this.data().currentUserId, f);
  }

  editUser(uid: string, f: (user: UserData) => UserData | void) {
    const data = this.data();
    if (!(uid in data.experiment.participants)) {
      throw new Error(`Cannot edit user ${uid}, they do not exist`);
    }
    // We have to force update the user object also, because change tracking for
    // the user Signal is based on reference.
    let user: UserData = { ...data.experiment.participants[uid] };
    const maybeNewUser = f(user);
    if (maybeNewUser) {
      user = { ...maybeNewUser };
    }
    if (user.userId !== uid) {
      throw new Error(`Editing a user should not their id: new: ${user.userId}, old: ${uid}`);
    }
    data.experiment.participants[uid] = user;
    this.data.set({ ...data });
  }

  setCurrentExpStageName(expStageName: string) {
    this.editCurrentUser((user) => {
      user.currentStageName = expStageName;
    });
  }

  setStageComplete(complete: boolean) {
    this.editCurrentUser((user) => {
      user.stageMap[user.currentStageName].complete = complete;
    });
  }

  editCurrentExpStageData<T extends ExpDataKinds>(f: (oldExpStage: T) => T | void) {
    this.editCurrentUser((user) => {
      const maybeNewData = f(user.stageMap[user.currentStageName].config as T);
      if (maybeNewData) {
        user.stageMap[user.currentStageName].config = maybeNewData;
      }
    });
  }

  editExpStageData<T extends ExpDataKinds>(uid: string, stageName: string, f: (oldExpStage: T) => T | void) {
    this.editUser(uid, (user) => {
      const maybeNewData = f(user.stageMap[stageName].config as T);
      if (maybeNewData) {
        user.stageMap[stageName].config = maybeNewData;
      }
    });
  }

  updateUserProfile(newUserProfile: UserProfile) {
    this.editCurrentUser((user) => {
      user.profile = newUserProfile;
    });
  }

  setCurrentUserId(userId: string) {
    this.data.update((data) => {
      if (Object.keys(data.experiment.participants).includes(userId) === false) {
        throw new Error(`Cannot set current user to ${userId}, they do not exist`);
      }
      data.currentUserId = userId;
      return data;
    });
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
