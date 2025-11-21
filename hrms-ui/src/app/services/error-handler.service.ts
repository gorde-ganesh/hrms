import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';

export interface ErrorMessage {
  status: number;
  message: string;
  error: { code: string; message: string; data: string };
}

@Injectable({
  providedIn: 'root',
})
export class ErrorHandlerService {
  constructor(private messageService: MessageService, private router: Router) {}

  handle(error: HttpErrorResponse): void {
    const status = error.status;
    console.log('ErrorHandlerService:', error);

    // Handle offline/network errors
    if (status === 0) {
      this.show('Network error. Please check your internet connection.');
      return;
    }

    // Handle custom error structure
    const message = error.error?.message || this.getDefaultMessage(status);

    if (status === 401) {
      this.show(message);
      // Clear tokens on unauthorized
      sessionStorage.removeItem('authToken');
      sessionStorage.removeItem('userInfo');
      localStorage.removeItem('authToken');
      this.router.navigate(['/login']);
      return;
    }

    if (status === 403) {
      this.show(message || 'Access forbidden. You do not have permission.');
      return;
    }

    if (status === 404) {
      this.show(message || 'Resource not found.');
      return;
    }

    if (status >= 500) {
      this.show(message || 'Server error. Please try again later.');
      return;
    }

    this.show(message);
  }

  private getDefaultMessage(status: number): string {
    switch (status) {
      case 400:
        return 'Bad request. Please check your input.';
      case 401:
        return 'Session expired. Please login again.';
      case 403:
        return 'Access forbidden.';
      case 404:
        return 'Resource not found.';
      case 500:
        return 'Internal server error.';
      default:
        return 'An error occurred. Please try again.';
    }
  }

  private show(error: string): void {
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: error,
      life: 3000,
    });
  }
}
