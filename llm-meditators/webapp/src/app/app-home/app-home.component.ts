/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

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
import { AppStateService } from '../services/app-state.service';

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
  constructor(public dataService: AppStateService) {}
}
