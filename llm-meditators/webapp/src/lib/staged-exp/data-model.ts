/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { uniqueId } from 'lodash';

export interface GenericExpStage<T> {
  kind: string;
  name: string;
  config: T;
}

// -------------------------------------------------------------------------------------
export interface UserProfile {
  pronouns: string;
  avatarUrl: string;
  name: string;
}

export const STAGE_KIND_PROFILE = 'set-profile';

export interface ExpStageUserProfile extends GenericExpStage<UserProfile> {
  kind: typeof STAGE_KIND_PROFILE;
}

export const fakeEmptyProfile: UserProfile = {
  pronouns: 'fake pronouns',
  avatarUrl: 'fake avatar url',
  name: 'fake name',
};

// -------------------------------------------------------------------------------------
export interface Item {
  name: string; // displayed to the users, must be unique
  imageUrl: string; // for the picture
}

export interface ItemPair {
  item1: Item; // Item name
  item2: Item; // Item name
}

export interface ItemRating extends ItemPair {
  choice: 'item1' | 'item2' | null; // null = not yet rated
  confidence: number | null; // 0 = 50/50, 1 = most confident
}

export const getDefaultItemRating = (): ItemRating => {
  return {
    item1: {
      name: '',
      imageUrl: '',
    },
    item2: {
      name: '',
      imageUrl: '',
    },
    choice: null,
    confidence: null,
  };
};

export interface ItemRatings {
  ratings: ItemRating[];
}

// export const STAGE_KIND_RANKED_ITEMS = 'rank-items';

// export interface ExpStageItemRatings extends GenericExpStage<ItemRatings> {
//   kind: typeof STAGE_KIND_RANKED_ITEMS;
// }

// -------------------------------------------------------------------------------------
export interface UserMessage {
  messageType: 'userMessage';
  timestamp: number;
  fromUserId: string;
  fromProfile: UserProfile;
  text: string;
}

export const FAKE_EMPTY_USERID = '';

export const fakeEmptyMessage: UserMessage = {
  messageType: 'userMessage',
  timestamp: 0,
  fromUserId: FAKE_EMPTY_USERID,
  fromProfile: fakeEmptyProfile,
  text: 'fakeMessage',
};

export interface DiscussItemsMessage {
  messageType: 'discussItemsMessage';
  timestamp: number;
  itemRatingToDiscuss: ItemRating;
  text: string;
}

export interface MediatorMessage {
  messageType: 'mediatorMessage';
  timestamp: number;
  text: string;
}

export const fakeEmptyMediatorMessage: MediatorMessage = {
  messageType: 'mediatorMessage',
  timestamp: 0,
  text: 'fakeMessage',
};

export type Message = UserMessage | DiscussItemsMessage | MediatorMessage;

export interface ChatAboutItems {
  ratingsToDiscuss: ItemPair[];
  messages: Message[];
}

export const getDefaultChatAboutItemsConfig = (): ChatAboutItems => {
  return {
    ratingsToDiscuss: [],
    messages: [],
  };
};

export const STAGE_KIND_CHAT = 'group-chat';

export interface ExpStageChatAboutItems extends GenericExpStage<ChatAboutItems> {
  kind: typeof STAGE_KIND_CHAT;
}

export const fakeChat: ExpStageChatAboutItems = {
  kind: STAGE_KIND_CHAT,
  name: 'dummy-chat',
  config: {
    ratingsToDiscuss: [],
    messages: [],
  },
};

// -------------------------------------------------------------------------------------
export enum LeaderVote {
  POSITIVE = 'positive',
  NEUTRAL = 'neutral',
  NEGATIVE = 'negative',
  NOT_RATED = 'not-rated',
}
export interface Votes {
  [otherUserId: string]: LeaderVote;
}

export const getDefaultVotesConfig = (): Votes => {
  return {};
};

export const STAGE_KIND_VOTES = 'leader-vote';

export interface ExpStageVotes extends GenericExpStage<Votes> {
  kind: typeof STAGE_KIND_VOTES;
}

// -------------------------------------------------------------------------------------
export interface TosAndUserProfile {
  pronouns: string;
  avatarUrl: string;
  name: string;
  tosLines: string[];
  acceptedTosTimestamp: Date | null;
}

export const getDefaultTosAndUserProfileConfig = (): TosAndUserProfile => {
  return {
    pronouns: '',
    avatarUrl: '',
    name: '',
    tosLines: [''],
    acceptedTosTimestamp: null,
  };
};

export const STAGE_KIND_TOS_AND_PROFILE = 'accept-tos-and-set-profile';

export interface ExpStageTosAndUserProfile extends GenericExpStage<TosAndUserProfile> {
  kind: typeof STAGE_KIND_TOS_AND_PROFILE;
}

// -------------------------------------------------------------------------------------
export interface AbstractQuestion<K extends string> {
  kind: K;
  id: string;
}

// -------------------------------------------------------------------------------------
export enum SurveyQuestionKind {
  TEXT = 'TextQuestion',
  CHECK = 'CheckQuestion',
  RATING = 'RatingQuestion',
  SCALE = 'ScaleQuestion',
}

export const SURVEY_QUESTION_TEXT = 'TextQuestion';
export interface TextQuestion {
  kind: SurveyQuestionKind.TEXT;
  id: string;
  questionText: string;
  answerText: string;
}

export const SURVEY_QUESTION_CHECK = 'CheckQuestion';
export interface CheckQuestion {
  kind: SurveyQuestionKind.CHECK;
  id: string;
  questionText: string;
  checkMark: boolean | null;
}

export const SURVEY_QUESTION_RATING = 'RatingQuestion';
export interface RatingQuestion {
  kind: SurveyQuestionKind.RATING;
  id: string;
  questionText: string;
  rating: ItemRating;
}

export const SURVEY_QUESTION_SCALE = 'ScaleQuestion';
export interface ScaleQuestion {
  kind: SurveyQuestionKind.SCALE;
  id: string;
  questionText: string;
  upperBound: string;
  lowerBound: string;
  score: number | null; //  10 point scale.
}

export type QuestionData = TextQuestion | RatingQuestion | ScaleQuestion | CheckQuestion;

export const getDefaultTextQuestion = (): TextQuestion => {
  return {
    kind: SurveyQuestionKind.TEXT,
    id: uniqueId(),
    questionText: '',
    answerText: '',
  };
};

export const getDefaultCheckQuestion = (): CheckQuestion => {
  return {
    kind: SurveyQuestionKind.CHECK,
    id: uniqueId(),
    questionText: '',
    checkMark: null,
  };
};

export const getDefaultItemRatingsQuestion = (): RatingQuestion => {
  return {
    kind: SurveyQuestionKind.RATING,
    id: uniqueId(),
    questionText: '',
    rating: {
      item1: { name: '', imageUrl: '' },
      item2: { name: '', imageUrl: '' },
      choice: null,
      confidence: null,
    },
  };
};

export const getDefaultScaleQuestion = (): ScaleQuestion => {
  return {
    kind: SurveyQuestionKind.SCALE,
    id: uniqueId(),
    questionText: '',
    upperBound: '',
    lowerBound: '',
    score: null,
  };
};

export interface Survey {
  questions: QuestionData[];
}

export const getDefaultSurveyConfig = (): Survey => {
  return {
    questions: [],
  };
};

export const STAGE_KIND_SURVEY = 'survey';

export interface ExpStageSurvey extends GenericExpStage<Survey> {
  kind: typeof STAGE_KIND_SURVEY;
}

// -------------------------------------------------------------------------------------
export interface TosAcceptance {
  acceptedTosTimestamp: Date | null;
}

export const STAGE_KIND_ACCEPT_TOS = 'accept-tos';

export interface ExpStageTosAcceptance extends GenericExpStage<TosAcceptance> {
  kind: typeof STAGE_KIND_ACCEPT_TOS;
}

// -------------------------------------------------------------------------------------
export interface LeaderReveal {
  pendingVoteStageName: string;
  revealTimestamp: Date | null;
}
export const getDefaultLeaderRevealConfig = (): LeaderReveal => {
  return {
    pendingVoteStageName: '',
    revealTimestamp: null,
  };
};

export const STAGE_KIND_LEADER_REVEAL = 'leader-reveal';

export interface ExpStageLeaderReveal extends GenericExpStage<LeaderReveal> {
  kind: typeof STAGE_KIND_LEADER_REVEAL;
}

// -------------------------------------------------------------------------------------
export type ExpDataKinds =
  | TosAcceptance
  | TosAndUserProfile
  | Survey
  | UserProfile
  | Votes
  | ChatAboutItems
  //| ItemRatings
  | LeaderReveal;

export type ExpStage =
  | ExpStageTosAcceptance
  | ExpStageTosAndUserProfile
  | ExpStageSurvey
  | ExpStageUserProfile
  | ExpStageVotes
  | ExpStageChatAboutItems
  // | ExpStageItemRatings
  | ExpStageLeaderReveal;

// type SelfMap<T extends ExpStage> = Map<T['kind'], T>;

// type KindToStageMap<K, T extends ExpStage> = T extends { kind: K } ?

//   ? { [Key in T['kind']]: T['config'] }
//   : never;

// type KindToStageMap<T extends ExpStage> = T extends any
//   ? { [Key in T['kind']]: T['config'] }
//   : never;

// type Bar = ExpStageTosAndUserProfile & ExpStageSurvey;

// type Foo = KindToStageMap<ExpStageTosAndUserProfile> & ;

// {
//   ExpStageTosAcceptance['kind']: ExpStageTosAcceptance,
//   // [ExpStageTosAcceptance['kind']]: ExpStageTosAcceptance,
// }

export type ExpStageKind = ExpStage['kind'];

// -------------------------------------------------------------------------------------
// TODO: probably an enum does this for us better...?
export const stageKinds = {
  STAGE_KIND_ACCEPT_TOS: STAGE_KIND_ACCEPT_TOS as typeof STAGE_KIND_ACCEPT_TOS,
  STAGE_KIND_TOS_AND_PROFILE: STAGE_KIND_TOS_AND_PROFILE as typeof STAGE_KIND_TOS_AND_PROFILE,
  STAGE_KIND_SURVEY: STAGE_KIND_SURVEY as typeof STAGE_KIND_SURVEY,
  STAGE_KIND_PROFILE: STAGE_KIND_PROFILE as typeof STAGE_KIND_PROFILE,
  STAGE_KIND_VOTES: STAGE_KIND_VOTES as typeof STAGE_KIND_VOTES,
  // STAGE_KIND_RANKED_ITEMS: STAGE_KIND_RANKED_ITEMS as typeof STAGE_KIND_RANKED_ITEMS,
  STAGE_KIND_CHAT: STAGE_KIND_CHAT as typeof STAGE_KIND_CHAT,
  STAGE_KIND_LEADER_REVEAL: STAGE_KIND_LEADER_REVEAL as typeof STAGE_KIND_LEADER_REVEAL,
};

// -------------------------------------------------------------------------------------
export interface UserData {
  // immutale properties.
  readonly accessCode: string;
  readonly userId: string;
  // Their appearance.
  profile: UserProfile;
  stageMap: { [stageName: string]: ExpStage };
  completedStageNames: string[]; // current stage is the very last one.
  workingOnStageName: string;
  futureStageNames: string[];
}

// Note: it should be that:
//   type ShouldBeTrue = ExpStage extends GenericExpStage<ExpDataKinds> ? true : false;

// -------------------------------------------------------------------------------------
// Admin editable, some parts of this are written to by certain
// user actions, by a trusted cloud function.
export interface Experiment {
  name: string;
  date: Date;
  numberOfParticipants: number;
  participants: { [userId: string]: UserData };
}
