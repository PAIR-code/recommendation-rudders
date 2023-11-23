/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LlmApiConfigComponent } from './llm-api-config/llm-api-config.component';
import { RuddersHomeComponent } from './rudders-home/rudders-home.component';
import { PromptsConfigComponent } from './prompts-config/prompts-config.component';
import { DataViewerComponent } from './data-viewer/data-viewer.component';
import { AppSettingsComponent } from './app-settings/app-settings.component';
import { PageNotFoundComponent } from './page-not-found/page-not-found.component';

const routes: Routes = [
  { path: '', component: RuddersHomeComponent, pathMatch: 'full' },
  { path: 'settings', component: AppSettingsComponent, pathMatch: 'full' },
  { path: 'llm-config', component: LlmApiConfigComponent, pathMatch: 'full' },
  { path: 'prompts', component: PromptsConfigComponent, pathMatch: 'full' },
  { path: 'data', component: DataViewerComponent, pathMatch: 'full' },
  { path: '**', component: PageNotFoundComponent }
];


@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: true })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
