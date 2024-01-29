import { Component, Input, Signal, computed } from '@angular/core';
import { AppStateService } from '../services/app-state.service';
import { Experiment } from 'src/lib/staged-exp/data-model';
import { GoogleAuthService, Credential } from '../services/google-auth.service';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatMenuModule } from '@angular/material/menu';
import { ExperimentMonitorComponent } from './experiment-monitor/experiment-monitor.component';
import { ExperimentSettingsComponent } from './experiment-settings/experiment-settings.component';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';

@Component({
  selector: 'app-experimenter-view',
  standalone: true,
  imports: [
    MatIconModule,
    MatSidenavModule,
    MatMenuModule,
    MatListModule,
    MatButtonModule,
    RouterModule,
    MatButtonModule,
    ExperimenterViewComponent,
    FormsModule,
    MatInputModule,
    MatFormFieldModule,
    RouterModule,
    ExperimentMonitorComponent,
    ExperimentSettingsComponent,
  ],
  templateUrl: './experimenter-view.component.html',
  styleUrl: './experimenter-view.component.scss',
})
export class ExperimenterViewComponent {
  public experiments: Signal<Experiment[]>;

  // credential: Credential;

  constructor(
    public stateService: AppStateService,
    // public authService: GoogleAuthService,
  ) {
    // const credential = this.authService.credential();
    // if (!credential) {
    //   throw new Error(`Not logged in, this component assumes you are logged in`);
    // }
    // this.credential = credential;

    this.experiments = computed(() => {
      console.log(this.stateService.data());
      return Object.values(this.stateService.data().experiments).sort((a, b) => {
        console.log(a);
        console.log(b);
        return a.name.localeCompare(b.name);
      });
    });
  }
}
