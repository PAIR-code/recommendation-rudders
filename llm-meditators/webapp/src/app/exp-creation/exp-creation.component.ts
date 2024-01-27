import { JsonEditorComponent, JsonEditorOptions, NgJsonEditorModule } from 'ang-jsoneditor';
import { isEqual } from 'lodash';
import {
  ExpStage,
  ExpStageNames,
  getDefaultChatAboutItemsConfig,
  getDefaultLeaderRevealConfig,
  getDefaultSurveyConfig,
  getDefaultVotesConfig,
  getDefaultTosAndUserProfileConfig,
  stageKinds,
  ExpStageTosAndUserProfile,
  getDefaultItemRatingsQuestion,
  Question,
  getDefaultScaleQuestion,
  ExpStageSurvey,
  getDefaultItemRating,
} from 'src/lib/staged-exp/data-model';
import { makeStages } from 'src/lib/staged-exp/example-experiment';

import { CdkDrag, CdkDragDrop, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { Component, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

import { CodemirrorConfigEditorModule } from '../codemirror-config-editor/codemirror-config-editor.module';
import { LocalService } from '../services/local.service';
import { SavedDataService } from '../services/saved-data.service';
import { MatCheckboxModule } from '@angular/material/checkbox';

const EXISTING_STAGES_KEY = 'existing-stages';

const CREATED_STAGES_KEY = 'created-stages';

const getInitStageData = (): Partial<ExpStage> => {
  return { complete: false, name: '' };
};

@Component({
  selector: 'app-exp-creation',
  standalone: true,
  imports: [
    MatButtonModule,
    MatCardModule,
    NgJsonEditorModule,
    MatIconModule,
    MatSelectModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatTooltipModule,
    // CodemirrorConfigEditorModule,
    FormsModule,
    CdkDropList,
    CdkDrag,
  ],
  templateUrl: './exp-creation.component.html',
  styleUrl: './exp-creation.component.scss',
})
export class ExpCreationComponent {
  // new stuff
  public existingStages: Partial<ExpStage>[] = [];
  public currentEditingStageIndex = -1;

  // old stuff
  public editorOptions: JsonEditorOptions;

  public oracleStages = makeStages();
  public createdStages: ExpStage[] = [];
  public creationIndex = 0;

  public data = {};

  readonly ExpStageNames = ExpStageNames;
  readonly stageKinds = stageKinds;

  readonly availableStageKinds = [
    stageKinds.STAGE_KIND_TOS_AND_PROFILE,
    stageKinds.STAGE_KIND_SURVEY,
    stageKinds.STAGE_KIND_VOTES,
    stageKinds.STAGE_KIND_CHAT,
    stageKinds.STAGE_KIND_LEADER_REVEAL,
  ];

  @ViewChild('editor') editor: JsonEditorComponent = new JsonEditorComponent();

  constructor(
    private dataService: SavedDataService,
    private localStore: LocalService,
  ) {
    // new stuff
    const existingStages = this.localStore.getData(EXISTING_STAGES_KEY) as ExpStage[];
    if (existingStages) {
      this.existingStages = existingStages;
    } else {
      this.existingStages = [getInitStageData()];
    }
    this.currentEditingStageIndex = 0;

    // old stuff
    const createdStages = this.localStore.getData(CREATED_STAGES_KEY) as ExpStage[];
    if (createdStages) {
      this.createdStages = createdStages;
    } else {
      this.createdStages = JSON.parse(JSON.stringify(this.oracleStages));
      this.persistCreatedStages();
    }
    this.data = JSON.parse(JSON.stringify(this.createdStages[this.creationIndex].config));

    this.editorOptions = new JsonEditorOptions();
    this.editorOptions.modes = ['code'];
    this.editorOptions.mode = 'code';
    this.editorOptions.mainMenuBar = false;
  }

  get currentEditingStage() {
    return this.existingStages[this.currentEditingStageIndex];
  }

  get hasUnsavedData() {
    const existingStages = this.localStore.getData(EXISTING_STAGES_KEY) as ExpStage[];
    return !isEqual(existingStages, this.existingStages);
  }

  // tos lines
  addNewTosLine() {
    (this.currentEditingStage as ExpStageTosAndUserProfile).config.tosLines.push('');
    this.persistExistingStages();
  }

  deleteTosLine(event: Event, index: number) {
    (this.currentEditingStage as ExpStageTosAndUserProfile).config.tosLines.splice(index, 1);
    this.persistExistingStages();
  }

  dropTosLine(event: CdkDragDrop<string[]>) {
    moveItemInArray(
      (this.currentEditingStage as ExpStageTosAndUserProfile).config.tosLines,
      event.previousIndex,
      event.currentIndex,
    );

    this.persistExistingStages();
  }

  // survey questions
  addNewSurveyQuestion(event: Event, type: 'rating' | 'scale') {
    let question: Question | null = null;
    if (type === 'rating') {
      question = getDefaultItemRatingsQuestion();
    } else if (type === 'scale') {
      question = getDefaultScaleQuestion();
    }
    (this.currentEditingStage as ExpStageSurvey).config.questions.push(question as Question);
    this.persistExistingStages();
  }

  deleteSurveyQuestion(event: Event, index: number) {
    (this.currentEditingStage as ExpStageSurvey).config.questions.splice(index, 1);
    this.persistExistingStages();
  }

  moveSurveyQuestion(direction: 'up' | 'down', questionIndex: number) {
    if (questionIndex === 0 && direction === 'up') return;
    if (
      questionIndex === (this.currentEditingStage as ExpStageSurvey).config?.questions.length - 1 &&
      direction === 'down'
    )
      return;

    moveItemInArray(
      (this.currentEditingStage as ExpStageSurvey).config.questions,
      questionIndex,
      direction === 'up' ? questionIndex - 1 : questionIndex + 1,
    );
  }

  dropSurveyQuestion(event: CdkDragDrop<string[]>) {
    moveItemInArray(
      (this.currentEditingStage as ExpStageSurvey).config.questions,
      event.previousIndex,
      event.currentIndex,
    );

    this.persistExistingStages();
  }

  // item rating
  addNewItemRating(questionIndex: number) {
    const rating = getDefaultItemRating();
    (this.currentEditingStage as ExpStageSurvey).config.questions[questionIndex].itemRatings?.ratings.push(rating);
    this.persistExistingStages();
  }

  deleteItemRating(event: Event, questionIndex: number, ratingIndex: number) {
    (this.currentEditingStage as ExpStageSurvey).config.questions[questionIndex].itemRatings?.ratings.splice(
      ratingIndex,
      1,
    );
    this.persistExistingStages();
  }

  stageSetupIncomplete(stageData?: ExpStage) {
    const _stageData = stageData || this.currentEditingStage;

    if (!_stageData.kind) return true;
    if (!_stageData.name || _stageData.name.length === 0) return true;

    if (_stageData.kind === stageKinds.STAGE_KIND_TOS_AND_PROFILE) {
      if (_stageData.config?.tosLines.length === 0) return true;
    } else if (_stageData.kind === stageKinds.STAGE_KIND_SURVEY) {
      if (_stageData.config?.questions.length === 0) return true;
    }

    return false;
  }

  persistExistingStages() {
    this.localStore.saveData(EXISTING_STAGES_KEY, this.existingStages);
  }

  dropStage(event: CdkDragDrop<string[]>) {
    moveItemInArray(this.existingStages, event.previousIndex, event.currentIndex);
    this.persistExistingStages();

    this.navigateToStage(event.currentIndex);
  }

  addNewStage() {
    this.existingStages.push(getInitStageData());
    this.persistExistingStages();

    this.currentEditingStageIndex = this.existingStages.length - 1;
  }

  deleteStage(event: Event, index: number) {
    event.stopPropagation();

    if (this.existingStages.length === 1) {
      // only one left
      this.existingStages[0] = getInitStageData();
    } else {
      if (this.currentEditingStageIndex >= index) {
        this.currentEditingStageIndex -= 1;
      }
      this.existingStages.splice(index, 1);
    }

    this.persistExistingStages();
  }

  resetExistingStages() {
    this.localStore.removeData(EXISTING_STAGES_KEY);

    this.existingStages = [getInitStageData()];
    this.persistExistingStages();

    this.currentEditingStageIndex = 0;
  }

  navigateToStage(idx: number) {
    this.currentEditingStageIndex = idx;
  }

  onChange(event: any, type?: string) {
    if (type === 'stage-kind') {
      console.log('Switched to:', this.currentEditingStage.kind);
      let newConfig = {};
      switch (this.currentEditingStage.kind) {
        case stageKinds.STAGE_KIND_TOS_AND_PROFILE:
          newConfig = getDefaultTosAndUserProfileConfig();
          break;
        case stageKinds.STAGE_KIND_SURVEY:
          newConfig = getDefaultSurveyConfig();
          break;
        case stageKinds.STAGE_KIND_VOTES:
          newConfig = getDefaultVotesConfig();
          break;
        case stageKinds.STAGE_KIND_CHAT:
          newConfig = getDefaultChatAboutItemsConfig();
          break;
        case stageKinds.STAGE_KIND_LEADER_REVEAL:
          newConfig = getDefaultLeaderRevealConfig();
          break;
      }
      this.currentEditingStage.config = newConfig;
    }

    this.persistExistingStages();
  }

  /**
   *
   * old
   * stuff
   *
   */
  get currentStage() {
    return this.createdStages[this.creationIndex];
  }

  get currentStageOracleConfigString() {
    return JSON.stringify(this.oracleStages[this.creationIndex].config, null, 2);
  }

  updatedData(event: any) {
    const newData = JSON.parse(JSON.stringify(this.editor.get()));
    // console.log('updatedData', newData);
    this.createdStages[this.creationIndex].config = newData;
    this.persistCreatedStages();
  }

  previousStage() {
    this.creationIndex = this.creationIndex === 0 ? 0 : this.creationIndex - 1;
    this.data = JSON.parse(JSON.stringify(this.createdStages[this.creationIndex].config));
  }

  nextStage() {
    this.creationIndex =
      this.creationIndex === this.oracleStages.length - 1 ? this.creationIndex : this.creationIndex + 1;
    this.data = JSON.parse(JSON.stringify(this.createdStages[this.creationIndex].config));
  }

  private persistCreatedStages() {
    this.localStore.saveData(CREATED_STAGES_KEY, this.createdStages);
  }

  private resetCreatedStages() {
    this.localStore.removeData(CREATED_STAGES_KEY);
  }

  resetAll() {
    this.resetCreatedStages();
    this.createdStages = JSON.parse(JSON.stringify(this.oracleStages));
    console.log('createdStages', this.createdStages);
    this.persistCreatedStages();
    this.creationIndex = 0;
    this.data = JSON.parse(JSON.stringify(this.createdStages[this.creationIndex].config));
  }

  makeExperiment() {
    this.dataService.reset(this.localStore.getData(CREATED_STAGES_KEY) as ExpStage[]);
  }
}
