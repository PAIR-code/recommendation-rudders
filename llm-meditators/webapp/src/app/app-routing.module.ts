/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AppHomeComponent as AppHomeComponent } from './app-home/app-home.component';
import { AppSettingsComponent } from './app-settings/app-settings.component';
import { PageNotFoundComponent } from './page-not-found/page-not-found.component';
import { ExpSurveyComponent } from './participant-stage-view/exp-survey/exp-survey.component';
import { ExpLeaderVoteComponent } from './participant-stage-view/exp-leader-vote/exp-leader-vote.component';
import { ExpTosComponent } from './participant-stage-view/exp-tos/exp-tos.component';
import { ParticipantViewComponent } from './participant-view/participant-view.component';
import { ExperimenterViewComponent } from './experimenter-view/experimenter-view.component';

const routes: Routes = [
  { path: '', component: AppHomeComponent, pathMatch: 'full' },
  {
    path: 'participant/:experiment;user=:user',
    component: ParticipantViewComponent,
    pathMatch: 'full',
  },
  { path: 'experimenter', component: AppHomeComponent, pathMatch: 'full' },
  { path: '**', component: PageNotFoundComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: true })],
  exports: [RouterModule],
})
export class AppRoutingModule {}
