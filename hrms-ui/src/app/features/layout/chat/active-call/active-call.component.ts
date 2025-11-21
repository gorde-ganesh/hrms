import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';
import { CallService } from '../../../../services/call.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-active-call',
  standalone: true,
  imports: [CommonModule, DialogModule, ButtonModule, AvatarModule],
  templateUrl: './active-call.component.html',
  styleUrl: './active-call.component.css',
})
export class ActiveCallComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('localVideo') localVideo!: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideo') remoteVideo!: ElementRef<HTMLVideoElement>;

  visible = false;
  activeCall: any = null;
  isVideoEnabled = true;
  isAudioEnabled = true;
  callDuration = '00:00';

  private subscriptions: Subscription[] = [];
  private callStartTime?: Date;
  private durationInterval?: any;

  constructor(private callService: CallService) {}

  ngOnInit() {
    this.subscriptions.push(
      this.callService.activeCall$.subscribe((call) => {
        if (call) {
          this.activeCall = call;
          this.visible = true;
          this.startCallTimer();
        } else {
          this.visible = false;
          this.activeCall = null;
          this.stopCallTimer();
        }
      }),

      this.callService.isVideoEnabled$.subscribe((enabled) => {
        this.isVideoEnabled = enabled;
      }),

      this.callService.isAudioEnabled$.subscribe((enabled) => {
        this.isAudioEnabled = enabled;
      })
    );
  }

  ngAfterViewInit() {
    this.subscriptions.push(
      this.callService.localStream$.subscribe((stream) => {
        if (stream && this.localVideo) {
          this.localVideo.nativeElement.srcObject = stream;
        }
      }),

      this.callService.remoteStream$.subscribe((stream) => {
        if (stream && this.remoteVideo) {
          this.remoteVideo.nativeElement.srcObject = stream;
        }
      })
    );
  }

  ngOnDestroy() {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
    this.stopCallTimer();
  }

  toggleVideo() {
    this.callService.toggleVideo();
  }

  toggleAudio() {
    this.callService.toggleAudio();
  }

  endCall() {
    this.callService.endCall();
  }

  private startCallTimer() {
    this.callStartTime = new Date();
    this.durationInterval = setInterval(() => {
      if (this.callStartTime) {
        const duration = Math.floor(
          (Date.now() - this.callStartTime.getTime()) / 1000
        );
        const minutes = Math.floor(duration / 60);
        const seconds = duration % 60;
        this.callDuration = `${minutes.toString().padStart(2, '0')}:${seconds
          .toString()
          .padStart(2, '0')}`;
      }
    }, 1000);
  }

  private stopCallTimer() {
    if (this.durationInterval) {
      clearInterval(this.durationInterval);
      this.durationInterval = null;
    }
    this.callDuration = '00:00';
  }
}
