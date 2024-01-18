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
import { ErrorResponse, isErrorResponse } from 'src/lib/simple-errors/simple-errors';

export interface Item {
  name: string; // displayed to the users, must be unique
  imageUrl: string; // for the picture
}

interface ItemPair {
  item1: Item; // Item name
  item2: Item; // Item name
}

interface ItemRating extends ItemPair {
  confidence: number; // -1 = confidence one is best, 0 = 50/50, 1 = confident two is best
}

interface BasicExpStage {
  kind: string;
  name: string;
}

interface ExpStageRankItems extends BasicExpStage {
  kind: 'rank-items';
  itemsToRate: ItemPair[];
  rankings: { [userId: string]: ItemRating[] };
}

interface ExpStageGroupRatingChat extends BasicExpStage {
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
interface ExpStageLeaderVote extends BasicExpStage {
  kind: 'leader-vote';
  // Map from a user to their votes on other users.
  // Probably 5 users.
  votes: {
    [userId: string]: { [maybeLeaderUserId: string]: LeaderVote };
  }[];
  electedLeader: string; // UserId
}

interface ExpStageSimpleSurvey extends BasicExpStage {
  kind: 'survey';
  question: string;
  responses: {
    [userId: string]: {
      score: number; //  10 point scale.
      openFeedback: string;
    };
  };
}

interface ExpStageSetProfile extends BasicExpStage {
  kind: 'set-profile';
  userProfiles: { [userId: string]: UserProfile };
}

interface ExpStageAcceptToS extends BasicExpStage {
  kind: 'accept-tos';
  userAcceptance: { [userId: string]: Date };
}

type ExpStage =
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
  userAcceptance: {},
};

const setProfile: ExpStageSetProfile = {
  kind: 'set-profile',
  name: '1. Set your profile',
  userProfiles: {},
};

const initialExperimentSetup: Experiment = {
  maxNumberOfParticipants: 5,
  participants: {},
  stages: [acceptTos, setProfile],
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
    experiment: {
      maxNumberOfParticipants: 5,
      participants: {},
      stages: [acceptTos, setProfile],
    },
  };
}

@Injectable({
  providedIn: 'root',
})
export class SavedDataService {
  public data: WritableSignal<AppData>;
  public appName: Signal<string>;
  public dataSize: Signal<number>;
  public dataJson: Signal<string>;

  constructor(
    private lmApiService: LmApiService,
    private itemInterpreterService: ItemInterpreterService,
  ) {
    // The data.
    this.data = signal(JSON.parse(localStorage.getItem('data') || JSON.stringify(initialAppData())));

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

  reset() {
    this.data.set(initialAppData());
  }
}
