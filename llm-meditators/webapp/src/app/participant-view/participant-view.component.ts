/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/
import { AfterViewInit, Component, ElementRef, Signal, ViewChild, computed, effect } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { SavedDataService } from '../services/saved-data.service';
import { ExpStageKind } from '../../lib/staged-exp/data-model';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatMenuModule } from '@angular/material/menu';
import { MatListModule } from '@angular/material/list';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-participant-view',
  standalone: true,
  imports: [MatIconModule, MatSidenavModule, MatMenuModule, MatListModule, RouterModule],
  templateUrl: './participant-view.component.html',
  styleUrl: './participant-view.component.scss',
})
export class ParticipantViewComponent {
  @ViewChild('googleButton') googleButton!: ElementRef<HTMLElement>;

  public currentStageKind: Signal<ExpStageKind>;
  public currentStageName: Signal<string>;
  public workingOnStageName: Signal<string>;

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    public dataService: SavedDataService,
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

  updateCurrentStageName(stageName: string) {
    console.log('updateViewingStageName', stageName);
    this.dataService.setCurrentExpStageName(stageName);
  }
}
