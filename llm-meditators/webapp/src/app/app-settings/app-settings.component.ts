/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { Component, ElementRef, OnInit, ViewChild, effect } from '@angular/core';
import { AppData, SavedDataService, initialAppData } from '../services/saved-data.service';
import { FormControl } from '@angular/forms';
import { LmApiService } from '../services/lm-api.service';
import { GoogleSheetsService, isSheetsError } from '../services/google-sheets.service';
import { GoogleAuthService } from '../services/google-auth.service';
import { GoogleDriveAppdataService } from '../services/google-drive-appdata.service';
import { SimpleError, isErrorResponse } from 'src/lib/simple-errors/simple-errors';
import { ConfigUpdate } from '../codemirror-config-editor/codemirror-config-editor.component';

@Component({
  selector: 'app-app-settings',
  templateUrl: './app-settings.component.html',
  styleUrls: ['./app-settings.component.scss'],
})
export class AppSettingsComponent implements OnInit {
  public appNameControl: FormControl<string | null>;
  public currentUserIdControl: FormControl<string | null>;

  public defaultDataStr: string = JSON.stringify(initialAppData(), null, 2);
  public currentDataStr: string = this.defaultDataStr.slice();

  public downloadUrl?: string;
  public waiting: boolean = false;
  public errorMessage?: string;
  public errorCount: number = 0;

  public usersList: string[] = [];

  @ViewChild('downloadLink') downloadLink!: ElementRef<HTMLAnchorElement>;

  constructor(
    private dataService: SavedDataService,
    private lmApiService: LmApiService,
    private sheetsService: GoogleSheetsService,
    private driveService: GoogleDriveAppdataService,
    private authService: GoogleAuthService,
  ) {
    this.appNameControl = new FormControl<string | null>(this.dataService.appName());
    this.appNameControl.valueChanges.forEach((n) => {
      if (n) {
        this.dataService.setSetting('name', n);
      }
    });

    this.currentUserIdControl = new FormControl<string | null>(this.dataService.data().currentUserId);
    this.currentUserIdControl.valueChanges.forEach((n) => {
      if (n) {
        this.dataService.setCurrentUserId(n);
      }
    });

    // When app data changes, update the fields in this UI.
    effect(() => {
      const newName = this.dataService.appName();
      if (this.appNameControl.value !== null && this.appNameControl.value !== newName) {
        this.appNameControl.setValue(newName, { emitEvent: false });
      }
    });

    effect(() => {
      this.currentDataStr = JSON.stringify(this.dataService.data(), null, 2);
    });

    this.usersList = Object.values(this.dataService.data().experiment.participants).map(({ userId }) => userId);
    console.log(this.usersList);
  }

  ngOnInit(): void {}

  setCurrentUser(event: { value: string }) {
    this.dataService.setCurrentUserId(event.value);
  }

  reset() {
    this.dataService.reset();
    this.appNameControl.setValue(this.dataService.appName());
    this.currentDataStr = JSON.stringify(this.dataService.data(), null, 2);
  }

  async saveToGoogleDrive() {
    const json = JSON.stringify(this.dataService.data());
    const token = await this.authService.getToken(
      'https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/drive.file',
    );

    const response = await this.driveService.saveData(json, `${this.dataService.appName()}.json`, '', token);

    console.log('saveToGoogleDrive:response', response);
  }

  download(anchorLink: HTMLAnchorElement) {
    const json = JSON.stringify(this.dataService.data());
    const blob = new Blob([json], { type: 'data:application/json;charset=utf-8' });
    if (this.downloadUrl) {
      URL.revokeObjectURL(this.downloadUrl);
    }
    this.downloadUrl = URL.createObjectURL(blob);
    anchorLink.href = this.downloadUrl;
    anchorLink.click();
    // window.open(this.downloadUrl, '_top');
  }

  downloadName() {
    return `${this.appNameControl.value}.json`;
  }

  configUpdated(update: ConfigUpdate<unknown>) {
    // When configUpdate has a new object, we assume it to be correct.
    //
    // TODO: provide some runtime value type checking. Right now all that is
    // needed is valid JSON/JSON5, but if you provide valid JSON missing needed
    // values (e.g. encoderConfig is null), it should complain here, but
    // currently does not.
    const configUpdate = update as ConfigUpdate<AppData>;

    if (configUpdate.error || !configUpdate.obj || !configUpdate.json) {
      console.log(`configUpdated with no update: ${configUpdate}`);
      return;
    }

    this.dataService.data.set(configUpdate.obj);
    this.currentDataStr = configUpdate.json;
  }

  sizeString() {
    const bytes = this.dataService.dataSize();
    if (bytes >= 1073741824) {
      return (bytes / 1073741824).toFixed(2) + ' GB';
    } else if (bytes >= 1048576) {
      return (bytes / 1048576).toFixed(2) + ' MB';
    } else if (bytes >= 1024) {
      return (bytes / 1024).toFixed(2) + ' KB';
    } else if (bytes > 1) {
      return bytes + ' bytes';
    } else if (bytes == 1) {
      return bytes + ' byte';
    } else {
      return '0 bytes';
    }
  }
}
