/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { Component, ElementRef, OnInit, ViewChild, effect } from '@angular/core';
import { AppData, SavedDataService } from '../services/saved-data.service';
import { FormControl } from '@angular/forms';
import { LmApiService } from '../services/lm-api.service';
import { GoogleSheetsService, isSheetsError } from '../services/google-sheets.service';
import { GoogleAuthService } from '../services/google-auth.service';
import { GoogleDriveAppdataService } from '../services/google-drive-appdata.service';
import { ItemInterpreterService } from '../services/item-interpreter.service';
import { SimpleError, isErrorResponse } from 'src/lib/simple-errors/simple-errors';


@Component({
  selector: 'app-app-settings',
  templateUrl: './app-settings.component.html',
  styleUrls: ['./app-settings.component.scss']
})
export class AppSettingsComponent implements OnInit {
  public appNameControl: FormControl<string | null>;

  public sheetsUrlOrIdControl: FormControl<string | null>;
  public sheetsRangeControl: FormControl<string | null>;

  public downloadUrl?: string;
  public waiting: boolean = false;
  public errorMessage?: string;
  public errorCount: number = 0;

  @ViewChild('downloadLink') downloadLink!: ElementRef<HTMLAnchorElement>;

  constructor(
    private dataService: SavedDataService,
    private lmApiService: LmApiService,
    private sheetsService: GoogleSheetsService,
    private driveService: GoogleDriveAppdataService,
    private authService: GoogleAuthService,
    private itemInterpreterService: ItemInterpreterService
  ) {
    this.sheetsUrlOrIdControl = new FormControl<string>('');
    this.sheetsRangeControl = new FormControl<string>('');
    this.appNameControl = new FormControl<string | null>(
      this.dataService.appName());
    this.appNameControl.valueChanges.forEach(n => {
      if (n) { this.dataService.setSetting('name', n); };
    });
    this.sheetsUrlOrIdControl.valueChanges.forEach(n => {
      if (n) { this.dataService.setSetting('sheetsId', n); };
    });
    this.sheetsRangeControl.valueChanges.forEach(n => {
      if (n) { this.dataService.setSetting('sheetsRange', n); };
    });

    // When app data changes, update the fields in this UI.
    effect(() => {
      const newName = this.dataService.appName();
      if (this.appNameControl.value !== null
        && this.appNameControl.value !== newName) {
        this.appNameControl.setValue(newName, { emitEvent: false });
      }
      const sheetsUrl = this.dataService.data().settings.sheetsId;
      if (this.sheetsUrlOrIdControl.value !== null
        && this.sheetsUrlOrIdControl.value !== sheetsUrl) {
        this.sheetsUrlOrIdControl.setValue(sheetsUrl, { emitEvent: false });
      }
      const sheetsRange = this.dataService.data().settings.sheetsRange;
      if (this.sheetsRangeControl.value !== null
        && this.sheetsRangeControl.value !== sheetsUrl) {
        this.sheetsRangeControl.setValue(sheetsRange, { emitEvent: false });
      }
    });
  }

  ngOnInit(): void {
  }

  reset() {
    this.dataService.reset();
    this.appNameControl.setValue(this.dataService.appName());
  }

  async saveToGoogleDrive() {
    const json = JSON.stringify(this.dataService.data());
    const token = await this.authService.getToken(
      'https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/drive.file');

    const response = await this.driveService.saveData(
      json, `${this.dataService.appName()}.json`, '', token);

    console.log('saveToGoogleDrive:response', response);
  }

  download(anchorLink: HTMLAnchorElement) {
    const json = JSON.stringify(this.dataService.data());
    const blob = new Blob([json], { type: "data:application/json;charset=utf-8" });
    if (this.downloadUrl) {
      URL.revokeObjectURL(this.downloadUrl);
    }
    this.downloadUrl = URL.createObjectURL(blob);
    anchorLink.href = this.downloadUrl;
    anchorLink.click();
    // window.open(this.downloadUrl, '_top');
  }

  downloadName() {
    return `${this.appNameControl.value}.json`
  }

  sizeString() {
    const bytes = this.dataService.dataSize();
    if (bytes >= 1073741824) { return (bytes / 1073741824).toFixed(2) + " GB"; }
    else if (bytes >= 1048576) { return (bytes / 1048576).toFixed(2) + " MB"; }
    else if (bytes >= 1024) { return (bytes / 1024).toFixed(2) + " KB"; }
    else if (bytes > 1) { return bytes + " bytes"; }
    else if (bytes == 1) { return bytes + " byte"; }
    else { return "0 bytes"; }
  }
}
