import { Component, Input, Signal, WritableSignal, computed, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterModule } from '@angular/router';
import { AppStateService } from 'src/app/services/app-state.service';
import { GoogleAuthService } from 'src/app/services/google-auth.service';
import { Experiment, UserData } from 'src/lib/staged-exp/data-model';

@Component({
  selector: 'app-experiment-monitor',
  standalone: true,
  imports: [RouterModule, RouterLink, RouterLinkActive],
  templateUrl: './experiment-monitor.component.html',
  styleUrl: './experiment-monitor.component.scss',
})
export class ExperimentMonitorComponent {
  public experiments: Signal<Experiment[]>;

  public experimentName: WritableSignal<string> = signal('');
  public participants: Signal<UserData[]>;

  @Input()
  set experiment(name: string) {
    this.experimentName.set(name);
  }

  constructor(
    public stateService: AppStateService,
    public authService: GoogleAuthService,
  ) {
    this.participants = computed(() => {
      console.log('experimentName:', this.experimentName());
      if (!(this.experimentName() in this.stateService.data().experiments)) {
        return [];
      }
      const exp = this.stateService.data().experiments[this.experimentName()];
      return Object.values(exp.participants);
    });

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
