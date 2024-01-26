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
import { Experiment } from 'src/lib/staged-exp/data-model';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements AfterViewInit {
  @ViewChild('googleButton') googleButton!: ElementRef<HTMLElement>;

  public error: string = '';

  public accessCode: string = '';
  public get accessCodeValue() {
    return this.accessCode;
  }
  public set accessCodeValue(s: string) {
    this.error = '';
    this.accessCode = s;
  }

  public experiments: Signal<Experiment[]>;

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    public dataService: SavedDataService,
    public authService: GoogleAuthService,
  ) {
    this.experiments = computed(() =>
      Object.values(this.dataService.data().experiments).sort((a, b) => a.name.localeCompare(b.name)),
    );

    effect(() => {
      document.title = `Experiment: ${this.dataService.appName()}`;
    });
  }

  joinExperiment() {
    const parts = this.accessCode.split(':');
    if (parts.length !== 3) {
      this.error = 'Bad access code';
    }
    const [experimentId, userId, accessCode] = parts;
  }

  ngAfterViewInit() {
    // TODO: enable this to login automatically when app starts.
    // also uncomment stuff in html.
    this.authService.prompt();
    this.authService.renderLoginButton(this.googleButton.nativeElement);
  }
}
