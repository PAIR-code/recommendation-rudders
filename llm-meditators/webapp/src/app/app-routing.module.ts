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
import { ExpCreationComponent } from './exp-creation/exp-creation.component';
import { ExpTosComponent } from './exp-tos/exp-tos.component';
import { PageNotFoundComponent } from './page-not-found/page-not-found.component';
import { ExperimenterViewComponent } from './experimenter-view/experimenter-view.component';

const routes: Routes = [
  { path: '', component: AppHomeComponent, pathMatch: 'full' },
  { path: 'settings', component: AppSettingsComponent, pathMatch: 'full' },
  { path: 'create-experiment', component: ExpCreationComponent, pathMatch: 'full' },
  { path: 'tos', component: ExpTosComponent, pathMatch: 'full' },
  { path: 'experimenter-view', component: ExperimenterViewComponent, pathMatch: 'full' },
  { path: '**', component: PageNotFoundComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: true })],
  exports: [RouterModule],
})
export class AppRoutingModule {}
