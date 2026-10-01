import { Component, input } from '@angular/core';

/**
 * PeopleOS mark: a geometric "P" whose bowl reads as a head, with a single
 * accent dot for the person beside it. Decorative when the wordmark is shown.
 */
@Component({
  selector: 'app-logo',
  template: `
    <svg
      class="mark"
      [attr.width]="size()"
      [attr.height]="size()"
      viewBox="0 0 32 32"
      [attr.aria-hidden]="wordmark() ? 'true' : null"
      [attr.role]="wordmark() ? null : 'img'"
      [attr.aria-label]="wordmark() ? null : 'PeopleOS'"
    >
      <rect width="32" height="32" rx="8" fill="var(--hr-accent)" />
      <path
        d="M11 24V8h5.5a5.25 5.25 0 0 1 0 10.5H11"
        fill="none"
        stroke="#fff"
        stroke-width="3.4"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <circle cx="22.5" cy="23" r="1.9" fill="#99f6e4" />
    </svg>
    @if (wordmark()) {
      <span class="word">PeopleOS</span>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: 10px;
    }
    .mark {
      flex-shrink: 0;
    }
    .word {
      font-size: 1.125rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: var(--hr-ink);
    }
  `,
})
export class Logo {
  size = input(28);
  wordmark = input(true);
}
