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
import { ActivatedRoute, Params, Router } from '@angular/router';
import * as _ from 'underscore';

// -------------------------------------------------------------------------------------
//  Session management: stored in the URL
// -------------------------------------------------------------------------------------
export interface AppSession {
  user: string;
  experiment: string;
  stage: string;
}
export interface AppSessionParamState {
  session: Partial<AppSession>;
  errors: string[];
}
const DEFAULT_SESSION: AppSession = {
  user: '',
  experiment: '',
  stage: '',
};

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
  experiments: { [name: string]: Experiment };
  currentUserId: string;
}

export function initialAppData(): AppData {
  const experiment = initialExperimentSetup(3);
  const experiments: { [name: string]: Experiment } = {};
  experiments[experiment.name] = experiment;

  return {
    currentUserId: Object.values(experiment.participants)[0].userId,
    settings: {
      name: 'LLM-Mediators',
      sheetsId: '',
      sheetsRange: '', // e.g.
    },
    experiments,
  };
}

// function parseSessionParam(str: string | null): AppSessionParamState {
//   if (!str) {
//     return { session: DEFAULT_SESSION, errors: [] };
//   }
//   try {
//     const session = JSON.parse(str) as AppSession;
//     return { session, errors: [] };
//   } catch (err) {
//     return { session: DEFAULT_SESSION, errors: ['URL state param is not valid JSON'] };
//   }
// }

// function prepareSessionParam(session: AppSession): string {
//   return JSON.stringify(session);
// }

class Participant {
  public data: Signal<UserData>;
  public experiment: Signal<Experiment>;
  public viewingStage: Signal<ExpStage>;
  public workingOnStage: Signal<ExpStage>;

  constructor(
    private appData: WritableSignal<AppData>,
    private session: Signal<AppSession>,
    public experimentName: string,
    public userId: string,
  ) {
    this.experiment = computed(() => {
      const experiment = this.appData().experiments[experimentName];
      if (!experiment) {
        throw new Error(`No such experiment name: ${experimentName}`);
      }
      return experiment;
    });
    this.data = computed(() => {
      const user = this.experiment().participants[userId];
      if (!user) {
        throw new Error(`No such user id: ${userId}`);
      }
      return user;
    });

    this.viewingStage = computed(() => {
      return this.data().stageMap[this.session().stage];
    });
  }

  public edit(f: (user: UserData) => UserData | void): void {
    const data = this.appData();
    // We have to force update the user object also, because change tracking for
    // the user Signal is based on reference.
    let user: UserData = { ...this.data() };
    const maybeNewUser = f(user);
    if (maybeNewUser) {
      user = { ...maybeNewUser };
    }
    if (user.userId !== this.userId) {
      // TODO: we could consider allowing this with an option to the call...
      throw new Error(`Editing a user should not their id: new: ${user.userId}, old: ${this.userId}`);
    }
    // Editing experiment like this means we assume no async changes to the experiment...
    // If we had signals linked to the experiment, tracked by reference, they will not know...
    this.experiment().participants[user.userId] = user;
    this.appData.set({ ...data });
  }


  editCurrentUser(f: (user: UserData) => UserData | void) {
    this.editUser(this.data().currentUserId, f);
  }

  nextStep() {
    let currentStageName = this.currentStage().name;
    this.editCurrentUser((u) => {
      if (u.workingOnStageName === currentStageName) {
        const nextStageName = u.futureStageNames.shift();
        if (!nextStageName) {
          return;
        }
        u.completedStageNames.push(u.workingOnStageName);
        u.workingOnStageName = nextStageName;
        currentStageName = nextStageName;
      } else {
        // here, we can assume that u.currentStageName is among one of the completed stages.
        const currentStageIdx = u.completedStageNames.indexOf(currentStageName);
        currentStageName =
          currentStageIdx === u.completedStageNames.length - 1
            ? u.workingOnStageName
            : u.completedStageNames[currentStageIdx + 1];
      }

      this.editSession((session) => {
        session.stage = currentStageName;
      });
    });
  }
}

function editExperiment(
  dataSignal: WritableSignal<AppData>,
  eName: string,
  f: (user: Experiment) => Experiment | void,
) {
  const data = dataSignal();
  if (!(eName in data.experiments)) {
    throw new Error(`Cannot edit experiment ${eName}, it does not exist`);
  }
  let experiment = { ...data.experiments[eName] };
  const maybeNewExperiment = f(experiment);
  if (maybeNewExperiment) {
    experiment = maybeNewExperiment;
  }
  if (experiment.name !== eName) {
    delete data.experiments[eName];
  }
  data.experiments[experiment.name] = experiment;
  dataSignal.set({ ...data });
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

  // Specific to the current user & their state.
  public experiment: Signal<Experiment | null>;
  public participant: Signal<Participant | null>;

  // the current URL params...
  public session: WritableSignal<AppSession>;
  public defaultSession: Signal<AppSession>;

  // Any errors.
  public errors: WritableSignal<string[]>;

  public participant(experimentName: string, uid: string): Participant | null {
    return new Participant(this.data(), experimentName, uid);
  }

  constructor(
    private lmApiService: LmApiService,
    private router: Router,
    private route: ActivatedRoute,
  ) {
    // The data.
    this.data = signal(JSON.parse(localStorage.getItem('data') || JSON.stringify(initialAppData())));

    // The current URL params data.
    // Update this to have default data if/as needed.
    this.defaultSession = computed(() => DEFAULT_SESSION);
    // Object.assign({ ...DEFAULT_SESSION }, { stage: this.user().workingOnStageName }));
    this.session = signal(this.defaultSession(), { equal: _.isEqual });

    // Current user related data...
    this.experiment = computed(() => );
    this.participant = computed(() => {
      const experiment = this.experiment();
      if (!experiment) {
        return null;
      }
      const user = experiment.participants[this.session().user];
      if (!user) {
        return null;
      }
      return new Participant(this.data, user, this.session);
    });

    // Convenience signal for the appName.
    this.appName = computed(() => this.data().settings.name);
    this.dataJson = computed(() => JSON.stringify(this.data()));
    this.dataSize = computed(() => this.dataJson().length);
    this.errors = signal([]);

    // This is a rather delicate bit of logic that corelates session parameters to URL parameters.
    // It ensures that all and only non-default session parameters are always
    // represented in the URL.
    let firstEmptyParams = true;
    const lastSession = signal<AppSession>(DEFAULT_SESSION);
    this.route.queryParams.forEach((urlParams) => {
      // Don't update on the very first value, which is always {} even if URL params are provided.
      if (firstEmptyParams) {
        firstEmptyParams = false;
        return;
      }
      const oldSession = untracked(this.session);
      const fullUrlSession: AppSession = Object.assign({ ...this.defaultSession() }, urlParams);
      lastSession.set(fullUrlSession);
      if (!_.isEqual(oldSession, fullUrlSession)) {
        this.session.set(fullUrlSession);
      }
    });

    let firstSessionUpdate = true;
    effect(() => {
      // Don't update on the very first value, which is restored from user saved default session.
      if (firstSessionUpdate) {
        firstSessionUpdate = false;
        return;
      }
      // Remove any entries that are the default value: keep the URL minimal.
      const trimmedNewSession: Partial<AppSession> = { ...this.session() };
      for (const k of Object.keys(trimmedNewSession)) {
        const key = k as keyof Partial<AppSession>;
        if (_.isEqual(trimmedNewSession[key], this.defaultSession()[key])) {
          delete trimmedNewSession[key];
        }
      }
      if (!_.isEqual(lastSession(), this.session())) {
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: trimmedNewSession as Params,
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

  setSetting(settingKey: keyof AppSettings, settingValue: string) {
    const data = this.data();
    if (data.settings[settingKey] !== settingValue) {
      data.settings[settingKey] = settingValue;
      this.data.set({ ...data });
    }
  }

  setCurrentExpStageName(expStageName: string) {
    this.editSession((session) => {
      session.stage = expStageName;
    });
  }

  setWorkingOnExpStageName(expStageName: string) {
    this.editCurrentUser((user) => {
      user.workingOnStageName = expStageName;
    });
  }

  setStageComplete(complete: boolean) {
    this.editCurrentUser((user) => {
      user.stageMap[user.workingOnStageName].complete = complete;
    });
  }

  editWorkingOnExpStageData<T extends ExpDataKinds>(f: (oldExpStage: T) => T | void) {
    this.editCurrentUser((user) => {
      const maybeNewData = f(user.stageMap[user.workingOnStageName].config as T);
      if (maybeNewData) {
        user.stageMap[user.workingOnStageName].config = maybeNewData;
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
    const data = this.data();
    if (Object.keys(data.experiment.participants).includes(userId) === false) {
      throw new Error(`Cannot set current user to ${userId}, they do not exist`);
    }
    data.currentUserId = userId;
    this.data.set({ ...data });
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
