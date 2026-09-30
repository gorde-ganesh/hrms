import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { ConfirmPopupModule } from 'primeng/confirmpopup';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastModule, ConfirmPopupModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected title = 'hrms-ui';
}
