/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { ExpStageNames, stageKinds } from 'src/lib/staged-exp/data-model';

import { Component, computed, Signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

import { ExpChatComponent } from '../exp-chat/exp-chat.component';
import { ExpLeaderRevealComponent } from '../exp-leader-reveal/exp-leader-reveal.component';
import { ExpLeaderVoteComponent } from '../exp-leader-vote/exp-leader-vote.component';
import { ExpProfileComponent } from '../exp-profile/exp-profile.component';
//import { ExpRatingComponent } from '../exp-rating/exp-rating.component';
import { ExpSurveyComponent } from '../exp-survey/exp-survey.component';
import { ExpTosAndProfileComponent } from '../exp-tos-and-profile/exp-tos-and-profile.component';
import { ExpTosComponent } from '../exp-tos/exp-tos.component';
import { SavedDataService } from '../services/saved-data.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    ExpChatComponent,
    ExpLeaderVoteComponent,
    ExpProfileComponent,
    //ExpRatingComponent,
    ExpSurveyComponent,
    ExpTosAndProfileComponent,
    ExpLeaderRevealComponent,
    ExpTosComponent,
    MatButtonModule,
  ],
  templateUrl: './app-home.component.html',
  styleUrls: ['./app-home.component.scss'],
})
export class AppHomeComponent {
  public everyoneReachedTheEnd: Signal<boolean>;
  public currentStageName: Signal<string>;
  public workingOnStageName: Signal<string>;
  public holdingForLeaderReveal: boolean = false;

  public waiting: boolean = false;
  public errorMessage?: string;
  readonly stageKinds = stageKinds;

  constructor(public dataService: SavedDataService) {
    this.everyoneReachedTheEnd = computed(() => {
      const users = Object.values(this.dataService.data().experiment.participants);
      return users.map((userData) => userData.futureStageNames.length).every((n) => n === 1);
    });

    this.currentStageName = computed(() => this.dataService.currentStage().name);
    this.workingOnStageName = computed(() => this.dataService.user().workingOnStageName);

    this.holdingForLeaderReveal =
      this.currentStageName() === ExpStageNames['8. Leader reveal'] && !this.everyoneReachedTheEnd();
  }

  dismissError() {
    delete this.errorMessage;
  }

  nextStep() {
    this.dataService.nextStep();
  }
}
