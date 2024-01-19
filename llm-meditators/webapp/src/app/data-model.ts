
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
