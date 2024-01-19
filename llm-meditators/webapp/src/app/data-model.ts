
export interface GenericExpStage<T> {
  kind: string;
  name: string;
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
export interface ExpStageItemRating extends GenericExpStage<ItemRating> {
  kind: 'rank-items';
}

// -------------------------------------------------------------------------------------
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
export interface ChatAboutItems {
  ratingsToDiscuss: ItemPair[];
  messages: Message[];
}
export interface ExpStageChatAboutItems extends GenericExpStage<ChatAboutItems> {
  kind: 'group-chat';
}

// -------------------------------------------------------------------------------------
export enum LeaderVote {
  POSITIVE = 'positive',
  NEUTRAL = 'neutral',
  NEGATIVE = 'negative',
  NOT_RATED = 'not-rated',
}
export interface Votes { [otherUserId: string]: LeaderVote };
export interface ExpStageVotes extends GenericExpStage<Votes> {
  kind: 'leader-vote';
}

// -------------------------------------------------------------------------------------
export type PronounPair = 'She/Her' | 'They/Them' | 'He/Him' | null;
export interface UserProfile {
  pronouns: PronounPair;
  avatarUrl: string;
  name: string;
}
export interface ExpStageUserProfile extends GenericExpStage<UserProfile> {
  kind: 'set-profile';
}

// -------------------------------------------------------------------------------------
export interface Survey {
  question: string;
  score: number | null; //  10 point scale.
  openFeedback: string;
}
export interface ExpStageSurvey extends GenericExpStage<Survey> {
  kind: 'survey';
}

// -------------------------------------------------------------------------------------
// The unique start stage, before they have started.
export interface ExpStageStart extends GenericExpStage<{}> {
  name: 'start';
  kind: 'start';
}
export const START_STAGE: ExpStageStart = {
  name: 'start',
  kind: 'start',
  config: {}
}

// -------------------------------------------------------------------------------------
// The unique end stage, once completed.
export interface ExpStageEnd extends GenericExpStage<{}> {
  name: 'end';
  kind: 'end';
}
export const END_STAGE: ExpStageEnd = {
  name: 'end',
  kind: 'end',
  config: {}
}

// -------------------------------------------------------------------------------------
export interface TosAcceptance {
  acceptedTimestamp: Date | null;
}
export interface ExpStageTosAcceptance extends GenericExpStage<TosAcceptance> {
  kind: 'accept-tos';
}

// -------------------------------------------------------------------------------------
export type ExpDataKinds =
  | {}  // no data for start and end.
  | TosAcceptance
  | Survey
  | UserProfile
  | Votes
  | ChatAboutItems
  | ItemRating;

export type ExpStage =
  | ExpStageStart
  | ExpStageTosAcceptance
  | ExpStageSurvey
  | ExpStageUserProfile
  | ExpStageVotes
  | ExpStageChatAboutItems
  | ExpStageItemRating
  | ExpStageEnd;

// Note: it should be that:
type ShouldBeTrue = ExpStage extends GenericExpStage<ExpDataKinds> ? true : false;

// -------------------------------------------------------------------------------------
// Admin editable, some parts of this are written to by certain
// user actions, by a trusted cloud function.
export interface Experiment {
  numberOfParticipants: number;
  participants: { [userId: string]: User };
  stages: ExpStage[];
}

// -------------------------------------------------------------------------------------
export interface User {
  accessCode: string; // likely stored in local browser cache/URL.
  userId: string;
  // Their appearance.
  profile: UserProfile;
  currentStage: ExpStage;
  completedStages: ExpStage[];  // current stage is the very last one.
}