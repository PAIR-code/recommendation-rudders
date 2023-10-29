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
import { LlmApiConfigComponent } from './llm-api-config/llm-api-config.component';
import { RuddersHomeComponent } from './rudders-home/rudders-home.component';
import { PromptsConfigComponent } from './prompts-config/prompts-config.component';
import { DataViewerComponent } from './data-viewer/data-viewer.component';

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

import { VertexApiService } from './vertex-api.service';
import { SavedDataService } from './saved-data.service';
import { DataItemComponent } from './data-item/data-item.component';

@NgModule({
  declarations: [
    AppComponent,
    LlmApiConfigComponent,
    RuddersHomeComponent,
    PromptsConfigComponent,
    DataViewerComponent,
    DataItemComponent,
  ],
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
  ],
  providers: [
    VertexApiService,
    SavedDataService,
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
