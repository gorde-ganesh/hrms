import { Component, computed, input } from '@angular/core';

/**
 * One stroke-icon family (24px grid, 1.75 stroke, round joins) so every icon in
 * the shell shares weight and corner style. Add new icons here, not inline.
 */
const PATHS: Record<string, string> = {
  home: 'M3 11.5 12 4l9 7.5M5.5 10v9.5h13V10M10 19.5v-5h4v5',
  chat: 'M4 5h16v11H9.5L4 20.5V5z',
  bell: 'M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15L6 16zM10 21h4',
  users:
    'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6M16.5 4.3a3.5 3.5 0 0 1 0 6.4M18 14.3c2.2.7 3.5 2.5 3.5 5.2',
  sitemap: 'M9 3h6v5H9zM3 16h6v5H3zM15 16h6v5h-6zM12 8v4M6 16v-4h12v4',
  briefcase: 'M3 8h18v12H3zM9 8V5h6v3M3 13h18',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  banknote:
    'M3 6h18v12H3zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6.5 9.5h.01M17.5 14.5h.01',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  trend: 'M3 17l6-6 4 4 8-8M15 7h6v6',
  shield: 'M12 3l8 3v6c0 4.5-3.2 7.8-8 9-4.8-1.2-8-4.5-8-9V6l8-3zM9 12l2 2 4-4',
  key: 'M8 15a4 4 0 1 1 3.9-4.9L20 18v3h-3v-2h-2v-2h-2l-1.9-1.9A4 4 0 0 1 8 15z',
  'sign-out': 'M9 4H5v16h4M16 8l4 4-4 4M20 12H9',
  menu: 'M4 6h16M4 12h16M4 18h16',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
  'chevron-up': 'M6 15l6-6 6 6',
  file: 'M6 3h8l4 4v14H6zM14 3v4h4M9 13h6M9 17h6',
};

@Component({
  selector: 'app-icon',
  template: `
    <svg
      [attr.width]="size()"
      [attr.height]="size()"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path [attr.d]="path()" />
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      flex-shrink: 0;
      line-height: 0;
    }
  `,
})
export class Icon {
  name = input.required<string>();
  size = input(18);
  path = computed(() => PATHS[this.name()] ?? PATHS['file']);
}
