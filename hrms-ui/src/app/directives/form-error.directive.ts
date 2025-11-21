import {
  Directive,
  Input,
  ElementRef,
  Renderer2,
  OnInit,
  OnDestroy,
  Optional,
  Host,
  SkipSelf,
  ViewContainerRef,
  ComponentRef,
} from '@angular/core';
import { ControlContainer } from '@angular/forms';
import { Message } from 'primeng/message';
import { Subscription } from 'rxjs';

@Directive({
  selector: '[formError]',
  standalone: true,
})
export class FormErrorDirective implements OnInit, OnDestroy {
  @Input('formError') controlName!: string;
  @Input() errorMessages: { [key: string]: string } = {};

  private subscriptions: Subscription[] = [];
  private errorComponent?: ComponentRef<Message>;
  private currentMessage: string = '';

  constructor(
    private vcr: ViewContainerRef,
    @Optional() @Host() @SkipSelf() private controlContainer: ControlContainer
  ) {}

  ngOnInit() {
    if (!this.controlContainer?.control) return;
    const formGroup = this.controlContainer.control;
    const control = formGroup.get(this.controlName);
    if (!control) return;

    // Watch for validation status changes
    this.subscriptions.push(
      control.statusChanges.subscribe(() => this.updateError(control))
    );

    // Watch for value changes only when touched
    this.subscriptions.push(
      control.valueChanges.subscribe(() => {
        if (control.touched) {
          this.updateError(control);
        }
      })
    );

    // Watch for form submission events (markAllAsTouched)
    if (formGroup.events) {
      this.subscriptions.push(
        formGroup.events.subscribe(() => {
          // Use setTimeout to ensure touched state is updated
          setTimeout(() => this.updateError(control), 0);
        })
      );
    }
  }

  private updateError(control: any) {
    const shouldShow = control.invalid && (control.dirty || control.touched);

    if (shouldShow) {
      const firstErrorKey = Object.keys(control.errors || {})[0];
      const message =
        this.errorMessages[firstErrorKey] ||
        this.getDefaultErrorMessage(firstErrorKey);

      // Only update if message changed (prevents flickering)
      if (message !== this.currentMessage) {
        this.showError(message);
      }
    } else {
      this.removeError();
    }
  }

  private getDefaultErrorMessage(errorKey: string): string {
    const messages: { [key: string]: string } = {
      required: `${this.prettyName(this.controlName)} is required.`,
      minlength: `${this.prettyName(this.controlName)} is too short.`,
      maxlength: `${this.prettyName(this.controlName)} is too long.`,
      pattern: `${this.prettyName(this.controlName)} format is invalid.`,
      email: `Please enter a valid email address.`,
    };
    return messages[errorKey] || 'Invalid input.';
  }

  private prettyName(name: string): string {
    return name
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (s) => s.toUpperCase());
  }

  private showError(message: string) {
    if (!this.errorComponent) {
      this.errorComponent = this.vcr.createComponent(Message);
      this.errorComponent.instance.severity = 'error';
      this.errorComponent.instance.size = 'small';
      this.errorComponent.instance.variant = 'simple';
    }

    this.errorComponent.instance.text = message;
    this.currentMessage = message;
  }

  private removeError() {
    if (this.errorComponent) {
      this.errorComponent.destroy();
      this.errorComponent = undefined;
      this.currentMessage = '';
    }
  }

  ngOnDestroy() {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
    this.removeError();
  }
}
