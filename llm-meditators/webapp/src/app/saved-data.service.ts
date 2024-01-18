/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { computed, effect, Injectable, Signal, signal, WritableSignal } from '@angular/core';
import { ItemInterpreterService } from './item-interpreter.service';
import { LmApiService } from './lm-api.service';
import { SimpleError, isErrorResponse } from 'src/lib/simple-errors/simple-errors';
import { map } from 'underscore';

export interface Item {
  name: string; // displayed to the users, must be unique
  imageUrl: string; // for the picture
}

export interface ItemPair {
  item1: Item; // Item name
  item2: Item; // Item name
}

export interface ItemRating extends ItemPair {
  confidence: number; // -1 = confidence one is best, 0 = 50/50, 1 = confident two is best
}

export interface BasicExpStage {
  kind: string;
  name: string;
}

export interface ExpStageRankItems extends BasicExpStage {
  kind: 'rank-items';
  itemsToRate: ItemPair[];
  rankings: { [userId: string]: ItemRating[] };
}

export interface ExpStageGroupRatingChat extends BasicExpStage {
  kind: 'group-chat';
  ratingsToDiscuss: ItemPair[];
  messages: Message[];
}

export enum LeaderVote {
  POSITIVE = 'positive',
  NEUTRAL = 'neutral',
  NEGATIVE = 'negative',
  NOT_RATED = 'not-rated',
}

export enum PronounPair {
  SHE = 'She/Her',
  THEY = 'They/Them',
  HE = 'He/Him',
}
export interface ExpStageLeaderVote extends BasicExpStage {
  kind: 'leader-vote';
  // Map from a user to their votes on other users.
  // Probably 5 users.
  
  // Backend data model
  // votes: {
  //   [userId: string]: { [maybeLeaderUserId: string]: LeaderVote };
  // }[];
  
  // Individual user model
  votes: { [otherUserId: string]: LeaderVote };

  electedLeader: string; // UserId
}

export interface ExpStageSimpleSurvey extends BasicExpStage {
  kind: 'survey';
  question: string;
  response: {
    score?: number; //  10 point scale.
    openFeedback: string;
  }
  // Backend:
  // responses: {
  //   [userId: string]: {
  //     score: number; //  10 point scale.
  //     openFeedback: string;
  //   };
  // };
}

export interface ExpStageSetProfile extends BasicExpStage {
  kind: 'set-profile';
  // Backend data...
  // userProfiles: { [userId: string]: UserProfile };
  userProfile: UserProfile
}

export interface ExpStageAcceptToS extends BasicExpStage {
  kind: 'accept-tos';
  // Backend data...
  // userAcceptance: { [userId: string]: Date };
  userAcceptance?: Date;
}

export type ExpStage =
  | ExpStageAcceptToS
  | ExpStageSetProfile
  | ExpStageRankItems
  | ExpStageGroupRatingChat
  | ExpStageLeaderVote
  | ExpStageSimpleSurvey;

// Admin editable, some parts of this are written to by certain
// user actions, by a trusted cloud function.
export interface Experiment {
  maxNumberOfParticipants: number;
  participants: { [userId: string]: User };
  stages: ExpStage[];
  currentStage: string;
}

export interface UserProfile {
  pronouns: string;
  avatarUrl: string;
  name: string;
}

export interface User {
  accessCode: string; // likely stored in local browser cache/URL.
  state: string; // BasicExpStage.name
  userId: string;
  // Their appearance.
  profile: UserProfile;
}

export interface UserMessage {
  messageType: 'userMessage';
  timestamp: number;
  userId: string;
}

export interface SystemMessage {
  messageType: 'systemMessage-DiscussItem';
  timestamp: number;
  itemRatingToDiscuss: ItemRating;
}

export interface ModeratorMessage {
  messageType: 'moderatorMessage';
  timestamp: number;
}

export type Message = UserMessage | SystemMessage | ModeratorMessage;

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

// --------------------------------------------
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
    private itemInterpreterService: ItemInterpreterService,
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
