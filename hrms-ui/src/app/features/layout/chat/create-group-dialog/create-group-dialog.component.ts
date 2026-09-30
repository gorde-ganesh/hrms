import { ChangeDetectorRef, Component, EventEmitter, Output } from '@angular/core';
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

  @Output() created = new EventEmitter<any>();

  constructor(private chatService: ChatService, private cdr: ChangeDetectorRef) {}

  open(users: any[], currentUserId: string) {
    this.allUsers = users.filter((u) => u.id !== currentUserId);
    this.currentUserId = currentUserId;
    this.visible = true;
    this.groupName = '';
    this.selectedMembers = [];
  }

  submitting = false;

  async onCreate() {
    if (this.submitting || !this.groupName.trim() || this.selectedMembers.length === 0) return;
    this.submitting = true;

    const memberIds = [...this.selectedMembers, this.currentUserId];
    try {
      const response: any = await this.chatService.createGroupChat(
        memberIds,
        this.groupName.trim(),
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
    this.groupName = '';
    this.selectedMembers = [];
  }
}
