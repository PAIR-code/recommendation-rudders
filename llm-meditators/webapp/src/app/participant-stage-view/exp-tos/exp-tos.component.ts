/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { Component, computed, Signal } from '@angular/core';
import { MatCheckboxChange, MatCheckboxModule } from '@angular/material/checkbox';

import { STAGE_KIND_ACCEPT_TOS, TosAcceptance } from '../../../lib/staged-exp/data-model';
import { AppStateService } from '../../services/app-state.service';
import { APPSTATE_PARTICIPANT } from 'src/lib/app';
import { Participant } from 'src/lib/participant';

@Component({
  selector: 'app-exp-tos',
  standalone: true,
  imports: [MatCheckboxModule],
  templateUrl: './exp-tos.component.html',
  styleUrl: './exp-tos.component.scss',
})
export class ExpTosComponent {
  public participant: Participant;
  public stageData: TosAcceptance;

  constructor(stateService: AppStateService) {
    const { participant, stageData } = stateService.getParticipantAndStage(STAGE_KIND_ACCEPT_TOS);
    this.stageData = stageData();
    this.participant = participant;
  }

  updateCheckboxValue(updatedValue: MatCheckboxChange) {
    const checked = updatedValue.checked;
    if (checked) {
      this.stageData.acceptedTosTimestamp = new Date();
    } else {
      this.stageData.acceptedTosTimestamp = null;
    }
    this.participant.editStageData(() => this.stageData);
  }
}
