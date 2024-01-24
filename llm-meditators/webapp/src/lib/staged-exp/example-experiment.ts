/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/
import { v4 as uuidv4 } from 'uuid';
import { uniqueNamesGenerator, Config as UniqueNamesGenConfig, starWars } from 'unique-names-generator';
import {
  Experiment,
  ExpStage,
  ExpStageSurvey,
  ExpStageVotes,
  ExpStageChatAboutItems,
  ExpStageItemRatings,
  UserData,
  ExpStageTosAndUserProfile,
  stageKinds,
  ExpStageLeaderReveal,
} from './data-model';

import * as items from './items';

const fakeNameGenConfig: UniqueNamesGenConfig = {
  dictionaries: [starWars],
};

// -------------------------------------------------------------------------------------
//  Initial Experiment Setup
// -------------------------------------------------------------------------------------

function acceptTosAndSetProfile(): ExpStageTosAndUserProfile {
  return {
    kind: stageKinds.STAGE_KIND_TOS_AND_PROFILE,
    name: '1. Agree to the experiment and set your profile',
    complete: false,
    config: {
      pronouns: '',
      avatarUrl: '',
      name: '',
      acceptedTosTimestamp: null,
    },
  };
}

function initialWork(): ExpStageItemRatings {
  return {
    kind: stageKinds.STAGE_KIND_RANKED_ITEMS,
    name: '2. Initial work',
    complete: false,
    config: {
      ratings: [
        { item1: items.compas, item2: items.blanket, choice: null, confidence: null },
        { item1: items.compas, item2: items.lighter, choice: null, confidence: null },
      ],
    },
    // userAcceptance: Date,
  };
}
function initialWantToLeadSurvey(): ExpStageSurvey {
  return {
    kind: stageKinds.STAGE_KIND_SURVEY,
    name: '3. intial leadership survey',
    complete: false,
    config: {
      question: `Rate the how much you would like to be the group leader.`,
      lowerBound: 'I would most definitely not like to be the leader (0/10)',
      upperBound: 'I will fight to be the leader (10/10)',
      freeForm: false,
      score: null,
      openFeedback: '',
    },
  };
}

function groupChat(): ExpStageChatAboutItems {
  return {
    kind: stageKinds.STAGE_KIND_CHAT,
    name: '5. Group discussion',
    complete: false,
    config: {
      ratingsToDiscuss: [],
      messages: [],
    },
  };
}

function chatDiscussionSurvey(): ExpStageSurvey {
  return {
    kind: stageKinds.STAGE_KIND_SURVEY,
    name: '6. Post-chat survey',
    complete: false,
    config: {
      question: `Rate the chat dicussion on a 1-10 scale.
  Also indicate your overall feeling about the chat.`,
      lowerBound: 'I did not enjoy the discussion at all (0/10)',
      upperBound: 'The dicussion was a perfect experience to me (10/10)',
      score: null,
      openFeedback: '',
      freeForm: true,
    },
  };
}

function postChatWantToLeadSurvey(): ExpStageSurvey {
  return {
    kind: stageKinds.STAGE_KIND_SURVEY,
    name: '7. Post-discussion leadership survey',
    complete: false,
    config: {
      question: `Rate the how much you would like to be the group leader.`,
      lowerBound: 'I would most definitely not like to be the leader (0/10)',
      upperBound: 'I will fight to be the leader (10/10)',
      score: null,
      openFeedback: '',
      freeForm: false,
    },
  };
}

function leaderVoting(): ExpStageVotes {
  return {
    kind: stageKinds.STAGE_KIND_VOTES,
    name: '8. Vote for the leader',
    complete: false,
    config: {},
    // userAcceptance: Date,
  };
}

function postChatWork(): ExpStageItemRatings {
  return {
    kind: stageKinds.STAGE_KIND_RANKED_ITEMS,
    name: '9. Post-discussion work',
    complete: false,
    config: {
      ratings: [
        { item1: items.compas, item2: items.blanket, choice: null, confidence: null },
        { item1: items.compas, item2: items.lighter, choice: null, confidence: null },
      ],
    },
    // userAcceptance: Date,
  };
}

function leaderReveal(): ExpStageLeaderReveal {
  return {
    kind: stageKinds.STAGE_KIND_LEADER_REVEAL,
    name: '10. Leader reveal',
    complete: false,
    config: {
      revealTimestamp: null,
    },
  };
}

function finalSatisfactionSurvey(): ExpStageSurvey {
  return {
    kind: stageKinds.STAGE_KIND_SURVEY,
    name: '11. final satisfaction survey',
    complete: false,
    config: {
      question: `Rate how happy you were with the final outcome.
      Also indicate your overall feeling about the experience.`,
      lowerBound: 'I was most definitely disappointed (0/10)',
      upperBound: 'I was very happy (10/10)',
      score: null,
      openFeedback: '',
      freeForm: true,
    },
  };
}

// Example data to bootstrap us...
export function initUserData(stages: ExpStage[]): UserData {
  const stageMap: { [stageName: string]: ExpStage } = {};
  stages.forEach((s) => {
    stageMap[s.name] = s;
  });
  const futureStageNames = stages.map((s) => s.name);
  const currentStageName = futureStageNames.shift();
  if (!currentStageName) {
    throw new Error('Cannot create a user with no experimental stages to do');
  }

  const userId = `uid:${uuidv4()}`;

  return {
    accessCode: `access-code:${uuidv4()}`,
    userId,
    profile: {
      name: uniqueNamesGenerator(fakeNameGenConfig), // `fakename:${uuidv4()}`,
      pronouns: '',
      avatarUrl: '',
    },
    stageMap,
    currentStageName,
    completedStageNames: [] as string[],
    futureStageNames,
  };
}

function makeStages() {
  return [
    acceptTosAndSetProfile(),
    initialWork(),
    initialWantToLeadSurvey(),
    groupChat(),
    chatDiscussionSurvey(),
    postChatWantToLeadSurvey(),
    leaderVoting(),
    postChatWork(),
    leaderReveal(),
    finalSatisfactionSurvey(),
  ];
}

function initParticipants(count: number): { [userId: string]: UserData } {
  const participants: { [userId: string]: UserData } = {};
  for (let i = 0; i < count; i++) {
    const p = initUserData(makeStages());
    participants[p.userId] = p;
  }
  return participants;
}

export function initialExperimentSetup(count: number): Experiment {
  const participants = initParticipants(count);

  const experiment: Experiment = {
    numberOfParticipants: Object.keys(participants).length,
    participants,
  };

  return experiment;
}
