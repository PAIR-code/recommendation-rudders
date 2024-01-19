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
import { ExpStageKind } from './data-model';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements AfterViewInit {
  @ViewChild('googleButton') googleButton!: ElementRef<HTMLElement>;
  public stageKind: Signal<ExpStageKind>;
  public stageName: Signal<string>;

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    public dataService: SavedDataService,
    public authService: GoogleAuthService,
  ) {
    this.stageKind = computed(() => this.dataService.user().currentStage.kind);
    this.stageName = computed(() => this.dataService.user().currentStage.name);

    effect(() => {
      // document.querySelector('title')!.textContent =
      //   this.dataService.appName();
      document.title = `Rudders: ${this.dataService.appName()}`;
    });
  }

  ngAfterViewInit() {
    // TODO: enable this to login automatically when app starts.
    // also uncomment stuff in html.
    this.authService.prompt();
    this.authService.renderLoginButton(this.googleButton.nativeElement);
  }
}
