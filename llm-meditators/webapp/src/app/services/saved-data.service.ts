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
import { Experiment, ExpStage, ExpStageAcceptToS, ExpStageSetProfile, ExpStageSimpleSurvey } from '../data-model';

// -------------------------------------------------------------------------------------

const acceptTos: ExpStageAcceptToS = {
  kind: 'accept-tos',
  name: '0. Agree to the experiment',
  // userAcceptance: Date,
};

const setProfile: ExpStageSetProfile = {
  kind: 'set-profile',
  name: '1. Set your profile',
  userProfile: {
    pronouns: '',
    avatarUrl: '',
    name: ''
  }
  // userProfiles: {},
};

const simpleSurvey: ExpStageSimpleSurvey = {
  kind: 'survey',
  name: '4. Post-chat survey',
  question: 'How was the chat?',
  response: {
    // score: 
    openFeedback: '',
  },
};

const initialExperimentSetup: Experiment = {
  maxNumberOfParticipants: 5,
  participants: {},
  stages: [acceptTos, setProfile, simpleSurvey],
  currentStage: '0. Agree to the experiment',
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
}

export interface AppSettings {
  name: string;
  sheetsId: string;
  sheetsRange: string;
}

function initialAppData(): AppData {
  return {
    settings: {
      name: 'A Rudders App',
      sheetsId: '',
      sheetsRange: '', // e.g.
    },
    experiment: initialExperimentSetup
  };
}

// -------------------------------------------------------------------------------------
@Injectable({
  providedIn: 'root',
})
export class SavedDataService {
  public data: WritableSignal<AppData>;
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
    data.experiment.currentStage = expStageName;
    this.data.set({ ...data });
  }

  updateExpStage(newExpStage: ExpStage) {
    const data = this.data();
    Object.assign(this.nameStageMap()[newExpStage.name], newExpStage);
    this.data.set({ ...data });
  }

  reset() {
    this.data.set(initialAppData());
  }
}
