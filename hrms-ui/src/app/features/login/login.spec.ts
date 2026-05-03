import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { Login } from './login';
import { ApiService } from '../../services/api-interface.service';
import { AuthStateService } from '../../services/auth-state.service';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ValidationService } from '../../services/validation.service';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

const mockApi = { post: jasmine.createSpy('post') };
const mockAuthState = { set: jasmine.createSpy('set') };
const mockRouter = { navigate: jasmine.createSpy('navigate') };
const mockMessageService = { add: jasmine.createSpy('add') };

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;

  beforeEach(async () => {
    mockApi.post.calls.reset();
    mockAuthState.set.calls.reset();
    mockRouter.navigate.calls.reset();
    mockMessageService.add.calls.reset();

    await TestBed.configureTestingModule({
      imports: [Login, NoopAnimationsModule],
      providers: [
        ValidationService,
        { provide: ApiService, useValue: mockApi },
        { provide: AuthStateService, useValue: mockAuthState },
        { provide: Router, useValue: mockRouter },
        { provide: MessageService, useValue: mockMessageService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('loginForm should be invalid when empty', () => {
    expect(component.loginForm.invalid).toBeTrue();
  });

  it('loginForm should be invalid with bad email', () => {
    component.loginForm.setValue({ username: 'notanemail', password: 'Secret1!', remember: false });
    expect(component.loginForm.invalid).toBeTrue();
    expect(component.loginForm.get('username')?.errors?.['email']).toBeTruthy();
  });

  it('loginForm should be invalid with short password', () => {
    component.loginForm.setValue({ username: 'a@b.com', password: '123', remember: false });
    expect(component.loginForm.invalid).toBeTrue();
    expect(component.loginForm.get('password')?.errors?.['minlength']).toBeTruthy();
  });

  it('loginForm should be valid with correct credentials', () => {
    component.loginForm.setValue({ username: 'user@example.com', password: 'Secret1!', remember: false });
    expect(component.loginForm.valid).toBeTrue();
  });

  it('onSubmit() should not call API when form is invalid', fakeAsync(async () => {
    component.loginForm.setValue({ username: '', password: '', remember: false });
    await component.onSubmit();
    expect(mockApi.post).not.toHaveBeenCalled();
  }));

  it('onSubmit() should call API and navigate on success', fakeAsync(async () => {
    const userDetails = { email: 'user@example.com', name: 'Test User' };
    mockApi.post.and.returnValue(Promise.resolve({ user_details: userDetails }));

    component.loginForm.setValue({ username: 'user@example.com', password: 'Secret1!', remember: false });
    const submitPromise = component.onSubmit();
    await submitPromise;
    tick(600);

    expect(mockApi.post).toHaveBeenCalledWith('/api/auth/login', { email: 'user@example.com', password: 'Secret1!' });
    expect(mockAuthState.set).toHaveBeenCalledWith(userDetails);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['']);
  }));

  it('onSubmit() should set error message on failure', fakeAsync(async () => {
    mockApi.post.and.returnValue(Promise.reject({ error: { message: 'Invalid credentials' } }));

    component.loginForm.setValue({ username: 'user@example.com', password: 'Wrong123!', remember: false });
    await component.onSubmit();

    expect(component.error).toBe('Invalid credentials');
    expect(component.isLoading).toBeFalse();
  }));

  it('onSubmit() stores email in localStorage when remember is checked', fakeAsync(async () => {
    mockApi.post.and.returnValue(Promise.resolve({ user_details: { email: 'user@example.com', name: 'User' } }));
    spyOn(localStorage, 'setItem');

    component.loginForm.setValue({ username: 'user@example.com', password: 'Secret1!', remember: true });
    await component.onSubmit();
    tick(600);

    expect(localStorage.setItem).toHaveBeenCalledWith(
      'pw-rm-data',
      JSON.stringify({ username: 'user@example.com', remember: true })
    );
  }));
});
