/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
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
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterModule } from '@angular/router';

import { AppHomeComponent } from './app-home/app-home.component';
import { AppRoutingModule } from './app-routing.module';
import { AppSettingsComponent } from './app-settings/app-settings.component';
import { AppComponent } from './app.component';
import { CodemirrorConfigEditorModule } from './codemirror-config-editor/codemirror-config-editor.module';
//import { ExpRatingComponent } from './exp-rating/exp-rating.component';
import { ExpChatComponent } from './exp-chat/exp-chat.component';
import { ExpCreationComponent } from './exp-creation/exp-creation.component';
import { ExpLeaderRevealComponent } from './exp-leader-reveal/exp-leader-reveal.component';
import { ExpLeaderVoteComponent } from './exp-leader-vote/exp-leader-vote.component';
import { ExpProfileComponent } from './exp-profile/exp-profile.component';
import { ExpSurveyComponent } from './exp-survey/exp-survey.component';
import { ExpTosAndProfileComponent } from './exp-tos-and-profile/exp-tos-and-profile.component';
import { ExpTosComponent } from './exp-tos/exp-tos.component';
import { PageNotFoundComponent } from './page-not-found/page-not-found.component';
import { GoogleAuthService } from './services/google-auth.service';
import { GoogleSheetsService } from './services/google-sheets.service';
import { LmApiService } from './services/lm-api.service';
import { SavedDataService } from './services/saved-data.service';
import { VertexApiService } from './services/vertex-api.service';

@NgModule({
  declarations: [AppComponent, AppSettingsComponent, PageNotFoundComponent],
  providers: [VertexApiService, SavedDataService, LmApiService, GoogleAuthService, GoogleSheetsService],
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
    ExpCreationComponent,
  ],
})
export class AppModule {}
