import { Component, input, output, ChangeDetectionStrategy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

export type PrimaryButtonVariant = 'primary' | 'dark' | 'soft' | 'outline-dark' | 'success' | 'info' | 'danger';

@Component({
  selector: 'app-primary-button',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      class="app-btn"
      [ngClass]="variantClass()"
      [disabled]="disabled() || loading()"
      [type]="type()"
      (click)="clicked.emit()"
    >
      @if (icon(); as ic) {
        <mat-icon class="btn-icon">{{ ic }}</mat-icon>
      }
      @if (loading()) {
        <span class="btn-spinner"></span>
        <ng-content select="[loading-label]"></ng-content>
      } @else {
        <ng-content></ng-content>
      }
    </button>
  `,
  styles: `
    .app-btn {
      font-family: var(--font-archivo);
      font-weight: var(--font-weight-bold);
      font-size: var(--font-size-base);
      border: none;
      border-radius: var(--radius-full);
      cursor: pointer;
      transition: all var(--transition-base);
      text-align: center;
      padding: 12px 24px;
      height: 46px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      line-height: 1.5;
      position: relative;

      &:hover:not(:disabled) {
        transform: translateY(-1px);
      }

      &:active:not(:disabled) {
        transform: translateY(0);
      }

      &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
        transform: none;
      }
    }

    .btn-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      line-height: 20px;
    }

    .btn-spinner {
      width: 18px;
      height: 18px;
      border: 2px solid currentColor;
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
      flex-shrink: 0;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .btn-primary {
      background: var(--primary);
      color: var(--on-primary);

      &:hover:not(:disabled) {
        background: var(--primary-bright);
        box-shadow: 0 0 20px rgba(204, 255, 0, 0.3);
      }
    }

    .btn-dark {
      background: var(--canvas-dark);
      color: var(--on-dark);
      border: 1px solid var(--charcoal);

      &:hover:not(:disabled) {
        background: var(--surface-deep);
        border-color: var(--mute);
      }
    }

    .btn-soft {
      background: var(--surface-soft);
      color: var(--ink);

      &:hover:not(:disabled) {
        background: var(--faint);
      }
    }

    .btn-outline-dark {
      background: transparent;
      color: var(--primary);
      border: 1px solid var(--primary);

      &:hover:not(:disabled) {
        background: var(--primary);
        color: var(--on-primary);
      }
    }

    .btn-success {
      background: var(--accent-green);
      color: #000;

      &:hover:not(:disabled) {
        background: #00c853;
        box-shadow: 0 0 20px rgba(0, 230, 118, 0.3);
      }
    }

    .btn-info {
      background: var(--accent-blue);
      color: var(--on-dark);

      &:hover:not(:disabled) {
        background: #0058d1;
        box-shadow: 0 0 20px rgba(0, 112, 243, 0.3);
      }
    }

    .btn-danger {
      background: transparent;
      color: var(--accent-red);
      border: 1px solid var(--accent-red);

      &:hover:not(:disabled) {
        background: var(--accent-red);
        color: var(--on-dark);
      }
    }
  `
})
export class PrimaryButtonComponent {
  readonly variant = input<PrimaryButtonVariant>('primary');
  readonly disabled = input(false);
  readonly loading = input(false);
  readonly type = input<'button' | 'submit'>('button');
  readonly icon = input<string>('');
  readonly clicked = output<void>();

  protected readonly variantClass = computed(() => `btn-${this.variant()}`);
}
