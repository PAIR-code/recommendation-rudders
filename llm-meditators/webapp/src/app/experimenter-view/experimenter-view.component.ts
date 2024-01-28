import { Component, Input, Signal, computed } from '@angular/core';
import { AppStateService } from '../services/app-state.service';
import { Experiment } from 'src/lib/staged-exp/data-model';
import { GoogleAuthService, Credential } from '../services/google-auth.service';

@Component({
  selector: 'app-experimenter-view',
  standalone: true,
  imports: [],
  templateUrl: './experimenter-view.component.html',
  styleUrl: './experimenter-view.component.scss',
})
export class ExperimenterViewComponent {
  public experiments: Signal<Experiment[]>;

  @Input() credential!: Credential;

  constructor(
    public stateService: AppStateService,
    public authService: GoogleAuthService,
  ) {
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
