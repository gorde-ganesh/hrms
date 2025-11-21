import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { ChatService } from '../../../../services/chat.service';

@Component({
  selector: 'app-create-group-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    MultiSelectModule,
  ],
  templateUrl: './create-group-dialog.component.html',
  styleUrl: './create-group-dialog.component.css',
})
export class CreateGroupDialogComponent {
  visible = false;
  groupName = '';
  selectedMembers: string[] = [];
  allUsers: any[] = [];
  currentUserId = '';

  constructor(private chatService: ChatService) {}

  open(users: any[], currentUserId: string) {
    this.allUsers = users.filter((u) => u.id !== currentUserId);
    this.currentUserId = currentUserId;
    this.visible = true;
    this.groupName = '';
    this.selectedMembers = [];
  }

  async onCreate() {
    if (!this.groupName || this.selectedMembers.length === 0) return;

    const memberIds = [...this.selectedMembers, this.currentUserId];

    const response: any = await this.chatService.createGroupChat(
      memberIds,
      this.groupName,
      this.currentUserId
    );
    console.log('Group created:', response.data);
    this.visible = false;
  }

  onCancel() {
    this.visible = false;
    this.groupName = '';
    this.selectedMembers = [];
  }
}
