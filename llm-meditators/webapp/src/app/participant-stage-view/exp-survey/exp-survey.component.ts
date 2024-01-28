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

import {
  ItemRatings,
  Question,
  STAGE_KIND_SURVEY,
  Survey,
} from '../../../lib/staged-exp/data-model';
import { AppStateService } from '../../services/app-state.service';
import { APPSTATE_PARTICIPANT } from 'src/lib/app';
import { Participant } from 'src/lib/participant';

@Component({
  selector: 'app-exp-survey',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSliderModule],
  templateUrl: './exp-survey.component.html',
  styleUrl: './exp-survey.component.scss',
})
export class ExpSurveyComponent {
  public participant: Participant;
  public stageData: Survey;
  public responseControl: FormControl<string | null>[];
  public itemRatings?: ItemRatings;

  constructor(stateService: AppStateService) {
    const { participant, stageData } = stateService.getParticipantAndStage(STAGE_KIND_SURVEY);
    this.stageData = stageData();
    this.participant = participant;

    // if one of the this.currentStage().question
    // has an itemRatings, then we use that one. Assumes max
    // one itemRatings question per stage.
    for (let i = 0; i < this.stageData.questions.length; i++) {
      if (this.stageData.questions[i].itemRatings) {
        this.itemRatings = this.stageData.questions[i].itemRatings;
      }
    }

    this.responseControl = new Array(this.stageData.questions.length);
    for (let i = 0; i < this.stageData.questions.length; i++) {
      this.responseControl[i] = new FormControl<string>(
        this.stageData.questions[i].answerText || '',
      );
    }
    for (let i = 0; i < this.stageData.questions.length; i++) {
      this.responseControl[i].valueChanges.forEach((n) => {
        if (n) {
          // const curStageData = this.config;
          this.stageData.questions[i].answerText = n;
          this.participant.editStageData(() => this.stageData);
          // this.stateService.editWorkingOnExpStageData(() => curStageData);
        }
        // console.log(this.stageData());
      });
    }
  }

  updateSliderValue(updatedValue: number, idx: number) {
    // const curStageData = this.stageData();
    this.stageData.questions[idx].score = updatedValue;
    this.participant.editStageData(() => this.stageData);
  }

  setChoice(questionIdx: number, pairIdx: number, choice: 'item1' | 'item2') {
    if (this.itemRatings) {
      this.itemRatings.ratings[pairIdx].choice = choice;
      this.stageData.questions[questionIdx].itemRatings = this.itemRatings;
      this.participant.editStageData(() => this.stageData);
    }
  }

  setConfidence(questionIdx: number, updatedValue: number, pairIdx: number) {
    if (this.itemRatings) {
      this.itemRatings.ratings[pairIdx].confidence = updatedValue;
      this.stageData.questions[questionIdx].itemRatings = this.itemRatings;
      this.participant.editStageData(() => this.stageData);
    }
  }
}
