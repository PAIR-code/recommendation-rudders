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
import { SavedDataService } from '../services/saved-data.service';
import { UserProfile } from '../../lib/staged-exp/data-model';

const dummyProfileData: UserProfile = {
  pronouns: null,
  avatarUrl: '',
  name: 'John Doe',
};

@Component({
  selector: 'app-exp-profile',
  standalone: true,
  imports: [MatRadioModule, MatButtonModule],
  templateUrl: './exp-profile.component.html',
  styleUrl: './exp-profile.component.scss',
})
export class ExpProfileComponent {
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
  }

  updatePronouns(updatedValue: MatRadioChange){
    const curStageData = this.stageData();
    curStageData.pronouns = updatedValue.value;
    this.dataService.updateExpStage(curStageData);
  }

}
