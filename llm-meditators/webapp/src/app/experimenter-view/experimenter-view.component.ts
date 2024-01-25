import { Component, Signal } from '@angular/core';
import { SavedDataService, StageState } from '../services/saved-data.service';
import { STAGE_KIND_CHAT } from 'src/lib/staged-exp/data-model';
import { MediatorChatComponent } from '../exp-chat/mediator-chat/mediator-chat.component';

@Component({
  selector: 'app-experimenter-view',
  standalone: true,
  imports: [ MediatorChatComponent ],
  templateUrl: './experimenter-view.component.html',
  styleUrl: './experimenter-view.component.scss'
})
export class ExperimenterViewComponent {
  public stageStates: Signal<StageState[]>;

  readonly STAGE_KIND_CHAT = STAGE_KIND_CHAT;

  constructor(
    private dataService: SavedDataService,
  ) {
    this.stageStates = this.dataService.stageStates;
  }

}
