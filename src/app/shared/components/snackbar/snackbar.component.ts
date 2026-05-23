import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

export type SnackbarType = 'success' | 'error';

@Component({
  selector: 'app-snackbar',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="snackbar-overlay">
      <div class="snackbar" [class]="'snackbar--' + type()">
        <mat-icon class="snackbar-icon">{{ type() === 'success' ? 'check_circle' : 'error' }}</mat-icon>
        <span class="snackbar-message">{{ message() }}</span>
        <button class="snackbar-close" (click)="dismissed.emit()" type="button">
          <mat-icon>close</mat-icon>
        </button>
      </div>
    </div>
  `,
  styles: `
    .snackbar-overlay {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 9999;
      animation: snackbar-in 300ms cubic-bezier(0.4, 0, 0.2, 1);
    }

    .snackbar {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 14px 20px;
      border-radius: var(--radius-lg);
      font-family: var(--font-jakarta);
      font-size: var(--font-size-base);
      font-weight: var(--font-weight-semibold);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
      min-width: 280px;
      max-width: 480px;
    }

    .snackbar--success {
      background: #0d2b1a;
      color: var(--accent-green);
      border: 1px solid rgba(0, 230, 118, 0.25);
    }

    .snackbar--error {
      background: #2b0d0d;
      color: var(--accent-red);
      border: 1px solid rgba(255, 61, 0, 0.25);
    }

    .snackbar-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      flex-shrink: 0;
    }

    .snackbar-message {
      flex: 1;
      line-height: 1.4;
    }

    .snackbar-close {
      background: none;
      border: none;
      color: inherit;
      cursor: pointer;
      padding: 2px;
      display: flex;
      opacity: 0.6;
      transition: opacity var(--transition-fast);

      &:hover {
        opacity: 1;
      }

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
    }

    @keyframes snackbar-in {
      from {
        opacity: 0;
        transform: translateX(-50%) translateY(16px);
      }
      to {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }
    }
  `
})
export class SnackbarComponent {
  readonly message = input.required<string>();
  readonly type = input<SnackbarType>('success');
  readonly dismissed = output<void>();
}
