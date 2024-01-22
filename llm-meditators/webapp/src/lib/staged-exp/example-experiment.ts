/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/
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
} from './data-model';

import * as items from './items';

// -------------------------------------------------------------------------------------
//  Initial Experiment Setup
// -------------------------------------------------------------------------------------
const acceptTos: ExpStageTosAcceptance = {
  kind: 'accept-tos',
  name: '1. Agree to the experiment',
  config: {
    acceptedTimestamp: null,
  },
  // userAcceptance: Date,
};
const initialWork: ExpStageItemRating = {
  kind: 'rank-items',
  name: '2. Initial work',
  config: {
    ratings: [
      { item1: items.compas, item2: items.blanket, confidence: null },
      { item1: items.compas, item2: items.lighter, confidence: null },
    ],
  },
  // userAcceptance: Date,
};
const initialWantToLeadSurvey: ExpStageSurvey = {
  kind: 'survey',
  name: '3. intial leadership survey',
  config: {
    question: `Rate the how much you would like to be the group leader.
1/10 corresponds = most definitely not 10/10 you will fight to be the leader.`,
    score: null,
    openFeedback: '',
  },
};
const setProfile: ExpStageUserProfile = {
  kind: 'set-profile',
  name: '4. Set your profile',
  config: {
    pronouns: null,
    avatarUrl: '',
    name: '',
  },
  // userProfiles: {},
};
const groupChat: ExpStageChatAboutItems = {
  kind: 'group-chat',
  name: '5. Group discussion',
  config: {
    ratingsToDiscuss: [],
    messages: [],
  },
};
const chatDiscussionSurvey: ExpStageSurvey = {
  kind: 'survey',
  name: '6. Post-chat survey',
  config: {
    question: `Rate the chat dicussion on a 1-10 scale.
1/10 corresponds to you did not enjoy the discussion at all and 10/10 corresponds to a perfect experience.
Also indicate your overall feeling about the experience.`,
    score: null,
    openFeedback: '',
  },
};
const postChatWantToLeadSurvey: ExpStageSurvey = {
  kind: 'survey',
  name: '7. Post-discussion leadership survey',
  config: {
    question: `Rate the how much you would like to be the group leader.
1/10 corresponds = most definitely not 10/10 you will fight to be the leader.`,
    score: null,
    openFeedback: '',
  },
};
const leaderVoting: ExpStageVotes = {
  kind: 'leader-vote',
  name: '8. Vote for the leader',
  config: {
    user1: LeaderVote.NOT_RATED,
    user2: LeaderVote.NOT_RATED,
    user3: LeaderVote.NOT_RATED,
    user4: LeaderVote.NOT_RATED,
  },
  // userAcceptance: Date,
};
const postChatWork: ExpStageItemRating = {
  kind: 'rank-items',
  name: '9. Post-discussion work',
  config: {
    ratings: [
      { item1: items.compas, item2: items.blanket, confidence: null },
      { item1: items.compas, item2: items.lighter, confidence: null },
    ],
  },
  // userAcceptance: Date,
};
const finalSatisfactionSurvey: ExpStageSurvey = {
  kind: 'survey',
  name: '10. final satisfaction survey',
  config: {
    question: `Rate how happy you were with the final outcome.
1/10 corresponds = most definitely not 10/10 you will fight to be the leader.`,
    score: null,
    openFeedback: '',
  },
};

export const initialExperimentSetup: Experiment = {
  numberOfParticipants: 5,
  participants: {
    userid1: initUserData(),
    userid2: initUserData(),
    userid3: initUserData(),
    userid4: initUserData(),
    userid5: initUserData(),
  },
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
// Example data to bootstrap us...
export function initUserData(): User {
  return {
    userId: '',
    accessCode: '',
    profile: {
      name: '',
      pronouns: null,
      avatarUrl: '',
    },
    currentStage: START_STAGE as ExpStage,
    completedStages: [] as ExpStage[],
  };
}
