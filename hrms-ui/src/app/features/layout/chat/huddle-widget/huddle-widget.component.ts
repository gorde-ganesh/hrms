import {
  Component,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  AfterViewInit,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';
import { TooltipModule } from 'primeng/tooltip';
import { BadgeModule } from 'primeng/badge';
import { HuddleService } from '../../../../services/huddle.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-huddle-widget',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    AvatarModule,
    BadgeModule,
    TooltipModule,
  ],
  templateUrl: './huddle-widget.component.html',
  styleUrl: './huddle-widget.component.css',
})
export class HuddleWidgetComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('localVideo') localVideoElement?: ElementRef<HTMLVideoElement>;

  activeHuddle: any = null;
  participants: any[] = [];
  isMuted = false;
  isVideoEnabled = false;
  isExpanded = false;
  localStream: MediaStream | null = null;
  remoteStreams: Map<string, MediaStream> = new Map();

  private subscriptions: Subscription[] = [];
  public currentUserId = '';

  constructor(
    private huddleService: HuddleService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    const userInfo = JSON.parse(sessionStorage.getItem('userInfo') as string);
    this.currentUserId = userInfo?.id || '';

    this.subscriptions.push(
      this.huddleService.activeHuddle$.subscribe((huddle) => {
        console.log(huddle, '>>>>>');
        this.activeHuddle = huddle;
        if (huddle) {
          this.participants = huddle.members || [];
        }
        this.cdr.detectChanges();
      }),

      this.huddleService.isMuted$.subscribe((muted) => {
        this.isMuted = muted;
        this.cdr.detectChanges();
      }),

      this.huddleService.isVideoEnabled$.subscribe((enabled) => {
        console.log(enabled);
        this.isVideoEnabled = enabled;
        console.log(this.isVideoEnabled, 'videoenabled');
        this.cdr.detectChanges();
      }),

      this.huddleService.localStream$.subscribe((stream) => {
        this.localStream = stream;
        this.cdr.detectChanges();
      }),

      this.huddleService.remoteStreams$.subscribe((streams) => {
        this.remoteStreams = streams;
        this.cdr.detectChanges();
      })
    );
  }

  ngAfterViewInit() {
    // Video element binding is handled by [srcObject] in template
  }

  ngOnDestroy() {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  get remoteStreamsArray() {
    return Array.from(this.remoteStreams.entries()).map(([id, stream]) => ({
      id,
      stream,
    }));
  }

  get hasRemoteVideo(): boolean {
    return this.remoteStreamsArray.some((entry) =>
      this.hasVideoTrack(entry.stream)
    );
  }

  hasVideoTrack(stream: MediaStream): boolean {
    return stream.getVideoTracks().length > 0;
  }

  getParticipantName(userId: string): string {
    const participant = this.participants.find((p) => p.userId === userId);
    return participant?.user?.name || 'Unknown';
  }

  getInitial(name: string): string {
    return name ? name.charAt(0).toUpperCase() : '?';
  }

  toggleMute() {
    this.huddleService.toggleMute();
  }

  toggleVideo() {
    this.huddleService.toggleVideo();
  }

  toggleExpand() {
    this.isExpanded = !this.isExpanded;
  }

  leaveHuddle() {
    if (this.activeHuddle) {
      this.huddleService.leaveHuddle(this.activeHuddle.id, this.currentUserId);
    }
    this.cdr.detectChanges();
  }
}
