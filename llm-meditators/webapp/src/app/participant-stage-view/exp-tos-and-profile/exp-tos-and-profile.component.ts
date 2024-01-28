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

import { STAGE_KIND_TOS_AND_PROFILE, TosAndUserProfile } from '../../../lib/staged-exp/data-model';
import { AppStateService } from '../../services/app-state.service';
import { Participant } from 'src/lib/participant';
import { APPSTATE_PARTICIPANT } from 'src/lib/app';

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
  public participant: Participant;

  public responseControl: FormControl<string | null>;
  public stageData: TosAndUserProfile;

  constructor(stateService: AppStateService) {
    const { participant, stageData } = stateService.getParticipantAndStage(
      STAGE_KIND_TOS_AND_PROFILE,
    );
    this.stageData = stageData();
    this.participant = participant;

    this.responseControl = new FormControl<string>(this.stageData.name);
    this.responseControl.valueChanges.forEach((n) => {
      if (n) {
        this.stageData.name = n;
        this.participant.editStageData(() => this.stageData);
        this.participant.edit((user) => {
          user.profile.name = this.stageData.name;
        });
      }
    });
  }

  updateCheckboxValue(updatedValue: MatCheckboxChange) {
    const checked = updatedValue.checked;
    if (checked) {
      console.log('checked');
      const date = new Date();
      this.stageData.acceptedTosTimestamp = date;
      this.participant.editStageData(() => this.stageData);
    }
  }

  // isComplete(): boolean {
  //   return (
  //     this.config.avatarUrl !== '' &&
  //     this.config.name !== '' &&
  //     this.config.pronouns !== '' &&
  //     this.config.acceptedTosTimestamp !== null
  //   );
  // }

  updatePronouns(updatedValue: MatRadioChange) {
    this.stageData.pronouns = updatedValue.value;
    this.participant.editStageData(() => this.stageData);
    this.participant.edit((user) => {
      user.profile.pronouns = this.stageData.pronouns;
    });
  }

  updateAvatarUrl(updatedValue: MatRadioChange) {
    this.stageData.avatarUrl = updatedValue.value;
    this.participant.editStageData(() => this.stageData);
    this.participant.edit((user) => {
      user.profile.pronouns = this.stageData.avatarUrl;
    });
  }
}
