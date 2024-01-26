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
  choice: 'item1' | 'item2' | null; // null = not yet rated
  confidence: number | null; // 0 = 50/50, 1 = most confident
}

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
  userId: string;
  text: string;
}

export const FAKE_EMPTY_USERID = '';

export const fakeEmptyMessage: UserMessage = {
  messageType: 'userMessage',
  timestamp: 0,
  userId: FAKE_EMPTY_USERID,
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

export type Message = UserMessage | DiscussItemsMessage | MediatorMessage;

export interface ChatAboutItems {
  ratingsToDiscuss: ItemPair[];
  messages: Message[];
}

export const STAGE_KIND_CHAT = 'group-chat';

export interface ExpStageChatAboutItems extends GenericExpStage<ChatAboutItems> {
  kind: typeof STAGE_KIND_CHAT;
}

export const fakeChat: ExpStageChatAboutItems = {
  kind: STAGE_KIND_CHAT,
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

export const STAGE_KIND_VOTES = 'leader-vote';

export interface ExpStageVotes extends GenericExpStage<Votes> {
  kind: typeof STAGE_KIND_VOTES;
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
export interface TosAndUserProfile {
  pronouns: string;
  avatarUrl: string;
  name: string;
  acceptedTosTimestamp: Date | null;
}

export const STAGE_KIND_TOS_AND_PROFILE = 'accept-tos-and-set-profile';

export interface ExpStageTosAndUserProfile extends GenericExpStage<TosAndUserProfile> {
  kind: typeof STAGE_KIND_TOS_AND_PROFILE;
}

// -------------------------------------------------------------------------------------
export interface Question {
  questionText: string;
  answerText?: string;
  upperBound?: string;
  lowerBound?: string;
  score?: number | null; //  10 point scale.
  openFeedback?: boolean;
  itemRatings?: ItemRatings;
}

export interface Survey {
  questions: Question[];
}

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

export interface LeaderReveal {
  revealTimestamp: Date | null;
}

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

export enum ExpStageNames {
  '1. Agree to the experiment and set your profile' = '1. Agree to the experiment and set your profile',
  '2. Initial leadership survey' = '2. Initial leadership survey',
  '3. Group discussion' = '3. Group discussion',
  '4. Post-chat survey' = '4. Post-chat survey',
  '5. Post-discussion leadership survey' = '5. Post-discussion leadership survey',
  '6. Vote for the leader' = '6. Vote for the leader',
  '7. Post-discussion work' = '7. Post-discussion work',
  '8. Leader reveal' = '8. Leader reveal',
  '9. final satisfaction survey' = '9. final satisfaction survey',
}

// -------------------------------------------------------------------------------------
export interface UserData {
  accessCode: string;
  userId: string;
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
  numberOfParticipants: number;
  participants: { [userId: string]: UserData };
}
