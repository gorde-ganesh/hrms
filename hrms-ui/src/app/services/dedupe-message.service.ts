import { Injectable } from '@angular/core';
import { MessageService, ToastMessageOptions } from 'primeng/api';

/**
 * The HTTP interceptor already toasts every failed request with the server's message, and many
 * components also toast in their own catch blocks. Keep the first error toast and drop any
 * further error toast that follows within a short window, so users see one message per failure.
 */
@Injectable()
export class DedupeMessageService extends MessageService {
  private static readonly WINDOW_MS = 1500;
  private lastErrorAt = 0;

  override add(message: ToastMessageOptions): void {
    if (message.severity === 'error') {
      const now = Date.now();
      if (now - this.lastErrorAt < DedupeMessageService.WINDOW_MS) return;
      this.lastErrorAt = now;
    }
    super.add(message);
  }
}
