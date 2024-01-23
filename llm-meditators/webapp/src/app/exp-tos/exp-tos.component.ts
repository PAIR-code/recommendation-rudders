/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { Component, Signal, computed } from '@angular/core';
import { SavedDataService } from '../services/saved-data.service';
import { MatCheckboxChange, MatCheckboxModule } from '@angular/material/checkbox';
import { MatRadioChange, MatRadioModule } from '@angular/material/radio';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { User, UserProfile } from '../../lib/staged-exp/data-model';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';


const dummyProfileData: UserProfile = {
  pronouns: 'They/Them',
  avatarUrl: '/assets/avatars/they.png',
  name: 'John Doe',
  tosAcceptance: {
    acceptedTimestamp: null,
  },
};



@Component({
  selector: 'app-exp-tos',
  standalone: true,
  imports: [MatCheckboxModule, MatRadioModule, MatButtonModule, MatFormFieldModule, MatInputModule, FormsModule, ReactiveFormsModule],
  templateUrl: './exp-tos.component.html',
  styleUrl: './exp-tos.component.scss',
})
export class ExpTosComponent {
  //public stageData: Signal<UserProfile>;
  public responseControl: FormControl<string | null>;
  public profile: UserProfile;
  public error: Signal<string | null>;

  constructor(private dataService: SavedDataService) {
    this.error = computed(() => {
      const currentStage = this.dataService.user().currentStage;
      if (!currentStage) {
        return `currentStage is undefined`;
      }
      if (currentStage.kind !== 'accept-tos-and-set-profile') {
        return `currentStage is kind is not right: ${JSON.stringify(currentStage, null, 2)}`;
      }
      return null;
    });

    // Assumption: this is only ever constructed when
    // `this.dataService.data().experiment.currentStage` references a
    // ExpStageTosAcceptance.

    //this.stageData = computed(() => {
    //  if (this.dataService.data().user.currentStage.kind !== 'accept-tos-and-set-profile') {
    //    return dummyProfileData;
    //  }
    //  return this.dataService.data().user.currentStage.config as UserProfile;
    //});

    if (this.dataService.data().user.currentStage.kind !== 'accept-tos-and-set-profile') {
      this.profile = dummyProfileData;
    } else {
      this.profile = this.dataService.data().user.currentStage.config as UserProfile;
    }

    this.responseControl = new FormControl<string>('');
    this.responseControl.valueChanges.forEach((n) => {
      if (n) {
        this.profile.name = n;
        this.updateStageAndUser(this.profile);
      }
    });
  }

  //updateCheckboxValue(updatedValue: MatCheckboxChange) {
  //  const currentStage = this.stageData();
  //  const checked = updatedValue.checked;
  //  if (checked) {
  //    console.log('checked');
  //    const date = new Date();
  //    currentStage.tosAcceptance.acceptedTimestamp = date;
  //    this.dataService.updateExpStage(currentStage);
  //  }
  //}

  updateCheckboxValue(updatedValue: MatCheckboxChange) {
    const checked = updatedValue.checked;
    if (checked) {
      console.log('checked');
      const date = new Date();
      this.profile.tosAcceptance.acceptedTimestamp = date;
      this.updateStageAndUser({ ...this.profile });
    }
  }

  isComplete(): boolean {
    return this.profile.avatarUrl !== '' && this.profile.name !== '' && this.profile.pronouns !== '' && this.profile.tosAcceptance.acceptedTimestamp !== null;
  }

  updatePronouns(updatedValue: MatRadioChange) {
    this.profile.pronouns = updatedValue.value;
    this.updateStageAndUser({ ...this.profile });
  }

  updateAvatarUrl(updatedValue: MatRadioChange) {
    this.profile.avatarUrl = updatedValue.value;
    this.updateStageAndUser({ ...this.profile });
  }

  updateStageAndUser(curStageData: UserProfile) {
    this.dataService.updateExpStage(curStageData);
    this.dataService.updateUser(this.profile);
    this.dataService.setStageComplete(this.isComplete());
  }
}
