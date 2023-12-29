/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { Injectable } from '@angular/core';
import { LmApiService } from './lm-api.service';

export interface InterpretedItem {
  entityTitle: string;
  text: string;
  entityDetails: string;
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

  interpretItemText(text: string): InterpretedItem {
    const title = text.slice(0, 20);
    const entityDetails = text.slice(20, 50);
    const sentiment = "liked";
    const keys = [... new Set<string>(text.split('.'))];
    return { entityTitle: title, text, entityDetails, sentiment, keys };
  }
}
