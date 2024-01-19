/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { computed, effect, Injectable, Signal, signal, WritableSignal } from '@angular/core';
import { LmApiService } from './lm-api.service';
import { SimpleError, isErrorResponse } from 'src/lib/simple-errors/simple-errors';
import { map } from 'underscore';
import { Experiment, ExpStage, ExpStageTosAcceptance, ExpStageUserProfile, ExpStageSurvey, User, START_STAGE, ExpDataKinds } from '../data-model';

// -------------------------------------------------------------------------------------

const acceptTos: ExpStageTosAcceptance = {
  kind: 'accept-tos',
  name: '0. Agree to the experiment',
  config: {
    acceptedTimestamp: null
  }
  // userAcceptance: Date,
};

const setProfile: ExpStageUserProfile = {
  kind: 'set-profile',
  name: '1. Set your profile',
  config: {
    pronouns: null,
    avatarUrl: '',
    name: ''
  }
  // userProfiles: {},
};

const simpleSurvey: ExpStageSurvey = {
  kind: 'survey',
  name: '4. Post-chat survey',
  config: {
    question: 'How was the chat?',
    score: null,
    openFeedback: '',
  },
};

const initialExperimentSetup: Experiment = {
  numberOfParticipants: 5,
  participants: {},
  stages: [acceptTos, setProfile, simpleSurvey],
};
// -------------------------------------------------------------------------------------


// TODO: write up the rest of the experiment.

// '0. acceptingTOS'
// | '1. profileSetup'
// | '2. initialRating'
// | '3. groupChat'
// | '4. finalRating'
// | '5. post-Chat-satisfaction'
// | '6. post-leader-reveal-satisfcation'
// | '7. Complete';

export interface AppData {
  settings: AppSettings;
  experiment: Experiment;
  user: User;
}

export interface AppSettings {
  name: string;
  sheetsId: string;
  sheetsRange: string;
}

function initUserData(): User {
  return {
    userId: '',
    accessCode: '',
    profile: {
      name: '',
      pronouns: null,
      avatarUrl: '',
    },
    currentStage: START_STAGE as ExpStage,
    completedStages: ([] as ExpStage[]),
  };
}

function initialAppData(): AppData {
  return {
    settings: {
      name: 'LLM-Mediators Experiment',
      sheetsId: '',
      sheetsRange: '', // e.g.
    },
    experiment: initialExperimentSetup,
    user: initUserData()
  };
}

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

  constructor(
    private lmApiService: LmApiService,
  ) {
    // The data.
    this.data = signal(JSON.parse(localStorage.getItem('data') || JSON.stringify(initialAppData())));
    this.nameStageMap = computed(() => {
      const map: { [stageName: string]: ExpStage } = {};
      this.data().experiment.stages.forEach(stage => 
        map[stage.name] = stage 
      );
      return map;
    });

    // Convenience signal for the appName.
    this.appName = computed(() => this.data().settings.name);
    this.dataJson = computed(() => JSON.stringify(this.data()));
    this.dataSize = computed(() => this.dataJson().length);
    this.user = computed(() => this.data().user);

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
