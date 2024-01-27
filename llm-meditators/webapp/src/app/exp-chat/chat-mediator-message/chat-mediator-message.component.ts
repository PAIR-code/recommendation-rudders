import { Component, Input, WritableSignal, signal } from '@angular/core';
import { ChatMediatorProfileComponent } from '../chat-mediator-profile/chat-mediator-profile.component';
import { MediatorMessage, fakeEmptyMediatorMessage } from 'src/lib/staged-exp/data-model';
import { SavedDataService } from 'src/app/services/saved-data.service';

@Component({
  selector: 'app-chat-mediator-message',
  standalone: true,
  imports: [ChatMediatorProfileComponent],
  templateUrl: './chat-mediator-message.component.html',
  styleUrl: './chat-mediator-message.component.scss'
})
export class ChatMediatorMessageComponent {
  @Input()
  set message(m: MediatorMessage) {
    this.mediatorMessage.set(m);
  }
  public mediatorMessage: WritableSignal<MediatorMessage> = signal(fakeEmptyMediatorMessage);
}
