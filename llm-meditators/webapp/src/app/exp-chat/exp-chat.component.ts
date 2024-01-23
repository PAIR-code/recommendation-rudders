/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { Component, Signal, computed } from '@angular/core';
import { ExpStageChatAboutItems, Message, fakeChat } from 'src/lib/staged-exp/data-model';
import { SavedDataService } from '../services/saved-data.service';
import { ChatUserMessageComponent } from './chat-user-message/chat-user-message.component';
import { ChatDiscussItemsMessageComponent } from './chat-discuss-items-message/chat-discuss-items-message.component';
import { ChatMediatorMessageComponent } from './chat-mediator-message/chat-mediator-message.component';
import { MediatorFeedbackComponent } from './mediator-feedback/mediator-feedback.component';
import { MatFormField, MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-exp-chat',
  standalone: true,
  imports: [
    ChatUserMessageComponent,
    ChatDiscussItemsMessageComponent,
    ChatMediatorMessageComponent,
    MediatorFeedbackComponent,
    MatFormFieldModule,
    FormsModule,
    MatButtonModule,
    MatInputModule,
  ],
  templateUrl: './exp-chat.component.html',
  styleUrl: './exp-chat.component.scss',
})
export class ExpChatComponent {
  public messages: Signal<Message[]>;
  public curStage: Signal<ExpStageChatAboutItems>;
  public message: string = '';

  constructor(private dataService: SavedDataService) {
    this.curStage = computed(() => {
      const currentStage = this.dataService.currentStage();
      if (currentStage.kind !== 'group-chat') {
        throw new Error(`Bad stage kind for group-chat component: ${currentStage.kind}`);
        return fakeChat;
      }
      return currentStage;
    });

    this.messages = computed(() => {
      return this.curStage().config.messages;
    });
  }

  sendMessage() {
    this.dataService.sendMessage(this.message, this.curStage().name);
    this.message = '';
  }
}
