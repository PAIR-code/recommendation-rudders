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

const dummySurveyData: Survey = {
  question: 'error: this should never happen',
  score: null,
  openFeedback: '',
};

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
  public error: Signal<string | null>;

  constructor(private dataService: SavedDataService) {
    this.error = computed(() => {
      const currentStage = this.dataService.user().currentStage;
      if (!currentStage) {
        return `currentStage is undefined`;
      }
      if (currentStage.kind !== 'survey') {
        return `currentStage is kind is not right: ${JSON.stringify(currentStage, null, 2)}`;
      }
      return null;
    });

    // Assumption: this is only ever constructed when
    // `this.dataService.data().experiment.currentStage` references a
    // ExpStageSimpleSurvey.

    this.stageData = computed(() => {
      if (this.dataService.data().user.currentStage.kind !== 'survey') {
        return dummySurveyData;
      }
      return this.dataService.data().user.currentStage.config as Survey;
    });

    this.responseControl = new FormControl<string>('');
    this.responseControl.valueChanges.forEach((n) => {
      if (n) {
        const curStageData = this.stageData();
        curStageData.openFeedback = n;
        this.dataService.updateExpStage(curStageData);
      }
      console.log(this.stageData());
    });
  }

  updateSliderValue(updatedValue: number) {
    const curStageData = this.stageData();
    curStageData.score = updatedValue;
    this.dataService.updateExpStage(curStageData);
  }
}
