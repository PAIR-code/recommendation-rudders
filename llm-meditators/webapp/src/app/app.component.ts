/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { AfterViewInit, Component, ElementRef, Signal, ViewChild, computed, effect } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { SavedDataService } from './services/saved-data.service';
import { GoogleAuthService } from './services/google-auth.service';
import { ExpStageKind } from '../lib/staged-exp/data-model';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements AfterViewInit {
  @ViewChild('googleButton') googleButton!: ElementRef<HTMLElement>;

  public currentStageKind: Signal<ExpStageKind>;
  public currentStageName: Signal<string>;
  public workingOnStageName: Signal<string>;

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    public dataService: SavedDataService,
    public authService: GoogleAuthService,
  ) {
    this.currentStageKind = computed(() => this.dataService.currentStage().kind);
    this.currentStageName = computed(() => this.dataService.currentStage().name);
    this.workingOnStageName = computed(() => this.dataService.user().workingOnStageName);

    effect(() => {
      // document.querySelector('title')!.textContent =
      //   this.dataService.appName();
      document.title = `Experiment: ${this.dataService.appName()}`;
    });
  }

  ngAfterViewInit() {
    // TODO: enable this to login automatically when app starts.
    // also uncomment stuff in html.
    this.authService.prompt();
    this.authService.renderLoginButton(this.googleButton.nativeElement);
  }

  updateCurrentStageName(stageName: string) {
    console.log('updateViewingStageName', stageName);
    this.dataService.setCurrentExpStageName(stageName);
  }
}
