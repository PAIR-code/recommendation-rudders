/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { Component, Signal, computed } from '@angular/core';
import { MatRadioChange, MatRadioModule } from '@angular/material/radio';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { SavedDataService } from '../services/saved-data.service';
import { UserProfile } from '../../lib/staged-exp/data-model';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';

const dummyProfileData: UserProfile = {
  pronouns: "They/Them",
  avatarUrl: '',
  name: 'John Doe',
};

@Component({
  selector: 'app-exp-profile',
  standalone: true,
  imports: [MatRadioModule, MatButtonModule, MatFormFieldModule, MatInputModule, FormsModule, ReactiveFormsModule],
  templateUrl: './exp-profile.component.html',
  styleUrl: './exp-profile.component.scss',
})
export class ExpProfileComponent {
  public responseControl: FormControl<string | null>;
  public stageData: Signal<UserProfile>;
  public error: Signal<string | null>;

  constructor(private dataService: SavedDataService) {
    this.error = computed(() => {
      const currentStage = this.dataService.user().currentStage;
      if (!currentStage) {
        return `currentStage is undefined`;
      }
      if (currentStage.kind !== 'set-profile') {
        return `currentStage is kind is not right: ${JSON.stringify(currentStage, null, 2)}`;
      }
      return null;
    });

    // Assumption: this is only ever constructed when
    // `this.dataService.data().experiment.currentStage` references a
    // ExpStageUserProfile.

    this.stageData = computed(() => {
      if (this.dataService.data().user.currentStage.kind !== 'set-profile') {
        return dummyProfileData;
      }
      return this.dataService.data().user.currentStage.config as UserProfile;
    });

    this.responseControl = new FormControl<string>('');
    this.responseControl.valueChanges.forEach((n) => {
      if (n) {
        const curStageData = this.stageData();
        curStageData.name = n;
        this.dataService.updateExpStage(curStageData);
      }
      console.log(this.stageData());
    });

  }

  updatePronouns(updatedValue: MatRadioChange){
    const curStageData = this.stageData();
    curStageData.pronouns = updatedValue.value;
    this.dataService.updateExpStage(curStageData);
  }

}
