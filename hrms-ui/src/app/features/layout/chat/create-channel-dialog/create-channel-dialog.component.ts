import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import { ChatService } from '../../../../services/chat.service';

@Component({
  selector: 'app-create-channel-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    CheckboxModule,
  ],
  templateUrl: './create-channel-dialog.component.html',
  styleUrl: './create-channel-dialog.component.css',
})
export class CreateChannelDialogComponent {
  visible = false;
  channelName = '';
  description = '';
  isPublic = true;
  currentUserId = '';

  constructor(private chatService: ChatService) {}

  open(currentUserId: string) {
    this.currentUserId = currentUserId;
    this.visible = true;
    this.channelName = '';
    this.description = '';
    this.isPublic = true;
  }

  async onCreate() {
    if (!this.channelName) return;

    const response: any = await this.chatService.createChannel(
      this.channelName,
      this.description,
      this.isPublic,
      this.currentUserId
    );
    console.log('Channel created:', response.data);
    this.visible = false;
  }

  onCancel() {
    this.visible = false;
    this.channelName = '';
    this.description = '';
    this.isPublic = true;
  }
}
