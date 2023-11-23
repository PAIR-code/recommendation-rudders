import { Component, ElementRef, OnInit, ViewChild, effect } from '@angular/core';
import { AppData, SavedDataService } from '../saved-data.service';
import { FormControl } from '@angular/forms';
import { LmApiService } from '../lm-api.service';
import { isEmbedError } from 'src/lib/text-embeddings/embedder';

@Component({
  selector: 'app-app-settings',
  templateUrl: './app-settings.component.html',
  styleUrls: ['./app-settings.component.scss']
})
export class AppSettingsComponent implements OnInit {
  public appNameControl!: FormControl<string | null>;
  public downloadUrl?: string;
  public waiting: boolean = false;
  public errorMessage?: string;
  public errorCount: number = 0;

  @ViewChild('downloadLink') downloadLink!: ElementRef<HTMLAnchorElement>;

  constructor(
    public dataService: SavedDataService,
    public lmApi: LmApiService
  ) {
    effect(() => {
      const newName = this.dataService.appName();
      if (this.appNameControl && this.appNameControl.value !== null
        && this.appNameControl.value !== newName) {
        this.appNameControl.setValue(newName, { emitEvent: false });
      }
    });
  }

  ngOnInit(): void {
    this.appNameControl = new FormControl<string | null>(
      this.dataService.appName());
    this.appNameControl.valueChanges.forEach(n => {
      if (n) { this.dataService.setAppName(n); };
    });
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
          const embedResult = await this.lmApi.embedder.embed(item.text);
          if (isEmbedError(embedResult)) {
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
