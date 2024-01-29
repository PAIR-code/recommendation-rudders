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
  //ExpStageItemRatings,
  UserData,
  ExpStageTosAndUserProfile,
  stageKinds,
  ExpStageLeaderReveal,
  Question,
  ExpStageNames,
  TosAndUserProfile,
  Survey,
  ChatAboutItems,
} from './data-model';

import * as items from './items';

const fakeNameGenConfig: UniqueNamesGenConfig = {
  dictionaries: [starWars],
};

// -------------------------------------------------------------------------------------
//  Initial Experiment Setup
// -------------------------------------------------------------------------------------

export function acceptTosAndSetProfile(config?: TosAndUserProfile): ExpStageTosAndUserProfile {
  return {
    kind: stageKinds.STAGE_KIND_TOS_AND_PROFILE,
    name: ExpStageNames['1. Agree to the experiment and set your profile'],
    complete: false,
    config: config || {
      pronouns: '',
      avatarUrl: '',
      name: '',
      tosLines: [
        'In vel diam malesuada nibh vehicula rutrum eget vel lectus.',
        'Suspendisse auctor dolor nec consectetur dignissim.',
        'Cras accumsan turpis sit amet pellentesque dictum.',
      ],
      acceptedTosTimestamp: null,
    },
  };
}

// function initialWork(): ExpStageItemRatings {
//   return {
//     kind: stageKinds.STAGE_KIND_RANKED_ITEMS,
//     name: '2. Initial work',
//     complete: false,
//     config: {
//       ratings: [
//         { item1: items.compas, item2: items.blanket, choice: null, confidence: null },
//         { item1: items.compas, item2: items.lighter, choice: null, confidence: null },
//       ],
//     },
//     // userAcceptance: Date,
//   };
// }
const initialItemRatingsQuestion: Question = {
  questionText: '',
  itemRatings: {
    ratings: [
      { item1: items.compas, item2: items.blanket, choice: null, confidence: null },
      { item1: items.compas, item2: items.lighter, choice: null, confidence: null },
    ],
  },
};

const initialWantToLeadQuestion: Question = {
  questionText: `Rate the how much you would like to be the group leader.`,
  //lowerBound: 'I would most definitely not like to be the leader (0/10)',
  lowerBound: '0/10: I would definitely prefer that someone else be the leader 🙅',
  upperBound: '10/10: I will fight to be the leader 👍',
  openFeedback: false,
  score: null,
};

function initialWantToLeadSurvey(config?: Survey): ExpStageSurvey {
  return {
    kind: stageKinds.STAGE_KIND_SURVEY,
    name: ExpStageNames['2. Initial leadership survey'],
    complete: false,
    config: config || {
      questions: [initialItemRatingsQuestion, initialWantToLeadQuestion],
    },
  };
}

function groupChat(config?: ChatAboutItems): ExpStageChatAboutItems {
  return {
    kind: stageKinds.STAGE_KIND_CHAT,
    name: ExpStageNames['3. Group discussion'],
    complete: false,
    config: config || {
      ratingsToDiscuss: [],
      messages: [],
    },
  };
}

const chatDiscussionQuestion: Question = {
  questionText: `Rate the chat dicussion on a 1-10 scale.
Also indicate your overall feeling about the chat.`,
  answerText: '',
  lowerBound: 'I did not enjoy the discussion at all (0/10)',
  upperBound: 'The dicussion was a perfect experience to me (10/10)',
  openFeedback: true,
  score: null,
};

function chatDiscussionSurvey(config?: Survey): ExpStageSurvey {
  return {
    kind: stageKinds.STAGE_KIND_SURVEY,
    name: ExpStageNames['4. Post-chat survey'],
    complete: false,
    config: config || {
      questions: [chatDiscussionQuestion],
    },
  };
}

const postChatWantToLeadQuestion: Question = {
  questionText: `Rate the how much you would like to be the group leader.`,
  answerText: '',
  lowerBound: 'I would most definitely not like to be the leader (0/10)',
  upperBound: 'I will fight to be the leader (10/10)',
  openFeedback: false,
  score: null,
};

function postChatWantToLeadSurvey(config?: Survey): ExpStageSurvey {
  return {
    kind: stageKinds.STAGE_KIND_SURVEY,
    name: ExpStageNames['5. Post-discussion leadership survey'],
    complete: false,
    config: config || {
      questions: [postChatWantToLeadQuestion],
    },
  };
}

function leaderVoting(): ExpStageVotes {
  return {
    kind: stageKinds.STAGE_KIND_VOTES,
    name: ExpStageNames['6. Vote for the leader'],
    complete: false,
    config: {},
    // userAcceptance: Date,
  };
}

const finalItemRatingsQuestion: Question = {
  questionText: '',
  itemRatings: {
    ratings: [
      { item1: items.compas, item2: items.blanket, choice: null, confidence: null },
      { item1: items.compas, item2: items.lighter, choice: null, confidence: null },
    ],
  },
};

function postChatWork(config?: Survey): ExpStageSurvey {
  return {
    kind: stageKinds.STAGE_KIND_SURVEY,
    name: '7. Post-discussion work',
    complete: false,
    config: config || {
      questions: [finalItemRatingsQuestion],
    },
    // userAcceptance: Date,
  };
}

function leaderReveal(): ExpStageLeaderReveal {
  return {
    kind: stageKinds.STAGE_KIND_LEADER_REVEAL,
    name: ExpStageNames['8. Leader reveal'],
    complete: false,
    config: {
      revealTimestamp: null,
    },
  };
}

const finalSatisfactionQuestion: Question = {
  questionText: `Rate how happy you were with the final outcome.
Also indicate your overall feeling about the experience.`,
  answerText: '',
  lowerBound: 'I was most definitely disappointed (0/10)',
  upperBound: 'I was very happy (10/10)',
  openFeedback: true,
  score: null,
};

function finalSatisfactionSurvey(config?: Survey): ExpStageSurvey {
  return {
    kind: stageKinds.STAGE_KIND_SURVEY,
    name: '9. final satisfaction survey',
    complete: false,
    config: config || {
      questions: [finalSatisfactionQuestion],
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
  const workingOnStageName = currentStageName;

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
    workingOnStageName,
    completedStageNames: [] as string[],
    futureStageNames,
  };
}

export function makeStages(): ExpStage[] {
  return [
    acceptTosAndSetProfile(),
    //initialWork(),
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

export function initParticipants(count: number, stages?: ExpStage[]): { [userId: string]: UserData } {
  const participants: { [userId: string]: UserData } = {};
  for (let i = 0; i < count; i++) {
    const p = initUserData(stages ? stages : makeStages());
    participants[p.userId] = p;
  }
  return participants;
}

export function initialExperimentSetup(count: number, stages?: ExpStage[]): Experiment {
  const participants = initParticipants(count, stages);

  const experiment: Experiment = {
    numberOfParticipants: Object.keys(participants).length,
    participants,
  };

  return experiment;
}
