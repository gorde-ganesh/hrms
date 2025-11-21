import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';
import { CallService } from '../../../../services/call.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-incoming-call-dialog',
  standalone: true,
  imports: [CommonModule, DialogModule, ButtonModule, AvatarModule],
  templateUrl: './incoming-call-dialog.component.html',
  styleUrl: './incoming-call-dialog.component.css',
})
export class IncomingCallDialogComponent implements OnInit, OnDestroy {
  visible = false;
  incomingCall: any = null;
  private subscription?: Subscription;

  constructor(private callService: CallService) {}

  ngOnInit() {
    this.subscription = this.callService.incomingCall$.subscribe((call) => {
      if (call) {
        this.incomingCall = call;
        this.visible = true;
      } else {
        this.visible = false;
        this.incomingCall = null;
      }
    });
  }

  ngOnDestroy() {
    this.subscription?.unsubscribe();
  }

  getInitial(name: string): string {
    return name ? name.charAt(0).toUpperCase() : '?';
  }

  accept() {
    if (this.incomingCall) {
      this.callService.answerCall(this.incomingCall.callId);
    }
  }

  decline() {
    this.callService.rejectCall();
  }
}
