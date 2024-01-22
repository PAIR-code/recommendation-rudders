import { Component, Input } from '@angular/core';
import { UserMessage } from 'src/lib/staged-exp/data-model';

@Component({
  selector: 'app-chat-user-message',
  standalone: true,
  imports: [],
  templateUrl: './chat-user-message.component.html',
  styleUrl: './chat-user-message.component.scss',
})
export class ChatUserMessageComponent {
  @Input() message!: UserMessage;

  constructor() {}
}
