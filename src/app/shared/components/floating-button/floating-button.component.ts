import {
  Component,
  input,
  output,
  ChangeDetectionStrategy,
  computed,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatIconModule } from "@angular/material/icon";

export type FloatingButtonVariant = "default" | "primary" | "success" | "danger";

@Component({
  selector: "app-floating-button",
  standalone: true,
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      class="floating-btn"
      [ngClass]="[variantClass()]"
      [class.floating-btn--active]="active()"
      [disabled]="disabled()"
      [type]="type()"
      [attr.aria-label]="ariaLabel()"
      [title]="title()"
      (click)="clicked.emit()"
    >
      @if (icon(); as ic) {
        <mat-icon>{{ ic }}</mat-icon>
      }
      <span class="floating-btn__label"><ng-content></ng-content></span>
    </button>
  `,
  styles: `
    .floating-btn {
      min-width: fit-content;
      height: 44px;
      padding: 0 14px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.04);
      color: var(--on-dark);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex: 0 0 auto;
      gap: 8px;
      cursor: pointer;
      white-space: nowrap;
      font-family: var(--font-archivo);
      transition:
        transform var(--transition-base),
        background var(--transition-base),
        border-color var(--transition-base),
        color var(--transition-base),
        box-shadow var(--transition-base);

      &:hover:not(:disabled) {
        transform: translateY(-2px);
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(255, 255, 255, 0.18);
      }

      &:focus-visible {
        outline: 2px solid var(--primary);
        outline-offset: 2px;
      }

      &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
        transform: none;
      }

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
        flex-shrink: 0;
      }
    }

    .floating-btn__label {
      font-family: var(--font-archivo);
      font-size: 12px;
      font-weight: var(--font-weight-semibold);
      letter-spacing: 0.3px;
      text-transform: uppercase;
    }

    .floating-btn--primary {
      background: rgba(var(--feature-accent-rgb, 204, 255, 0), 0.14);
      color: var(--primary-bright);
      border-color: rgba(var(--feature-accent-rgb, 204, 255, 0), 0.24);
      box-shadow: 0 0 24px rgba(var(--feature-accent-rgb, 204, 255, 0), 0.08);
    }

    .floating-btn--success {
      background: rgba(0, 230, 118, 0.12);
      color: var(--accent-green);
      border-color: rgba(0, 230, 118, 0.22);
    }

    .floating-btn--danger {
      background: rgba(255, 61, 0, 0.12);
      color: var(--accent-red);
      border-color: rgba(255, 61, 0, 0.22);
    }

    .floating-btn--active {
      background: rgba(var(--feature-accent-rgb, 204, 255, 0), 0.14);
      color: var(--primary-bright);
      border-color: rgba(var(--feature-accent-rgb, 204, 255, 0), 0.24);
    }

    @media (max-width: 680px) {
      .floating-btn {
        height: 42px;
        width: 120px;
        padding: 0 12px;
        margin: 0px 5px;
        gap: 6px;
      }

      .floating-btn__label {
        font-size: 11px;
      }
    }
  `,
})
export class FloatingButtonComponent {
  readonly variant = input<FloatingButtonVariant>("default");
  readonly active = input(false);
  readonly disabled = input(false);
  readonly type = input<"button" | "submit">("button");
  readonly icon = input<string>("");
  readonly ariaLabel = input<string>("");
  readonly title = input<string>("");
  readonly clicked = output<void>();

  protected readonly variantClass = computed(() =>
    this.variant() !== "default" ? `floating-btn--${this.variant()}` : "",
  );
}
