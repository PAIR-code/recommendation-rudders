/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { Component, Signal, computed } from '@angular/core';
import { SavedDataService } from '../services/saved-data.service';
import { TosAcceptance } from '../../lib/staged-exp/data-model';

const dummyTosData: TosAcceptance = {
  acceptedTimestamp: null,
};

@Component({
  selector: 'app-exp-tos',
  standalone: true,
  imports: [],
  templateUrl: './exp-tos.component.html',
  styleUrl: './exp-tos.component.scss'
})
export class ExpTosComponent {
  public stageData: Signal<TosAcceptance>;
  public error: Signal<string | null>;

  constructor(
    private dataService: SavedDataService,
  ) {
    this.error = computed(() => {
      const currentStage = this.dataService.user().currentStage;
      if(!currentStage) {
        return `currentStage is undefined`;
      };
      if(currentStage.kind !== 'survey') {
        return `currentStage is kind is not right: ${JSON.stringify(currentStage, null, 2)}`;
      }
      return null;
    });

    // Assumption: this is only ever constructed when 
    // `this.dataService.data().experiment.currentStage` references a 
    // ExpStageSimpleSurvey.

    this.stageData = computed(() => {
      if(this.dataService.data().user.currentStage.kind !== 'accept-tos') {
        return dummyTosData;
      }
      return this.dataService.data().user.currentStage.config as TosAcceptance;
    });
  }
}
