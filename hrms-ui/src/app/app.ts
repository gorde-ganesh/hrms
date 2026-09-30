import { Component } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { ButtonModule } from 'primeng/button';
import { ConfirmPopupModule } from 'primeng/confirmpopup';
import { MessageService, SharedModule } from 'primeng/api';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastModule, ConfirmPopupModule, ButtonModule, SharedModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected title = 'hrms-ui';

  constructor(private router: Router, private messageService: MessageService) {}

  joinHuddle(message: { data?: { conversationId?: string } }) {
    const conversationId = message?.data?.conversationId;
    if (!conversationId) return;
    this.messageService.clear();
    this.router.navigate(['/chat'], { queryParams: { huddle: conversationId } });
  }
}
