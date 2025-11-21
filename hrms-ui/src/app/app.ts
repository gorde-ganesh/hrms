import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { ConfirmPopupModule } from 'primeng/confirmpopup';
import { NotificationService } from './services/notification.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastModule, ConfirmPopupModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  protected title = 'hrms-ui';

  constructor(private notificationService: NotificationService) {}

  ngOnInit(): void {
    const user = localStorage.getItem('user_details');
    if (user) {
      const userDetails = JSON.parse(user);
      this.notificationService.connect(userDetails.id);
    }
  }
}
