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
import { ExpStageItemRatings, ItemRatings, STAGE_KIND_RANKED_ITEMS } from '../../lib/staged-exp/data-model';

@Component({
  selector: 'app-exp-rating',
  standalone: true,
  imports: [MatSliderModule],
  templateUrl: './exp-rating.component.html',
  styleUrl: './exp-rating.component.scss',
})
export class ExpRatingComponent {
  public currStage: Signal<ExpStageItemRatings>;
  public itemRatings: ItemRatings;

  constructor(private dataService: SavedDataService) {
    this.currStage = computed(() => {
      const stage = this.dataService.currentStage();
      if (stage.kind !== STAGE_KIND_RANKED_ITEMS) {
        throw new Error(`Bad kind for Rating component ${stage.kind}.`);
      }
      return stage;
    });

    this.itemRatings = this.currStage().config;
  }

  isComplete(): boolean {
    let completed = true;
    for (const rating of this.itemRatings.ratings) {
      if (rating.choice === null || rating.confidence === null) {
        completed = false;
        break;
      }
    }
    return completed;
  }

  setChoice(pairIdx: number, choice: 'item1' | 'item2') {
    this.itemRatings.ratings[pairIdx].choice = choice;
    this.dataService.editCurrentExpStageData<ItemRatings>(() => this.itemRatings);
  }

  setConfidence(updatedValue: number, pairIdx: number) {
    this.itemRatings.ratings[pairIdx].confidence = updatedValue;
    this.dataService.editCurrentExpStageData<ItemRatings>(() => this.itemRatings);
  }
}
