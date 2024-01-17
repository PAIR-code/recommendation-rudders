import { Component } from '@angular/core';
import { SavedDataService } from '../saved-data.service';

@Component({
  selector: 'app-exp-survey',
  standalone: true,
  imports: [],
  templateUrl: './exp-survey.component.html',
  styleUrl: './exp-survey.component.scss'
})
export class ExpSurveyComponent {

  constructor(
    private dataService: SavedDataService,
  ) {
    this.dataService.appName()
  }

}
