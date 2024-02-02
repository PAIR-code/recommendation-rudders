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
  QuestionData,
  STAGE_KIND_SURVEY,
  Survey,
  SurveyQuestionKind,
} from '../../../lib/staged-exp/data-model';
import { AppStateService } from '../../services/app-state.service';
import { APPSTATE_PARTICIPANT } from 'src/lib/staged-exp/app';
import { Participant } from 'src/lib/staged-exp/participant';
import { SurveyCheckQuestionComponent } from './survey-check-question/survey-check-question.component';
import { SurveyRatingQuestionComponent } from './survey-rating-question/survey-rating-question.component';
import { SurveyScaleQuestionComponent } from './survey-scale-question/survey-scale-question.component';
import { SurveyTextQuestionComponent } from './survey-text-question/survey-text-question.component';
import { Question } from 'src/lib/staged-exp/question';

@Component({
  selector: 'app-exp-survey',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSliderModule,
    SurveyCheckQuestionComponent,
    SurveyRatingQuestionComponent,
    SurveyScaleQuestionComponent,
    SurveyTextQuestionComponent,
  ],
  templateUrl: './exp-survey.component.html',
  styleUrl: './exp-survey.component.scss',
})
export class ExpSurveyComponent {
  public participant: Participant;
  public stageData: Signal<Survey>;
  public questions: Signal<Question<QuestionData>[]>;
  // public responseControl: FormControl<string | null>[];

  readonly SurveyQuestionKind = SurveyQuestionKind;

  constructor(stateService: AppStateService) {
    const { participant, stageData } = stateService.getParticipantAndStage(STAGE_KIND_SURVEY);
    this.stageData = stageData;
    this.participant = participant;

    this.questions = computed(() => {
      return stageData().questions.map((v, i) => new Question(this.participant, this.stageData, i));
    });

    // // if one of the this.currentStage().question
    // // has an itemRatings, then we use that one. Assumes max
    // // one itemRatings question per stage.
    // this.itemRatings = computed(() => {
    //   const questions = this.stageData().questions;
    //   for (let i = 0; i < questions.length; i++) {
    //     const ratings = questions[i].itemRatings;
    //     if (ratings) {
    //       return ratings;
    //     }
    //   }
    //   return null;
    // });

    // this.responseControl = new Array(this.stageData.questions.length);
    // for (let i = 0; i < this.stageData.questions.length; i++) {
    //   if (this.stageData.questions[i].itemRatings) {
    //     this.responseControl[i] = new FormControl<string>(
    //       this.stageData.questions[i].answerText || '',
    //     );
    //   }
    // }
    // for (let i = 0; i < this.stageData.questions.length; i++) {
    //   this.responseControl[i].valueChanges.forEach((n) => {
    //     if (n) {
    //       // const curStageData = this.config;
    //       this.stageData.questions[i].answerText = n;
    //       this.participant.editStageData(() => this.stageData);
    //       // this.stateService.editWorkingOnExpStageData(() => curStageData);
    //     }
    //     // console.log(this.stageData());
    //   });
    // }
  }

  // updateSliderValue(updatedValue: number, idx: number) {
  //   // const curStageData = this.stageData();
  //   this.stageData.questions[idx].score = updatedValue;
  //   this.participant.editStageData(() => this.stageData);
  // }

  // setConfidence(questionIdx: number, updatedValue: number, pairIdx: number) {
  //   if (this.itemRatings) {
  //     this.itemRatings.ratings[pairIdx].confidence = updatedValue;
  //     this.stageData.questions[questionIdx].itemRatings = this.itemRatings;
  //     this.participant.editStageData(() => this.stageData);
  //   }
  // }
}
