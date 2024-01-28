import { Component, Input, Signal, WritableSignal, computed, signal } from '@angular/core';
import { AppStateService } from 'src/app/services/app-state.service';
import {
  FAKE_EMPTY_USERID,
  UserMessage,
  UserProfile,
  fakeEmptyMessage,
  fakeEmptyProfile,
} from 'src/lib/staged-exp/data-model';
import { ChatUserProfileComponent } from '../chat-user-profile/chat-user-profile.component';

@Component({
  selector: 'app-chat-user-message',
  standalone: true,
  imports: [ChatUserProfileComponent],
  templateUrl: './chat-user-message.component.html',
  styleUrl: './chat-user-message.component.scss',
})
export class ChatUserMessageComponent {
  @Input()
  set message(m: UserMessage) {
    this.userMessage = m;
  }
  public userMessage!: UserMessage;

  constructor() {}
}
