interface ItemRating {
  item1: number;
  // Index into items
  item2: number;
  confidence?: number;  // -1 = confidence one is best, 0 = 50/50, 1 = confident two is best
}

// Admin editable, some parts of this are written to by certain 
// user actions, by a trusted cloud function.
export interface Experiment {
  electedLeader: string;  // UserId
  maxNumberOfParticipants: number;
  participants: { [userId: string]: User }
  items: Item[];
  expertRatingsForInitialIndWork: ItemRating[];
  ratingsToDiscuss: ItemRating[];  // confidence not used.
  expertRatingsForFinalIndWork: ItemRating[];
  groupChat: Message[];
}

export interface User {
  accessCode: string;  // likely stored in local browser cache/URL.
  state: '0. acceptingTOS' 
    | '1. profileSetup' 
    | '2. initialRating' 
    | '3. groupChat' 
    | '4. finalRating' 
    | '5. post-Chat-satisfaction' 
    | '6. post-leader-reveal-satisfcation'
    | '7. Complete';
  userId: string;
  // Their appearance.
  pronouns: string;
  avatarUrl: string;
  name: string;
  // Actions from the experiment.
  initiallyWantsToLead: number; //  10 point scale.
  // initialRatings = same items as expertRatingsForInitialIndWork
  initialRatings: ItemRating[]; // pre discussion
  votes: { [userId: string]: 'positive' | 'neutral' | 'negative' | 'not-rated' } ;
  finalRatings: ItemRating[]; // post discussion
  finalWantsToLead: number; //  10 point scale.
  satisfactionWithDiscussion: number; //  10 point scale.
  satisfactionAfterLeaderReveal: number; //  10 point scale.
  satisfactionWithExperiment: number; //  10 point scale.
  openFeedback: string;
}

export interface Item {
  name: string; // displayed to the users
  imageUrl: string; // for the picture
}

export interface UserMessage {
  messageType: 'userMessage';
  timestamp: number;
  userId: string;
}

export interface systemMessage {
  messageType: 'systemMessage-DiscussItem';
  timestamp: number;
  itemRatingToDiscuss: ItemRating;
}

export interface ModeratorMessage {
  messageType: 'moderatorMessage';
  timestamp: number;
}

export type Message = UserMessage | systemMessage | ModeratorMessage;