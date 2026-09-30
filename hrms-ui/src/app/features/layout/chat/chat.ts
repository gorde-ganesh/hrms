import { MessageService } from 'primeng/api';
import {
  Component,
  ElementRef,
  ViewChild,
  OnInit,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BadgeModule } from 'primeng/badge';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { ScrollPanelModule } from 'primeng/scrollpanel';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { AvatarModule } from 'primeng/avatar';
import { TooltipModule } from 'primeng/tooltip';

import { ChatService } from '../../../services/chat.service';
import { HuddleService } from '../../../services/huddle.service';
import { CallService } from '../../../services/call.service';
import { AuthStateService } from '../../../services/auth-state.service';

import { CreateGroupDialogComponent } from './create-group-dialog/create-group-dialog.component';
import { CreateChannelDialogComponent } from './create-channel-dialog/create-channel-dialog.component';
import { ChannelBrowserComponent } from './channel-browser/channel-browser.component';
import { IncomingCallDialogComponent } from './incoming-call-dialog/incoming-call-dialog.component';
import { ActiveCallComponent } from './active-call/active-call.component';
import { HuddleWidgetComponent } from './huddle-widget/huddle-widget.component';
import { TabsModule } from 'primeng/tabs';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ScrollPanelModule,
    BadgeModule,
    CardModule,
    InputTextModule,
    DialogModule,
    ButtonModule,
    TabsModule,
    MenuModule,
    AvatarModule,
    TooltipModule,
    CreateGroupDialogComponent,
    CreateChannelDialogComponent,
    ChannelBrowserComponent,
    IncomingCallDialogComponent,
    ActiveCallComponent,
    HuddleWidgetComponent,
  ],
  templateUrl: './chat.html',
  styleUrl: './chat.css',
})
export class Chat implements OnInit {
  @ViewChild('messageInput') messageInput!: ElementRef;
  @ViewChild('createGroupDialog')
  createGroupDialog!: CreateGroupDialogComponent;
  @ViewChild('createChannelDialog')
  createChannelDialog!: CreateChannelDialogComponent;
  @ViewChild('channelBrowser') channelBrowser!: ChannelBrowserComponent;

  currentUser = { id: '', name: '' };
  selectedChat: any = null;
  conversations: any[] = [];
  messages: any[] = [];
  newMessage = '';
  allUsers: any[] = [];
  showUserList = false;
  activeTab = 0; // 0: DMs, 1: Groups, 2: Channels

  constructor(
    private chatService: ChatService,
    public huddleService: HuddleService,
    public callService: CallService,
    private cdr: ChangeDetectorRef,
    private authState: AuthStateService,
    private messageService: MessageService
  ) {}

  onlineUserIds = new Set<string>();

  isOnline(conv: any): boolean {
    const other = conv?.members?.find((m: any) => m.userId !== this.currentUser?.id);
    return !!other && this.onlineUserIds.has(other.userId);
  }

  timeAgo(value: string | Date | null | undefined): string {
    if (!value) return '';
    const secs = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
    if (secs < 60) return 'now';
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  }

  ngOnInit() {
    const userInfo = this.authState.userInfo;
    this.currentUser = userInfo as any;

    this.loadUsers();
    this.loadConversations();

    // Register user for real-time updates
    this.chatService.registerUser(this.currentUser.id);
    this.chatService.listenForMessages();
    this.chatService.listenForTyping();
    this.chatService.listenForOnlineStatus();
    this.huddleService.huddleChanged$.subscribe(() => this.loadConversations());
    this.chatService.onlineUsers$.subscribe((ids) => {
      this.onlineUserIds = new Set(ids);
      this.cdr.markForCheck();
    });

    // Update messages in real-time
    this.chatService.messages$.subscribe((msgs) => {
      if (this.selectedChat) {
        const currentIds = new Set(this.messages.map((m) => m.id));
        const relevantMsgs = msgs.filter(
          (m) => m.conversationId === this.selectedChat.id
        );

        let added = false;
        relevantMsgs.forEach((msg) => {
          if (!currentIds.has(msg.id)) {
            this.messages.push(msg);
            added = true;
          }
        });

        if (added) {
          this.cdr.detectChanges();
        }
      }
      // Refresh conversations list to show latest message
      this.loadConversations();
    });
  }

  get filteredConversations() {
    if (!this.conversations || !Array.isArray(this.conversations)) {
      return [];
    }

    if (this.activeTab === 0) {
      return this.conversations.filter(
        (c) => !c.isGroup && c.channelType === 'DM'
      );
    } else if (this.activeTab === 1) {
      return this.conversations.filter(
        (c) => c.isGroup && c.channelType === 'GROUP'
      );
    } else {
      return this.conversations.filter(
        (c) =>
          c.channelType === 'PUBLIC_CHANNEL' ||
          c.channelType === 'PRIVATE_CHANNEL'
      );
    }
  }

  async loadConversations() {
    try {
      const response: any = await this.chatService.getUserConversations(
        this.currentUser.id
      );

      this.conversations = response || [];
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error loading conversations:', error);
      this.conversations = [];
    }
  }

  async loadUsers() {
    try {
      const response: any = await this.chatService.getAllUsers();
      this.allUsers = (response || []).filter(
        (u: any) => u.id !== this.currentUser.id
      );
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error loading users:', error);
      this.allUsers = [];
    }
  }

  async startNewChat(otherUserId: string) {
    try {
      const response: any = await this.chatService.startConversation(
        this.currentUser.id,
        otherUserId
      );
      this.handleConversationCreated(response);
      this.showUserList = false;
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error starting conversation:', error);
    }
  }

  /** A group/channel was just created: refresh the list and open it. */
  async onConversationAdded(created: any) {
    await this.loadConversations();
    const conv = this.conversations.find((c) => c.id === created?.id);
    if (conv) await this.openConversation(conv);
    this.cdr.detectChanges();
  }

  handleConversationCreated(conversation: any) {
    this.selectedChat = conversation;

    const exists = this.conversations.find((c) => c.id === conversation.id);
    if (!exists) {
      this.conversations.unshift(conversation);
    }

    this.openConversation(conversation);
  }

  async openConversation(conv: any) {
    this.selectedChat = conv;
    try {
      const response: any = await this.chatService.getMessages(conv.id);
      // API returns { messages, nextCursor }
      this.messages = Array.isArray(response) ? response : response?.messages ?? [];
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error loading messages:', error);
      this.messages = [];
    }
  }

  async sendMessage() {
    if (!this.newMessage.trim() || !this.selectedChat) return;

    const messageData = {
      senderId: this.currentUser.id,
      conversationId: this.selectedChat.id,
      messageText: this.newMessage.trim(),
      messageType: 'text',
      createdAt: new Date().toISOString(),
      sender: {
        id: this.currentUser.id,
        name: this.currentUser.name,
      },
    };

    try {
      const response: any = await this.chatService.sendMessage(messageData);
      this.newMessage = '';

      if (Array.isArray(response)) {
        this.messages = response;
      } else {
        this.messages.push(response);
      }

      this.cdr.detectChanges();
      // Sidebar preview/time come from the conversation list, which only refreshed on socket events
      this.loadConversations();
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }

  getReceiverId(): string {
    if (this.selectedChat?.isGroup || this.selectedChat?.channelType !== 'DM')
      return '';

    const member = this.selectedChat?.members?.find(
      (m: any) => m.userId !== this.currentUser.id
    );
    return member?.userId || '';
  }

  getChatName(conv: any): string {
    if (
      conv.isGroup ||
      conv.channelType === 'PUBLIC_CHANNEL' ||
      conv.channelType === 'PRIVATE_CHANNEL'
    ) {
      return conv.name || 'Unnamed Group';
    }

    const member = conv?.members?.find(
      (m: any) => m.userId !== this.currentUser.id
    );
    return member?.user?.name || 'Unknown User';
  }

  getChatInitial(conv: any): string {
    return this.getChatName(conv).charAt(0).toUpperCase();
  }

  // Dialog Openers
  openCreateGroup() {
    this.createGroupDialog.open(this.allUsers, this.currentUser.id);
  }

  openCreateChannel() {
    this.createChannelDialog.open(this.currentUser.id);
  }

  openChannelBrowser() {
    const joinedIds = this.conversations
      .filter((c) => c.channelType === 'PUBLIC_CHANNEL')
      .map((c) => c.id);
    this.channelBrowser.open(this.currentUser.id, joinedIds);
  }

  private huddleError(action: string, err: any) {
    const denied = err?.name === 'NotAllowedError' || err?.name === 'NotFoundError';
    this.messageService.add({
      severity: 'error',
      summary: `Could not ${action} huddle`,
      detail: denied
        ? 'Microphone access is needed. Allow it in the browser and try again.'
        : err?.message ?? 'Something went wrong.',
    });
  }

  async startHuddle() {
    if (!this.selectedChat) return;
    try {
      await this.huddleService.startHuddle(this.selectedChat.id, this.currentUser.id);
      await this.loadConversations();
    } catch (err) {
      this.huddleError('start', err);
    }
  }

  async joinHuddle() {
    if (!this.selectedChat) return;
    try {
      await this.huddleService.joinHuddle(this.selectedChat.id, this.currentUser.id);
    } catch (err) {
      this.huddleError('join', err);
    }
  }

  isMyMessage(msg: any): boolean {
    if (!msg || !this.currentUser) return false;

    return (
      msg.senderId === this.currentUser.id ||
      msg.sender?.id === this.currentUser.id
    );
  }
}
