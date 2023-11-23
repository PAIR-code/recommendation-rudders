import { Component, OnInit } from '@angular/core';
import { SavedDataService } from '../saved-data.service';
import { FormControl } from '@angular/forms';

@Component({
  selector: 'app-app-settings',
  templateUrl: './app-settings.component.html',
  styleUrls: ['./app-settings.component.scss']
})
export class AppSettingsComponent implements OnInit {
  public appNameControl!: FormControl<string | null>;

  constructor(public dataService: SavedDataService) {
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
}
