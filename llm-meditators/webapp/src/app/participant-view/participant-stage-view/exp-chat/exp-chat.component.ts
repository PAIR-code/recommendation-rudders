/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { Component, Signal, computed } from '@angular/core';
import { ChatAboutItems, ItemPair, Message, StageKinds, UserData } from 'src/lib/staged-exp/data-model';
import { AppStateService } from '../../../services/app-state.service';
import { ChatUserMessageComponent } from './chat-user-message/chat-user-message.component';
import { ChatDiscussItemsMessageComponent } from './chat-discuss-items-message/chat-discuss-items-message.component';
import { ChatMediatorMessageComponent } from './chat-mediator-message/chat-mediator-message.component';
import { MediatorFeedbackComponent } from './mediator-feedback/mediator-feedback.component';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { Participant } from 'src/lib/staged-exp/participant';
import { ChatUserProfileComponent } from './chat-user-profile/chat-user-profile.component';
import { ScrollingModule } from '@angular/cdk/scrolling';
@Component({
  selector: 'app-exp-chat',
  standalone: true,
  imports: [
    ChatUserMessageComponent,
    ChatDiscussItemsMessageComponent,
    ChatMediatorMessageComponent,
    ChatUserProfileComponent,
    MediatorFeedbackComponent,
    MatFormFieldModule,
    FormsModule,
    MatButtonModule,
    MatInputModule,
    ScrollingModule,
  ],
  templateUrl: './exp-chat.component.html',
  styleUrl: './exp-chat.component.scss',
})
export class ExpChatComponent {
  public messages: Signal<Message[]>;
  public stageData: Signal<ChatAboutItems>;
  public message: string = '';

  public participant: Participant;
  public otherParticipants: Signal<UserData[]>;
  public everyoneReachedTheChat: Signal<boolean>;
  public ratingsToDiscuss: Signal<ItemPair[]>;
  public currentRatingsToDiscuss: Signal<ItemPair>;

  constructor(stateService: AppStateService) {
    const { participant, stageData } = stateService.getParticipantAndStage(StageKinds.groupChat);
    this.stageData = stageData;
    this.participant = participant;

    this.messages = computed(() => {
      return this.stageData().messages;
    });

    this.otherParticipants = computed(() => {
      const thisUserId = this.participant.userData().userId;
      const allUsers = Object.values(this.participant.experiment().participants);
      return allUsers.filter((u) => u.userId !== thisUserId);
    });

    this.everyoneReachedTheChat = computed(() => {
      const users = Object.values(this.participant.experiment().participants);
      return users.map((userData) => userData.workingOnStageName).every((n) => n === this.participant.userData().workingOnStageName);
    });

    this.ratingsToDiscuss = computed(() => {
      return this.stageData().ratingsToDiscuss;
    });

    this.currentRatingsToDiscuss = computed(() => {
      // last item in the array
      return this.ratingsToDiscuss()[this.ratingsToDiscuss().length - 1];
    });

  }

  sendMessage() {
    this.participant.sendMessage(this.message);
    this.message = '';
  }
}
