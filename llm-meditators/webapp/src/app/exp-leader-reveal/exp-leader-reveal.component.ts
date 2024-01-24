import { Component, Signal, computed } from '@angular/core';
import { SavedDataService } from '../services/saved-data.service';

@Component({
  selector: 'app-exp-leader-reveal',
  standalone: true,
  imports: [],
  templateUrl: './exp-leader-reveal.component.html',
  styleUrl: './exp-leader-reveal.component.scss',
})
export class ExpLeaderRevealComponent {
  public everyoneReachedTheEnd: Signal<boolean>;

  constructor(private dataService: SavedDataService) {
    this.everyoneReachedTheEnd = computed(() => {
      const users = Object.values(this.dataService.data().experiment.participants);
      return users.map((userData) => userData.futureStageNames.length).every((n) => n === 0);
    });
  }
}
