/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { Component } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxChange, MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioChange, MatRadioModule } from '@angular/material/radio';

import { STAGE_KIND_TOS_AND_PROFILE, TosAndUserProfile } from '../../lib/staged-exp/data-model';
import { SavedDataService } from '../services/saved-data.service';

@Component({
  selector: 'app-exp-tos-and-profile',
  standalone: true,
  imports: [
    MatCheckboxModule,
    MatRadioModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    ReactiveFormsModule,
  ],
  templateUrl: './exp-tos-and-profile.component.html',
  styleUrl: './exp-tos-and-profile.component.scss',
})
export class ExpTosAndProfileComponent {
  public responseControl: FormControl<string | null>;
  public config: TosAndUserProfile;

  constructor(private dataService: SavedDataService) {
    const stage = this.dataService.currentStage();
    if (stage.kind !== STAGE_KIND_TOS_AND_PROFILE) {
      throw new Error(`incorrect stage: ${stage.kind}.`);
    }
    this.config = stage.config;

    this.responseControl = new FormControl<string>('');
    this.responseControl.valueChanges.forEach((n) => {
      if (n) {
        this.config.name = n;
        this.updateStageAndUser();
      }
    });
  }

  updateCheckboxValue(updatedValue: MatCheckboxChange) {
    const checked = updatedValue.checked;
    if (checked) {
      console.log('checked');
      const date = new Date();
      this.config.acceptedTosTimestamp = date;
      this.updateStageAndUser();
    }
  }

  isComplete(): boolean {
    return (
      this.config.avatarUrl !== '' &&
      this.config.name !== '' &&
      this.config.pronouns !== '' &&
      this.config.acceptedTosTimestamp !== null
    );
  }

  updatePronouns(updatedValue: MatRadioChange) {
    this.config.pronouns = updatedValue.value;
    this.updateStageAndUser();
  }

  updateAvatarUrl(updatedValue: MatRadioChange) {
    this.config.avatarUrl = updatedValue.value;
    this.updateStageAndUser();
  }

  updateStageAndUser() {
    this.dataService.editWorkingOnExpStageData(() => this.config);
    this.dataService.updateUserProfile(this.config);
    this.dataService.setStageComplete(this.isComplete());
  }
}
