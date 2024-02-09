import { Component, Input, Signal, WritableSignal, computed, signal } from '@angular/core';
import {
  ChatAboutItems,
  ExpStageChatAboutItems,
  Item,
  ItemPair,
  Message,
  UserData,
  fakeChat,
} from 'src/lib/staged-exp/data-model';
import { AppStateService } from '../../services/app-state.service';
import { ChatUserMessageComponent } from '../../participant-view/participant-stage-view/exp-chat/chat-user-message/chat-user-message.component';
import { ChatDiscussItemsMessageComponent } from '../../participant-view/participant-stage-view/exp-chat/chat-discuss-items-message/chat-discuss-items-message.component';
import { ChatMediatorMessageComponent } from '../../participant-view/participant-stage-view/exp-chat/chat-mediator-message/chat-mediator-message.component';
import { MediatorFeedbackComponent } from '../../participant-view/participant-stage-view/exp-chat/mediator-feedback/mediator-feedback.component';
import { MatFormField, MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { sendMediatorGroupMessage, sendMediatorGroupRatingToDiscuss } from 'src/lib/staged-exp/app';
import { MatSelectChange, MatSelectModule } from '@angular/material/select';

@Component({
  selector: 'app-mediator-chat',
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
    MatSelectModule,
  ],
  templateUrl: './mediator-chat.component.html',
  styleUrl: './mediator-chat.component.scss',
})
export class MediatorChatComponent {
  roomName: WritableSignal<string> = signal('');

  @Input() experiment?: Signal<string>;
  @Input() participants?: Signal<UserData[]>;

  @Input()
  set chatRoomName(name: string) {
    this.roomName.set(name);
  }

  public messages: Signal<Message[]>;
  public message: string = '';

  public items: Signal<Item[]>;
  public itemPair: Signal<ItemPair>;
  public instructions: string = '';


  constructor(private appStateService: AppStateService) {
    this.messages = computed(() => {
      if (this.roomName() === '' || !this.experiment || !this.participants) {
        return [];
      }
      // TODO: think about how to show a merged view in cases when
      // partcipants have different views...
      const participant0 = this.participants()[0];
      const chat = participant0.stageMap[this.roomName()].config as ChatAboutItems;
      return chat.messages;
    });

    this.items = computed(() => {
      if (this.roomName() === '' || !this.experiment || !this.participants) {
        return [];
      }
      const participant0 = this.participants()[0];
      const chat = participant0.stageMap[this.roomName()].config as ChatAboutItems;
      return chat.items;
    });

    this.itemPair = computed(() => {
      return {item1: this.items()[0], item2: this.items()[1]};
    });

  }

  sendMessage() {
    if (!this.experiment) {
      throw new Error('Tried to send a message without knowing the experiment');
    }
    sendMediatorGroupMessage(this.appStateService.data, this.experiment(), {
      stageName: this.roomName(),
      message: this.message,
    });
    this.message = '';
  }

  updateItemPair(updatedValue: MatSelectChange, i: number) {
    if (i === 1) {
      this.itemPair().item1 = updatedValue.value;
    } else if (i === 2) {
      this.itemPair().item2 = updatedValue.value;
    }
    else {
      throw new Error('Only two items in one pair of item');
    }
  }

  sendRatingToDiscuss() {
    if (!this.experiment) {
      throw new Error('Tried to send a RatingToDiscuss without knowing the experiment');
    }
    sendMediatorGroupRatingToDiscuss(this.appStateService.data, this.experiment(), {
      stageName: this.roomName(),
      itemPair: this.itemPair(),
      message: this.instructions,
    });
  }

}
