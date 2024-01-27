import { JsonEditorComponent, JsonEditorOptions, NgJsonEditorModule } from 'ang-jsoneditor';
import { isEqual } from 'lodash';
import { ExpStage, ExpStageNames, stageKinds } from 'src/lib/staged-exp/data-model';
import { makeStages } from 'src/lib/staged-exp/example-experiment';

import { CdkDrag, CdkDragDrop, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { Component, ViewChild } from '@angular/core';
import { FormGroup, FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { LocalService } from '../services/local.service';
import { SavedDataService } from '../services/saved-data.service';

const EXISTING_STAGES_KEY = 'existing-stages';

const CREATED_STAGES_KEY = 'created-stages';

const getInitStageData = (): Partial<ExpStage> => {
  return { complete: false, name: Math.random().toString(36).substring(7) };
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
    MatFormFieldModule,
    MatInputModule,
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

  persistExistingStages() {
    this.localStore.saveData(EXISTING_STAGES_KEY, this.existingStages);
  }

  drop(event: CdkDragDrop<string[]>) {
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
      if (this.currentEditingStageIndex > index) {
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

  onChange(event: any) {
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
