/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { AppComponent } from './app.component';
import { AppHomeComponent } from './app-home/app-home.component';
import { AppSettingsComponent } from './app-settings/app-settings.component';
import { PageNotFoundComponent } from './page-not-found/page-not-found.component';
import { ExpSurveyComponent } from './exp-survey/exp-survey.component';

import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { VertexApiService } from './services/vertex-api.service';
import { SavedDataService } from './services/saved-data.service';
import { LmApiService } from './services/lm-api.service';
import { GoogleAuthService } from './services/google-auth.service';
import { GoogleSheetsService } from './services/google-sheets.service';
import { CodemirrorConfigEditorModule } from './codemirror-config-editor/codemirror-config-editor.module';
import { ExpLeaderVoteComponent } from './exp-leader-vote/exp-leader-vote.component';
import { ExpProfileComponent } from './exp-profile/exp-profile.component';
import { ExpRatingComponent } from './exp-rating/exp-rating.component';
import { ExpChatComponent } from './exp-chat/exp-chat.component';
import { ExpTosComponent } from "./exp-tos/exp-tos.component";

@NgModule({
    declarations: [AppComponent, AppHomeComponent, AppSettingsComponent, PageNotFoundComponent],
    providers: [VertexApiService, SavedDataService, LmApiService, GoogleAuthService, GoogleSheetsService],
    bootstrap: [AppComponent],
    imports: [
        BrowserModule,
        AppRoutingModule,
        BrowserAnimationsModule,
        MatButtonModule,
        MatSelectModule,
        MatSidenavModule,
        MatButtonToggleModule,
        MatIconModule,
        MatListModule,
        FormsModule,
        ReactiveFormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatMenuModule,
        MatProgressBarModule,
        CodemirrorConfigEditorModule,
        ExpSurveyComponent,
        ExpLeaderVoteComponent,
        ExpProfileComponent,
        ExpRatingComponent,
        ExpChatComponent,
        ExpTosComponent
    ]
})
export class AppModule {}
