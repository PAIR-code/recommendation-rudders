/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

export interface GenericExpStage<T> {
  kind: string;
  name: string;
  complete: boolean;
  config: T;
}

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
  confidence: number | null; // -1 = confidence one is best, 0 = 50/50, 1 = confident two is best
}
export interface ItemRatings {
  ratings: ItemRating[];
}
export const RANKED_ITEMS_STAGE_KIND = 'rank-items';
export interface ExpStageItemRating extends GenericExpStage<ItemRatings> {
  kind: typeof RANKED_ITEMS_STAGE_KIND;
}

// -------------------------------------------------------------------------------------
export interface UserMessage {
  messageType: 'userMessage';
  timestamp: number;
  userId: string;
  text: string;
}
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
export type Message = UserMessage | DiscussItemsMessage | MediatorMessage;
export interface ChatAboutItems {
  ratingsToDiscuss: ItemPair[];
  messages: Message[];
}
export interface ExpStageChatAboutItems extends GenericExpStage<ChatAboutItems> {
  kind: 'group-chat';
}

export const fakeChat: ExpStageChatAboutItems = {
  kind: 'group-chat',
  name: 'dummy-chat',
  complete: false,
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
export interface ExpStageVotes extends GenericExpStage<Votes> {
  kind: 'leader-vote';
}
export const fakeVote: ExpStageVotes = {
  kind: 'leader-vote',
  name: 'fake leader vote',
  complete: false,
  config: {},
};

// -------------------------------------------------------------------------------------
export interface UserProfile {
  pronouns: string;
  avatarUrl: string;
  name: string;
}
export interface ExpStageUserProfile extends GenericExpStage<UserProfile> {
  kind: 'set-profile';
}

// -------------------------------------------------------------------------------------
export interface Survey {
  question: string;
  lowerBound: string;
  upperBound: string;
  score: number | null; //  10 point scale.
  openFeedback: string;
  freeForm: boolean;
}
export interface ExpStageSurvey extends GenericExpStage<Survey> {
  kind: 'survey';
}

export type EmptyObject = Record<string, never>;

// -------------------------------------------------------------------------------------
// The unique start stage, before they have started.
export interface ExpStageStart extends GenericExpStage<EmptyObject> {
  name: 'start';
  kind: 'start';
}
export const START_STAGE: ExpStageStart = {
  name: 'start',
  kind: 'start',
  complete: true,
  config: {},
};

// -------------------------------------------------------------------------------------
// The unique end stage, once completed.
export interface ExpStageEnd extends GenericExpStage<EmptyObject> {
  name: 'end';
  kind: 'end';
}
export const END_STAGE: ExpStageEnd = {
  name: 'end',
  kind: 'end',
  complete: false,
  config: {},
};

// -------------------------------------------------------------------------------------
export interface TosAcceptance {
  acceptedTimestamp: Date | null;
}
export interface ExpStageTosAcceptance extends GenericExpStage<TosAcceptance> {
  kind: 'accept-tos';
}

// -------------------------------------------------------------------------------------
export type ExpDataKinds =
  | EmptyObject // no data for start and end.
  | TosAcceptance
  | Survey
  | UserProfile
  | Votes
  | ChatAboutItems
  | ItemRatings;

export type ExpStage =
  | ExpStageStart
  | ExpStageTosAcceptance
  | ExpStageSurvey
  | ExpStageUserProfile
  | ExpStageVotes
  | ExpStageChatAboutItems
  | ExpStageItemRating
  | ExpStageEnd;

export type ExpStageKind = ExpStage['kind'];

// -------------------------------------------------------------------------------------
export interface UserData {
  accessCode: string;
  userId: string;
  // Their appearance.
  profile: UserProfile;
  stageMap: { [stageName: string]: ExpStage };
  completedStageNames: string[]; // current stage is the very last one.
  currentStageName: string;
  futureStageNames: string[];
}

// Note: it should be that:
//   type ShouldBeTrue = ExpStage extends GenericExpStage<ExpDataKinds> ? true : false;

// -------------------------------------------------------------------------------------
// Admin editable, some parts of this are written to by certain
// user actions, by a trusted cloud function.
export interface Experiment {
  numberOfParticipants: number;
  participants: { [userId: string]: UserData };
}
