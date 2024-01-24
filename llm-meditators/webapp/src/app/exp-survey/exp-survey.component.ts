/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { Component, Signal, computed } from '@angular/core';
import { SavedDataService } from '../services/saved-data.service';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSliderModule } from '@angular/material/slider';
import { Survey } from '../../lib/staged-exp/data-model';

@Component({
  selector: 'app-exp-survey',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSliderModule],
  templateUrl: './exp-survey.component.html',
  styleUrl: './exp-survey.component.scss',
})
export class ExpSurveyComponent {
  public responseControl: FormControl<string | null>;
  public stageData: Signal<Survey>;

  constructor(private dataService: SavedDataService) {
    // Assumption: this is only ever constructed when
    // `this.dataService.data().experiment.currentStage` references a
    // ExpStageSimpleSurvey.

    this.stageData = computed(() => {
      const stage = this.dataService.currentStage();
      if (stage.kind !== 'survey') {
        throw new Error(`bad stage kind ${stage.kind}`);
      }
      return stage.config;
    });

    this.responseControl = new FormControl<string>('');
    this.responseControl.valueChanges.forEach((n) => {
      if (n) {
        const curStageData = this.stageData();
        curStageData.openFeedback = n;
        this.dataService.editCurrentExpStageData(() => curStageData);
      }
      console.log(this.stageData());
    });
  }

  updateSliderValue(updatedValue: number) {
    const curStageData = this.stageData();
    curStageData.score = updatedValue;
    this.dataService.editCurrentExpStageData(() => curStageData);
    console.log(this.stageData());
  }
}
