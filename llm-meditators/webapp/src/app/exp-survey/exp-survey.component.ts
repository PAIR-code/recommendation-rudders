/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { Component, computed, Signal } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSliderModule } from '@angular/material/slider';

import { ItemRatings, Question, STAGE_KIND_SURVEY, Survey } from '../../lib/staged-exp/data-model';
import { SavedDataService } from '../services/saved-data.service';

@Component({
  selector: 'app-exp-survey',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSliderModule],
  templateUrl: './exp-survey.component.html',
  styleUrl: './exp-survey.component.scss',
})
export class ExpSurveyComponent {
  public responseControl: FormControl<string | null>[];
  public stageData: Signal<Survey>;
  public itemRatings?: ItemRatings;

  constructor(private dataService: SavedDataService) {
    // Assumption: this is only ever constructed when
    // `this.dataService.data().experiment.currentStage` references a
    // ExpStageSimpleSurvey.

    this.stageData = computed(() => {
      const stage = this.dataService.currentStage();
      if (stage.kind !== STAGE_KIND_SURVEY) {
        throw new Error(`bad stage kind ${stage.kind}`);
      }
      return stage.config;
    });

    // if one of the this.currentStage().question
    // has an itemRatings, then we use that one. Assumes max
    // one itemRatings question per stage.
    for (let i = 0; i < this.stageData().questions.length; i++) {
      if (this.stageData().questions[i].itemRatings) {
        this.itemRatings = this.stageData().questions[i].itemRatings;
      }
    }

    this.responseControl = new Array(this.stageData().questions.length);
    for (let i = 0; i < this.stageData().questions.length; i++) {
      this.responseControl[i] = new FormControl<string>('');
    }
    for (let i = 0; i < this.stageData().questions.length; i++) {
      this.responseControl[i].valueChanges.forEach((n) => {
        if (n) {
          const curStageData = this.stageData();
          curStageData.questions[i].answerText = n;
          this.dataService.editCurrentExpStageData(() => curStageData);
        }
        console.log(this.stageData());
      });
    }
  }

  updateSliderValue(updatedValue: number, idx: number) {
    const curStageData = this.stageData();
    curStageData.questions[idx].score = updatedValue;
    this.dataService.editCurrentExpStageData(() => curStageData);
    console.log(this.stageData());
  }

  setChoice(questionIdx: number, pairIdx: number, choice: 'item1' | 'item2') {
    if (this.itemRatings) {
      this.itemRatings.ratings[pairIdx].choice = choice;
      const curStageData = this.stageData();
      curStageData.questions[questionIdx].itemRatings = this.itemRatings;
      this.dataService.editCurrentExpStageData(() => curStageData);
    }
  }

  setConfidence(questionIdx: number, updatedValue: number, pairIdx: number) {
    if (this.itemRatings) {
      this.itemRatings.ratings[pairIdx].confidence = updatedValue;
      const curStageData = this.stageData();
      curStageData.questions[questionIdx].itemRatings = this.itemRatings;
      this.dataService.editCurrentExpStageData(() => curStageData);
    }
  }
}
