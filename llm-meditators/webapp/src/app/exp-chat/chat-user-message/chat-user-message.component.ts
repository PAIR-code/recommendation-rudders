import { Component, Input, Signal, WritableSignal, computed, signal } from '@angular/core';
import { SavedDataService } from 'src/app/services/saved-data.service';
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
    this.userMessage.set(m);
  }
  public profile: Signal<UserProfile>;
  public userMessage: WritableSignal<UserMessage> = signal(fakeEmptyMessage);
  public dateMessage: Signal<Date>;

  constructor(private dataService: SavedDataService) {
    this.profile = computed(() => {
      const m = this.userMessage();
      if (m.userId === FAKE_EMPTY_USERID) {
        return fakeEmptyProfile;
      }
      return this.dataService.data().experiment.participants[m.userId].profile;
    });
    this.dateMessage = computed(() => {
      const m = this.userMessage();
      return new Date(m.timestamp);
    }); 
  }
}
