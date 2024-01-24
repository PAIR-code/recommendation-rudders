/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { Component, computed, Signal } from '@angular/core';
import { MatCheckboxChange, MatCheckboxModule } from '@angular/material/checkbox';

import { TosAcceptance } from '../../lib/staged-exp/data-model';
import { SavedDataService } from '../services/saved-data.service';

@Component({
  selector: 'app-exp-tos',
  standalone: true,
  imports: [MatCheckboxModule],
  templateUrl: './exp-tos.component.html',
  styleUrl: './exp-tos.component.scss',
})
export class ExpTosComponent {
  public stageData: Signal<TosAcceptance>;

  constructor(private dataService: SavedDataService) {
    // Assumption: this is only ever constructed when
    // `this.dataService.data().experiment.currentStage` references a
    // ExpStageTosAcceptance.

    this.stageData = computed(() => {
      const currentStage = this.dataService.currentStage();
      if (currentStage.kind !== 'accept-tos') {
        throw new Error(`currentStage is kind is not right: ${JSON.stringify(currentStage, null, 2)}`);
      }
      return currentStage.config;
    });
  }

  updateCheckboxValue(updatedValue: MatCheckboxChange) {
    const checked = updatedValue.checked;
    if (checked) {
      const date = new Date();
      this.dataService.editCurrentExpStageData<TosAcceptance>((d) => {
        d.acceptedTosTimestamp = date;
      });
    }
  }
}
