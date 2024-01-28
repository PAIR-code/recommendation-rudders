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
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioChange, MatRadioModule } from '@angular/material/radio';

import { STAGE_KIND_PROFILE, UserProfile } from '../../../lib/staged-exp/data-model';
import { AppStateService } from '../../services/app-state.service';
import { Participant } from 'src/lib/participant';

@Component({
  selector: 'app-exp-profile',
  standalone: true,
  imports: [
    MatRadioModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    ReactiveFormsModule,
  ],
  templateUrl: './exp-profile.component.html',
  styleUrl: './exp-profile.component.scss',
})
export class ExpProfileComponent {
  public participant: Participant;

  public responseControl: FormControl<string | null>;
  public profile: UserProfile;

  constructor(private stateService: AppStateService) {
    const { participant, stageData } = stateService.getParticipantAndStage(STAGE_KIND_PROFILE);
    this.profile = stageData();
    this.participant = participant;

    this.responseControl = new FormControl<string>('');
    this.responseControl.valueChanges.forEach((n) => {
      if (n) {
        this.profile.name = n;
        this.participant.setProfile(this.profile);
      }
    });
  }

  isComplete(): boolean {
    return (
      this.profile.avatarUrl !== '' && this.profile.name !== '' && this.profile.pronouns !== ''
    );
  }

  updatePronouns(updatedValue: MatRadioChange) {
    this.profile.pronouns = updatedValue.value;
    this.participant.setProfile(this.profile);
  }

  updateAvatarUrl(updatedValue: MatRadioChange) {
    this.profile.avatarUrl = updatedValue.value;
    this.participant.setProfile(this.profile);
  }
}
