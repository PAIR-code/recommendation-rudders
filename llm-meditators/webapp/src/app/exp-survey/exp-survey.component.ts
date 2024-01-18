import { Component } from '@angular/core';
import { MatRadioModule } from '@angular/material/radio';
import { MatButtonModule } from '@angular/material/button';
import { SavedDataService, PronounPair } from '../saved-data.service';

@Component({
  selector: 'app-exp-survey',
  standalone: true,
  imports: [MatRadioModule, MatButtonModule],
  templateUrl: './exp-survey.component.html',
  styleUrl: './exp-survey.component.scss'
})
export class ExpSurveyComponent {
  readonly PronounPair = PronounPair;
  pronouns = PronounPair.THEY;
  constructor(
    private dataService: SavedDataService,
  ) {
    console.log(dataService);
  }

  setPronouns(event: any) {
    this.pronouns = event.value;
    console.log(this.pronouns);
  }

}
