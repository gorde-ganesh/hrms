import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { BadgeModule } from 'primeng/badge';
import { ChatService } from '../../../../services/chat.service';

@Component({
  selector: 'app-channel-browser',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    BadgeModule,
  ],
  templateUrl: './channel-browser.component.html',
  styleUrl: './channel-browser.component.css',
})
export class ChannelBrowserComponent implements OnInit {
  visible = false;
  channels: any[] = [];
  searchQuery = '';
  currentUserId = '';
  joinedChannelIds: Set<string> = new Set();

  constructor(private chatService: ChatService) {}

  ngOnInit() {}

  get filteredChannels() {
    if (!this.searchQuery) return this.channels;

    const query = this.searchQuery.toLowerCase();
    return this.channels.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.description?.toLowerCase().includes(query)
    );
  }

  open(currentUserId: string, joinedChannelIds: string[]) {
    this.currentUserId = currentUserId;
    this.joinedChannelIds = new Set(joinedChannelIds);
    this.visible = true;
    this.loadChannels();
  }

  async loadChannels() {
    const response: any = await this.chatService.getPublicChannels();
    this.channels = response.data;
    console.log('Channels loaded:', this.channels);
  }

  isJoined(channel: any): boolean {
    return this.joinedChannelIds.has(channel.id);
  }

  async joinChannel(channel: any) {
    const response: any = await this.chatService.joinChannel(
      channel.id,
      this.currentUserId
    );
    console.log('Joined channel:', response.data);
    this.joinedChannelIds.add(channel.id);
  }

  onClose() {
    this.visible = false;
    this.searchQuery = '';
  }
}
