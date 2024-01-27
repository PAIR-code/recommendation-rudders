import { Component, Input, Signal, WritableSignal, computed, signal } from '@angular/core';
import { ChatAboutItems, ExpStageChatAboutItems, Message, fakeChat } from 'src/lib/staged-exp/data-model';
import { SavedDataService } from '../../services/saved-data.service';
import { ChatUserMessageComponent } from '../chat-user-message/chat-user-message.component';
import { ChatDiscussItemsMessageComponent } from '../chat-discuss-items-message/chat-discuss-items-message.component';
import { ChatMediatorMessageComponent } from '../chat-mediator-message/chat-mediator-message.component';
import { MediatorFeedbackComponent } from './../mediator-feedback/mediator-feedback.component';
import { MatFormField, MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-mediator-chat',
  standalone: true,
  imports: [ChatUserMessageComponent,
    ChatDiscussItemsMessageComponent,
    ChatMediatorMessageComponent,
    MediatorFeedbackComponent,
    MatFormFieldModule,
    FormsModule,
    MatButtonModule,
    MatInputModule,],
  templateUrl: './mediator-chat.component.html',
  styleUrl: './mediator-chat.component.scss'
})
export class MediatorChatComponent {
  roomName: WritableSignal<string> = signal('');

  @Input() 
  set chatRoomName(name: string) {
    this.roomName.set(name);
  }

  public messages: Signal<Message[]>;
  public message: string = '';

  constructor(private dataService: SavedDataService) {
    this.messages = computed(() => {
      if(this.roomName() === '') {
        return [];
      }
      const participant0 = Object.values(this.dataService.data().experiment.participants)[0];
      const chat = participant0.stageMap[this.roomName()].config as ChatAboutItems;
      return chat.messages;
    });
  }

  sendMessage() {
    this.dataService.sendMediatorMessage(this.message);
    this.message = '';
  }

}
