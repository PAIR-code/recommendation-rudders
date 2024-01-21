/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { computed, effect, Injectable, Signal, signal, untracked, WritableSignal } from '@angular/core';
import { LmApiService } from './lm-api.service';
import { Experiment, ExpStage, User, ExpDataKinds, END_STAGE } from '../../lib/staged-exp/data-model';
import { initialExperimentSetup, initUserData } from '../../lib/staged-exp/example-experiment';
import { ActivatedRoute, Router } from '@angular/router';
import * as _ from 'underscore';

export function initialAppData(): AppData {
  return {
    settings: {
      name: 'LLM-Mediators Experiment',
      sheetsId: '',
      sheetsRange: '', // e.g.
    },
    experiment: initialExperimentSetup,
    user: initUserData(),
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
  user: User;
}

// -------------------------------------------------------------------------------------
//  The Service Class...
// -------------------------------------------------------------------------------------
@Injectable({
  providedIn: 'root',
})
export class SavedDataService {
  public data: WritableSignal<AppData>;
  public user: Signal<User>;
  public appName: Signal<string>;
  public dataSize: Signal<number>;
  public dataJson: Signal<string>;
  public nameStageMap: Signal<{ [stageName: string]: ExpStage }>;
  public session: WritableSignal<AppSession>;
  public errors: WritableSignal<string[]>;

  constructor(
    private lmApiService: LmApiService,
    private router: Router,
    private route: ActivatedRoute,
  ) {
    // The data.
    this.data = signal(JSON.parse(localStorage.getItem('data') || JSON.stringify(initialAppData())));
    this.nameStageMap = computed(() => {
      const map: { [stageName: string]: ExpStage } = {};
      this.data().experiment.stages.forEach((stage) => (map[stage.name] = stage));
      return map;
    });

    // Convenience signal for the appName.
    this.appName = computed(() => this.data().settings.name);
    this.dataJson = computed(() => JSON.stringify(this.data()));
    this.dataSize = computed(() => this.dataJson().length);
    this.user = computed(() => this.data().user);
    this.session = signal(DEFAULT_SESSION, { equal: _.isEqual });
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

  nextStep() {
    // We update data, and specifically the user in it.
    const data = { ...this.data() };
    const user = { ...data.user };
    data.user = user;

    // Once we get to end, we do nothing.
    if (user.currentStage.kind === END_STAGE.kind) {
      console.warn('nextStep called at the end stage... this should not be possible.');
      return;
    }

    console.log('stages: ', data.experiment.stages);
    console.log('completed stages: ', user.completedStages.length);
    const stages = data.experiment.stages;
    // We have ">" because we always add a dummy start state, so user.completedStages can be 1 bigger
    // than experiment.stages.
    user.completedStages.push(user.currentStage);
    if (user.completedStages.length > stages.length) {
      user.currentStage = END_STAGE;
    } else {
      const nextStage = data.experiment.stages[user.completedStages.length - 1];
      user.currentStage = { ...nextStage };
    }

    console.log('new stage: ', user.currentStage);
    const curSession = this.session();
    const newSession = Object.assign({ ...curSession }, { stage: user.currentStage.name } as Partial<AppSession>);
    this.session.set(newSession);
    console.log(curSession, newSession);
    this.data.set(data);
  }

  setSetting(settingKey: keyof AppSettings, settingValue: string) {
    const data = this.data();
    if (data.settings[settingKey] !== settingValue) {
      data.settings[settingKey] = settingValue;
      this.data.set({ ...data });
    }
  }

  setCurrentExpStageName(expStageName: string) {
    const data = this.data();
    data.user.currentStage = this.nameStageMap()[expStageName];
    this.data.set({ ...data });
  }

  updateExpStage(newExpStage: ExpDataKinds) {
    const data = this.data();
    Object.assign(this.user().currentStage.config, newExpStage);
    this.data.set({ ...data });
  }

  reset() {
    this.data.set(initialAppData());
  }
}
