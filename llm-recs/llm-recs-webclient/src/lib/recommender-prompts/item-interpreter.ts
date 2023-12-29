/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/
import { Template, escapeStr, template, nv, unEscapeStr } from '../text-templates/template';
import { FewShotTemplate } from '../text-templates/fewshot_template';

interface Experience {
  experience: string;
  aboutEntity: string,
  aboutDetails: string,
  likedOrDisliked: string,
  characteristics: string[];
}

interface ExperienceTemplEntry {
  experience: string;
  aboutEntity: string,
  aboutDetails: string,
  likedOrDisliked: string,
  characteristics: string;
}

const characteristicsTempl = new FewShotTemplate(template`"${nv('characteristic')}"`,
  ',\n  ');

const criteriaPoints: Experience[] = [
  {
    experience: 'Parc des Buttes Chaumont: love it.',
    aboutEntity: 'Parc des Buttes Chaumont',
    aboutDetails: 'park in Paris 20 arr.',
    likedOrDisliked: 'Liked',
    characteristics: [
      'Peaceful',
      'Tons of old growth trees and benches',
      'Great for walking, jogging, picnic, or just sitting and relaxing',
      'Like a mini version of Central Park in New York'
    ]
  },
  {
    experience: 'Spirited Away: breathtakingly beautiful.',
    aboutEntity: 'Spirited Away',
    aboutDetails: 'movie by Hayao Miyazaki',
    likedOrDisliked: 'Liked',
    characteristics: ['Visually stunning', 'Great story', 'Heartwarming']
  },
];


const experienceTemplEntries: ExperienceTemplEntry[] = criteriaPoints.map(
  (item) => {
    const { experience, aboutEntity, aboutDetails, likedOrDisliked } = item;
    const characteristics = characteristicsTempl.apply(
      item.characteristics.map(s => { return { characteristic: s }; })
    ).escaped;
    return {
      experience, aboutEntity, aboutDetails, likedOrDisliked, characteristics
    };
  })

const itemExperienceTempl = template`Short experience description: "${nv('experience')}"
About: ${nv('aboutEntity')} (${nv('aboutDetails')})
Liked or Disliked: ${nv('likedOrDisliked')}
Key characteristics: [
  ${nv('characteristics')}
]`;

const itemExperiencesTempl = new FewShotTemplate(itemExperienceTempl, '\n\n');

const itemInterpreterTempl = template`Given a short description of an experience, identify what it is about (write "Entity: and name the thing being written about (and give some details about what kind of thing it is, e.g. movie by director name)"). If the author likes it (write "Liked") or not (write "Disliked"), and then list the key characteristics that might be why they liked or disliked it.

${nv('pastExperiences')}

${itemExperienceTempl}
`;


// Example usage.
const pastFewShotItemExperiences = itemExperiencesTempl.apply(experienceTemplEntries);

export const llmInput = itemInterpreterTempl.substs({
  pastExperiences: pastFewShotItemExperiences.escaped,
  // experience: 'The Garden of Forking Paths: like it'
});

