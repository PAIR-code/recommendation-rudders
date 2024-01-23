/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/
import { v4 as uuidv4 } from 'uuid';
import {
  Experiment,
  ExpStage,
  ExpStageTosAcceptance,
  ExpStageUserProfile,
  ExpStageSurvey,
  ExpStageStart,
  ExpStageVotes,
  ExpStageChatAboutItems,
  ExpStageItemRating,
  ExpStageEnd,
  User,
  START_STAGE,
  ExpDataKinds,
  END_STAGE,
  ItemPair,
  Item,
  LeaderVote,
  Question,
} from './data-model';

import * as items from './items';

// -------------------------------------------------------------------------------------
//  Initial Experiment Setup
// -------------------------------------------------------------------------------------
const acceptTos: ExpStageTosAcceptance = {
  kind: 'accept-tos',
  name: '1. Agree to the experiment',
  complete: false,
  config: {
    acceptedTimestamp: null,
  },
  // userAcceptance: Date,
};
const initialWork: ExpStageItemRating = {
  kind: 'rank-items',
  name: '2. Initial work',
  complete: false,
  config: {
    ratings: [
      { item1: items.compas, item2: items.blanket, confidence: null },
      { item1: items.compas, item2: items.lighter, confidence: null },
    ],
  },
  // userAcceptance: Date,
};
const initialWantToLeadQuestion: Question = {
  questionText: `Rate the how much you would like to be the group leader.`,
  lowerBound: "I would most definitely not like to be the leader (0/10)",
  upperBound: "I will fight to be the leader (10/10)",
  openFeedback: false,
  score: null,
}
const initialWantToLeadSurvey: ExpStageSurvey = {
  kind: 'survey',
  name: '3. intial leadership survey',
  complete: false,
  config: {
    questions: [initialWantToLeadQuestion],
  },
};
const setProfile: ExpStageUserProfile = {
  kind: 'set-profile',
  name: '4. Set your profile',
  complete: false,
  config: {
    pronouns: '',
    avatarUrl: '',
    name: '',
  },
  // userProfiles: {},
};
const groupChat: ExpStageChatAboutItems = {
  kind: 'group-chat',
  name: '5. Group discussion',
  complete: false,
  config: {
    ratingsToDiscuss: [],
    messages: [],
  },
};

const chatDiscussionQuestion: Question = {
  questionText: `Rate the chat dicussion on a 1-10 scale.
Also indicate your overall feeling about the chat.`,
  answerText: '',
  lowerBound: "I did not enjoy the discussion at all (0/10)",
  upperBound: "The dicussion was a perfect experience to me (10/10)",
  openFeedback: true,
  score: null,
}
const chatDiscussionSurvey: ExpStageSurvey = {
  kind: 'survey',
  name: '6. Post-chat survey',
  complete: false,
  config: {
    questions: [chatDiscussionQuestion],
  },
};

const postChatWantToLeadQuestion: Question = {
  questionText: `Rate the how much you would like to be the group leader.`,
  answerText: '',
  lowerBound: "I would most definitely not like to be the leader (0/10)",
  upperBound: "I will fight to be the leader (10/10)",
  openFeedback: false,
  score: null,
}
const postChatWantToLeadSurvey: ExpStageSurvey = {
  kind: 'survey',
  name: '7. Post-discussion leadership survey',
  complete: false,
  config: {
    questions: [postChatWantToLeadQuestion],
  },
};
const leaderVoting: ExpStageVotes = {
  kind: 'leader-vote',
  name: '8. Vote for the leader',
  complete: false,
  config: {},
  // userAcceptance: Date,
};
const postChatWork: ExpStageItemRating = {
  kind: 'rank-items',
  name: '9. Post-discussion work',
  complete: false,
  config: {
    ratings: [
      { item1: items.compas, item2: items.blanket, confidence: null },
      { item1: items.compas, item2: items.lighter, confidence: null },
    ],
  },
  // userAcceptance: Date,
};
const finalSatisfactionQuestion: Question = {
  questionText: `Rate how happy you were with the final outcome.
Also indicate your overall feeling about the experience.`,
  answerText: '',
  lowerBound: "I was most definitely disappointed (0/10)",
  upperBound: "I was very happy (10/10)",
  openFeedback: true,
  score: null,
}
const finalSatisfactionSurvey: ExpStageSurvey = {
  kind: 'survey',
  name: '10. final satisfaction survey',
  complete: false,
  config: {
    questions: [finalSatisfactionQuestion],
  },
};

// Example data to bootstrap us...
export function initUserData(): User {
  return {
    userId: uuidv4(),
    accessCode: '',
    profile: {
      name: '',
      pronouns: '',
      avatarUrl: '',
    },
    currentStage: START_STAGE as ExpStage,
    completedStages: [] as ExpStage[],
  };
}

function initParticipants(count: number): { [userId: string]: User } {
  const participants: { [userId: string]: User } = {};
  for (let i = 0; i < count; i++) {
    const p = initUserData();
    participants[p.userId] = p;
  }
  return participants;
}

export function initialExperimentSetup(count: number): Experiment {
  const participants = initParticipants(count);

  const experiment: Experiment = {
    numberOfParticipants: Object.keys(participants).length,
    participants,
    // currentUser: null,
    stages: [
      acceptTos,
      initialWork,
      initialWantToLeadSurvey,
      setProfile,
      groupChat,
      chatDiscussionSurvey,
      postChatWantToLeadSurvey,
      leaderVoting,
      postChatWork,
      finalSatisfactionSurvey,
    ],
  };

  return experiment;
}
