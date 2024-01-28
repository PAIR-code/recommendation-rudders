/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AppComponent } from './app.component';
import { AppHomeComponent } from './app-home/app-home.component';
import { AppRoutingModule } from './app-routing.module';
import { AppSettingsComponent } from './app-settings/app-settings.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { BrowserModule } from '@angular/platform-browser';
import { CodemirrorConfigEditorModule } from './codemirror-config-editor/codemirror-config-editor.module';
//import { ExpRatingComponent } from './exp-rating/exp-rating.component';
import { ExpChatComponent } from './exp-chat/exp-chat.component';
import { ExpLeaderRevealComponent } from './exp-leader-reveal/exp-leader-reveal.component';
import { ExpLeaderVoteComponent } from './exp-leader-vote/exp-leader-vote.component';
import { ExpProfileComponent } from './exp-profile/exp-profile.component';
import { ExpSurveyComponent } from './exp-survey/exp-survey.component';
import { ExpTosAndProfileComponent } from './exp-tos-and-profile/exp-tos-and-profile.component';
import { ExpTosComponent } from './exp-tos/exp-tos.component';
import { GoogleAuthService } from './services/google-auth.service';
import { GoogleSheetsService } from './services/google-sheets.service';
import { LmApiService } from './services/lm-api.service';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { NgModule } from '@angular/core';
import { PageNotFoundComponent } from './page-not-found/page-not-found.component';
import { AppStateService } from './services/app-state.service';
import { VertexApiService } from './services/vertex-api.service';
import { RouterModule } from '@angular/router';
import { ExperimenterViewComponent } from './experimenter-view/experimenter-view.component';

@NgModule({
  declarations: [AppComponent, AppSettingsComponent, PageNotFoundComponent],
  providers: [
    VertexApiService,
    AppStateService,
    LmApiService,
    GoogleAuthService,
    GoogleSheetsService,
  ],
  bootstrap: [AppComponent],
  imports: [
    BrowserModule,
    RouterModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    MatButtonModule,
    MatSelectModule,
    MatSidenavModule,
    MatButtonToggleModule,
    MatIconModule,
    MatListModule,
    MatBadgeModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatChipsModule,
    MatMenuModule,
    MatProgressBarModule,
    CodemirrorConfigEditorModule,
    AppHomeComponent,
    ExpSurveyComponent,
    ExpLeaderVoteComponent,
    ExpProfileComponent,
    //ExpRatingComponent,
    ExpChatComponent,
    ExpTosComponent,
    ExpTosAndProfileComponent,
    ExpLeaderRevealComponent,
    ExperimenterViewComponent,
  ],
})
export class AppModule {}
