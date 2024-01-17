export interface Item {
  name: string; // displayed to the users, must be unique
  imageUrl: string; // for the picture
}

interface ItemPair {
  item1: Item;  // Item name
  item2: Item;  // Item name
}

interface ItemRating extends ItemPair {
  confidence: number;  // -1 = confidence one is best, 0 = 50/50, 1 = confident two is best
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

interface ExpStageLeaderVote extends BasicExpStage {
  kind: 'leader-vote';
  // Map from a user to their votes on other users.
  votes: { [userId: string]: 
    { [userId: string]: 'positive' | 'neutral' | 'negative' | 'not-rated' }
  };
  electedLeader: string;  // UserId
}

interface ExpStageSimpleSurvey extends BasicExpStage {
  kind: 'survey';
  question: string;
  responses: { [userId: string]: {
    score: number; //  10 point scale.
    openFeedback: string;
  }};
}

interface ExpStageSetProfile extends BasicExpStage {
  kind: 'set-profile';
  userProfiles: { [userId: string]: UserProfile };
}

interface ExpStageAcceptToS extends BasicExpStage {
  kind: 'accept-tos';
  userAcceptance: { [userId: string]: Date };
}

type ExpStage = ExpStageAcceptToS | ExpStageSetProfile | ExpStageRankItems | ExpStageGroupRatingChat | ExpStageLeaderVote | SimpleSurvey;

// Admin editable, some parts of this are written to by certain 
// user actions, by a trusted cloud function.
export interface Experiment {
  maxNumberOfParticipants: number;
  participants: { [userId: string]: User }
  stages: ExpStage[];
}

export interface UserProfile {
  pronouns: string;
  avatarUrl: string;
  name: string;
}

export interface User {
  accessCode: string;  // likely stored in local browser cache/URL.
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
  userAcceptance: {}
}

const setProfile: ExpStageSetProfile = { 
  kind: 'set-profile',
  name: '1. Set your profile',
  userProfiles: {},
}

const initialExperimentSetup: Experiment = {
  maxNumberOfParticipants: 5,
  participants: {},
  stages: [
    acceptTos,
    setProfile,
  ],
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