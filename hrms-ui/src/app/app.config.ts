import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeuix/themes/aura';
import { routes } from './app.routes';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { definePreset } from '@primeuix/themes';
import {
  provideHttpClient,
  withInterceptors,
  withInterceptorsFromDi,
} from '@angular/common/http';
import { apiInterceptor } from './interceptors/api.interceptor';
import { ConfirmationService, MessageService } from 'primeng/api';
import { DedupeMessageService } from './services/dedupe-message.service';
import { ValidationService } from './services/validation.service';
import { SpinnerService } from './services/spinner.service';
import { NotificationService } from './services/notification.service';

const MyPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '{teal.50}',
      100: '{teal.100}',
      200: '{teal.200}',
      300: '{teal.300}',
      400: '{teal.400}',
      500: '{teal.500}',
      600: '{teal.600}',
      700: '{teal.700}',
      800: '{teal.800}',
      900: '{teal.900}',
      950: '{teal.950}',
    },
    // Teal-700 gives white button text 5.5:1 contrast (WCAG AA)
    colorScheme: {
      light: {
        primary: {
          color: '{primary.700}',
          contrastColor: '#ffffff',
          hoverColor: '{primary.800}',
          activeColor: '{primary.900}',
        },
        highlight: {
          background: '{primary.50}',
          focusBackground: '{primary.100}',
          color: '{primary.800}',
          focusColor: '{primary.900}',
        },
      },
    },
  },
});

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: MessageService, useClass: DedupeMessageService },
    ValidationService,
    ConfirmationService,
    SpinnerService,
    NotificationService,
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideAnimationsAsync(),
    providePrimeNG({
      theme: {
        preset: MyPreset,
        options: {
          darkModeSelector: '.my-app-dark',
        },
      },
    }),
    provideHttpClient(withInterceptors([apiInterceptor])),
  ],
};
