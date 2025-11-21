import { Component, inject } from '@angular/core';
import {
  Validators,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { CheckboxModule } from 'primeng/checkbox';
import { FloatLabelModule } from 'primeng/floatlabel';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ApiService } from '../../services/api-interface.service';
import { MessageModule } from 'primeng/message';
import { FormErrorDirective } from '../../directives/form-error.directive';
import { ValidationService } from '../../services/validation.service';
import { DividerModule } from 'primeng/divider';
import { CommonModule } from '@angular/common';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-login',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    FloatLabelModule,
    InputTextModule,
    ButtonModule,
    CardModule,
    CheckboxModule,
    PasswordModule,
    MessageModule,
    FormErrorDirective,
    DividerModule,
  ],
  templateUrl: './login.html',
  styleUrl: './login.css',
  standalone: true,
})
export class Login {
  error: string | null = null;
  isForwordPassword: boolean = false;
  tempToken: boolean = false;
  loginForm!: FormGroup;
  forgotPasswordForm!: FormGroup;
  changePasswordForm!: FormGroup;
  isLoading: boolean = false;

  private messageService = inject(MessageService);

  constructor(
    private fb: FormBuilder,
    private serverApi: ApiService,
    private router: Router,
    private validationService: ValidationService
  ) {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      remember: [false],
    });
    this.forgotPasswordForm = this.fb.group({
      username: ['', [Validators.required, Validators.email]],
    });
    this.changePasswordForm = this.fb.group(
      {
        newPassword: [
          '',
          [Validators.required, validationService.passwordValidator],
        ],
        confirmPassword: ['', [Validators.required]],
      },
      { validators: [this.validationService.matchPasswords] }
    );

    const rememberData = JSON.parse(
      localStorage.getItem('pw-rm-data') as string
    );

    if (rememberData?.username) {
      this.loginForm.controls['username'].setValue(rememberData.username);
      this.loginForm.controls['remember'].setValue(true);
    }
  }

  async onSubmit() {
    this.loginForm.markAllAsTouched();
    if (this.loginForm.invalid) return;

    this.error = null;
    this.isLoading = true;

    try {
      const { username, password, remember } = this.loginForm.value;

      // Only store email if remember me is checked
      if (remember) {
        localStorage.setItem(
          'pw-rm-data',
          JSON.stringify({ username, remember })
        );
      } else {
        localStorage.removeItem('pw-rm-data');
      }

      const login: {
        token: string;
        user_details: { email: string; name: string };
      } = await this.serverApi.post('/api/auth/login', {
        email: username,
        password,
      });

      sessionStorage.setItem('authToken', login.token);
      sessionStorage.setItem('userInfo', JSON.stringify(login.user_details));

      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Login successful! Welcome back.',
        life: 3000,
      });

      setTimeout(() => {
        this.router.navigate(['']);
      }, 500);
    } catch (error: any) {
      this.error = error?.error?.message || 'Login failed. Please try again.';
    } finally {
      this.isLoading = false;
    }
  }

  async onForgotPassword() {
    this.forgotPasswordForm.markAllAsTouched();
    if (!this.forgotPasswordForm.valid) return;

    this.error = null;
    this.isLoading = true;

    try {
      const { username } = this.forgotPasswordForm.value;

      await this.serverApi.post('/api/auth/forgot-password', {
        email: username,
      });

      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail:
          'Password reset link sent to your email. Please check your inbox.',
        life: 5000,
      });

      this.tempToken = true;
    } catch (error: any) {
      this.error =
        error?.error?.message || 'Failed to send reset link. Please try again.';
    } finally {
      this.isLoading = false;
    }
  }

  async onChangePassword() {
    this.changePasswordForm.markAllAsTouched();
    if (!this.changePasswordForm.valid) return;

    this.error = null;
    this.isLoading = true;

    try {
      const { confirmPassword } = this.changePasswordForm.value;

      await this.serverApi.post('/api/auth/change-password', {
        token: sessionStorage.getItem('tempToken'),
        newPassword: confirmPassword,
      });

      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail:
          'Password changed successfully! Please login with your new password.',
        life: 5000,
      });

      // Clear session and redirect to login
      sessionStorage.removeItem('tempToken');
      this.isForwordPassword = false;
      this.tempToken = false;
      this.changePasswordForm.reset();
    } catch (error: any) {
      this.error =
        error?.error?.message || 'Failed to change password. Please try again.';
    } finally {
      this.isLoading = false;
    }
  }

  onForgotPasswordClick() {
    this.isForwordPassword = !this.isForwordPassword;
    this.error = null;
  }
}
