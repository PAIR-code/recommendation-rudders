/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { Component, ElementRef, OnInit, ViewChild, effect } from '@angular/core';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import { SavedDataService } from './saved-data.service';
import { GoogleAuthService } from './google-auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  public loc: 'home' | 'llm-config' | 'prompts' = 'home';

  @ViewChild('googleButton') googleButton!: ElementRef;

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    public dataService: SavedDataService,
    public authService: GoogleAuthService
  ) {
    effect(() => {
      // document.querySelector('title')!.textContent =
      //   this.dataService.appName();
      document.title = `Rudders: ${this.dataService.appName()}`;
    });
  }

  ngOnInit() {

  }

  ngAfterViewInit() {
    this.authService.prompt();
    // @ts-ignore
    google.accounts.id.renderButton(
      this.googleButton.nativeElement,
      {
        theme: "outline",
        // type: "icon",
        size: "medium",
        width: "215",
      }
    );
  }

  // async handleCredentialResponse(response: any) {
  //   // Here will be your response from Google.
  //   // this.ngZone.run(() => this.localVariable = "newValue");
  //   console.log(response);
  // }

  // console.log('ngOnInit');
  // this.route.fragment.subscribe(f => console.log(f));
  // this.route.queryParams.subscribe(params => console.log(params));

  // // this.route.outlet .subscribe(f => console.log(f));
  // console.log('this.router.routerState.root');

}
