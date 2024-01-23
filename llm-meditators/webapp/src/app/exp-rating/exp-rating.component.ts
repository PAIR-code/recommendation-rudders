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
import { ItemRatings, RANKED_ITEMS_STAGE_KIND } from '../../lib/staged-exp/data-model';

const dummyRatingsData: ItemRatings = {
  ratings: [],
};

@Component({
  selector: 'app-exp-rating',
  standalone: true,
  imports: [MatSliderModule],
  templateUrl: './exp-rating.component.html',
  styleUrl: './exp-rating.component.scss',
})
export class ExpRatingComponent {
  public stageData: Signal<ItemRatings>;
  readonly RANKED_ITEMS_STAGE_KIND = RANKED_ITEMS_STAGE_KIND;

  constructor(private dataService: SavedDataService) {
    this.stageData = computed(() => {
      const stage = this.dataService.currentStage();
      if (stage.kind !== RANKED_ITEMS_STAGE_KIND) {
        throw new Error(`Bad kind for Rating component ${stage.kind}.`);
      }
      return stage.config;
    });
  }

  updateSliderValue(updatedValue: number, pairIdx: number) {
    const curStageData = this.stageData();
    curStageData.ratings[pairIdx].confidence = updatedValue;
    this.dataService.editCurrentExpStageData(() => curStageData);
  }
}
