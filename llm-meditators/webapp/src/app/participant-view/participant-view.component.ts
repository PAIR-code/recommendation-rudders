/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  Signal,
  ViewChild,
  computed,
  effect,
} from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AppStateService } from '../services/app-state.service';
import { ExpStageKind } from '../../lib/staged-exp/data-model';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatMenuModule } from '@angular/material/menu';
import { MatListModule } from '@angular/material/list';
import { RouterModule } from '@angular/router';
import { APPSTATE_PARTICIPANT, makeRouteLinkedParticipant } from 'src/lib/app';
import { Participant } from 'src/lib/participant';
import { ParticipantStageViewComponent } from '../participant-stage-view/participant-stage-view.component';

@Component({
  selector: 'app-participant-view',
  standalone: true,
  imports: [
    MatIconModule,
    MatSidenavModule,
    MatMenuModule,
    MatListModule,
    RouterModule,
    ParticipantStageViewComponent,
  ],
  templateUrl: './participant-view.component.html',
  styleUrl: './participant-view.component.scss',
})
export class ParticipantViewComponent implements OnDestroy {
  @ViewChild('googleButton') googleButton!: ElementRef<HTMLElement>;
  // public currentUserIdControl: FormControl<string | null>;

  participant: Participant;

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    public stateService: AppStateService,
  ) {
    this.participant = makeRouteLinkedParticipant(router, route, stateService.data);
    stateService.state.set({ kind: APPSTATE_PARTICIPANT, particpant: this.participant });

    effect(() => {
      // document.querySelector('title')!.textContent =
      //   this.dataService.appName();
      document.title = `Experiment: ${this.stateService.appName()}`;
    });

    // this.usersList = Object.values(this.dataService.data().experiment.participants).map(
    //   ({ userId }) => userId,
    // );

    // this.currentUserIdControl = new FormControl<string | null>(
    //   this.dataService.data().currentUserId,
    // );
    // this.currentUserIdControl.valueChanges.forEach((n) => {
    //   if (n) {
    //     this.dataService.setCurrentUserId(n);
    //   }
    // });
  }

  // setCurrentUser(event: { value: string }) {
  //   this.dataService.setCurrentUserId(event.value);
  // }

  updateCurrentStageName(stageName: string) {
    this.participant.setViewingStage(stageName);
    // console.log('updateViewingStageName', stageName);
    // this.dataService.setCurrentExpStageName(stageName);
  }

  ngOnDestroy(): void {
    if (this.participant.destory) {
      this.participant.destory();
    }
  }
}
