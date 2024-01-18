import { Component, Signal, WritableSignal, computed, signal } from '@angular/core';
import { AppData, ExpStageSimpleSurvey, SavedDataService,  } from '../saved-data.service';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { SimpleError, isErrorResponse as isSimpleError } from 'src/lib/simple-errors/simple-errors';

const dummySurveyData: ExpStageSimpleSurvey = {
  kind: 'survey',
  name: 'error name',
  question: 'error: this should never happen',
  response: {
    // score: 
    openFeedback: '',
  },
}
@Component({
  selector: 'app-exp-survey',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './exp-survey.component.html',
  styleUrl: './exp-survey.component.scss'
})
export class ExpSurveyComponent {
  public responseControl: FormControl<string | null>;
  public stageData: Signal<ExpStageSimpleSurvey>;
  public error: Signal<string | null>;

  constructor(
    private dataService: SavedDataService,
  ) {
    this.error = computed(() => {
      if(!this.dataService.data().experiment.currentStage) {
        return `currentStage is undefined`;
      }
      if(this.dataService.nameStageMap()[
        this.dataService.data().experiment.currentStage]) {
        return null;
      }
      return `this.dataService.data().experiment.currentStage is not in the map`;
    });

    // Assumption: this is only ever constructed when 
    // `this.dataService.data().experiment.currentStage` references a 
    // ExpStageSimpleSurvey.
    this.stageData = computed(() => {
      console.log(this.error())
      console.log(this.dataService.nameStageMap())
      console.log(this.dataService.data().experiment.currentStage);

      const stageData = this.dataService.nameStageMap()[
        this.dataService.data().experiment.currentStage]
      if (!stageData) {
        return dummySurveyData;
      }
      return stageData as ExpStageSimpleSurvey;
    });

    this.responseControl = new FormControl<string>('');
    this.responseControl.valueChanges.forEach(n => {
      if (n) {
        const curStageData = this.stageData();
        if(isSimpleError(curStageData)) {
          return;
        }
        curStageData.response =  {
          openFeedback: n
        }
        this.dataService.updateExpStage(curStageData); };
        console.log(this.stageData());
    });
  }
}
