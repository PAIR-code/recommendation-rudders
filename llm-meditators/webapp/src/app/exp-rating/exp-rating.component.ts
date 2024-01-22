/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { Component, Signal, computed } from '@angular/core';
import { MatSliderModule } from '@angular/material/slider';
import { SavedDataService } from '../services/saved-data.service';
import { ItemRatings } from '../../lib/staged-exp/data-model';

const dummyRatingsData: ItemRatings = {
  ratings: [],
};

const CURRENT_STAGE_KIND = 'rank-items';

@Component({
  selector: 'app-exp-rating',
  standalone: true,
  imports: [MatSliderModule],
  templateUrl: './exp-rating.component.html',
  styleUrl: './exp-rating.component.scss',
})
export class ExpRatingComponent {
  public stageData: Signal<ItemRatings>;
  public error: Signal<string | null>;

  constructor(private dataService: SavedDataService) {
    this.error = computed(() => {
      const currentStage = this.dataService.user().currentStage;
      if (!currentStage) {
        return `currentStage is undefined`;
      }
      if (currentStage.kind !== CURRENT_STAGE_KIND) {
        return `currentStage is kind is not right: ${JSON.stringify(currentStage, null, 2)}`;
      }
      return null;
    });

    this.stageData = computed(() => {
      if (this.dataService.data().user.currentStage.kind !== CURRENT_STAGE_KIND) {
        return dummyRatingsData;
      }
      return this.dataService.data().user.currentStage.config as ItemRatings;
    });
  }

  updateSliderValue(updatedValue: number, pairIdx: number) {
    const curStageData = this.stageData();
    curStageData.ratings[pairIdx].confidence = updatedValue;
    this.dataService.updateExpStage(curStageData);
  }
}
