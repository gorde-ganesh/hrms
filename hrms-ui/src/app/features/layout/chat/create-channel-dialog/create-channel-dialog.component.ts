import { ChangeDetectorRef, Component, EventEmitter, Output } from '@angular/core';
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

  @Output() created = new EventEmitter<any>();

  constructor(private chatService: ChatService, private cdr: ChangeDetectorRef) {}

  open(currentUserId: string) {
    this.currentUserId = currentUserId;
    this.visible = true;
    this.channelName = '';
    this.description = '';
    this.isPublic = true;
  }

  submitting = false;

  async onCreate() {
    if (this.submitting || !this.channelName.trim()) return;
    this.submitting = true;
    try {
      const response: any = await this.chatService.createChannel(
        this.channelName.trim(),
        this.description,
        this.isPublic,
        this.currentUserId
      );
      this.visible = false;
      this.created.emit(response);
    } finally {
      this.submitting = false;
      this.cdr.detectChanges();
    }
  }

  onCancel() {
    this.visible = false;
    this.channelName = '';
    this.description = '';
    this.isPublic = true;
  }
}
