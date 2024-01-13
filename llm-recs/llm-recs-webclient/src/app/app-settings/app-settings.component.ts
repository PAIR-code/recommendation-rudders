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
import { ErrorResponse, isErrorResponse } from 'src/lib/simple-errors/simple-errors';


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

  deleteEmbeddings() {
    const data = this.dataService.data();
    for (const item of Object.values(data.items)) {
      item.embeddings = {};
    }
    this.dataService.data.set(data);
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

  upload(file: Blob) {
    this.waiting = true;
    const reader = new FileReader();

    reader.onload = async (progressEvent) => {
      const uploadedData =
        JSON.parse(progressEvent.target!.result as string) as AppData;

      for (const item of Object.values(uploadedData.items)) {
        if (Object.keys(item.embeddings).length === 0) {
          const embedResult = await this.lmApiService.embedder.embed(item.text);
          if (isErrorResponse(embedResult)) {
            if (!this.errorMessage) {
              this.errorMessage = embedResult.error;
            }
            console.error(embedResult.error);
            this.errorCount += 1;
          } else {
            item.embeddings[item.text] = embedResult.embedding;
          }
        }
      }

      this.dataService.data.set(uploadedData);
      this.waiting = false;
    };
    reader.readAsText(file);
  }

  async addEntriesFromSheetColumn() {
    this.waiting = true;
    delete this.errorMessage;
    this.errorCount = 0;
    const currentSheetStr = this.sheetsUrlOrIdControl.value || '';
    const currentRangeStr = this.sheetsRangeControl.value || '';

    const token = await this.authService.getToken(
      'https://www.googleapis.com/auth/spreadsheets.readonly');
    const data = await this.sheetsService.getSheetValues(
      currentSheetStr, currentRangeStr, token);

    // const info = await this.sheetsService.getSheetInfo(currentSheetStr, token);
    if (isSheetsError(data)) {
      this.errorMessage = data.error;
      this.errorCount++;
      this.waiting = false;
      return;
    }
    console.log(data.values);

    for (const row of data.values) {
      if (row.length > 1) {
        this.errorMessage = 'You entered a range with more than one column, but indexing of a sheet only works on a single column right now.';
        this.errorCount++;
        this.waiting = false;
        return;
      }
      const itemTextSet = new Set<string>();
      Object.values(this.dataService.data().items).forEach(i =>
        itemTextSet.add(i.text));

      const s = row[0];
      // Skip empty items, or items that we already have.
      if (s.match(/^\s*$/) || (itemTextSet.has(s))) {
        break;
      }

      const result = await this.dataService.createItem(s);
      if (isErrorResponse(result)) {
        this.errorMessage = result.error;
        this.errorCount++;
        return;
      }
      this.dataService.addDataItem(result);
    }
    // if (data.sheets) {
    //   info.sheets.forEach(sheet => {
    //     console.log(sheet.properties?.title);
    //     console.log(sheet.properties?.index);
    //     console.log(sheet.properties?.sheetId);
    //     console.log('data', sheet.data);
    //     if () {
    //       const info = await this.sheetsService.getSheetInfo(currentSheetStr, token);
    //     }
    //   });
    // data.settings.sheetsColumnName
    // info.sheets[0].data[0].rowData[0].values
    // }

    this.waiting = false;
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
