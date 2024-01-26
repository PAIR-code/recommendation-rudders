import { JsonEditorComponent, JsonEditorOptions, NgJsonEditorModule } from 'ang-jsoneditor';
import { ExpStage, ExpStageNames, stageKinds } from 'src/lib/staged-exp/data-model';
import { makeStages } from 'src/lib/staged-exp/example-experiment';

import { Component, ViewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';

import { LocalService } from '../services/local.service';
import { SavedDataService } from '../services/saved-data.service';

const CREATED_STAGES_KEY = 'created-stages';

@Component({
  selector: 'app-exp-creation',
  standalone: true,
  imports: [MatButtonModule, MatCardModule, NgJsonEditorModule],
  templateUrl: './exp-creation.component.html',
  styleUrl: './exp-creation.component.scss',
})
export class ExpCreationComponent {
  public editorOptions: JsonEditorOptions;

  public oracleStages = makeStages();
  public createdStages: ExpStage[] = [];
  public creationIndex = 0;

  public data = {};

  readonly ExpStageNames = ExpStageNames;
  readonly stageKinds = stageKinds;

  @ViewChild('editor') editor: JsonEditorComponent = new JsonEditorComponent();

  constructor(
    private dataService: SavedDataService,
    private localStore: LocalService,
  ) {
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
