/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { Injectable } from '@angular/core';
import { LmApiService } from './lm-api.service';
import { expInterpTempl, characteristicsTempl } from '../../lib/recommender-prompts/item-interpreter';
import { fillTemplate } from 'src/lib/text-templates/llm';
import { matchFewShotTemplate } from 'src/lib/text-templates/fewshot_template';
import { ErrorResponse, isErrorResponse } from 'src/lib/simple-errors/simple-errors';

export interface InterpretedItem {
  entityTitle: string;
  text: string;
  sentiment: string;
  keys: string[];
}

@Injectable({
  providedIn: 'root'
})
export class ItemInterpreterService {

  constructor(
    // TODO: use this with a prompt to do smarter interpretation.
    private lmApiService: LmApiService,
    // public interpretationPrompt: Template<input, title, keys>
  ) { }

  async interpretItemText(text: string): Promise<InterpretedItem | ErrorResponse> {
    const responses = await fillTemplate(
      this.lmApiService.llm,
      expInterpTempl.substs({ experience: text }));

    if (isErrorResponse(responses)) {
      return responses;
    }

    const badlyFormedResponsesCount = responses.filter(r => !r.substs).length;
    console.log(`badlyFormedResponses count: ${badlyFormedResponsesCount}`);
    console.log(`responses: ${JSON.stringify(responses, null, 2)} `);

    if (responses.length === 0) {
      throw new Error('no responses');
    }

    const substs = responses[0].substs;
    if (!substs) {
      throw new Error('no substs for initial response');
    }
    const title = substs.aboutEntity;
    const sentiment = substs.likedOrDisliked;

    const charMatches = matchFewShotTemplate(
      characteristicsTempl, substs.characteristics);
    const keys = charMatches.map(c => c.substs.characteristic);
    return { entityTitle: title, text, sentiment, keys };
  }
}
